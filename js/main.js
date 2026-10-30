/* WORDROP — ゲーム進行・UI */
(function () {
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const Sfx = WD.Sfx;
  const W = WD.IsoWorld.W, H = WD.IsoWorld.H;

  /* ================= 設定（localStorage） ================= */
  const LS = { key: 'wordrop.apiKey', model: 'wordrop.model', offline: 'wordrop.offline' };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
  const settings = {
    apiKey: store.get(LS.key, ''),
    model: store.get(LS.model, WD.DEFAULT_MODEL),
    offline: store.get(LS.offline, '0') === '1',
  };

  function syncModeUI() {
    $('offline-toggle').checked = settings.offline;
    $('offline-toggle-2').checked = settings.offline;
    const note = $('mode-note');
    if (settings.offline) note.textContent = '◆ オフライン：内蔵の予言エンジンで歴史が変わります（通信なし）。';
    else if (settings.apiKey) note.textContent = '◆ オンライン：Gemini（' + settings.model + '）が歴史を改変します。';
    else note.textContent = '◆ APIキー未設定：このままでもオフライン予言で遊べます。⚙から設定するとGeminiが歴史を紡ぎます。';
    updateSourceHud();
  }
  function setOffline(v) {
    settings.offline = v;
    store.set(LS.offline, v ? '1' : '0');
    syncModeUI();
  }

  function toast(msg, ms) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add('hidden'), ms || 3200);
  }

  /* ================= タイトル画面 ================= */
  let titleWorld = null;
  function setupTitle() {
    titleWorld = new WD.IsoWorld($('title-world'), { course: 'japan', seed: (Math.random() * 1e9) | 0 });
    const skies = ['night', 'dusk', 'aurora'];
    titleWorld.setEnv({ sky: skies[(Math.random() * skies.length) | 0], sea: 'dark', land: 'normal', weather: 'none' });
    titleWorld.skyCur = titleWorld.skyCur.map(() => [10, 10, 40]);
    titleWorld.setParams({ population: 55, technology: 45, order: 55, distortion: 0 });
    titleWorld.applyPreset([['castle', 1], ['pagoda', 1], ['shrine', 1], ['house', 6], ['field', 3], ['windmill', 1], ['market', 1], ['tower', 1]]);
    titleWorld.syncAuto(true);
    titleWorld.start();
    WD.Logo.mount($('logo'));

    const showMenu = () => {
      Sfx.unlock();
      if (!$('title-menu').classList.contains('hidden')) return;
      Sfx.play('start');
      $('push-start').classList.add('hidden');
      $('title-menu').classList.remove('hidden');
      setActiveMenu(0);
    };
    $('push-start').addEventListener('click', showMenu);
    $('title-screen').addEventListener('click', (e) => {
      if (e.target.closest('#title-menu')) return;
      if (!$('push-start').classList.contains('hidden')) showMenu();
    });

    document.querySelectorAll('.menu-item').forEach((btn, i) => {
      btn.addEventListener('mouseenter', () => setActiveMenu(i, true));
      btn.addEventListener('click', () => { Sfx.unlock(); Sfx.play('select'); startGame(btn.dataset.course); });
    });

    document.addEventListener('keydown', (e) => {
      if ($('title-screen').classList.contains('hidden') || !$('settings-modal').classList.contains('hidden')) return;
      if (!$('push-start').classList.contains('hidden')) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showMenu(); }
        return;
      }
      const items = [...document.querySelectorAll('.menu-item')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveMenu((menuIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        items[menuIndex].click();
      }
    });

    $('offline-toggle').addEventListener('change', (e) => { setOffline(e.target.checked); Sfx.play('blip'); });
    $('btn-settings').addEventListener('click', openSettings);
  }
  let menuIndex = 0;
  function setActiveMenu(i, silent) {
    const items = document.querySelectorAll('.menu-item');
    items.forEach((el, k) => el.classList.toggle('active', k === i));
    if (i !== menuIndex && !silent) Sfx.play('blip');
    menuIndex = i;
  }
  function showTitle() {
    $('game-screen').classList.add('hidden');
    $('title-screen').classList.remove('hidden');
    if (game.world) game.world.stop();
    titleWorld.start();
    $('logo')._resume && $('logo')._resume();
    $('push-start').classList.add('hidden');
    $('title-menu').classList.remove('hidden');
    setActiveMenu(menuIndex, true);
  }

  /* ================= 設定モーダル ================= */
  function openSettings() {
    Sfx.unlock(); Sfx.play('blip');
    $('api-key').value = settings.apiKey;
    $('api-model').value = settings.model;
    $('offline-toggle-2').checked = settings.offline;
    $('api-status').textContent = settings.apiKey ? '保存済みのキーがあります。' : 'キーは未設定です。';
    $('settings-modal').classList.remove('hidden');
    setTimeout(() => $('api-key').focus(), 50);
  }
  function closeSettings() { $('settings-modal').classList.add('hidden'); }
  function setupSettings() {
    $('btn-show-key').addEventListener('click', () => {
      const i = $('api-key');
      i.type = i.type === 'password' ? 'text' : 'password';
      $('btn-show-key').textContent = i.type === 'password' ? '表示' : '隠す';
    });
    $('btn-save-settings').addEventListener('click', () => {
      settings.apiKey = $('api-key').value.trim();
      settings.model = $('api-model').value.trim() || WD.DEFAULT_MODEL;
      if (settings.apiKey) store.set(LS.key, settings.apiKey); else store.del(LS.key);
      store.set(LS.model, settings.model);
      setOffline($('offline-toggle-2').checked);
      Sfx.play('select');
      closeSettings();
      toast(settings.apiKey && !settings.offline ? 'Gemini モードで歴史を改変します' : 'オフライン予言モードで遊びます');
    });
    $('btn-clear-key').addEventListener('click', () => {
      $('api-key').value = '';
      settings.apiKey = '';
      store.del(LS.key);
      syncModeUI();
      $('api-status').textContent = 'キーを削除しました。';
    });
    $('btn-test-api').addEventListener('click', async () => {
      const key = $('api-key').value.trim();
      if (!key) { $('api-status').textContent = 'APIキーを入力してください。'; return; }
      $('api-status').textContent = '接続中…';
      try {
        const r = await WD.Oracle.test({ apiKey: key, model: $('api-model').value.trim() || WD.DEFAULT_MODEL });
        $('api-status').textContent = '✔ 接続成功：' + (r && r.message ? r.message : 'OK');
        Sfx.play('select');
      } catch (e) {
        $('api-status').textContent = '✖ 接続失敗：' + (e.message || e);
      }
    });
    $('settings-modal').addEventListener('click', (e) => { if (e.target.id === 'settings-modal') closeSettings(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSettings(); });
    $('offline-toggle-2').addEventListener('change', () => Sfx.play('blip'));
    $('btn-settings-2').addEventListener('click', openSettings);
  }

  /* ================= ゲーム本体 ================= */
  const game = { world: null, course: null, eraIndex: 0, params: null, history: [], phase: 'idle', usedWords: new Set(), lastWord: '' };

  function startGame(courseKey) {
    const course = WD.COURSES[courseKey];
    titleWorld.stop();
    $('title-screen').classList.add('hidden');
    $('game-screen').classList.remove('hidden');
    hideModals();

    if (game.world) game.world.stop();
    game.course = course;
    game.params = Object.assign({}, course.initial);
    game.history = [];
    game.usedWords = new Set();
    game.phase = 'idle';
    game.world = new WD.IsoWorld($('world'), {
      course: course.key,
      onImpact: () => Sfx.play('impact'),
      onLand: () => Sfx.play('thud'),
    });
    game.world.setParams(game.params);
    game.world.setEnv(course.eras[0].env);
    game.world.start();

    $('panel-course').textContent = course.name;
    $('log').innerHTML = '';
    buildParams();
    renderParams();
    fitCanvas();
    updateSourceHud();
    beginEra(0);
  }

  function beginEra(i) {
    game.eraIndex = i;
    const era = game.course.eras[i];
    game.world.setEnv(era.env);
    game.world.applyPreset(era.preset, era.name);
    game.world.syncAuto();
    $('hud-year').textContent = WD.fmtYear(era.year);
    $('hud-era').textContent = '第' + (i + 1) + '時代　' + era.name;
    showBanner('ERA ' + (i + 1) + ' / 3', WD.fmtYear(era.year) + '　' + era.name, era.desc);
    logEra(i, era);
    renderPips();
    dealCards();
    $('drop-form').classList.remove('hidden');
    $('btn-next').classList.add('hidden');
    setFormEnabled(true);
    game.phase = 'input';
    Sfx.play('select');
    if (window.matchMedia('(min-width: 1025px)').matches) setTimeout(() => $('word-input').focus(), 100);
  }

  function showBanner(b1, b2, b3) {
    const el = $('era-banner');
    el.innerHTML = '<div class="b1"></div><div class="b2"></div><div class="b3"></div>';
    el.querySelector('.b1').textContent = b1;
    el.querySelector('.b2').textContent = b2;
    el.querySelector('.b3').textContent = b3 || '';
    el.classList.add('hidden');
    void el.offsetWidth;
    el.classList.remove('hidden');
  }

  function renderPips() {
    const el = $('turn-pips');
    el.innerHTML = '';
    for (let k = 0; k < 3; k++) {
      const d = document.createElement('span');
      d.style.cssText = 'width:12px;height:12px;border:2px solid #000;display:inline-block;';
      d.style.background = k < game.eraIndex ? '#ffd23f' : k === game.eraIndex ? '#ff8a3a' : '#2a2a32';
      if (k === game.eraIndex) d.className = 'blink-slow';
      d.title = '第' + (k + 1) + '時代';
      el.appendChild(d);
    }
  }

  /* ---------- パラメータ表示 ---------- */
  function buildParams() {
    const el = $('params');
    el.innerHTML = '';
    for (const p of WD.PARAMS) {
      const row = document.createElement('div');
      row.className = 'param';
      row.id = 'param-' + p.key;
      row.innerHTML =
        '<span class="param-name"></span>' +
        '<div class="bar"><div class="bar-fill"></div>' + (p.key !== 'distortion' ? '<span class="zone lo"></span><span class="zone hi"></span>' : '') + '</div>' +
        '<span class="param-val">0</span>';
      row.querySelector('.param-name').textContent = p.name;
      row.querySelector('.param-name').style.color = p.color;
      const fill = row.querySelector('.bar-fill');
      fill.style.background = 'linear-gradient(' + p.color + ', ' + p.dark + ')';
      row.title = p.key === 'distortion' ? '時代錯誤による時空の歪み（0〜100）' : '0以下または100以上で文明崩壊';
      el.appendChild(row);
    }
  }
  function renderParams(deltas) {
    for (const p of WD.PARAMS) {
      const v = game.params[p.key];
      const row = $('param-' + p.key);
      row.querySelector('.bar-fill').style.width = Math.max(0, Math.min(100, v)) + '%';
      row.querySelector('.param-val').textContent = v;
      row.classList.toggle('danger', p.key !== 'distortion' && (v <= 15 || v >= 85));
      if (deltas && deltas[p.key]) {
        const d = deltas[p.key];
        const pop = document.createElement('span');
        pop.className = 'delta-pop';
        pop.textContent = (d > 0 ? '+' : '') + d;
        pop.style.color = d > 0 ? '#7aff8a' : '#ff6a5a';
        row.appendChild(pop);
        setTimeout(() => pop.remove(), 1700);
      }
    }
  }

  /* ---------- ログ ---------- */
  function logEl(cls, html) {
    const d = document.createElement('div');
    d.className = cls;
    if (html !== undefined) d.innerHTML = html;
    $('log').appendChild(d);
    scrollLog();
    return d;
  }
  function scrollLog() { const l = $('log'); l.scrollTop = l.scrollHeight; }
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function logEra(i, era) {
    logEl('log-era', '◆ 第' + (i + 1) + '時代　' + esc(WD.fmtYear(era.year)) + '　' + esc(era.name));
    logEl('log-note', esc(era.desc));
  }
  let skipTyping = false;
  async function typeInto(el, text) {
    skipTyping = false;
    const chars = Array.from(text);
    for (let k = 0; k < chars.length; k++) {
      if (skipTyping) { el.textContent = text; break; }
      el.textContent += chars[k];
      if (k % 2 === 0) Sfx.play('type');
      if (k % 6 === 0) scrollLog();
      await sleep(26);
    }
    scrollLog();
  }

  /* ---------- 単語カード ---------- */
  function dealCards() {
    const el = $('cards');
    el.innerHTML = '';
    const pool = WD.WORD_POOL.filter((w) => !game.usedWords.has(w));
    const picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    const nums = ['壱', '弐', '参'];
    picks.forEach((w, k) => {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'card deal';
      c.style.animationDelay = k * 0.12 + 's';
      c.innerHTML = '<span class="num">' + nums[k] + '</span><span class="vert"></span><span class="seal"></span>';
      const v = c.querySelector('.vert');
      v.textContent = w;
      if (Array.from(w).length > 6) v.classList.add('small');
      c.title = 'クリックで「' + w + '」を入力';
      c.addEventListener('click', () => {
        if (game.phase !== 'input') return;
        Sfx.play('blip');
        $('word-input').value = w;
        updateCount();
        $('word-input').focus();
      });
      el.appendChild(c);
    });
  }

  function updateCount() {
    const i = $('word-input');
    let chars = Array.from(i.value);
    if (chars.length > WD.MAX_WORD_LEN) { chars = chars.slice(0, WD.MAX_WORD_LEN); i.value = chars.join(''); }
    $('char-count').textContent = chars.length + '/' + WD.MAX_WORD_LEN;
  }
  function setFormEnabled(on) {
    $('word-input').disabled = !on;
    $('btn-drop').disabled = !on;
    document.querySelectorAll('.card').forEach((c) => (c.disabled = !on));
  }

  /* ---------- 単語投下 ---------- */
  async function dropWord(word) {
    if (game.phase !== 'input') return;
    word = word.trim().replace(/\s+/g, ' ');
    const len = Array.from(word).length;
    if (!len) { toast('単語を入力してください'); return; }
    if (len > WD.MAX_WORD_LEN) { toast(WD.MAX_WORD_LEN + '文字以内で入力してください'); return; }
    game.phase = 'busy';
    game.lastWord = word;
    game.usedWords.add(word);
    setFormEnabled(false);
    document.querySelectorAll('.card').forEach((c) => { if (c.querySelector('.vert').textContent === word) c.classList.add('used'); });
    $('word-input').value = '';
    updateCount();

    const era = game.course.eras[game.eraIndex];
    logEl('log-drop', '▼ ' + esc(WD.fmtYear(era.year)) + 'に <b>' + esc(word) + '</b> を投下！');
    const thinking = logEl('log-thinking', settings.offline || !settings.apiKey ? '予言エンジンが歴史を演算中' : 'Gemini が時空を演算中');
    Sfx.play('drop');
    game.world.dropWord(word);

    const ctx = { course: game.course, eraIndex: game.eraIndex, era, params: Object.assign({}, game.params), history: game.history, word };
    const [res] = await Promise.all([WD.Oracle.drop(ctx, settings), sleep(1900)]);
    thinking.remove();
    if (res.error) toast('Gemini通信エラー：' + res.error + '　→ オフライン予言で代行しました', 6000);
    updateSourceHud(res.source);

    const result = res.result;
    logEl('log-title', '【' + esc(result.title) + '】');

    for (let s = 0; s < result.timeline.length; s++) {
      const st = result.timeline[s];
      await sleep(500);
      animateYear(s === 0 ? era.year : result.timeline[s - 1].year, st.year, 700);
      Sfx.play('stage');
      const box = logEl('log-stage');
      box.innerHTML = '<span class="chip"></span><span class="yr"></span><div class="txt"></div><div class="deltas"></div>';
      box.querySelector('.chip').textContent = st.label;
      box.querySelector('.yr').textContent = WD.fmtYear(st.year);
      await typeInto(box.querySelector('.txt'), st.text);

      // パラメータ更新
      const applied = {};
      for (const p of WD.PARAMS) {
        const d = st.delta[p.key] || 0;
        let v = game.params[p.key] + d;
        if (p.key === 'distortion') v = Math.max(0, Math.min(100, v));
        applied[p.key] = v - game.params[p.key];
        game.params[p.key] = v;
      }
      box.querySelector('.deltas').innerHTML = WD.PARAMS.filter((p) => applied[p.key]).map((p) => {
        const d = applied[p.key];
        return '<span style="color:' + p.color + '">' + p.name + (d > 0 ? '+' : '') + d + '</span>';
      }).join('');
      renderParams(applied);
      game.world.setParams(game.params);
      game.world.applyMap(st.map, '第' + (game.eraIndex + 1) + '時代「' + word + '」');
      game.world.syncAuto();
      scrollLog();

      const fail = checkCollapse();
      if (fail) {
        await sleep(1200);
        gameOver(fail, st, word, result);
        return;
      }
      await sleep(1500);
    }

    game.history.push({ word, title: result.title, timeline: result.timeline });
    renderPips();
    game.phase = 'result';
    $('drop-form').classList.add('hidden');
    const nb = $('btn-next');
    if (game.eraIndex < game.course.eras.length - 1) {
      const next = game.course.eras[game.eraIndex + 1];
      nb.textContent = '第' + (game.eraIndex + 2) + '時代（' + WD.fmtYear(next.year) + ' ' + next.name + '）へ ▶';
    } else {
      nb.textContent = '2026年へ ― 最終到達点 ▶';
    }
    nb.classList.remove('hidden');
    nb.focus();
  }

  function animateYear(from, to, ms) {
    const t0 = performance.now();
    const el = $('hud-year');
    function step(now) {
      const k = Math.min(1, (now - t0) / ms);
      el.textContent = WD.fmtYear(Math.round(from + (to - from) * k) || 1);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- 崩壊判定 ---------- */
  const COLLAPSE = {
    'population-lo': ['人口消滅', 'ひとり、またひとりと島を去り、ついに最後の住人も姿を消した。無人となった浮島は静かに雲海へ沈んでいった。'],
    'population-hi': ['人口爆発', '島の許容量を超えた人々が押し合いへし合い、浮島は重みに耐えきれず大きく傾いた。'],
    'technology-lo': ['技術喪失', '道具の作り方さえ忘れ去られ、文明は石器以前へと逆戻りした。火の起こし方を巡る論争だけが残った。'],
    'technology-hi': ['技術的特異点', '発達しすぎた技術が人間の理解を超え、島は機械たちの手に渡った。人類の記録はここで途切れている。'],
    'order-lo': ['無秩序', '法も掟も失われ、島は終わりなき内乱に呑み込まれた。最後に残ったのは瓦礫と怒号だけだった。'],
    'order-hi': ['完全管理社会', 'すべてが規則で縛られ、笑うことすら申請制になった島で、文明は静かに息を止めた。'],
  };
  function checkCollapse() {
    for (const key of ['population', 'technology', 'order']) {
      const v = game.params[key];
      if (v <= 0) return key + '-lo';
      if (v >= 100) return key + '-hi';
    }
    return null;
  }

  function gameOver(kind, stage, word, result) {
    game.phase = 'ended';
    game.world.collapse();
    Sfx.play('collapse');
    const era = game.course.eras[game.eraIndex];
    const [reason, text] = COLLAPSE[kind];
    setTimeout(() => {
      $('collapse-reason').textContent = '― ' + reason + ' ―';
      $('collapse-text').textContent =
        WD.fmtYear(era.year) + '（' + era.name + '）に投下された「' + word + '」は「' + result.title + '」を引き起こし、その' + stage.label + '、' +
        WD.fmtYear(stage.year) + '。' + text;
      $('collapse-sns').value = '【WORDROP】' + game.course.short + 'の' + era.name + 'に「' + word + '」を投下したら、' + stage.label + 'に' + reason + 'で文明が崩壊しました…。 #WORDROP #歴史改変';
      $('collapse-modal').classList.remove('hidden');
    }, 2200);
  }

  /* ---------- エンディング ---------- */
  async function finale() {
    if (game.phase !== 'result') return;
    game.phase = 'busy';
    $('btn-next').classList.add('hidden');
    const last = game.course.eras[game.course.eras.length - 1];
    const lastYear = game.history.length ? game.history[game.history.length - 1].timeline[2].year : last.year;
    animateYear(lastYear, 2026, 1600);
    $('hud-era').textContent = '最終到達点　現代';
    showBanner('FINAL', '2026年', '改変された歴史の、その先へ');
    logEl('log-era', '◆ 2026年　最終到達点');
    const thinking = logEl('log-thinking', '歴史教科書を編纂中');
    game.world.setEnv({ sky: game.params.distortion > 60 ? 'aurora' : game.params.technology > 70 ? 'cyber' : 'golden', weather: 'none' });
    game.world.syncAuto();

    const ctx = { course: game.course, params: Object.assign({}, game.params), history: game.history };
    const [res] = await Promise.all([WD.Oracle.finale(ctx, settings), sleep(2600)]);
    thinking.remove();
    if (res.error) toast('Gemini通信エラー：' + res.error + '　→ オフラインで編纂しました', 6000);
    const r = res.result;
    logEl('log-title', '【' + esc(r.chapter) + '】');

    $('tb-title').textContent = r.title;
    $('tb-chapter').textContent = r.chapter;
    $('tb-text').textContent = r.body;
    $('tb-image').src = game.world.snapshot();
    $('tb-keywords').innerHTML = r.keywords.map((k) => '<span class="kw">' + esc(k) + '</span>').join('');
    $('tb-history').innerHTML = game.history.map((h, i) => {
      const era = game.course.eras[i];
      return '<tr><td>' + esc(WD.fmtYear(era.year)) + ' ' + esc(era.name) + '</td><td>「' + esc(h.word) + '」→ ' + esc(h.title) + '</td></tr>';
    }).join('') + '<tr><td>2026年</td><td>' + esc(WD.describeState(game.params)) + '</td></tr>';
    $('tb-params').innerHTML = WD.PARAMS.map((p) => '<span>' + p.name + ' <b style="color:' + p.dark + '">' + game.params[p.key] + '</b></span>').join('');
    $('sns-text').value = r.sns;
    $('btn-share-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(r.sns);
    Sfx.play('fanfare');
    game.phase = 'ended';
    await sleep(900);
    $('ending-modal').classList.remove('hidden');
  }

  function hideModals() {
    $('ending-modal').classList.add('hidden');
    $('collapse-modal').classList.add('hidden');
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) { /* ignore */ }
      ta.remove();
    }
    toast('クリップボードにコピーしました');
    Sfx.play('select');
  }

  /* ---------- キャンバスのフィット ---------- */
  function fitCanvas() {
    const pane = $('map-pane');
    const pw = pane.clientWidth - 24, ph = pane.clientHeight - 24;
    if (pw <= 0 || ph <= 0) return;
    let s = Math.min(pw / W, ph / H);
    if (s >= 2) s = Math.floor(s);
    const c = $('world');
    c.style.width = Math.floor(W * s) + 'px';
    c.style.height = Math.floor(H * s) + 'px';
  }

  function updateSourceHud(src) {
    const el = $('hud-source');
    if (!el) return;
    const online = WD.Oracle.online(settings);
    if (src === 'offline' && online) { el.innerHTML = '<span style="color:#ff8a5a">● FALLBACK: OFFLINE PROPHECY</span>'; return; }
    el.innerHTML = online
      ? '<span style="color:#7aff8a">● GEMINI ONLINE</span> <span style="color:#9a94b8">' + esc(settings.model) + '</span>'
      : '<span style="color:#ffd23f">● OFFLINE PROPHECY</span>';
  }

  function setupGame() {
    $('word-input').addEventListener('input', updateCount);
    $('drop-form').addEventListener('submit', (e) => { e.preventDefault(); dropWord($('word-input').value); });
    $('btn-next').addEventListener('click', () => {
      if (game.phase !== 'result') return;
      Sfx.play('select');
      if (game.eraIndex < game.course.eras.length - 1) beginEra(game.eraIndex + 1);
      else finale();
    });
    $('log').addEventListener('click', () => { skipTyping = true; });
    $('btn-mute').addEventListener('click', () => {
      const m = Sfx.toggle();
      $('btn-mute').classList.toggle('off', m);
    });
    $('btn-mute').classList.toggle('off', Sfx.muted);
    $('btn-copy').addEventListener('click', () => copyText($('sns-text').value));
    $('btn-copy-collapse').addEventListener('click', () => copyText($('collapse-sns').value));
    $('btn-retry').addEventListener('click', () => { hideModals(); startGame(game.course.key); });
    document.querySelectorAll('.btn-restart').forEach((b) => b.addEventListener('click', () => { hideModals(); showTitle(); }));

    // 建物ツールチップ
    const canvas = $('world');
    const tip = $('tooltip');
    canvas.addEventListener('mousemove', (e) => {
      if (!game.world) return;
      const r = canvas.getBoundingClientRect();
      const mx = ((e.clientX - r.left) * W) / r.width, my = ((e.clientY - r.top) * H) / r.height;
      const b = game.world.pick(mx, my);
      if (!b) { tip.classList.add('hidden'); return; }
      tip.textContent = WD.BUILDINGS[b.type].name + (b.label ? '　' + b.label : '');
      const fr = $('map-frame').getBoundingClientRect();
      tip.style.left = e.clientX - fr.left + 12 + 'px';
      tip.style.top = e.clientY - fr.top - 28 + 'px';
      tip.classList.remove('hidden');
    });
    canvas.addEventListener('mouseleave', () => tip.classList.add('hidden'));

    window.addEventListener('resize', fitCanvas);
    if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe($('map-pane'));
  }

  /* ================= 起動 ================= */
  function boot() {
    setupSettings();
    setupTitle();
    setupGame();
    syncModeUI();
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(boot);
  else window.addEventListener('load', boot);
})();
