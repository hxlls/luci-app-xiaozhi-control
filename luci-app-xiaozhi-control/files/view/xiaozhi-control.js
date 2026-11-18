'use strict';
'require view';
'require form';
'require uci';

/* 扩展点 1：新增功能开关，只需追加一项 [标识, 名称, 提示] */
var FEATURES = [
	['clients',          '在线设备', '查询'],
	['wan',              'WAN 状态', '查询'],
	['status',           '系统状态', '查询'],
	['portforward',      '端口映射', '写操作'],
	['portforward_list', '映射列表', '查询']
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
		var statusHtml = '<div class="xz-sec">在线设备</div><div id="xz-devices">'
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
				+ '.xz-empty{color:var(--color-text-tertiary);font-size:13px;padding:8px 0}';
			root.insertBefore(style, root.firstChild);
			return root;
		});
	}
});
