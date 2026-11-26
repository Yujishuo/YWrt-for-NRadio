'use strict';
'require view';
'require rpc';
'require poll';
'require ui';

var callStatus = rpc.declare({
	object: 'c2000-modem',
	method: 'status',
	expect: { }
});

var callAt = rpc.declare({
	object: 'c2000-modem',
	method: 'at',
	params: [ 'cmd' ],
	expect: { }
});

var callReconnect = rpc.declare({
	object: 'c2000-modem',
	method: 'reconnect',
	expect: { }
});

var callSimInfo = rpc.declare({
	object: 'c2000-modem',
	method: 'siminfo',
	expect: { }
});

var callSimSwitch = rpc.declare({
	object: 'c2000-modem',
	method: 'simswitch',
	params: [ 'slot', 'mode' ],
	expect: { }
});

var callSimAuto = rpc.declare({
	object: 'c2000-modem',
	method: 'simauto',
	params: [ 'action' ],
	expect: { }
});

var callSimSetMode = rpc.declare({
	object: 'c2000-modem',
	method: 'simsetmode',
	params: [ 'mode' ],
	expect: { }
});

function simName(si, n) {
	var cs = (si && si.cards) || [];
	for (var i = 0; i < cs.length; i++)
		if (cs[i].n == n)
			return cs[i].name;
	return '卡位 ' + n;
}

function cell(label, value) {

	var v = (value && value.nodeType) ? value :
		((value !== undefined && value !== null && value !== '') ? String(value) : '—');

	return E('tr', { 'class': 'tr' }, [
		E('td', { 'class': 'td left', 'width': '30%' }, label),
		E('td', { 'class': 'td left' }, v)
	]);
}

function bar(n, active) {
	return E('span', {
		'style': 'display:inline-block;width:10px;margin-right:3px;border-radius:2px;' +
			'background:' + (active ? '#2b8a3e' : '#d0d0d0') + ';height:' + (6 + n * 5) + 'px;vertical-align:bottom'
	}, '');
}

function signalView(st) {
	var bars = parseInt(st.bars || 0) || 0;
	var dbm = (st.dbm === undefined || st.dbm === null) ? '' : String(st.dbm);
	var txt;

	if (dbm !== '') {
		txt = dbm + ' dBm';
		if (st.sinr) txt += ' · SINR ' + st.sinr + ' dB';
		if (st.rsrq) txt += ' · RSRQ ' + st.rsrq + ' dB';
		if (st.mode) txt += ' · ' + st.mode;
	}
	else {
		txt = '未上报';
	}

	return E('span', {}, [
		bar(1, bars >= 1), bar(2, bars >= 2), bar(3, bars >= 3),
		E('span', { 'style': 'margin-left:8px' }, txt)
	]);
}

function fmtRate(kbps) {
	var n = parseInt(kbps, 10);
	if (!n || n <= 0)
		return '';
	return (n >= 1000) ? (Math.round(n / 100) / 10) + ' Mbps' : n + ' kbps';
}

function ambrText(st) {
	var a = st && st.ambr;
	if (!a || !(a.dl_kbps || a.ul_kbps))
		return '';

	var parts = [];
	if (a.dl_kbps) parts.push('↓ ' + fmtRate(a.dl_kbps));
	if (a.ul_kbps) parts.push('↑ ' + fmtRate(a.ul_kbps));

	return parts.join('　') + (a.apn ? '　（APN ' + a.apn + '）' : '');
}

function cellsText(st) {
	var list = (st && st.cells) || [];
	if (!list.length)
		return '';

	var txt = list.map(function(c) {
		var name = (c.rat === 'NR' ? 'n' : 'B') + c.band;
		var bw = c.dl_bw_khz ? ('/' + (c.dl_bw_khz / 1000) + 'MHz') : '';
		return name + ' ' + (c.dl_freq_khz / 1000) + 'MHz' + bw;
	});

	return list.length + ' 载波：' + txt.join('　+　');
}

function sleep(ms) {
	return new Promise(function(resolve) { window.setTimeout(resolve, ms); });
}

function mkBtn(cls, label, disabled, handler) {
	var attrs = { 'class': cls, 'click': handler };
	if (disabled)
		attrs.disabled = 'disabled';
	return E('button', attrs, label);
}

return view.extend({
	handleSaveApply: null,
	handleSave: null,
	handleReset: null,

	load: function() {
		return Promise.all([ callStatus(), callSimInfo() ]);
	},

	render: function(data) {
		var self = this;
		var st = data[0] || {};
		var lastSim = data[1] || {};
		var busy = false;

		var body = E('div', {}, '');

		var update = function(s) {
			s = s || {};
			while (body.firstChild)
				body.removeChild(body.firstChild);

			body.appendChild(E('table', { 'class': 'table' }, [
				cell('模组状态', s.present ? '已识别' : '未识别'),
				cell('USB ID', s.usb),
				cell('型号', s.model),
				cell('AT 口', s.at),
				cell('网络接口', s.iface),
				cell('IPv4', s.ipv4),
				cell('网关', s.gateway),
				cell('APN', s.apn),
				cell('承载', s.carrier == 1 ? '已激活' : '未激活'),
				cell('信号', signalView(s)),
				cell('签约速率', ambrText(s)),
				cell('载波聚合', cellsText(s)),
				cell('运营商', s.operator),
				cell('注网状态', s.reg),
				cell('SIM', s.sim)
			]));
		};

		update(st);

		poll.add(function() {
			return callStatus().then(update);
		}, 15);

		var simBody = E('div', {}, '');
		var simMode = E('div', { 'style': 'margin:14px 0 6px' }, '');
		var simBtns = E('div', { 'style': 'margin-top:8px' }, '');
		var lastSig = '';

		var simSig = function(si) {
			var r = (si && si.result) || {}, cs = (si && si.cards) || [];
			var names = [];
			for (var i = 0; i < cs.length; i++) names.push(cs[i].n + ':' + cs[i].name);
			return [ si.mode, si.cfg, si.slot, si.pin, si.reg, si.iccid,
				r.state, r.round, r.slot, r.msg, si.autorun,
				names.join(','), si.busy ? 1 : 0 ].join('|');
		};

		var modeHint = function(isAuto, si) {
			if (isAuto)
				return ('自动模式：上不了网时自动从卡位 1 开始逐个试，最多 %d 轮；' +
					'找到能上网的卡就停在那儿，全都不行会回到原来的卡位。')
					.format(parseInt(si.rounds || 3) || 3);
			return '手动模式：只切到你点的卡位，读不到卡或没网都**不会**自动回滚。';
		};

		var setMode = function(m) {
			busy = true;
			renderSim(lastSim);
			return callSimSetMode(String(m)).then(function(r) {
				busy = false;
				if (r && r.ok === true)
					ui.addNotification(null, E('p', {},
						(m === '0' ? '已切到自动模式' : '已切到手动模式')), 'info');
				else
					ui.addNotification(null, E('p', {},
						'切换模式失败：' + ((r && r.msg) || '未知错误')), 'error');
				return callSimInfo().then(renderSim);
			});
		};

		var renderSim = function(si) {
			si = si || {};
			lastSim = si;
			lastSig = simSig(si);

			var cards = (si.cards && si.cards.length) ? si.cards : [];
			var derived = parseInt(si.slot || 0) || 0;
			var cfg = parseInt(si.cfg || 0) || 0;
			var cur = derived || cfg;
			var pin = si.pin || '';
			var gpio = (si.gpio === undefined || si.gpio === null) ? '' : String(si.gpio);
			var isAuto = (String(si.mode === undefined ? 0 : si.mode) === '0');
			var running = (si.autorun == 1);

			while (simBody.firstChild)
				simBody.removeChild(simBody.firstChild);

			simBody.appendChild(E('table', { 'class': 'table' }, [
				cell('当前卡位', cur ? ('卡位 %d · %s%s'.format(cur, simName(si, cur),
					derived ? '' : '（按配置，模组未应答）')) : '未识别'),
				cell('ICCID', si.iccid),
				cell('SIM 状态', pin ? (pin === 'READY' ? 'READY（已就绪）' : pin) : '—'),
				cell('注网状态', si.reg),
				cell('板级开关', 'cpe-sel0 = ' + (gpio !== '' ? gpio : '?') +
					(si.gpioName ? '（' + si.gpioName + '）' : '')),
				cell('模组 usim', si.usim),
				cell('卡位表', ('%d 张卡 · %s').format(cards.length || 0,
					si.bank ? '来自原厂 cpesel' : '原厂配置读不到，用内置默认'))
			]));

			while (simMode.firstChild)
				simMode.removeChild(simMode.firstChild);

			var mkRadio = function(val, label, on) {
				var attrs = { 'type': 'radio', 'name': 'sim-mode', 'value': val,
					'change': ui.createHandlerFn(self, function() { return setMode(val); }) };
				if (on)
					attrs.checked = 'checked';
				return E('label', { 'style': 'margin-right:18px;cursor:pointer' }, [
					E('input', attrs), ' ' + label
				]);
			};

			simMode.appendChild(E('div', { 'style': 'font-weight:bold;margin-bottom:4px' },
				'切换方式'));
			simMode.appendChild(E('div', {}, [
				mkRadio('0', '自动（没网就自己找卡）', isAuto),
				mkRadio('1', '手动（自己选，不回滚）', !isAuto)
			]));
			simMode.appendChild(E('div',
				{ 'style': 'margin-top:4px;color:#666;font-size:12px' },
				modeHint(isAuto, si)));

			var res = si.result;
			if (res && res.msg) {
				var color = (res.state === 'ok') ? '#2b8a3e' :
					((res.state === 'running') ? '#1c7ed6' : '#c92a2a');
				var head = (res.state === 'ok') ? '上次切换成功：' :
					((res.state === 'running') ? '自动轮询进行中：' :
					((res.state === 'revert') ? '已自动回滚：' : '切换结果：'));
				simBody.appendChild(E('p', { 'style': 'margin-top:8px;color:' + color }, [
					E('strong', {}, head), res.msg,
					res.iccid ? ('　ICCID ' + res.iccid) : ''
				]));
			}

			while (simBtns.firstChild)
				simBtns.removeChild(simBtns.firstChild);

			if (isAuto && cards.length) {
				var chips = [];
				cards.forEach(function(c) {
					chips.push('卡位 %d %s（sel0=%s / usim=%s）'.format(
						c.n, c.name, c.sel0, c.usim));
				});
				simBtns.appendChild(E('div',
					{ 'style': 'color:#666;font-size:12px;margin-bottom:8px;line-height:1.6' },
					'共 %d 张卡：%s'.format(cards.length, chips.join('；'))));
			}

			if (isAuto) {
				simBtns.appendChild(mkBtn('btn cbi-button cbi-button-action',
					running ? '轮询中…' : '开始自动轮询',
					busy || running,
					ui.createHandlerFn(self, function() { return doAutoStart(); })));
				simBtns.appendChild(document.createTextNode(' '));
				simBtns.appendChild(mkBtn('btn cbi-button', '停止', busy || !running,
					ui.createHandlerFn(self, function() { return doAutoStop(); })));
			}
			else {
				cards.forEach(function(c) {
					var isCur = (cur == c.n);
					simBtns.appendChild(mkBtn(
						'btn cbi-button ' + (isCur ? 'cbi-button-apply' : 'cbi-button-action'),
						(isCur ? '✓ ' : '') + '卡位 %d · %s'.format(c.n, c.name),
						busy || isCur,
						ui.createHandlerFn(self, function() { return doSwitch(c); })
					));

					simBtns.appendChild(document.createTextNode(' '));
				});
			}

			simBtns.appendChild(mkBtn('btn cbi-button', '刷新', busy,
				ui.createHandlerFn(self, function() {
					return callSimInfo().then(renderSim);
				})));
		};

		var monitor = function(maxTicks) {
			var n = 0, max = maxTicks || 240;

			var tick = function() {
				return sleep(3000).then(function() {
					return callSimInfo();
				}).then(function(si) {
					renderSim(si);
					var res = si && si.result;
					var stillRunning = (si && si.autorun == 1);

					if (res && res.state && res.state !== 'running' && !stillRunning) {
						busy = false;
						renderSim(si);
						ui.addNotification(null, E('p', {}, res.msg +
							(res.iccid ? ('（ICCID ' + res.iccid + '）') : '')),
							res.state === 'ok' ? 'info' : 'warning');
						return;
					}
					if (++n >= max) {
						busy = false;
						renderSim(si);
						ui.addNotification(null,
							E('p', {}, '等待超时，稍后点「刷新」查看结果。'), 'warning');
						return;
					}
					return tick();
				});
			};

			return tick();
		};

		var doSwitch = function(c) {
			var isAuto = (String((lastSim && lastSim.mode) === undefined ? 1 : lastSim.mode) === '0');

			var msg = ('确认切换到「卡位 %d · %s」？\n\n' +
				'切换会同时改板级开关（cpe-sel0）和模组选卡（AT^SCICHG），' +
				'然后复位模组，网络中断约 30~60 秒。\n\n').format(c.n, c.name);
			msg += isAuto
				? '当前是自动模式：读不到 SIM 会自动回滚到原卡位。'
				: '当前是手动模式：读不到卡或上不了网都**不会**自动回滚。';

			if (!confirm(msg))
				return Promise.resolve();

			busy = true;
			renderSim(lastSim);

			ui.showModal(null, E('p', { 'class': 'spinning' },
				'正在切换卡位并复位 5G 模组…'));

			return callSimSwitch(String(c.n), isAuto ? 'auto' : 'manual').then(function(r) {
				ui.hideModal();
				if (!r) {

					busy = false;
					ui.addNotification(null,
						E('p', {}, '模组无响应或超时，请稍后点「刷新」确认真实卡位。'), 'warning');
					return callSimInfo().then(renderSim);
				}
				if (r.ok !== true) {
					busy = false;
					ui.addNotification(null,
						E('p', {}, '切换失败：' + (r.msg || '未知错误')), 'error');
					return callSimInfo().then(renderSim);
				}
				if (r.same) {
					busy = false;
					ui.addNotification(null, E('p', {}, '已经是该卡位了。'), 'info');
					return callSimInfo().then(renderSim);
				}
				ui.addNotification(null, E('p', {},
					'已切到「卡位 %d」，模组正在复位，约 1 分钟出结果…'.format(c.n)), 'info');
				return monitor(120);
			}).catch(function(e) {
				ui.hideModal();
				busy = false;
				ui.addNotification(null, E('p', {}, '出错了：' + e), 'error');
				return callSimInfo().then(renderSim);
			});
		};

		var doAutoStart = function() {
			if (!confirm('开始自动轮询？\n\n' +
				'会从卡位 1 开始逐个尝试：每张卡都要改板级开关、复位模组、等注网、' +
				'再试能不能上网。期间网络会反复中断，全程可能几分钟。\n\n' +
				'全部失败会回到开始前的卡位。'))
				return Promise.resolve();

			busy = true;
			renderSim(lastSim);

			ui.showModal(null, E('p', { 'class': 'spinning' }, '正在启动自动轮询…'));

			return callSimAuto('start').then(function(r) {
				ui.hideModal();
				if (!r || r.ok !== true) {
					busy = false;
					ui.addNotification(null, E('p', {},
						'启动失败：' + ((r && r.msg) || '无响应')), 'error');
					return callSimInfo().then(renderSim);
				}
				ui.addNotification(null, E('p', {}, '自动轮询已启动，进度见上方提示。'), 'info');
				return monitor(240);
			}).catch(function(e) {
				ui.hideModal();
				busy = false;
				ui.addNotification(null, E('p', {}, '出错了：' + e), 'error');
				return callSimInfo().then(renderSim);
			});
		};

		var doAutoStop = function() {
			busy = true;
			renderSim(lastSim);
			return callSimAuto('stop').then(function() {
				busy = false;
				ui.addNotification(null, E('p', {},
					'已发送停止指令，正在跑的轮询会在当前这张卡结束后退出。'), 'info');
				return callSimInfo().then(renderSim);
			}).catch(function(e) {
				busy = false;
				ui.addNotification(null, E('p', {}, '停止失败：' + e), 'error');
				return callSimInfo().then(renderSim);
			});
		};

		renderSim(lastSim);

		poll.add(function() {
			return callSimInfo().then(function(si) {
				if (simSig(si) !== lastSig)
					renderSim(si);
				else
					lastSim = si;
			});
		}, 15);

		var atOut = E('pre', {
			'style': 'max-height:220px;overflow:auto;background:rgba(0,0,0,0.05);padding:8px;border-radius:4px'
		}, '');

		var atCmd = E('input', {
			'type': 'text',
			'class': 'cbi-input-text',
			'style': 'width:70%',
			'value': 'AT^HCSQ?',
			'placeholder': 'AT 命令，例如 AT^HCSQ? / ATI / AT+COPS?'
		});

		var runAt = function() {
			var cmd = (atCmd.value || '').trim();
			if (!cmd)
				return;
			atOut.textContent = '...';
			callAt(cmd).then(function(r) {
				atOut.textContent = (r && r.output) ? r.output : '(无应答)';
			}).catch(function(e) {
				atOut.textContent = '出错了: ' + e;
			});
		};

		return E('div', {}, [
			E('h2', {}, '5G 模组（MT5700M-CN）'),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, 'SIM 卡位'),
				simBody,
				simMode,
				simBtns,
				E('p', { 'class': 'cbi-value-description', 'style': 'margin-top:10px' },
					'卡位数量、每张卡对应哪个板级电平 / 模组 usim 值，都是运行时从' +
					'原厂的 /etc/config/cpesel（max / gval / stype）读的，没有写死。' +
					'切卡必须同时动两处：板级开关 cpe-sel0 和模组 AT^SCICHG 选卡寄存器，' +
					'只改一边会得到「未插卡」(+CME ERROR: 10)。')
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, '状态'),
				body
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, '操作'),
				E('div', { 'style': 'margin-bottom:10px' }, [

					E('button', {
						'class': 'btn cbi-button cbi-button-action',
						'click': ui.createHandlerFn(this, function() {
							return callReconnect().then(function() {
								ui.addNotification(null, E('p', {}, '已重置 wwan 接口，正在重新拨号…'), 'info');
							});
						})
					}, '重新拨号')
				])
			]),

			E('div', { 'class': 'cbi-section' }, [
				E('h3', {}, 'AT 控制台'),
				E('div', {}, [ atCmd, ' ', E('button', {
					'class': 'btn cbi-button cbi-button-action',
					'click': ui.createHandlerFn(this, runAt)
				}, '发送') ]),
				atOut
			])
		]);
	}
});
