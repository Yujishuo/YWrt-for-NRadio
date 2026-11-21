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

/*
 * 【2026-11-09 修】expect 千万不要写成 { 某个键: 默认值 }。
 *
 * LuCI 的 rpc.js 里这段：
 *     if (req.expect) {
 *         for (const key in req.expect) {
 *             if (ret != null && key != '') ret = ret[key];      // 只取第一个键
 *             if (ret == null || 类型不符) ret = req.expect[key];
 *             break;                                            // 立刻 break
 *         }
 *     }
 * 也就是说 expect 里只要有 **一个** 键，整个返回对象就会被"拆掉"，
 * 只把那个键的值 resolve 出来：
 *   - 原来 callAt 写 expect:{ output:'' }  → 拿到的是字符串，
 *     r.output === undefined → AT 控制台永远显示"(无应答)"；
 *   - 原来 callSimSwitch 写 expect:{ ok:false } → 拿到的是布尔值，
 *     r.ok === undefined → 切卡永远报"切换失败：未知错误"。
 * 空对象 {} 时循环体不执行，返回的是完整对象，字段按名字取。
 */
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

/* 卡位表**不写死**。后端 siminfo 每次都返回 cards[]：
 *   { n, name, type, sel0, usim, cur }
 * name/type 来自原厂分区 /mnt/mmcblk0p1/upper/etc/config/cpesel 的
 * max / gval / stype —— 厂商以后改卡数量、改映射，这里自动跟上。
 *   stype: 0=卡槽 1=内置移动 2=内置联通 3=内置电信 4=内置 eSIM */
function simName(si, n) {
	var cs = (si && si.cards) || [];
	for (var i = 0; i < cs.length; i++)
		if (cs[i].n == n)
			return cs[i].name;
	return '卡位 ' + n;
}

function cell(label, value) {
	/* value 可能是节点（比如信号条），直接 String() 会变成 [object HTMLSpanElement] */
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

/* 信号来自模组 ^HCSQ（AT+CSQ 在本模组固件上只回空值）：
 * NR 模式字段顺序是 RSRP / SINR / RSRQ，含义见 c2000-modem 里的注释。 */
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

/* 模组给的是 kbps；≥1 Mbps 就换算，避免显示 500000 kbps 这种数 */
function fmtRate(kbps) {
	var n = parseInt(kbps, 10);
	if (!n || n <= 0)
		return '';
	return (n >= 1000) ? (Math.round(n / 100) / 10) + ' Mbps' : n + ' kbps';
}

/* 签约速率 = 网络下发的 UE-AMBR，来自 AT^DSAMBR=<cid>
 *   未拨号 / 未注网时拿不到，显示 —
 * 注意这是「签约/授权上限」，不是当前实际吞吐。 */
function ambrText(st) {
	var a = st && st.ambr;
	if (!a || !(a.dl_kbps || a.ul_kbps))
		return '';

	var parts = [];
	if (a.dl_kbps) parts.push('↓ ' + fmtRate(a.dl_kbps));
	if (a.ul_kbps) parts.push('↑ ' + fmtRate(a.ul_kbps));

	return parts.join('　') + (a.apn ? '　（APN ' + a.apn + '）' : '');
}

/* 载波聚合 = AT^HFREQINFO? 回报的载波组数，每组一个频段
 *   rat: NR 的前缀写 n，LTE 写 B（后端用 arfcn×5==频率 判定） */
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

/* LuCI 的 E() 会把属性值直接 setAttribute，传 null 会变成字符串 "null"，
 * 所以禁用状态要显式写成 disabled="disabled"。 */
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

		/* ---------- 模组状态 ---------- */
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

		/* ---------- SIM 卡位 ---------- */
		var simBody = E('div', {}, '');
		var simMode = E('div', { 'style': 'margin:14px 0 6px' }, '');
		var simBtns = E('div', { 'style': 'margin-top:8px' }, '');
		var lastSig = '';

		/* 只在这几个值真的变了才重建 DOM，否则 10 秒一次的轮询会把用户
		 * 正在点的按钮整个换掉（点击会丢）。 */
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

			/* 模式切换 */
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

			/* 自动模式下按钮只有两个，但卡表还是列出来（只读），
			 * 让人一眼看出「现在识别到几张卡、各自什么映射」。 */
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
					/* 不能 appendChild(' ')：传字符串会抛
					 * "parameter 1 is not of type 'Node'"，整个 render 直接中断。 */
					simBtns.appendChild(document.createTextNode(' '));
				});
			}

			simBtns.appendChild(mkBtn('btn cbi-button', '刷新', busy,
				ui.createHandlerFn(self, function() {
					return callSimInfo().then(renderSim);
				})));
		};

		/* 后台干完之前按钮保持禁用，靠轮询 siminfo 收尾。
		 * 手动切一张卡约 40~90 s；自动轮询一轮要试完所有卡，可能好几分钟，
		 * 所以窗口给到 12 分钟（240 × 3s），并且自动模式要等 autorun 归 0。 */
		var monitor = function(maxTicks) {
			var n = 0, max = maxTicks || 240;

			var tick = function() {
				return sleep(3000).then(function() {
					return callSimInfo();
				}).then(function(si) {
					renderSim(si);
					var res = si && si.result;
					var stillRunning = (si && si.autorun == 1);
					/* running 表示还在试下一张，继续等 */
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

		/* 手动模式：切到用户点的卡，**不回滚**（后端 manual 分支只报告结果） */
		var doSwitch = function(c) {
			var isAuto = (String((lastSim && lastSim.mode) === undefined ? 1 : lastSim.mode) === '0');
			/* 注意括号：String.format 只作用于「紧邻的那个字符串字面量」，
			 * 不加外括号时弹窗里会出现字面的 「卡位 %d · %s」。 */
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
					/* RPC 超时/无应答时 LuCI 会给 null —— 别报「未知错误」，
					 * 让用户去刷新看实际卡位（后台可能已经在切了）。 */
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

		/* 自动模式：让后端从卡位 1 开始轮询 */
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

		/* 自动轮询可能是守护进程自己触发的（没网就找卡），页面要能跟上进度。
		 * 只在 simSig 变化时才重建 DOM，避免把用户正要点的按钮换掉。 */
		poll.add(function() {
			return callSimInfo().then(function(si) {
				if (simSig(si) !== lastSig)
					renderSim(si);
				else
					lastSim = si;
			});
		}, 15);

		/* ---------- AT 控制台 ---------- */
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
					/* 【2026-11-09】这里原来还有「下次启动：SD 系统 / 原厂系统」
					 * 两个按钮，已移除 —— 启动系统切换统一放「重启」页面
					 * （view/system/reboot.js，那边带「切换并重启」和只切换两种），
					 * 5G 模组页不该管整机启动。 */
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
