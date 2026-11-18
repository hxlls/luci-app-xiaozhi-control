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

		// OUI 前缀 -> 厂商名
		var oui = {};
		ouiText.split('\n').forEach(function (line) {
			var i = line.indexOf(',');
			if (i > 0) oui[line.substring(0, i)] = line.substring(i + 1);
		});

		m = new form.Map('xiaozhi-api', _('小智 API'),
			_('配置小智通过 MCP 调用本路由器；查询类只读，控制类需单独开启。'));

		// 通用
		s = m.section(form.NamedSection, 'main', 'xiaozhi-api', _('通用'));
		o = s.option(form.Value, 'token', _('Token'),
			_('接口鉴权 token，改后固件侧 URL 也要同步带 ?token='));
		o = s.option(form.Flag, 'allow_control', _('控制类总开关'),
			_('写操作总闸，默认关闭'));

		// 各功能开关
		var perms = [
			['clients', _('在线设备查询')],
			['wan', _('WAN 状态查询')],
			['status', _('系统状态查询')],
			['portforward', _('端口映射（写操作）')],
			['portforward_list', _('查看端口映射')]
		];
		// 每个功能单独一个命名段，直接渲染成带开关的卡片
		perms.forEach(function (p) {
			var sec = uci.get('xiaozhi-api', p[0]);
			if (!sec) return;
			var ss = m.section(form.NamedSection, p[0], 'permission', p[1],
				_('控制类还须上面的总开关同时打开才生效'));
			o = ss.option(form.Flag, 'allow', _('允许'));
		});

		// 在线设备（只读展示）
		s = m.section(form.TypedSection, '_devices', _('在线设备'), null);
		s.anonymous = true;
		o = s.option(form.DummyValue, '_dev');
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
