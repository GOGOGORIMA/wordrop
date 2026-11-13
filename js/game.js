/* WORDROP — ゲーム進行と画面
 * 状態は S ひとつ。時間は requestAnimationFrame のループひとつで進め、
 * 起きることはすべて「何ヶ月目に何が起きるか」を並べたキュー S.queue に入れて順に発火する。
 * モーダルや AI 通信の待ちは holds に理由を入れて表し、holds が空でないあいだ時間は止まる。 */
(function () {
  const $ = (id) => document.getElementById(id);
  const AI = WD.AI;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ================= 状態 ================= */
  const S = {
    phase: 'draft', // draft | play | ended
    era: null,
    params: { population: 50, technology: 50, order: 50 },
    month: 0,       // 開始からの経過月数（処理済み）
    frac: 0,        // 次の月までの進み具合（0〜1）
    speed: 1,
    century: 0,
    oracles: WD.ORACLES,
    lockUntil: -1,  // この月になるまで次の神託は投下できない
    queue: [],      // { at, type: main | murmur | opa | history, ... }
    drops: [],      // { word, title, date, century, fired: [text] }
    historyDone: [],
  };
  const holds = new Set();
  const running = () => S.phase === 'play' && holds.size === 0 && S.speed > 0;
  const island = new WD.Island($('world'));

  const dateAt = (m) => ({ year: S.era.year + Math.floor(m / 12), month: (m % 12) + 1 });
  const fmt = (d) => WD.fmtYear(d.year) + d.month + '月';
  const span = (months) => (months >= 12 ? Math.floor(months / 12) + '年' : '') + (months % 12 ? (months % 12) + 'ヶ月' : '');

  /* ================= モーダル ================= */
  function openModal(id) { $(id).hidden = false; holds.add(id); }
  function closeModal(id) { $(id).hidden = true; holds.delete(id); }
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t.timer);
    t.timer = setTimeout(() => (t.hidden = true), 3200);
  }
  function setBusy(text) { $('busy').hidden = !text; if (text) $('busy').textContent = '⌛ ' + text; }

  /* ================= 時間のループ ================= */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (running()) {
      S.frac += (dt * S.speed) / WD.SECONDS_PER_MONTH;
      while (S.frac >= 1 && running()) { S.frac -= 1; advance(); }
    }
    island.timeScale = running() ? S.speed : 0;
    island.update(dt);
    island.render();
    renderStatus();
    requestAnimationFrame(frame);
  }

  // 1ヶ月進める：季節・島の発展・予定された出来事
  function advance() {
    S.month++;
    island.setSeason(WD.seasonOf(dateAt(S.month).month));
    island.grow(S.params);
    settle();
  }
  // 期限の来た出来事を順に起こし、100年の区切りに達していれば止める
  function settle() {
    while (S.phase === 'play' && holds.size === 0 && S.queue.length && S.queue[0].at <= S.month) fire(S.queue.shift());
    if (S.phase === 'play' && holds.size === 0 && S.month >= (S.century + 1) * WD.CENTURY_MONTHS) openCentury();
  }
  const ORDER = { history: 0, main: 1, opa: 2, murmur: 3 };
  function enqueue(ev) {
    S.queue.push(ev);
    S.queue.sort((a, b) => a.at - b.at || ORDER[a.type] - ORDER[b.type]);
  }

  function skip() {
    if (S.phase !== 'play' || holds.size) return;
    const end = (S.century + 1) * WD.CENTURY_MONTHS;
    const next = S.queue.find((e) => e.type !== 'murmur');
    let target = Math.min(next ? next.at : end, end);
    if (target <= S.month) target = S.month + 1;
    while (S.month < target && S.phase === 'play' && holds.size === 0) advance();
    S.frac = 0;
  }
  function setSpeed(s) {
    S.speed = s;
    document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('on', +b.dataset.speed === s));
  }

  /* ================= 出来事 ================= */
  function fire(ev) {
    const drop = S.drops[ev.drop];
    if (ev.type === 'main') {
      applyDelta(ev.delta);
      drop.fired.push(ev.text);
      addLog('main', ev.text, drop.word);
      island.say(ev.say);
      checkCollapse(ev.text);
    } else if (ev.type === 'murmur') {
      addLog('murmur', ev.text);
      island.say(ev.say);
    } else if (ev.type === 'opa') {
      const at = island.spawnOpa(ev.kind);
      addLog('opa', ev.text, drop.word);
      island.say(ev.say, at || undefined);
    } else if (ev.type === 'history') {
      fireHistory(ev);
    }
  }

  function applyDelta(d) {
    for (const p of WD.PARAMS) S.params[p.key] += d[p.key] || 0;
    renderParams();
  }
  function checkCollapse(trigger) {
    const broken = WD.PARAMS.find((p) => S.params[p.key] <= 0 || S.params[p.key] >= 100);
    if (broken) collapse(broken, trigger);
    return !!broken;
  }

  function addLog(type, text, tag, title) {
    const li = document.createElement('li');
    li.className = type + ' fresh';
    const when = document.createElement('span');
    when.className = 'when';
    when.textContent = fmt(dateAt(S.month));
    if (tag) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = tag; when.appendChild(t); }
    li.appendChild(when);
    if (title) { const b = document.createElement('b'); b.textContent = title; li.appendChild(b); }
    li.appendChild(document.createTextNode(text));
    const log = $('log');
    log.prepend(li);
    setTimeout(() => li.classList.remove('fresh'), 2000);
    while (log.children.length > 300) log.lastChild.remove();
    $('log-empty').hidden = true;
  }

  const dropsForAI = () => S.drops.map((d) => ({ word: d.word, title: d.title, date: d.date, recent: d.fired.slice(-3) }));

  /* ---------- 神託（単語の投下） ---------- */
  function canDrop() { return S.phase === 'play' && holds.size === 0 && S.oracles > 0 && S.lockUntil <= S.month; }
  async function drop(word) {
    word = word.trim().replace(/\s+/g, ' ');
    if (!canDrop()) return;
    const len = Array.from(word).length;
    if (!len) { toast('単語を入力してください'); return; }
    if (len > WD.MAX_WORD) { toast(WD.MAX_WORD + '文字以内で入力してください'); return; }
    holds.add('ai');
    setBusy('「' + word + '」の歴史を演算中…');
    $('word').value = '';
    island.dropWord(word);
    const date = dateAt(S.month);
    const ctx = { era: S.era, date, elapsed: S.month, params: { ...S.params }, drops: dropsForAI(), word };
    const r = await request({ task: '「' + word + '」による歴史改変（15〜30年分）', cancel: 'この神託を取り消す' }, () => AI.drop(ctx), 1300);
    holds.delete('ai');
    setBusy('');
    if (S.phase !== 'play') return;
    if (!r) { $('word').value = word; return; } // 取り消し：神託は減らない
    const i = S.drops.length, m0 = S.month;
    S.drops.push({ word, title: r.title, date, century: S.century, fired: [] });
    S.oracles--;
    S.lockUntil = m0 + WD.LOCK_MONTHS;
    for (const e of r.events) enqueue({ type: 'main', at: m0 + e.year * 12, drop: i, text: e.text, say: e.say, delta: e.delta });
    for (const m of r.murmurs) enqueue({ type: 'murmur', at: m0 + m.after, drop: i, text: m.text, say: m.say });
    for (const o of r.opa) enqueue({ type: 'opa', at: m0 + o.after, drop: i, kind: o.type, text: o.text, say: o.say });
    settle(); // 投下直後の出来事はすぐ起きる
  }

  /* ---------- 史実の大事件 ---------- */
  async function fireHistory(ev) {
    holds.add('ai');
    const date = dateAt(S.month);
    island.alert();
    $('hist-alert').textContent = '⚠ ' + fmt(date) + '　史実『' + ev.name + '』';
    $('hist-alert').hidden = false;
    const ctx = { era: S.era, date, event: ev, params: { ...S.params }, drops: dropsForAI() };
    const r = await request({ task: '史実『' + ev.name + '』の歪み', cancel: 'この史実を見送る' }, () => AI.history(ctx), 1500);
    holds.delete('ai');
    $('hist-alert').hidden = true;
    if (S.phase !== 'play') return;
    if (r) {
      S.historyDone.push({ year: date.year, name: ev.name, title: r.title });
      applyDelta(r.delta);
      addLog('history', r.text, '史実：' + ev.name, r.title);
      island.say(r.say);
      if (checkCollapse('史実『' + ev.name + '』→「' + r.title + '」' + r.text)) return;
    }
    settle();
  }

  /* ---------- 100年の区切り ---------- */
  function openCentury() {
    const c = S.century, y0 = dateAt(c * WD.CENTURY_MONTHS).year, y1 = dateAt(S.month).year;
    $('cen-title').textContent = '第' + (c + 1) + '世紀が終わった';
    $('cen-sub').textContent = S.era.name + '（' + S.era.place + '）　' + WD.fmtYear(y0) + '〜' + WD.fmtYear(y1);
    fillFacts($('cen-drops'), c);
    $('cen-params').innerHTML = '';
    for (const p of WD.PARAMS) {
      const s = document.createElement('span');
      s.textContent = p.name + ' ' + S.params[p.key];
      $('cen-params').appendChild(s);
    }
    openModal('m-century');
  }
  function fillFacts(ul, century) {
    ul.innerHTML = '';
    const rows = S.drops.filter((d) => century === undefined || d.century === century)
      .map((d) => fmt(d.date) + '「' + d.word + '」→ ' + d.title)
      .concat(S.historyDone.map((h) => WD.fmtYear(h.year) + ' 史実『' + h.name + '』→「' + h.title + '」'));
    if (!rows.length) rows.push('神託は一度も下されなかった');
    for (const t of rows) { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); }
  }
  function continueCentury() {
    closeModal('m-century');
    S.century++;
    S.oracles = WD.ORACLES;
    toast('神託が★★★に回復した。第' + (S.century + 1) + '世紀へ');
  }

  /* ---------- 結末 ---------- */
  async function finale() {
    closeModal('m-century');
    holds.add('ai');
    setBusy('2026年の歴史教科書を編纂中…');
    const ctx = { era: S.era, date: dateAt(S.month), centuries: S.century + 1, params: { ...S.params }, drops: dropsForAI(), history: S.historyDone };
    const r = await request({ task: '2026年の歴史教科書', cancel: '100年の区切りに戻る' }, () => AI.finale(ctx), 800);
    holds.delete('ai');
    setBusy('');
    if (!r) { openModal('m-century'); return; }
    S.phase = 'ended';
    showResult({ kind: 'textbook', label: '2026年 歴史教科書', title: r.title || S.era.name + 'の歴史', heading: r.chapter, body: r.body, sns: r.sns, snap: island.snapshot(520, 627) });
  }

  async function collapse(broken, trigger) {
    S.phase = 'ended';
    const date = dateAt(S.month), value = S.params[broken.key];
    island.collapse();
    await sleep(900);
    const snap = island.snapshot(520, 627);
    const ctx = { era: S.era, date, broken: { name: broken.name, value }, trigger, params: { ...S.params }, drops: dropsForAI() };
    const r = await request({ task: '滅亡調査報告書', cancel: '本文なしで報告書を表示' }, () => AI.report(ctx), 600);
    showResult({
      kind: 'report', label: '時空省 滅亡調査報告書',
      title: r ? r.title : '文明崩壊',
      heading: fmt(date) + '　' + broken.name + (value <= 0 ? 'が0に到達' : 'が100に到達'),
      body: r ? r.body : '', sns: r ? r.sns : '', snap,
    });
  }

  let result = null;
  function showResult(data) {
    result = data;
    $('result-sheet').classList.toggle('report', data.kind === 'report');
    $('res-label').textContent = data.label;
    $('res-title').textContent = data.title;
    $('res-heading').textContent = data.heading;
    $('res-body').textContent = data.body;
    $('res-body').hidden = !data.body;
    $('res-image').src = data.snap.toDataURL();
    fillFacts($('res-facts'));
    $('res-sns').value = data.sns;
    shareLink();
    openModal('m-result');
  }
  function shareLink() { $('res-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent($('res-sns').value); }
  async function saveImage() {
    try {
      const blob = await WD.Card.blob({
        kind: result.kind, label: result.label, title: result.title, heading: result.heading, body: result.body,
        footer: S.era.name + '／' + S.drops.map((d) => '「' + d.word + '」').join(''), snapshot: result.snap,
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'wordrop-' + (result.kind === 'report' ? 'report' : 'textbook') + '.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast('画像を保存しました。X の投稿に添付できます');
    } catch (e) { toast('画像を保存できませんでした：' + e.message); }
  }

  /* ================= AI 通信とエラーモーダル ================= */
  const KIND = {
    config: '設定不足（URL 未設定）', http: 'HTTP エラー', network: '通信不能（ネットワーク／CORS）', timeout: 'タイムアウト',
    parse: 'JSON の解析失敗', format: '応答 JSON の形式エラー', blocked: 'Gemini による生成拒否',
  };
  let pendingError = null; // { info, err, resolve }
  // 成功するまで AI を呼ぶ。中止なら null（代わりの文章は作らない）
  async function request(info, fn, minMs) {
    const until = performance.now() + (minMs || 0);
    for (;;) {
      try {
        const r = await fn();
        const left = until - performance.now();
        if (left > 0) await sleep(left);
        return r;
      } catch (err) {
        const choice = await new Promise((resolve) => { pendingError = { info, err, resolve }; showError(); });
        if (choice !== 'retry') return null;
      }
    }
  }
  function showError() {
    const { info, err } = pendingError, st = AI.status;
    $('err-task').textContent = info.task;
    $('err-route').textContent = AI.routeLabel(st.route) + (st.route === 'direct' ? '（' + AI.settings.model + '）' : '（' + WD.ENDPOINT + '）');
    $('err-kind').textContent = KIND[err.kind] || err.kind || '不明';
    $('err-message').textContent = err.message;
    $('err-detail').textContent = err.detail || '';
    $('err-detail').hidden = !err.detail;
    $('err-cancel').textContent = info.cancel;
    openModal('m-error');
    $('err-retry').focus();
  }
  function answerError(choice) {
    const p = pendingError;
    pendingError = null;
    closeModal('m-error');
    if (p) p.resolve(choice);
  }

  /* ---------- AI 通信設定 ---------- */
  function paintAI() {
    const st = AI.status, label = { idle: '未通信', pending: '通信中', ok: '成功', error: 'エラー' }[st.state];
    $('ai-dot').className = 'dot ' + st.state;
    $('btn-ai').title = 'AI通信設定（' + AI.routeLabel(st.state === 'idle' ? AI.route() : st.route) + '｜' + label + '）';
    $('api-status').textContent = '現在の経路：' + AI.routeLabel(AI.route()) + '\n直近の通信：' + label + (st.error ? '（' + st.error.message + '）' : '');
  }
  function openSettings() {
    $('endpoint').textContent = WD.ENDPOINT;
    $('api-key').value = AI.settings.apiKey;
    $('api-model').value = AI.settings.model;
    paintAI();
    openModal('m-settings');
  }
  function closeSettings() {
    closeModal('m-settings');
    if (pendingError) showError(); // エラーから開いたときは、エラーモーダルに戻る
  }

  /* ================= 画面の表示 ================= */
  function buildParams() {
    $('params').innerHTML = '';
    for (const p of WD.PARAMS) {
      const row = document.createElement('div');
      row.className = 'param';
      row.id = 'p-' + p.key;
      row.innerHTML = '<span></span><div class="meter"><i></i></div><b></b>';
      row.querySelector('span').textContent = p.name;
      row.querySelector('span').style.color = p.color;
      row.querySelector('i').style.background = p.color;
      $('params').appendChild(row);
    }
  }
  function renderParams() {
    for (const p of WD.PARAMS) {
      const v = S.params[p.key], row = $('p-' + p.key);
      row.querySelector('i').style.width = clamp(v, 0, 100) + '%';
      row.querySelector('b').textContent = v;
      row.classList.toggle('danger', v <= 15 || v >= 85);
    }
  }

  let shown = '';
  function renderStatus() {
    if (!S.era) return;
    const locked = S.lockUntil > S.month, busy = holds.has('ai');
    const key = [S.month, S.century, S.oracles, S.lockUntil, S.phase, busy, holds.size].join('|');
    if (key === shown) return;
    shown = key;
    const d = dateAt(S.month), inC = clamp(S.month - S.century * WD.CENTURY_MONTHS, 0, WD.CENTURY_MONTHS);
    $('date').textContent = fmt(d);
    $('season').textContent = WD.SEASONS[WD.seasonOf(d.month)];
    $('century').textContent = '第' + (S.century + 1) + '世紀';
    $('elapsed').textContent = '経過 ' + Math.floor(inC / 12) + '年 / 100年';
    $('elapsed-bar').style.width = (inC / WD.CENTURY_MONTHS) * 100 + '%';
    $('stars').textContent = '★'.repeat(S.oracles) + '☆'.repeat(WD.ORACLES - S.oracles);
    const out = S.oracles <= 0;
    $('drop-form').hidden = out || locked;
    $('lock').hidden = !(out || locked);
    if (out) {
      $('lock-text').textContent = '🔒 この100年の神託は使い切った（次の100年で回復）';
      $('lock-bar').style.width = '0%';
    } else if (locked) {
      const left = S.lockUntil - S.month;
      $('lock-text').textContent = '🔒 次の神託まで あと' + span(left);
      $('lock-bar').style.width = ((WD.LOCK_MONTHS - left) / WD.LOCK_MONTHS) * 100 + '%';
    }
    const playing = S.phase === 'play';
    $('drop').disabled = !playing || busy;
    $('word').disabled = !playing || busy;
    document.querySelectorAll('[data-speed], #skip').forEach((b) => (b.disabled = !playing));
  }

  /* ================= 開始 ================= */
  function openDraft() {
    const pool = WD.ERAS.slice(), picks = [];
    while (picks.length < 3) picks.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    const box = $('draft-cards');
    box.innerHTML = '';
    for (const era of picks) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'era-card';
      b.innerHTML = '<span class="meta-line"><span class="region"></span><span class="year"></span></span><span class="name"></span><span class="desc"></span><span class="mods"></span><span class="go">この時代から始める ▶</span>';
      b.querySelector('.region').textContent = (era.region === 'japan' ? '日本史' : '世界史') + '／' + era.place;
      b.querySelector('.year').textContent = era.yearLabel;
      b.querySelector('.name').textContent = era.name + '（' + era.sub + '）';
      b.querySelector('.desc').textContent = era.desc;
      b.querySelector('.mods').textContent = '開始：' + WD.fmtYear(era.year) + '1月　史実の大事件 ' + era.history.length + '件';
      b.addEventListener('click', () => start(era));
      box.appendChild(b);
    }
    $('m-draft').hidden = false;
  }

  function start(era) {
    $('m-draft').hidden = true;
    S.era = era;
    for (const p of WD.PARAMS) S.params[p.key] = clamp(50 + (era.mod[p.key] || 0), 10, 90);
    island.generate(era);
    island.setSeason(WD.seasonOf(1));
    island.settle(S.params);
    island.resetView();
    for (const [y, m, name, fact] of era.history) enqueue({ type: 'history', at: y * 12 + (m - 1), name, fact });
    $('era-name').textContent = era.name + '（' + era.sub + '）';
    $('era-sub').textContent = era.place + '／' + era.desc;
    S.phase = 'play';
    setSpeed(1);
    renderParams();
  }

  /* ================= 操作 ================= */
  function bind() {
    $('drop-form').addEventListener('submit', (e) => { e.preventDefault(); drop($('word').value); });
    $('word').addEventListener('input', () => {
      const chars = Array.from($('word').value);
      if (chars.length > WD.MAX_WORD) $('word').value = chars.slice(0, WD.MAX_WORD).join('');
    });
    document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => setSpeed(+b.dataset.speed)));
    $('skip').addEventListener('click', skip);
    document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
      const z = b.dataset.zoom;
      if (z === 'reset') island.resetView(); else island.zoomAt(z === 'in' ? 1.3 : 1 / 1.3);
    }));
    $('btn-ai').addEventListener('click', openSettings);
    $('show-key').addEventListener('click', () => {
      const i = $('api-key');
      i.type = i.type === 'password' ? 'text' : 'password';
      $('show-key').textContent = i.type === 'password' ? '表示' : '隠す';
    });
    $('save-settings').addEventListener('click', () => {
      AI.saveSettings($('api-key').value, $('api-model').value);
      paintAI();
      toast('通信経路：' + AI.routeLabel(AI.route()));
      closeSettings();
    });
    $('close-settings').addEventListener('click', closeSettings);
    $('test-api').addEventListener('click', async () => {
      const s = { apiKey: $('api-key').value.trim(), model: $('api-model').value.trim() || WD.DEFAULT_MODEL };
      const label = AI.routeLabel(AI.route(s));
      $('api-status').textContent = label + 'で接続中…';
      try {
        await AI.test(s);
        $('api-status').textContent = '✔ 接続成功（' + label + '）';
      } catch (e) {
        $('api-status').textContent = '✖ 接続失敗（' + label + '）：' + e.message + (e.detail ? '\n' + e.detail : '');
      }
    });
    $('err-retry').addEventListener('click', () => answerError('retry'));
    $('err-cancel').addEventListener('click', () => answerError('cancel'));
    $('err-settings').addEventListener('click', () => { closeModal('m-error'); openSettings(); });
    $('cen-finish').addEventListener('click', finale);
    $('cen-continue').addEventListener('click', continueCentury);
    $('res-sns').addEventListener('input', shareLink);
    $('res-save').addEventListener('click', saveImage);
    $('res-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('res-sns').value); toast('コピーしました'); } catch (e) { $('res-sns').select(); }
    });
    $('res-again').addEventListener('click', () => location.reload());
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea') || holds.size || S.phase !== 'play') return;
      if (e.key === ' ') { e.preventDefault(); setSpeed(S.speed ? 0 : 1); }
      if (e.key === 's' || e.key === 'S') skip();
    });
    window.addEventListener('beforeunload', (e) => { if (S.phase === 'play' && S.month > 0) { e.preventDefault(); e.returnValue = ''; } });
    const fit = () => island.resize();
    window.addEventListener('resize', fit);
    if (window.ResizeObserver) new ResizeObserver(fit).observe($('stage'));
    fit();
  }

  function boot() {
    AI.onStatus = paintAI;
    paintAI();
    buildParams();
    renderParams();
    bind();
    // 時代を選ぶまでの背景：適当な島
    island.generate({ biome: 'temperate', house: 'jp', landmarks: [['castleJP', 1], ['pagoda', 1], ['shrine', 1]] });
    island.settle({ population: 60, technology: 40, order: 50 });
    openDraft();
    requestAnimationFrame(frame);
  }
  boot();
})();
