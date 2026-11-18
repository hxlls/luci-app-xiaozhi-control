'use strict';
'require view';
'require form';
'require uci';
'require fs';

return view.extend({
	load: function () {
		return Promise.all([
			uci.load('xiaozhi-api'),
			fs.read('/proc/net/arp').catch(function () { return ''; }),
			fs.read('/tmp/oui.csv').catch(function () { return ''; })
		]);
	},

	render: function (data) {
		var m, s, o;
		var arpText = data[1] || '';
		var ouiText = data[2] || '';

		var oui = {};
		ouiText.split('\n').forEach(function (line) {
			var i = line.indexOf(',');
			if (i > 0) oui[line.substring(0, i)] = line.substring(i + 1);
		});

		m = new form.Map('xiaozhi-api', _('小智控制'),
			_('配置小智通过 MCP 调用本路由器；查询类只读，控制类需单独开启。'));

		s = m.section(form.NamedSection, 'main', 'xiaozhi-api', _('通用'));
		o = s.option(form.Value, 'token', _('Token'),
			_('接口鉴权 token，改后固件侧 URL 也要同步带 ?token='));
		o = s.option(form.Flag, 'allow_control', _('控制类总开关'),
			_('写操作总闸，默认关闭'));

		// 各功能开关：合并到同一卡片，每个一行（直接读写对应 permission 段）
		var perms = [
			['clients', _('在线设备查询'), _('只读，默认开')],
			['wan', _('WAN 状态查询'), _('只读，默认开')],
			['status', _('系统状态查询'), _('只读，默认开')],
			['portforward', _('端口映射（写操作）'), _('需总开关同时打开，带二次确认')],
			['portforward_list', _('查看端口映射'), _('需总开关同时打开')]
		];
		perms.forEach(function (p) {
			var opt = s.option(form.Flag, 'perm_' + p[0], p[1], p[2]);
			opt.cfgvalue = function () {
				return uci.get('xiaozhi-api', p[0], 'allow');
			};
			opt.write = function (section_id, value) {
				return uci.set('xiaozhi-api', p[0], 'allow', value);
			};
		});

		// 在线设备表格（同一卡片内只读展示）
		o = s.option(form.DummyValue, '_device_list', _('在线设备'));
		o.rawhtml = true;
		o.cfgvalue = function () {
			var rows = ['<table class="table"><tr><th>IP</th><th>MAC</th><th>厂商</th></tr>'];
			arpText.split('\n').forEach(function (line) {
				var f = line.trim().split(/\s+/);
				if (f.length < 4 || f[2] !== '0x2') return;
				var mac = f[3].toLowerCase();
				if (mac === '00:00:00:00:00:00') return;
				var prefix = mac.substring(0, 2) + mac.substring(3, 5) + mac.substring(6, 8);
				var vendor = oui[prefix] || '';
				rows.push('<tr><td>' + f[0] + '</td><td>' + mac + '</td><td>' + vendor + '</td></tr>');
			});
			rows.push('</table>');
			return rows.join('');
		};

		return m.render();
	}
});
