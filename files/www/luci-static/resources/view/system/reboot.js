'use strict';
'require view';
'require rpc';
'require ui';
'require uci';

var callReboot = rpc.declare({
	object: 'system',
	method: 'reboot',
	expect: { result: 0 }
});

var callBootStatus = rpc.declare({
	object: 'c2000boot',
	method: 'status',
	expect: { }
});

var callBootSwitch = rpc.declare({
	object: 'c2000boot',
	method: 'switch',
	params: [ 'target' ],
	expect: { }
});

function systemLabel(id) {
	switch (id) {
	case 'sd':  return _('YWrt（SD 卡）');
	case 'nor': return _('原厂系统（NOR）');
	default:    return _('未识别');
	}
}

function makeButton(cls, label, handler, enabled) {
	var attrs = { 'class': cls, 'click': handler };

	if (enabled === false)
		attrs.disabled = true;

	return E('button', attrs, label);
}

function showRebooting() {	L.ui.showModal(_('Rebooting…'), [
		E('p', { 'class': 'spinning' }, _('Waiting for device...'))
	]);

	window.setTimeout(function() {
		L.ui.showModal(_('Rebooting…'), [
			E('p', { 'class': 'spinning alert-message warning' },
				_('Device unreachable! Still waiting for device...'))
		]);
	}, 150000);

	L.ui.awaitReconnect();
}

return view.extend({
	load: function() {
		return Promise.all([
			uci.changes(),
			callBootStatus().catch(function() { return { available: false }; })
		]);
	},

	render: function(data) {
		var changes = data[0] || {};
		var st      = data[1] || {};
		var avail   = (st.available === true);

		var body = E([
			E('h2', {}, _('Reboot')),
			E('p', {}, _('Reboots the operating system of your device'))
		]);

		for (var config in changes) {
			body.appendChild(E('p', { 'class': 'alert-message warning' },
				_('Warning: There are unsaved changes that will get lost on reboot!')));
			break;
		}

		body.appendChild(E('hr'));
		body.appendChild(E('button', {
			'class': 'cbi-button cbi-button-action important',
			'click': ui.createHandlerFn(this, 'handleReboot')
		}, _('Perform reboot')));

		body.appendChild(E('hr'));
		body.appendChild(E('h2', {}, _('启动系统切换')));
		body.appendChild(E('p', {},
			_('本机可以在 SD 卡系统（YWrt）与原厂 NOR 系统之间切换。') + ' ' +
			_('切换只改写 u-boot 的环境变量 boot_from_sd，') + ' ' +
			_('不修改任何分区内容，下一次开机生效。')));

		body.appendChild(E('div', { 'class': 'cbi-section' }, [
			E('table', { 'class': 'table' }, [
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td', 'width': '30%' }, _('当前运行')),
					E('td', { 'class': 'td' }, E('strong', {}, systemLabel(st.running)))
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, _('下次启动')),
					E('td', { 'class': 'td' }, E('strong', {}, systemLabel(st.target)))
				]),
				E('tr', { 'class': 'tr' }, [
					E('td', { 'class': 'td' }, _('u-boot 环境')),
					E('td', { 'class': 'td' }, E('code', {},
						'boot_from_sd=%s'.format(st.boot_from_sd || '—')))
				])
			])
		]));

		if (!avail)
			body.appendChild(E('p', { 'class': 'alert-message warning' },
				_('读不到 u-boot 环境（fw_printenv 不可用），切换功能已禁用。')));

		body.appendChild(E('div', { 'class': 'cbi-page-actions' }, [
			makeButton('cbi-button cbi-button-apply',
				_('切到 YWrt 并重启'),
				ui.createHandlerFn(this, 'handleSwitch', 'sd', true), avail),
			' ',
			makeButton('cbi-button cbi-button-reset',
				_('切到原厂系统并重启'),
				ui.createHandlerFn(this, 'handleSwitch', 'nor', true), avail),
			' ',
			makeButton('btn',
				_('只切换，不重启'),
				ui.createHandlerFn(this, 'handleSwitch', (st.running === 'nor' ? 'sd' : 'nor'), false), avail)
		]));

		return body;
	},

	handleReboot: function() {
		return callReboot().then(function(res) {
			if (res != 0) {
				L.ui.addNotification(null, E('p',
					_('The reboot command failed with code %d').format(res)));
				L.raise('Error', 'Reboot failed');
			}

			showRebooting();
		}).catch(function(e) {
			L.ui.addNotification(null, E('p', e.message));
		});
	},

	handleSwitch: function(target, doReboot) {
		return ui.showModal(_('切换启动系统'), [
			E('p', {}, _('确定把下次启动目标改为「%s」吗？').format(systemLabel(target))),
			E('p', { 'class': 'alert-message warning' },
				_('这会写入 u-boot 环境变量 boot_from_sd，') + ' ' +
				_('只影响下次开机，不改动任何分区内容。') + ' ' +
				_('若目标与原厂系统不一致，请确认设备旁有人可以操作。')),
			E('div', { 'class': 'right' }, [
				E('button', { 'class': 'btn', 'click': ui.hideModal }, _('取消')),
				' ',
				E('button', {
					'class': 'cbi-button cbi-button-action important',
					'click': ui.createHandlerFn(this, 'doSwitch', target, doReboot)
				}, doReboot ? _('切换并重启') : _('仅切换'))
			])
		]);
	},

	doSwitch: function(target, doReboot) {
		ui.hideModal();

		return callBootSwitch(target).then(function(res) {
			if (!res || res.ok !== true) {
				L.ui.addNotification(null, E('p', _('切换失败：%s').format(
					(res && res.message) || _('未知错误'))));
				return;
			}

			if (!doReboot) {
				L.ui.addNotification(null, E('p',
					_('已设置下次从「%s」启动，重启后生效。').format(systemLabel(target))));
				return;
			}

			return callReboot().then(function(code) {
				if (code != 0) {
					L.ui.addNotification(null, E('p',
						_('The reboot command failed with code %d').format(code)));
					L.raise('Error', 'Reboot failed');
					return;
				}

				showRebooting();
			});
		}).catch(function(e) {
			L.ui.addNotification(null, E('p', e.message || String(e)));
		});
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
