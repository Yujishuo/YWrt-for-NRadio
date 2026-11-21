'use strict';
'require baseclass';
'require vantage.fmt as fmt';
'require vantage.wifi as wifi';

/* Explainable judgements over the model: health checks, per-client
   experience, top talkers, session presence and radio insights. Every
   verdict carries a one-line reason and, where something can be done
   about it, the LuCI page that does it. Pure functions. */

var PAGES = {
	network: [ 'admin', 'network', 'network' ],
	wireless: [ 'admin', 'network', 'wireless' ],
	turboacc: [ 'admin', 'network', 'turboacc' ],
	processes: [ 'admin', 'status', 'processes' ],
	mounts: [ 'admin', 'system', 'mounts' ],
	realtime: [ 'admin', 'status', 'realtime' ]
};

var WEAK_DBM = -75;

function num(v) { v = +v; return isFinite(v) ? v : 0; }
function finite(v) { return typeof v === 'number' && isFinite(v); }
function own(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k); }
function speedLong(mbps) { return mbps >= 1000 ? _('%s Gbit/s').format(mbps / 1000) : _('%s Mbit/s').format(mbps); }
function rank(level) { return { err: 3, warn: 2, info: 1, ok: 0 }[level] || 0; }

return baseclass.extend({
	PAGES: PAGES,
	WEAK_DBM: WEAK_DBM,

	/* ------------------------------------------------------------ health */

	/* model + { cpu: { pct, cores } | null, uplinkRate: { rx, tx } | null,
	   temps: model.temps() | null }
	   (model.wired: no Wi-Fi checks)
	   -> [ { id, level, title, value, reason, detail, page } ]
	   value and reason are short enough for a health chip; detail is the
	   full sentence (tooltip / accessible description). */
	health: function(model, live) {
		model = model || {};
		live = live || {};
		var out = [], dev = model.device || {}, up = model.uplink;

		/* uplink: live traffic is the value, the negotiated link the context */
		if (!up) out.push({ id: 'uplink', level: 'err', title: _('Uplink', 'vantage'), value: _('Down', 'vantage'), reason: _('No interface with a route'),
			detail: _('No network interface with a route is up'), page: PAGES.network });
		else if (up.carrier === false) out.push({ id: 'uplink', level: 'err', title: _('Uplink', 'vantage'), value: _('No link'), reason: _('%s: no carrier').format(up.dev),
			detail: _('%s has no carrier: cable unplugged or switch port down').format(up.dev), page: PAGES.network });
		else if (up.speed && up.speed.duplex === 'half') out.push({ id: 'uplink', level: 'warn', title: _('Uplink', 'vantage'), value: _('Half duplex'), reason: _('%s · check cable').format(up.dev),
			detail: _('%s negotiated half duplex; check the cable and switch port').format(up.dev), page: PAGES.network });
		else if (up.speed && up.speed.mbps < 1000) out.push({ id: 'uplink', level: 'warn', title: _('Uplink', 'vantage'), value: _('%s Mbit/s').format(up.speed.mbps), reason: _('%s · slow link').format(up.dev),
			detail: _('%s negotiated only %d Mbit/s; a cable pair or port may be faulty').format(up.dev, up.speed.mbps), page: PAGES.network });
		else {
			var rate = live.uplinkRate && finite(live.uplinkRate.rx) && finite(live.uplinkRate.tx) ? live.uplinkRate : null;
			/* no-break spaces keep '↑ 2.9 Mbit/s' and '2.5 Gbit/s link' whole when the chip wraps */
			var link = up.speed ? _('%s link').format(speedLong(up.speed.mbps)).replace(/ /g, '\u00a0') : null;
			out.push({ id: 'uplink', level: 'ok', title: _('Uplink', 'vantage'), value: rate ? '↓ ' + fmt.bits(rate.rx) : _('Up', 'vantage'),
				/* the device name only until there is a rate (the path names it) */
				reason: [ rate ? ('↑ ' + fmt.bits(rate.tx)).replace(/ /g, '\u00a0') : up.dev, link ].filter(Boolean).join(' · '),
				detail: (up.speed ? _('%s up at %s').format(up.dev, speedLong(up.speed.mbps)) : _('%s up').format(up.dev)) +
					(up.gateway ? ', ' + _('gateway %s').format(up.gateway) : '') +
					(rate ? '; ' + _('now %s down, %s up').format(fmt.bits(rate.rx), fmt.bits(rate.tx)) : ''),
				page: PAGES.network });
		}

		/* CPU */
		var cpu = live.cpu && finite(live.cpu.pct) ? live.cpu.pct : null, cores = (live.cpu && live.cpu.cores && live.cpu.cores.length) || 1;
		var load = (dev.load || [])[0];
		/* the hottest sensor, when the device has any */
		var hot = live.temps && live.temps[0] ? fmt.celsius(live.temps[0].celsius) : null;
		if (cpu == null) out.push({ id: 'cpu', level: 'info', title: _('CPU', 'vantage'), value: fmt.DASH, reason: _('Measuring…'), detail: _('Measuring over the next poll'), page: PAGES.processes });
		else out.push({ id: 'cpu', level: cpu >= 90 ? 'err' : cpu >= 70 ? 'warn' : 'ok', title: _('CPU', 'vantage'), value: fmt.pct(cpu),
			reason: (cpu >= 70 ? _('Busy · load %s').format(fmt.load(load)) : fmt.N_(cores, 'Load %s · %d core', 'Load %s · %d cores').format(fmt.load(load), cores)) + (hot ? ' · ' + hot : ''),
			detail: (cpu >= 70 ? fmt.N_(cores, 'Busy; load %s on %d core; see the busiest processes', 'Busy; load %s on %d cores; see the busiest processes').format(fmt.load(load), cores)
				: fmt.N_(cores, 'Load %s on %d core', 'Load %s on %d cores').format(fmt.load(load), cores)) +
				(hot ? ' · ' + _('Temperature %s').format(hot) : ''),
			page: PAGES.processes });

		/* memory, framed as available (as in the System tile) */
		var mem = dev.memory;
		if (mem) {
			var avail = finite(mem.availPct) ? mem.availPct : 100 - num(mem.usedPct);
			out.push({ id: 'memory', level: mem.usedPct >= 90 ? 'err' : mem.usedPct >= 80 ? 'warn' : 'ok', title: _('Memory'), value: _('%s available', 'vantage').format(fmt.pct(avail)),
				reason: _('%s of %s').format(fmt.bytes(mem.available), fmt.bytes(mem.total)),
				detail: _('%s of %s available (%s in use)').format(fmt.bytes(mem.available), fmt.bytes(mem.total), fmt.pct(mem.usedPct)), page: PAGES.processes });
		}

		/* the radios; not applicable to a wired-only device */
		if (!model.wired) this.wifiHealth(model, out, live.quiet);

		/* HNAT: the conversations the packet engines forward in hardware.
		   The binding count is the one honest figure -- a bound flow's
		   packets never reach the CPU -- so 0 says offload is not working,
		   whatever the entries' byte counters say. Left out (no card) where
		   there is no debugfs to answer from, e.g. a device without the
		   driver: an absent PPE is not "zero flows". */
		var hn = live.hnat;
		if (hn && typeof hn === 'object' && hn.present === true) {
			var ppe = Array.isArray(hn.ppe) ? hn.ppe : [], bind = finite(hn.bind) ? hn.bind : 0;
			var slots = finite(hn.slots) ? hn.slots : 0;
			/* the share of what could be offloaded that is: established
			   forwarded conversations, two entries each (down and up land
			   in different engines). The whole connection table is the
			   wrong yardstick -- it is mostly DNS one-shots, TIME_WAIT
			   debris and one-way scans, which made a perfectly working
			   offload read as 2%. The per-engine split is the card's
			   picture (overview.ppePicture), not its text. */
			var usable = finite(hn.usable) ? hn.usable : 0;
			var flows = finite(hn.flows) ? hn.flows : 0;
			/* known: the table could be read; with nothing forwardable the
			   share is 0 %, not "unknown" */
			var frac = finite(hn.flows) ? (usable > 0 ? bind / usable : 0) : null;
			var pctText = frac == null ? null : fmt.pct(Math.min(frac, 1) * 100, frac < 0.1 ? 1 : 0);
			var reason = (frac != null) ? _('%s of forwarded flows').format(pctText)
				: ppe.length ? _('%s table slots').format(fmt.count(slots))
				: _('No packet engine answered', 'vantage');
			if (hn.enabled === false) out.push({ id: 'hnat', level: 'warn', title: 'HNAT', value: _('Off', 'vantage'),
				reason: _('hook_toggle is 0'),
				detail: _('Hardware offload is switched off: every packet goes through the CPU'), page: PAGES.turboacc });
			else out.push({ id: 'hnat', level: bind > 0 ? 'ok' : 'info', title: 'HNAT',
				value: bind > 0 ? fmt.N_(bind, '%d flow', '%d flows').format(bind) : _('Nothing bound', 'vantage'),
				reason: reason,
				detail: bind > 0
					? fmt.N_(bind, '%d conversation is forwarded in hardware; its packets do not reach the CPU',
						'%d conversations are forwarded in hardware; their packets do not reach the CPU').format(bind)
						+ (flows > 0 ? ' · ' + _('%s forwarded connections').format(fmt.count(flows)) : '')
					: _('No conversation is offloaded right now: idle, or a protocol the PPE does not take'),
				page: PAGES.turboacc });
		}

		/* storage */
		var root = (dev.storage || [])[0];
		if (root) out.push({ id: 'storage', level: root.usedPct >= 95 ? 'err' : root.usedPct >= 85 ? 'warn' : 'ok', title: _('Storage'), value: _('%s used').format(fmt.pct(root.usedPct)),
			reason: _('%s free').format(fmt.bytes(root.free)), detail: _('%s free on the overlay (%s used)').format(fmt.bytes(root.free), fmt.pct(root.usedPct)), page: PAGES.mounts });

		return out;
	},

	/* the Wi-Fi and Signal checks, appended to out; an SSID without
	   clients is idle, not a fault */
	wifiHealth: function(model, out, quietMacs) {
		var radios = model.radios || [], nSsid = (model.ssids || []).length;
		var off = radios.filter(function(r) { return r.disabled; }), down = radios.filter(function(r) { return !r.disabled && !r.up; });
		var idle = (model.ssids || []).filter(function(s) { return s.up && !s.clients; });
		if (!radios.length) out.push({ id: 'radios', level: 'info', title: _('Wi-Fi'), value: _('None'), reason: _('No radios reported'), detail: _('This device reports no radios'), page: PAGES.wireless });
		else if (down.length) out.push({ id: 'radios', level: 'err', title: _('Wi-Fi'), value: fmt.N_(down.length, '%d radio down', '%d radios down').format(down.length), reason: _('%s is not up').format(down[0].bandLabel),
			detail: _('%s (%s) is enabled but not up').format(down[0].id, down[0].bandLabel), page: PAGES.wireless });
		/* a radio switched off in the configuration is a choice, not a
		   fault: shown, never tinted or counted as needing attention */
		else if (off.length) out.push({ id: 'radios', level: 'info', title: _('Wi-Fi'), value: fmt.N_(off.length, '%d radio off', '%d radios off').format(off.length), reason: _('%s is disabled').format(off[0].bandLabel),
			detail: _('%s (%s) is disabled').format(off[0].id, off[0].bandLabel), page: PAGES.wireless });
		else out.push({ id: 'radios', level: 'ok', title: _('Wi-Fi'), value: fmt.N_(radios.length, '%d radio up', '%d radios up').format(radios.length),
			reason: idle.length ? fmt.N_(nSsid, '%d SSID · %d idle', '%d SSIDs · %d idle').format(nSsid, idle.length) : fmt.N_(nSsid, '%d SSID on air', '%d SSIDs on air').format(nSsid),
			detail: idle.length ? fmt.N_(nSsid, '%d SSID broadcasting, %d idle', '%d SSIDs broadcasting, %d idle').format(nSsid, idle.length) : fmt.N_(nSsid, '%d SSID broadcasting', '%d SSIDs broadcasting').format(nSsid),
			page: PAGES.wireless });
	},

	/* -> { level, count (warn+err), headline } */
	summary: function(checks) {
		var worst = 'ok', n = 0;
		(checks || []).forEach(function(c) {
			if (rank(c.level) > rank(worst)) worst = c.level;
			if (c.level === 'warn' || c.level === 'err') n++;
		});
		var headline = n === 0 ? _('Everything looks healthy') : n === 1 ? _('1 thing needs attention') : _('%d things need attention').format(n);
		return { level: worst === 'info' ? 'ok' : worst, count: n, headline: headline };
	},

	/* -------------------------------------------------------- experience */

	/* Per-client experience 0..100 from signal, link rate, delivery
	   failures and the generation gap to the radio. The explanation is
	   the factor that cost the most. -> { score, grade, level, reason, short, factors } */
	experience: function(c) {
		c = c || {};
		var factors = [], s = c.signal;
		if (s == null) factors.push({ cost: 0, text: _('Signal not reported'), short: _('Signal not reported') });
		else if (s < -80) factors.push({ cost: 70, text: _('Very weak signal %s; expect drops').format(fmt.dbm(s)), short: _('Very weak signal; expect drops') });
		else if (s < WEAK_DBM) factors.push({ cost: 55, text: _('Weak signal %s; may roam poorly').format(fmt.dbm(s)), short: _('Weak signal') });
		else if (s < -67) factors.push({ cost: 30, text: _('Fair signal %s; lower rates at range').format(fmt.dbm(s)), short: _('Fair signal') });
		else if (s < -60) factors.push({ cost: 10, text: _('Good signal %s').format(fmt.dbm(s)), short: _('Good signal') });

		var best = Math.max(c.rx && c.rx.rate || 0, c.tx && c.tx.rate || 0);
		var active = c.inactive == null || c.inactive < 10000;
		if (best > 0 && best < 20000 && active && s != null && s >= -70)
			factors.push({ cost: 20, text: _('Low link rate %s despite good signal; interference or an old device').format(fmt.phyRate(best)), short: _('Low link rate for its signal') });

		var sent = num(c.txPackets) + num(c.txFailed);
		if (sent >= 200) {
			var fail = num(c.txFailed) / sent * 100;
			if (fail >= 10) factors.push({ cost: 25, text: _('%s of frames to the device fail; interference likely').format(fmt.pct(fail)), short: _('%s of frames fail').format(fmt.pct(fail)) });
			else if (fail >= 4) factors.push({ cost: 10, text: _('%s of frames to the device fail').format(fmt.pct(fail)), short: _('%s of frames fail').format(fmt.pct(fail)) });
		}

		if (c.legacyOnRadio)
			factors.push({ cost: 5, text: _('%s device on a newer radio; uses more airtime per byte').format(c.gen === 'legacy' ? _('Legacy', 'vantage') : c.gen),
				short: _('Older %s device').format(c.gen === 'legacy' ? _('legacy') : c.gen) });

		var cost = factors.reduce(function(a, f) { return a + f.cost; }, 0);
		var score = Math.max(0, Math.min(100, 100 - cost));
		var grade = score >= 85 ? _('Excellent', 'vantage') : score >= 65 ? _('Good', 'vantage') : score >= 40 ? _('Fair', 'vantage') : _('Poor', 'vantage');
		var level = score >= 65 ? 'ok' : score >= 40 ? 'warn' : 'err';
		var worst = factors.slice().sort(function(a, b) { return b.cost - a.cost; })[0];
		var reason = (worst && worst.cost > 0) ? worst.text
			: (s != null ? _('Strong signal %s, %s link').format(fmt.dbm(s), fmt.phyRate(best)) : _('No problems detected'));
		var short = (worst && worst.cost > 0) ? worst.short
			: (s != null ? (best > 0 ? _('Strong signal, %s').format(fmt.phyRate(best)) : _('Strong signal')) : _('No problems detected'));
		return { score: score, grade: grade, level: level, reason: reason, short: short, factors: factors };
	},

	/* ------------------------------------------------------ top talkers */

	/* clients + rates { mac: { rx, tx } } (AP view: tx = to the client)
	   -> top n [ { mac, name, down, up, total, share } ] with total > 0 */
	topTalkers: function(clients, rates, n) {
		var list = [], sum = 0;
		(clients || []).forEach(function(c) {
			var r = own(rates, c.mac) ? rates[c.mac] : null;
			if (!r) return;
			var down = num(r.tx), up = num(r.rx), total = down + up;
			if (!(total > 0)) return;
			sum += total;
			list.push({ mac: c.mac, name: c.name, down: down, up: up, total: total });
		});
		list.sort(function(a, b) { return b.total - a.total || (a.mac < b.mac ? -1 : 1); });
		list.forEach(function(t) { t.share = sum > 0 ? t.total / sum : 0; });
		return list.slice(0, n > 0 ? n : 5);
	},

	/* --------------------------------------------------------- presence */

	/* Session presence. state: { baseline: [macs] | null, present: { mac: client },
	   gone: { mac: { client, at } }, firstSeen: { mac: ms } }.
	   The first call fixes the baseline (what was there when the page
	   opened); later arrivals are "new". Stations that leave are kept as
	   gone for keepMs. -> { state, isNew: { mac: true }, gone: [ { client, at } ] } */
	presence: function(state, clients, now, keepMs) {
		state = state || {};
		var baseline = Array.isArray(state.baseline) ? state.baseline : null;
		var present = Object.create(null), gone = Object.create(null), firstSeen = Object.create(null), isNew = Object.create(null);
		var prevPresent = state.present || {}, prevGone = state.gone || {}, prevFirst = state.firstSeen || {};

		(clients || []).forEach(function(c) {
			present[c.mac] = c;
			firstSeen[c.mac] = own(prevFirst, c.mac) ? prevFirst[c.mac] : now;
			if (baseline && baseline.indexOf(c.mac) < 0) isNew[c.mac] = true;
		});
		Object.keys(prevGone).forEach(function(mac) {
			var g = prevGone[mac];
			if (!own(present, mac) && g && now - g.at < keepMs) { gone[mac] = g; firstSeen[mac] = prevFirst[mac]; }
		});
		Object.keys(prevPresent).forEach(function(mac) {
			if (!own(present, mac)) { gone[mac] = { client: prevPresent[mac], at: now }; firstSeen[mac] = prevFirst[mac]; }
		});

		var goneList = Object.keys(gone).map(function(k) { return gone[k]; }).sort(function(a, b) { return b.at - a.at; });
		return {
			state: { baseline: baseline || Object.keys(present), present: present, gone: gone, firstSeen: firstSeen },
			isNew: isNew,
			gone: goneList
		};
	},

	/* ---------------------------------------------------------- radios */

	/* radios + per-radio rates { id: { rx, tx } } -> { id: { busiest, share, notes: [ { level, text } ] } } */
	radioInsights: function(radios, rates) {
		var out = {}, sum = 0, top = null, topV = 0;
		(radios || []).forEach(function(r) {
			var v = own(rates, r.id) ? num(rates[r.id].rx) + num(rates[r.id].tx) : 0;
			sum += v;
			if (v > topV) { topV = v; top = r.id; }
		});
		(radios || []).forEach(function(r) {
			var v = own(rates, r.id) ? num(rates[r.id].rx) + num(rates[r.id].tx) : 0;
			var notes = [];
			if (r.disabled) notes.push({ level: 'info', text: _('Radio is disabled') });
			else if (!r.up) notes.push({ level: 'err', text: _('Radio is enabled but not up') });
			if (top === r.id && sum > 0 && (radios.length > 1)) notes.push({ level: 'info', text: _('Busiest radio: %s of Wi-Fi traffic').format(fmt.pct(v / sum * 100)) });
			if (r.legacy) notes.push({ level: 'info', text: r.legacy === 1 ? _('1 older device (Wi-Fi 4 or earlier) slows airtime') : _('%d older devices (Wi-Fi 4 or earlier) slow airtime').format(r.legacy) });
			out[r.id] = { busiest: top === r.id && sum > 0, share: sum > 0 ? v / sum : 0, notes: notes };
		});
		return out;
	}
});
