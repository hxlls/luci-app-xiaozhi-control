'use strict';
'require view';
'require form';
'require uci';
'require fs';

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
			fs.read('/proc/net/arp').catch(function () { return ''; }),
			fs.read('/tmp/oui.csv').catch(function () { return ''; })
		]);
	},

	render: function (data) {
		var m, s, o;
		var arpText = data[2] || '', ouiText = data[3] || '';

		var oui = {};
		ouiText.split('\n').forEach(function (line) {
			var i = line.indexOf(',');
			if (i > 0) oui[line.substring(0, i)] = line.substring(i + 1);
		});

		// MAC -> 友好名（config name_map）
		var names = {};
		uci.sections('xiaozhi-api', 'name_map').forEach(function (sec) {
			if (sec.mac && sec.name) names[sec.mac.toLowerCase()] = sec.name;
		});

		var devices = [];
		arpText.split('\n').forEach(function (line) {
			var f = line.trim().split(/\s+/);
			if (f.length < 4 || f[2] !== '0x2') return;
			var mac = f[3].toLowerCase();
			if (mac === '00:00:00:00:00:00') return;
			var p = mac.substring(0, 2) + mac.substring(3, 5) + mac.substring(6, 8);
			var vendor = oui[p] || '-';
			var name = names[mac] || f[4] || vendor;
			devices.push([f[0], name, vendor]);
		});

		var forwards = [];
		uci.sections('firewall', 'redirect').forEach(function (sec) {
			if (!sec.name || sec.name.indexOf('xiaozhi_') !== 0) return;
			forwards.push([sec.src_dport || '-', sec.dest_ip || '-', sec.dest_port || '-']);
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

		// 右栏：状态（实时读取，无需保存）
		s = m.section(form.TypedSection, '_status', _('状态'));
		s.anonymous = true;
		o = s.option(form.DummyValue, '_tables');
		o.rawhtml = true;
		o.cfgvalue = function () {
			var h = '<div class="xz-sec">在线设备</div>' + table(['IP', '名称', '厂商'], devices);
			h += '<div class="xz-sec">端口映射</div>' + table(['外部', '内网 IP', '内部'], forwards);
			return h;
		};

		var root = m.render();
		root.classList.add('xz-map');
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
	}
});
