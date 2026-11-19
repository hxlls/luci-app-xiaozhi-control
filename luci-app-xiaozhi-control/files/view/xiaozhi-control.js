'use strict';
'require view';
'require form';
'require uci';

/* 扩展点 1：新增功能开关，只需追加一项 [标识, 名称, 提示] */
var FEATURES = [
	['health',           '网络体检', '查询'],
	['clients',          '在线设备', '查询'],
	['wan',              'WAN 状态', '查询'],
	['status',           '系统状态', '查询'],
	['portforward',      '端口映射', '写操作'],
	['portforward_list', '映射列表', '查询'],
	['route_list',       '静态路由查询', '查询'],
	['route_add',        '静态路由添加', '写操作'],
	['route_del',        '静态路由删除', '写操作']
];

return view.extend({
	load: function () {
		return Promise.all([
			uci.load('xiaozhi-api'),
			uci.load('firewall'),
			uci.load('network')
		]);
	},

	render: function (data) {
		var m, s, o;

		var forwards = [];
		uci.sections('firewall', 'redirect').forEach(function (sec) {
			// 列出所有 DNAT 端口转发（与小智接口 portforward_list 保持一致）
			if (sec.target !== 'DNAT' || !sec.src_dport) return;
			forwards.push([sec.name || '-', sec.src_dport, sec.dest_ip || '-', sec.dest_port || '-']);
		});

		// netmask 点分十进制 -> 前缀位数
		function maskToBits(mask) {
			if (!mask) return null;
			var parts = mask.split('.');
			if (parts.length !== 4) return null;
			var bits = 0;
			for (var i = 0; i < 4; i++) {
				var n = parseInt(parts[i], 10);
				if (isNaN(n)) return null;
				while (n > 0) { bits += n & 1; n >>= 1; }
			}
			return bits;
		}

		var routes = [];
		uci.sections('network', 'route').forEach(function (sec) {
			var target = sec.target || '';
			var bits = maskToBits(sec.netmask);
			var cidr = bits !== null ? (target + '/' + bits) : target;
			routes.push([cidr, sec.gateway || '-', sec.interface || '-']);
		});

		/* 扩展点 2：状态表格统一渲染，新增状态只加一次 table() 调用 */
		function table(headers, rows) {
			if (!rows.length) return '<p class="xz-empty">暂无数据</p>';
			var h = '<div class="xz-scroll"><table class="xz-tb"><thead><tr>';
			headers.forEach(function (t) { h += '<th>' + t + '</th>'; });
			h += '</tr></thead><tbody>';
			rows.forEach(function (r) {
				h += '<tr>';
				r.forEach(function (c) { h += '<td>' + c + '</td>'; });
				h += '</tr>';
			});
			return h + '</tbody></table></div>';
		}

		function esc(text) {
				return String(text == null ? '' : text).replace(/[&<>"']/g, function (ch) {
					return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
				});
			}

			function rate(v) {
				if (v < 0) return '采样中';
				return v >= 1000 ? (v / 1000).toFixed(1) + ' Mbps' : v + ' kbps';
			}

			function healthHtml(j) {
				if (j.error) return '<p class="xz-empty">读取失败：' + esc(j.error) + '</p>';
				var c = j.checks || {};
				var wan = c.wan || {}, net = c.internet || {}, dns = c.dns || {};
				var gw = c.gateway_ping || {}, sys = c.system || {}, cl = c.clients || {}, ct = c.conntrack || {};
				var tf = c.traffic || {}, cnt = c.counts || {};
				var st = { ok: '正常', warn: '注意', error: '异常', unknown: '未知' };
				var rows = [
					['WAN', st[wan.status] || '-', wan.up ? (wan.ip || '已连接') : '未连接'],
					['WAN 流量', st[tf.status] || '-', '↓ ' + rate(tf.rx_rate_kbps) + '  ↑ ' + rate(tf.tx_rate_kbps)],
					['外网', st[net.status] || '-', net.latency_ms >= 0 ? (net.latency_ms + ' ms，丢包 ' + net.loss + '%') : '丢包 ' + net.loss + '%'],
					['DNS', st[dns.status] || '-', dns.status === 'ok' ? '解析正常' : '解析失败'],
					['网关', st[gw.status] || '-', gw.latency_ms >= 0 ? (gw.latency_ms + ' ms') : (wan.gateway || '-')],
					['系统', st[sys.status] || '-', '负载 ' + (sys.load || '-') + '，内存已用 ' + (sys.mem_used_pct || 0) + '%'],
					['在线设备', st[cl.status] || '-', (cl.online || 0) + ' 台（' + (cl.unknown || 0) + ' 台未命名，DHCP ' + (cnt.dhcp_leases || 0) + '）'],
					['配置', '-', '端口映射 ' + (cnt.port_forwards || 0) + ' 条，静态路由 ' + (cnt.static_routes || 0) + ' 条'],
					['连接数', st[ct.status] || '-', ct.max > 0 ? (ct.count + ' / ' + ct.max + '（' + ct.pct + '%）') : '未知']
				];
				var issues = (j.issues || []).length
					? '<p class="xz-health-issue">注意：' + j.issues.map(esc).join('；') + '</p>' : '';
				return '<div class="xz-health-head"><span class="xz-score">' + esc(j.score) + '</span> 分 · '
					+ esc(j.grade_text || j.grade || '') + '</div>'
					+ '<p class="xz-health-sum">' + esc(j.summary || '') + '</p>'
					+ table(['项目', '状态', '详情'], rows) + issues;
			}

			m = new form.Map('xiaozhi-api', _('小智控制'));

		// 左栏：配置
		s = m.section(form.NamedSection, 'main', 'xiaozhi-api', _('配置'));
		s.option(form.Value, 'token', _('Token'));
		s.option(form.Flag, 'allow_control', _('允许控制'));
		FEATURES.forEach(function (f) {
			var opt = s.option(form.Flag, 'perm_' + f[0], f[1], f[2]);
			opt.cfgvalue = function () { return uci.get('xiaozhi-api', f[0], 'allow'); };
			opt.write = function (sid, val) { return uci.set('xiaozhi-api', f[0], 'allow', val); };
		});

		// 右栏：状态用占位 section，渲染后用 DOM 填充（实时读取，无需保存）
		s = m.section(form.TypedSection, '_status', _('状态'));
		s.anonymous = true;

		// 状态区 HTML（在线设备稍后异步填充）
		var statusHtml = '<div class="xz-sec">网络体检</div><div id="xz-health">'
			+ '<p class="xz-empty">加载中…</p></div>'
			+ '<div class="xz-sec">在线设备</div><div id="xz-devices">'
			+ '<p class="xz-empty">加载中…</p></div>'
			+ '<div class="xz-sec">端口映射</div>' + table(['规则名', '外部', '内网 IP', '内部'], forwards)
			+ '<div class="xz-sec">静态路由</div>' + table(['目标网段', '网关', '接口'], routes);

		return m.render().then(function (root) {
			root.classList.add('xz-map');
			// 找到"状态"section，替换其空内容为状态表格
			var sections = root.querySelectorAll('.cbi-section');
			if (sections.length > 1) {
				var node = sections[1].querySelector('.cbi-section-node') || sections[1];
				node.innerHTML = statusHtml;
			}
			// 异步读取在线设备（延迟到页面渲染完成后，routerapi 已做好名称解析）
			setTimeout(function () {
				fetch('/cgi-bin/routerapi?action=clients')
					.then(function (r) { return r.json(); })
					.then(function (j) {
						var box = root.querySelector('#xz-devices');
						if (!box) return;
						var rows = (j.clients || []).map(function (c) {
							return [c.ip, c.name || c.mac || '-'];
						});
						box.innerHTML = rows.length ? table(['IP', '设备名'], rows) : '<p class="xz-empty">暂无在线设备</p>';
					})
					.catch(function (e) {
						var box = root.querySelector('#xz-devices');
						if (box) box.innerHTML = '<p class="xz-empty">读取失败: ' + (e && e.message || '') + '</p>';
					});
				fetch('/cgi-bin/routerapi?action=health')
					.then(function (r) { return r.json(); })
					.then(function (j) {
						var box = root.querySelector('#xz-health');
						if (box) box.innerHTML = healthHtml(j);
					})
					.catch(function (e) {
						var box = root.querySelector('#xz-health');
						if (box) box.innerHTML = '<p class="xz-empty">读取失败: ' + (e && e.message || '') + '</p>';
					});
			}, 300);
			var style = document.createElement('style');
			style.textContent = ''
				+ '.xz-map{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start}'
				+ '.xz-map>h2,.xz-map>.cbi-map-description,.xz-map>.cbi-page-actions{grid-column:1/-1}'
				+ '.xz-map>.cbi-section{margin:0}'
				+ '@media(max-width:900px){.xz-map{grid-template-columns:1fr}}'
				+ '.xz-sec{margin:10px 0 4px;font-weight:500}'
				+ '.xz-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}'
				+ '.xz-tb{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}'
				+ '.xz-tb th,.xz-tb td{padding:6px 8px;border-bottom:0.5px solid var(--color-border-tertiary);text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
				+ '.xz-tb th{color:var(--color-text-secondary);font-weight:500}'
				+ '.xz-empty{color:var(--color-text-tertiary);font-size:13px;padding:8px 0}'
				+ '.xz-health-head{font-size:14px;margin:4px 0}'
				+ '.xz-score{font-size:26px;font-weight:600}'
				+ '.xz-health-sum{margin:2px 0 8px;color:var(--color-text-secondary);font-size:13px}'
				+ '.xz-health-issue{margin:6px 0 0;color:var(--color-warning,#b26a00);font-size:13px}';
			root.insertBefore(style, root.firstChild);
			return root;
		});
	}
});
