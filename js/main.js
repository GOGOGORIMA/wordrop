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
      refreshContinue();
      setActiveMenu(0);
    };
    $('push-start').addEventListener('click', showMenu);
    $('title-screen').addEventListener('click', (e) => {
      if (e.target.closest('#title-menu')) return;
      if (!$('push-start').classList.contains('hidden')) showMenu();
    });

    document.querySelectorAll('.menu-item').forEach((btn) => {
      btn.addEventListener('mouseenter', () => setActiveMenu(menuItems().indexOf(btn), true));
      btn.addEventListener('click', () => {
        Sfx.unlock(); Sfx.play('select');
        if (btn.dataset.action === 'continue') resumeGame(); else startGame(btn.dataset.mode);
      });
    });

    document.addEventListener('keydown', (e) => {
      if ($('title-screen').classList.contains('hidden') || !$('settings-modal').classList.contains('hidden')) return;
      if (!$('push-start').classList.contains('hidden')) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showMenu(); }
        return;
      }
      const items = menuItems();
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
  const menuItems = () => [...document.querySelectorAll('.menu-item')].filter((b) => !b.classList.contains('hidden'));
  /* セーブデータがあればタイトルに「続きから再開」を出す */
  function refreshContinue() {
    const sv = loadSave();
    $('menu-continue').classList.toggle('hidden', !sv);
    if (sv) {
      const era = WD.ERAS.find((e) => e.id === sv.eraId);
      const mi = Math.floor(sv.clock.m);
      $('continue-note').textContent = era.name + '　' + WD.fmtYear(era.year + Math.floor(mi / 12)) + ((mi % 12) + 1) + '月　第' + ((sv.century || 0) + 1) + '世紀　神託' + '★'.repeat(sv.oracles) + '☆'.repeat(WD.ORACLES_PER_CENTURY - sv.oracles);
    }
    menuIndex = 0;
  }
  function setActiveMenu(i, silent) {
    const items = menuItems();
    items.forEach((el, k) => el.classList.toggle('active', k === i));
    if (i !== menuIndex && !silent) Sfx.play('blip');
    menuIndex = i;
  }
  function showTitle() {
    saveGame();
    refreshContinue();
    $('game-screen').classList.add('hidden');
    $('title-screen').classList.remove('hidden');
    if (game.world) game.world.stop();
    game.phase = 'idle';
    stopClock();
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
    // 設定中は時計を止める
    if (game.phase === 'live' && clock.speed > 0) { game.autoPaused = clock.speed; setSpeed(0, true); }
  }
  function closeSettings() {
    $('settings-modal').classList.add('hidden');
    if (game.autoPaused) { if (game.phase === 'live') setSpeed(game.autoPaused, true); game.autoPaused = 0; }
  }
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
  const game = {
    world: null, mode: null, era: null, params: null, phase: 'idle', usedWords: new Set(), draft: [], rerolls: 0,
    drops: [], schedule: [], collapsed: false, currentWord: '', result: null, autoPaused: 0,
    century: 0, oracles: WD.ORACLES_PER_CENTURY, centuryStart: null,
    cooldownUntil: -1, histEvents: [], histDone: [],
  };
  const COOLDOWN_MONTHS = WD.COOLDOWN_YEARS * 12;
  const CENTURY_MONTHS = WD.CENTURY_YEARS * 12;
  // 時計：m はゲーム開始からの経過月数（小数）。等倍では WD.SECONDS_PER_MONTH 秒で1ヶ月進む
  const clock = { m: 0, month: -1, speed: 1, lastSpeed: 1, running: false, last: 0, nextMini: 3, shown: '' };
  // 船の様式（0: ロングシップ / 1: 帆船 / 2: 黒船・蒸気船）
  const SHIP_STYLE = { 19: 0, 20: 0, 25: 0, 38: 2, 48: 2 };
  const SEASON_LABEL = { spring: '🌸 春', summer: '🌻 夏', autumn: '🍁 秋', winter: '⛄ 冬' };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const fmtDate = WD.fmtDate;
  const dateAt = (mi) => ({ year: game.era.year + Math.floor(mi / 12), month: (mi % 12) + 1, elapsed: mi });
  // ゲーム上の「いま」は処理済みの最後の月（描画用の clock.m は少し先まで進んでいることがある）
  const nowMonth = () => Math.max(0, Math.min(Math.floor(clock.m), clock.month));
  const elapsedLabel = (mi) => Math.floor(mi / 12) + '年' + (mi % 12) + 'ヶ月';
  const nextDaily = (mi) => mi + WD.DAILY_MONTHS[0] + Math.floor(Math.random() * (WD.DAILY_MONTHS[1] - WD.DAILY_MONTHS[0] + 1));
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(WD.ORACLES_PER_CENTURY - n);

  function startGame(modeKey) {
    if (loadSave() && !window.confirm('続きのセーブデータがあります。上書きして新しい歴史を始めますか？')) return;
    const mode = WD.MODES[modeKey];
    titleWorld.stop();
    $('title-screen').classList.add('hidden');
    $('game-screen').classList.remove('hidden');
    hideModals();

    if (game.world) game.world.stop();
    Object.assign(game, {
      mode, era: null, params: Object.assign({}, WD.BASE_PARAMS), phase: 'idle', usedWords: new Set(),
      drops: [], schedule: [], collapsed: false, currentWord: '', result: null, autoPaused: 0,
      century: 0, oracles: WD.ORACLES_PER_CENTURY, centuryStart: null,
      cooldownUntil: -1, histEvents: [], histDone: [],
    });
    Object.assign(clock, { m: 0, month: -1, nextMini: WD.DAILY_MONTHS[0], shown: '' });
    game.world = new WD.IsoWorld($('world'), {
      course: 'japan',
      onImpact: () => Sfx.play('impact'),
      onLand: () => Sfx.play('thud'),
    });
    game.world.setParams(game.params);
    game.world.setEnv({ sky: 'night', sea: 'dark', land: 'normal', weather: 'none' });
    game.world.start();

    $('panel-course').textContent = mode.name;
    $('log').innerHTML = '';
    $('hud-year').textContent = '？？？？年';
    $('hud-era').textContent = '時空の狭間';
    $('drop-form').classList.add('hidden');
    $('btn-next').classList.add('hidden');
    $('cards').innerHTML = '';
    $('word-input').placeholder = '単語を入力（15文字以内）';
    buildParams();
    renderParams();
    fitCanvas();
    updateSourceHud();
    setSpeed(1, true);
    renderClock(true);
    renderSteps();
    updateDropLeft();
    logEl('log-note', '◆ ' + esc(mode.name) + '：舞台となる時代を1つ選ぶと、その開始年から時計が動き出します（等倍で1分＝1年）。100年ごとに、歴史を確定するか次の100年へ進むかを選べます。');
    startClock();
    setTimeout(openDraft, 400);
  }

  /* ---------- 時代ドラフト（開始時のみ・ランダム3択） ---------- */
  function openDraft() {
    game.phase = 'draft';
    game.rerolls = 1;
    game.draft = WD.drawEras(game.mode.key, null, 3);
    renderDraft();
    $('draft-modal').classList.remove('hidden');
    Sfx.play('select');
  }

  const BIOME_SKY = {
    temperate: ['#4a90e0', '#cfeeff'], desert: ['#e09030', '#fff0b8'], snow: ['#5a6474', '#d0d8e4'],
    jungle: ['#2a8ac0', '#d0f0e0'], water: ['#2a70d0', '#c0e8ff'], urban: ['#3a2a5a', '#ffa868'], wasteland: ['#2a0606', '#ff6a3a'],
  };
  function drawEraArt(canvas, era) {
    const W2 = 120, H2 = 64;
    canvas.width = W2; canvas.height = H2;
    const g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    const sky = BIOME_SKY[era.biome];
    const grd = g.createLinearGradient(0, 0, 0, H2);
    grd.addColorStop(0, sky[0]); grd.addColorStop(1, sky[1]);
    g.fillStyle = grd; g.fillRect(0, 0, W2, H2);
    const L = WD.IsoWorld.palette(WD.eraEnv(era).land);
    const cx = 60, cy = 46, a = 46;
    const diamond = (aa, colA, colB, oy) => {
      for (let dx = -aa; dx < aa; dx++) {
        const adx = dx < 0 ? -dx - 1 : dx;
        const hh = Math.floor((aa - adx) / 2);
        for (let y = cy - hh; y <= cy + hh; y++) {
          g.fillStyle = (dx + y) % 3 === 0 ? colB : colA;
          g.fillRect(cx + dx, y + (oy || 0), 1, 1);
        }
      }
    };
    // 側面
    for (let dx = -a; dx < a; dx++) {
      const adx = dx < 0 ? -dx - 1 : dx;
      const yF = cy + Math.floor((a - adx) / 2);
      g.fillStyle = dx < 0 ? L.dirt[0] : L.dirt[1];
      g.fillRect(cx + dx, yF, 1, 5);
      g.fillStyle = L.under[1];
      g.fillRect(cx + dx, yF + 5, 1, Math.max(0, 8 - Math.floor(adx / 6)));
    }
    if (era.biome === 'water') {
      diamond(a, '#2a6fc4', '#3a80d8');
      diamond(26, L.grass[0], L.grass[1]);
    } else {
      diamond(a, L.grass[0], L.grass[1]);
    }
    const spots = [[cx, cy + 2], [cx - 26, cy + 4], [cx + 26, cy + 4]];
    era.symbols.slice(0, 3).forEach(([type], k) => {
      const v = type === 'ship' ? (SHIP_STYLE[era.id] !== undefined ? SHIP_STYLE[era.id] : 1) : 1;
      const s = WD.Sprites.get(type, v, era.region);
      const [x, y] = spots[k];
      g.drawImage(s.canvas, x - s.ax, y - s.ay);
    });
  }

  function renderDraft() {
    $('draft-tier').textContent = 'SELECT YOUR ERA';
    $('draft-title').textContent = '舞台となる時代を選べ';
    $('draft-sub').textContent = '選んだ時代の開始年から、時は1年ずつ進み続けます。100年ごとに区切りが訪れます。途中で時代は変えられません。';
    const box = $('draft-cards');
    box.innerHTML = '';
    game.draft.forEach((era, k) => {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'era-card deal region-' + era.region;
      c.style.animationDelay = k * 0.1 + 's';
      c.innerHTML =
        '<div class="era-top"><span class="era-num">' + (k + 1) + '</span><span class="era-region"></span><span class="era-year"></span></div>' +
        '<canvas class="era-art pixel"></canvas>' +
        '<div class="era-name"></div><div class="era-sub"></div>' +
        '<p class="era-desc"></p>' +
        '<div class="era-biome"></div>' +
        '<div class="era-mods"></div>' +
        '<div class="era-pick">この時代から始める ▶</div>';
      c.querySelector('.era-region').textContent = WD.REGION_NAME[era.region];
      c.querySelector('.era-year').textContent = era.yearLabel;
      c.querySelector('.era-name').textContent = era.name;
      c.querySelector('.era-sub').textContent = '（' + era.sub + '）';
      c.querySelector('.era-desc').textContent = era.desc;
      const B = WD.BIOMES[era.biome];
      c.querySelector('.era-biome').textContent = B.icon + ' ' + B.name + '　舞台：' + era.place + '　開始：' + WD.fmtYear(era.year) + '1月';
      c.querySelector('.era-mods').innerHTML = WD.PARAMS.filter((p) => era.mod[p.key]).map((p) => {
        const d = era.mod[p.key];
        return '<span style="color:' + p.color + '">' + p.name + (d > 0 ? '+' : '') + d + '</span>';
      }).join('') || '<span style="color:#9a94b8">補正なし</span>';
      drawEraArt(c.querySelector('.era-art'), era);
      c.addEventListener('click', () => pickEra(era));
      c.addEventListener('mouseenter', () => Sfx.play('blip'));
      box.appendChild(c);
    });
    const rb = $('btn-reroll');
    rb.disabled = game.rerolls <= 0;
    rb.textContent = '🎲 別の時代を引き直す（残り' + game.rerolls + '回）';
  }

  function reroll() {
    if (game.phase !== 'draft' || game.rerolls <= 0) return;
    game.rerolls--;
    game.draft = WD.drawEras(game.mode.key, null, 3, game.draft.map((e) => e.id));
    Sfx.play('start');
    renderDraft();
  }

  function pickEra(era) {
    if (game.phase !== 'draft') return;
    $('draft-modal').classList.add('hidden');
    Sfx.play('start');
    game.era = era;

    // 時代の初期パラメータ補正（選んだ瞬間に崩壊はしない）
    const applied = {};
    for (const p of WD.PARAMS) {
      const before = game.params[p.key];
      const v = p.key === 'distortion' ? clamp(before + (era.mod[p.key] || 0), 0, 100) : clamp(before + (era.mod[p.key] || 0), 5, 95);
      applied[p.key] = v - before;
      game.params[p.key] = v;
    }
    renderParams(applied);

    // 浮島をその時代のバイオームとシンボル建築に切り替える
    const w = game.world;
    w.setCourse(era.region);
    w.setParams(game.params);
    w.setEnv(WD.eraEnv(era));
    w.switchSymbols(era.symbols, era.name, (type, k) => {
      if (type === 'ship') return SHIP_STYLE[era.id] !== undefined ? SHIP_STYLE[era.id] : 1;
      if (type === 'moai' || type === 'mammoth') return k;
      return undefined;
    });
    w.syncAuto();
    w.setSeason(1, era);

    $('hud-era').textContent = era.name + '（' + era.sub + '）';
    showBanner('第1世紀 ― 100年の大河が始まる', WD.fmtYear(era.year) + '　' + era.name, era.sub + ' ― ' + era.desc);
    logEl('log-era', '◆ ' + esc(era.yearLabel) + '　' + esc(era.name) + '（' + esc(era.sub) + '）／舞台：' + esc(era.place));
    logEl('log-note', esc(era.desc));
    const mods = WD.PARAMS.filter((p) => applied[p.key]).map((p) => p.name + (applied[p.key] > 0 ? '+' : '') + applied[p.key]).join(' ');
    if (mods) logEl('log-note', '時代補正：' + esc(mods));
    logEl('log-year', '― ' + esc(fmtDate(dateAt(0))) + '　時計が動き出した ―');

    dealCards();
    $('drop-form').classList.remove('hidden');
    setFormEnabled(true);
    Object.assign(clock, { m: 0, month: 0, nextMini: nextDaily(0), shown: '' });
    Object.assign(game, {
      century: 0, oracles: WD.ORACLES_PER_CENTURY, centuryStart: { params: Object.assign({}, game.params), month: 0 },
      cooldownUntil: -1, histEvents: WD.historyFor(era), histDone: [],
    });
    logEl('log-note hist-note', '⚠ この100年に待ち受ける史実：' + game.histEvents.map((h) => esc(WD.fmtYear(h.year)) + '『' + esc(h.name) + '』').join('、'));
    updateDropLeft();
    game.phase = 'live';
    setSpeed(1, true);
    renderClock(true);
    renderSteps();
    saveGame();
    if (window.matchMedia('(min-width: 1025px)').matches) setTimeout(() => $('word-input').focus(), 100);
  }

  /* ---------- 時計 ---------- */
  function startClock() {
    if (clock.running) return;
    clock.running = true;
    clock.last = performance.now();
    requestAnimationFrame(tick);
  }
  function stopClock() { clock.running = false; }
  function tick(now) {
    if (!clock.running) return;
    const dt = Math.min(0.25, (now - clock.last) / 1000);
    clock.last = now;
    if (game.phase === 'live' && clock.speed > 0) {
      clock.m += (dt * clock.speed) / WD.SECONDS_PER_MONTH;
      while (Math.floor(clock.m) > clock.month && game.phase === 'live') {
        clock.month++;
        onMonth(clock.month);
      }
      // 途中で時間が止まった（世紀末・崩壊など）ら、その月で時計を止める
      if (Math.floor(clock.m) > clock.month) clock.m = clock.month + 0.999;
    }
    renderClock();
    requestAnimationFrame(tick);
  }

  function setSpeed(s, silent) {
    clock.speed = s;
    if (s > 0) clock.lastSpeed = s;
    if (game.world) game.world.timeScale = game.phase === 'busy' ? 0 : s;
    document.querySelectorAll('.spd').forEach((b) => b.classList.toggle('active', +b.dataset.speed === s));
    updatePauseHud();
    if (!silent) Sfx.play('blip');
  }
  function updatePauseHud() {
    const el = $('hud-pause');
    if (game.phase === 'busy') { el.textContent = '⌛ 時空演算中…'; el.classList.remove('hidden'); }
    else if (game.phase === 'live' && clock.speed === 0) { el.textContent = '❚❚ PAUSE'; el.classList.remove('hidden'); }
    else el.classList.add('hidden');
  }

  function renderClock(force) {
    const fill = $('year-gauge-fill');
    if (!game.era) {
      if (force) {
        $('clock-year').textContent = '----年'; $('clock-month').textContent = '-月'; $('clock-season').textContent = '';
        $('clock-elapsed').textContent = '経過 0年0ヶ月 / 100年'; $('clock-next').textContent = '次の激変：―'; $('clock-century').textContent = '第1世紀';
        fill.style.width = '0%';
      }
      return;
    }
    fill.style.width = (((clock.m % 12) / 12) * 100).toFixed(2) + '%';
    const mi = nowMonth();
    const next = game.schedule.filter((e) => !e.fired).sort((a, b) => a.month - b.month)[0];
    const nh = game.histEvents.find((h) => !h.fired);
    const key = mi + '|' + (next ? next.month : '') + '|' + game.drops.length + '|' + game.century + '|' + (nh ? nh.month : '');
    if (!force && key === clock.shown) return;
    clock.shown = key;
    const d = dateAt(mi);
    $('clock-year').textContent = WD.fmtYear(d.year);
    $('clock-month').textContent = d.month + '月';
    $('clock-season').textContent = SEASON_LABEL[game.world.season] || '';
    $('clock-century').textContent = '第' + (game.century + 1) + '世紀';
    $('clock-elapsed').textContent = '経過 ' + elapsedLabel(clamp(mi - game.century * CENTURY_MONTHS, 0, CENTURY_MONTHS)) + ' / 100年';
    $('clock-next').textContent = next ? '次の激変：' + fmtDate(dateAt(next.month)) + '（あと' + (next.month - mi) + 'ヶ月）' : '次の激変：―';
    $('hud-year').textContent = fmtDate(d);
    const ch = $('clock-hist');
    if (nh) {
      const left = nh.month - mi;
      ch.textContent = '⚠ 次の史実イベント：' + WD.fmtYear(nh.year) + '『' + nh.name + '』まであと' + (left >= 12 ? Math.floor(left / 12) + '年' + (left % 12 ? (left % 12) + 'ヶ月' : '') : left + 'ヶ月');
      ch.classList.toggle('soon', left <= 24);
    } else {
      ch.textContent = '次の史実イベント：―（この先は誰も知らない歴史）';
      ch.classList.remove('soon');
    }
    updateLock();
  }

  /* 1ヶ月ごとの処理：季節・予約イベント・日常の小イベント・クリア判定 */
  function onMonth(mi) {
    const d = dateAt(mi);
    game.world.setSeason(d.month, game.era);
    if (d.month === 1) logEl('log-year', '― ' + esc(WD.fmtYear(d.year)) + '（' + (Math.floor(mi / 12) + 1) + '年目）―');

    // 神託のクールタイム明け
    if (game.cooldownUntil >= 0 && mi >= game.cooldownUntil) {
      game.cooldownUntil = -1;
      if (game.oracles > 0) {
        toast('✨ 神託（単語投下）が可能になりました', 4000);
        showNews('✨ ' + fmtDate(d) + '　神託（単語投下）が可能になりました');
        logEl('log-note unlock', '✨ ' + esc(fmtDate(d)) + '　神託が再び下せるようになった');
        Sfx.play('unlock');
      }
      refreshForm();
    }
    // 史実の大事件が割り込む
    const he = game.histEvents.find((h) => !h.fired && h.month <= mi);
    if (he) { historyCollision(he); return; }
    for (const ev of game.schedule.filter((e) => !e.fired && e.month <= mi).sort((a, b) => a.month - b.month)) {
      fireEvent(ev);
      if (game.phase !== 'live') return;
    }
    if (mi >= clock.nextMini) {
      clock.nextMini = nextDaily(mi);
      dailyEvent(d);
      if (game.phase !== 'live') return;
    }
    // 100年ごとの世紀末マイルストーン
    if (mi >= (game.century + 1) * CENTURY_MONTHS) { openMilestone(); return; }
    // 年が変わるたびにオートセーブ
    if (d.month === 1) saveGame();
  }

  function applyDelta(delta) {
    const applied = {};
    for (const p of WD.PARAMS) {
      const d = delta[p.key] || 0;
      let v = game.params[p.key] + d;
      if (p.key === 'distortion') v = clamp(v, 0, 100);
      applied[p.key] = v - game.params[p.key];
      game.params[p.key] = v;
    }
    renderParams(applied);
    game.world.setParams(game.params);
    return applied;
  }
  function deltaHtml(applied) {
    return WD.PARAMS.filter((p) => applied[p.key]).map((p) => {
      const d = applied[p.key];
      return '<span style="color:' + p.color + '">' + p.name + (d > 0 ? '+' : '') + d + '</span>';
    }).join('');
  }

  /* 予約された年次イベントの発動 */
  function fireEvent(ev) {
    ev.fired = true;
    const drop = game.drops[ev.drop];
    const date = dateAt(nowMonth());
    drop.fired.push({ year: date.year, month: date.month, offset: ev.offset, text: ev.text });
    const applied = applyDelta(ev.delta);
    const box = logEl('log-stage');
    box.innerHTML = '<span class="chip"></span><span class="yr"></span><div class="txt"></div><div class="deltas"></div>';
    const gen = WD.GENERATIONS[WD.generationOf(ev.offset)];
    box.querySelector('.chip').textContent = '+' + ev.offset + '年';
    box.querySelector('.yr').textContent = fmtDate(date) + '　「' + drop.word + '」' + gen.name + '［' + gen.label + '］';
    box.querySelector('.deltas').innerHTML = deltaHtml(applied);
    typeInto(box.querySelector('.txt'), ev.text);
    game.world.applyMap(ev.map, '「' + drop.word + '」+' + ev.offset + '年');
    game.world.syncAuto();
    showNews('📜 ' + fmtDate(date) + '「' + drop.word + '」' + gen.name + '　' + ev.text);
    Sfx.play('stage');
    renderSteps();
    const fail = checkCollapse();
    if (fail) gameOver(fail, { type: 'event', ev, drop, date });
  }

  /* ---------- 史実の大事件の割り込み（歴史イベント衝突） ---------- */
  async function historyCollision(he) {
    he.fired = true;
    const resume = clock.speed || clock.lastSpeed || 1;
    game.phase = 'busy';
    setSpeed(0, true);
    setFormEnabled(false);
    const date = dateAt(nowMonth());
    $('ha-name').textContent = fmtDate(date) + '『' + he.name + '』';
    $('ha-sub').textContent = '本来の史実：' + he.fact;
    const al = $('hist-alert');
    al.classList.remove('hidden'); al.classList.remove('show'); void al.offsetWidth; al.classList.add('show');
    game.world.alert = 4;
    game.world.shake = 6;
    Sfx.play('alarm');
    logEl('log-hist-alert', '⚠️ ' + esc(fmtDate(date)) + '　史実イベント割り込み発生！『' + esc(he.name) + '』');
    const thinking = logEl('log-thinking', (game.drops.length ? '神託「' + game.drops.map((d) => d.word).join('」「') + '」' : '現在の文明') + 'が史実をどう狂わせたか判定中');

    const ctx = {
      mode: game.mode, era: game.era, event: he, date, params: Object.assign({}, game.params),
      drops: game.drops.map((d) => ({ word: d.word, title: d.title, date: d.date, fired: d.fired, century: d.century })),
    };
    const [res] = await Promise.all([WD.Oracle.history(ctx, settings), sleep(2600)]);
    if (game.phase !== 'busy') return;
    thinking.remove();
    al.classList.add('hidden');
    if (res.error) toast('Gemini通信エラー：' + res.error + '　→ オフライン判定で代行しました', 6000);
    const r = res.result;
    game.histDone.push({ year: he.year, month: he.mon, name: he.name, title: r.title, text: r.text, century: game.century });

    const applied = applyDelta(r.delta);
    const box = logEl('log-stage hist');
    box.innerHTML = '<span class="chip"></span><span class="yr"></span><div class="hist-title"></div><div class="txt"></div><div class="hist-fact"></div><div class="deltas"></div>';
    box.querySelector('.chip').textContent = '史実';
    box.querySelector('.yr').textContent = fmtDate(date) + '『' + he.name + '』';
    box.querySelector('.hist-title').textContent = '→「' + r.title + '」';
    box.querySelector('.hist-fact').textContent = '本来の史実：' + he.fact;
    box.querySelector('.deltas').innerHTML = deltaHtml(applied);
    typeInto(box.querySelector('.txt'), r.text);
    game.world.applyMap(r.map, '史実『' + he.name + '』');
    game.world.syncAuto();
    showNews('⚠️ ' + fmtDate(date) + '『' + he.name + '』→「' + r.title + '」　' + r.text);
    Sfx.play('impact');

    const fail = checkCollapse();
    if (fail) { gameOver(fail, { type: 'history', he, r, date }); return; }
    game.phase = 'live';
    setSpeed(resume, true);
    refreshForm();
    renderClock(true);
    saveGame();
  }

  /* 3〜4ヶ月ごとの日常の小イベント */
  function dailyEvent(date) {
    const last = game.drops[game.drops.length - 1];
    const r = WD.Oracle.miniEvent({ era: game.era, season: game.world.season, word: last ? last.word : '', params: game.params });
    const applied = applyDelta(r.delta);
    logEl('log-mini', '・' + esc(fmtDate(date)) + '　' + esc(r.text) + ' <span class="deltas">' + deltaHtml(applied) + '</span>');
    if (Math.random() < 0.6) game.world.addBuilding(Math.random() < 0.5 ? 'field' : game.params.technology < 35 ? 'hut' : 'house', { label: '日常の営み' });
    game.world.syncAuto();
    const fail = checkCollapse();
    if (fail) gameOver(fail, { type: 'daily', text: r.text, date });
  }

  function showNews(text) {
    const el = $('map-news');
    el.textContent = text;
    el.classList.remove('hidden');
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.add('hidden'), 5200);
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

  /* ---------- この100年の神託スロット ---------- */
  function renderSteps() {
    const el = $('steps');
    el.innerHTML = '';
    const nums = ['①', '②', '③'];
    const mine = game.drops.map((d, i) => ({ d, i })).filter((x) => x.d.century === game.century);
    for (let k = 0; k < WD.ORACLES_PER_CENTURY; k++) {
      const x = mine[k];
      let state = 'pending', name = '空きスロット', tag = '';
      if (x) {
        const { d, i } = x;
        const live = game.schedule.some((e) => e.drop === i && !e.fired);
        name = d.word;
        const gen = d.fired.length ? WD.GENERATIONS[WD.generationOf(d.fired[d.fired.length - 1].offset)].name : '';
        if (game.collapsed && i === game.drops.length - 1) { state = 'dead'; tag = '崩壊'; }
        else if (live) { state = 'current'; tag = gen + ' ' + d.fired.length + '/' + d.total; }
        else { state = 'done'; tag = '第3世代まで到達'; }
      } else if (k === mine.length && game.currentWord) {
        state = 'current'; name = game.currentWord; tag = '演算中…';
      }
      if (k > 0) {
        const ar = document.createElement('span');
        ar.className = 'step-arrow';
        ar.textContent = '▶';
        el.appendChild(ar);
      }
      const st = document.createElement('div');
      st.className = 'step ' + state;
      st.innerHTML = '<span class="step-num"></span><span class="step-era"></span><span class="step-word"></span>';
      st.querySelector('.step-num').textContent = nums[k];
      st.querySelector('.step-era').textContent = name;
      st.querySelector('.step-word').textContent = tag ? '[' + tag + ']' : '';
      st.title = x ? fmtDate(x.d.date) + '投下「' + x.d.word + '」→ ' + x.d.title : 'この100年の神託の枠';
      el.appendChild(st);
    }
    // 前の世紀から続いている予言
    const carried = game.drops.filter((d, i) => d.century < game.century && game.schedule.some((e) => e.drop === i && !e.fired));
    el.title = carried.length ? '前の世紀から進行中：' + carried.map((d) => '「' + d.word + '」').join('') : '';
  }
  function updateDropLeft() {
    const el = $('drop-left');
    if (el) el.textContent = stars(game.oracles);
    $('oracle-stars').textContent = stars(game.oracles);
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
    const log = $('log');
    log.appendChild(d);
    while (log.children.length > 400) log.removeChild(log.firstChild);
    scrollLog();
    return d;
  }
  function scrollLog() { const l = $('log'); l.scrollTop = l.scrollHeight; }
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  let skipTyping = false;
  async function typeInto(el, text) {
    skipTyping = false;
    const chars = Array.from(text);
    for (let k = 0; k < chars.length; k++) {
      if (skipTyping) { el.textContent = text; break; }
      el.textContent += chars[k];
      if (k % 2 === 0) Sfx.play('type');
      if (k % 6 === 0) scrollLog();
      await sleep(24);
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
        if (game.phase !== 'live') return;
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

  /* ---------- 神託（単語投下）→ 3世代・9段階の年次イベント予約 ---------- */
  async function dropWord(word) {
    if (game.phase !== 'live') return;
    word = word.trim().replace(/\s+/g, ' ');
    const len = Array.from(word).length;
    if (!len) { toast('単語を入力してください'); return; }
    if (len > WD.MAX_WORD_LEN) { toast(WD.MAX_WORD_LEN + '文字以内で入力してください'); return; }
    if (game.oracles <= 0) { toast('この100年の神託はもう残っていません。次の100年で回復します'); return; }
    if (game.cooldownUntil > nowMonth()) { toast('神託のクールタイム中です（' + WD.COOLDOWN_YEARS + '年）'); return; }

    // 時間を止めて演算
    const resume = clock.speed || clock.lastSpeed || 1;
    game.phase = 'busy';
    setSpeed(0, true);
    game.usedWords.add(word);
    game.currentWord = word;
    setFormEnabled(false);
    document.querySelectorAll('.card').forEach((c) => { if (c.querySelector('.vert').textContent === word) c.classList.add('used'); });
    $('word-input').value = '';
    updateCount();
    renderSteps();

    const era = game.era;
    const mi = nowMonth();
    const date = dateAt(mi);
    logEl('log-drop', '▼ ' + esc(fmtDate(date)) + '、' + esc(era.place) + 'に神託 <b>' + esc(word) + '</b> が下された！（時間停止）');
    const thinking = logEl('log-thinking', (WD.Oracle.online(settings) ? 'Gemini' : '予言エンジン') + 'がこの先30年・3世代の歴史を演算中');
    Sfx.play('drop');
    game.world.dropWord(word);

    const pending = game.schedule.filter((e) => !e.fired).sort((a, b) => a.month - b.month);
    const ctx = {
      mode: game.mode, era, word, date, century: game.century,
      params: Object.assign({}, game.params),
      drops: game.drops.map((d) => ({ word: d.word, title: d.title, date: d.date, fired: d.fired, century: d.century })),
      pending: pending.map((e) => Object.assign(dateAt(e.month), { word: game.drops[e.drop].word, text: e.text })),
    };
    const [res] = await Promise.all([WD.Oracle.drop(ctx, settings), sleep(1900)]);
    if (game.phase !== 'busy') return; // 演算中にタイトルへ戻った等
    thinking.remove();
    if (res.error) toast('Gemini通信エラー：' + res.error + '　→ オフライン予言で代行しました', 6000);
    updateSourceHud(res.source);
    const result = res.result;

    const idx = game.drops.length;
    game.drops.push({ word, title: result.title, date: { year: date.year, month: date.month }, fired: [], total: result.events.length, century: game.century });
    for (const ev of result.events) game.schedule.push(Object.assign({}, ev, { month: mi + ev.offset * 12, drop: idx, fired: false }));
    game.oracles--;
    game.cooldownUntil = mi + COOLDOWN_MONTHS;

    logEl('log-title', '【' + esc(result.title) + '】の予言が3世代にわたって刻まれた');
    logEl('log-plan', WD.GENERATIONS.map((g) => '<span class="plan-gen">' + g.name + '</span>' + g.offsets.map((o) => {
      const due = mi + o * 12;
      return '<span class="plan">+' + o + '年 ' + esc(WD.fmtYear(dateAt(due).year)) + '</span>';
    }).join('')).join(''));

    game.currentWord = '';
    updateDropLeft();
    dealCards();
    game.phase = 'live';
    // +0年（投下直後）の出来事はその場で起きる
    for (const ev of game.schedule.filter((e) => !e.fired && e.month <= mi)) {
      fireEvent(ev);
      if (game.phase !== 'live') return;
    }
    setSpeed(resume, true);
    renderSteps();
    renderClock(true);
    refreshForm();
    saveGame();
  }

  function refreshForm() {
    const locked = game.oracles <= 0 || game.cooldownUntil > nowMonth();
    setFormEnabled(game.phase === 'live' && !locked);
    $('word-input').placeholder = game.oracles <= 0 ? '神託は次の100年で回復します' : locked ? '神託のクールタイム中…' : '単語を入力（15文字以内）';
    $('cards').classList.toggle('locked', locked);
    updateLock();
  }

  /* 神託のクールタイム表示：「次の神託解禁まで：あと X 年（〇〇年）」＋充填バー */
  function updateLock() {
    const box = $('oracle-lock');
    if (!game.era) { box.classList.add('hidden'); return; }
    const mi = nowMonth();
    const btn = $('btn-drop');
    if (game.oracles <= 0) {
      box.classList.remove('hidden');
      $('lock-text').textContent = '🔒 この100年の神託はすべて使い切った（次の100年で★★★に回復）';
      $('lock-fill').style.width = '0%';
      btn.innerHTML = '🔒<small>神託切れ</small>';
      return;
    }
    if (game.cooldownUntil > mi) {
      const left = game.cooldownUntil - mi;
      const years = Math.ceil(left / 12);
      box.classList.remove('hidden');
      $('lock-text').textContent = '🔒 次の神託解禁まで：あと ' + years + ' 年（' + WD.fmtYear(dateAt(game.cooldownUntil).year) + '）';
      $('lock-fill').style.width = (((COOLDOWN_MONTHS - left) / COOLDOWN_MONTHS) * 100).toFixed(1) + '%';
      btn.innerHTML = '🔒 あと' + years + '年<small>' + stars(game.oracles) + '</small>';
      return;
    }
    box.classList.add('hidden');
    btn.innerHTML = '歴史に投下<small id="drop-left">' + stars(game.oracles) + '</small>';
  }

  /* ---------- 次の歴史イベントまでスキップ ---------- */
  function skipToNextEvent() {
    if (game.phase !== 'live') return;
    const mi = nowMonth();
    const next = game.schedule.filter((e) => !e.fired).sort((a, b) => a.month - b.month)[0];
    const nh = game.histEvents.find((h) => !h.fired);
    let target = Math.min(next ? next.month : Infinity, nh ? nh.month : Infinity, clock.nextMini, (game.century + 1) * CENTURY_MONTHS);
    if (target <= mi) target = mi + 1;
    Sfx.play('select');
    showNews('⏭ ' + fmtDate(dateAt(mi)) + ' → ' + fmtDate(dateAt(target)) + ' まで時を進めた');
    while (clock.month < target && game.phase === 'live') {
      clock.month++;
      clock.m = clock.month;
      onMonth(clock.month);
    }
    renderClock(true);
  }

  /* ---------- 百年史の到達点 ---------- */
  function openMilestone() {
    game.phase = 'milestone';
    setSpeed(0, true);
    setFormEnabled(false);
    const c = game.century;
    const start = game.centuryStart || { params: WD.BASE_PARAMS, month: c * CENTURY_MONTHS };
    const y0 = dateAt(start.month).year, y1 = dateAt(nowMonth()).year;
    const mine = game.drops.filter((d) => d.century === c);
    const carry = game.schedule.filter((e) => !e.fired).length;
    $('ms-tag').textContent = 'CENTURY ' + (c + 1) + ' COMPLETE';
    $('ms-title').textContent = '百年史の到達点 ― 第' + (c + 1) + '世紀';
    $('ms-sub').textContent = game.era.name + '（' + game.era.place + '）　' + WD.fmtYear(y0) + ' 〜 ' + WD.fmtYear(y1) + '　開始から' + (c + 1) * 100 + '年';
    $('ms-image').src = game.world.snapshot();
    $('ms-caption').textContent = '図　' + fmtDate(dateAt(nowMonth())) + 'の浮島（空撮）';
    $('ms-words').innerHTML = mine.length
      ? mine.map((d) => {
        const last = d.fired[d.fired.length - 1];
        return '<tr><td>' + esc(fmtDate(d.date)) + '<br><b>「' + esc(d.word) + '」</b></td><td><b>' + esc(d.title) + '</b>（' + d.fired.length + '/' + d.total + '件）<br><span class="ms-last">' + esc(last ? last.text : 'まだ何も起きていない') + '</span></td></tr>';
      }).join('')
      : '<tr><td colspan="2">この100年、神託は一度も下されなかった。</td></tr>';
    $('ms-words').innerHTML += game.histDone.filter((h) => h.century === c).map((h) =>
      '<tr class="ms-hist"><td>' + esc(WD.fmtYear(h.year)) + '<br><b>史実</b></td><td>『' + esc(h.name) + '』→ <b>「' + esc(h.title) + '」</b><br><span class="ms-last">' + esc(h.text) + '</span></td></tr>').join('');
    $('ms-params').innerHTML = WD.PARAMS.map((p) => {
      const a = start.params[p.key], b = game.params[p.key], d = b - a;
      return '<span><i style="color:' + p.color + '">' + p.name + '</i> ' + a + ' → <b>' + b + '</b> <em class="' + (d >= 0 ? 'up' : 'down') + '">(' + (d > 0 ? '+' : '') + d + ')</em></span>';
    }).join('');
    $('ms-summary').textContent = 'この100年で' + game.era.place + 'は「' + WD.describeState(game.params) + '」へと姿を変えた。' +
      (carry ? 'まだ' + carry + '件の予言が次の世紀へ持ち越されている。' : '');
    $('ms-continue-label').textContent = ((c + 1) * 100 + 1) + '年目以降もこのまま継続する（次の100年へ）';
    logEl('log-era', '◆ 開始から' + (c + 1) * 100 + '年　第' + (c + 1) + '世紀の終わり');
    Sfx.play('fanfare');
    $('milestone-modal').classList.remove('hidden');
    saveGame();
  }

  function continueCentury() {
    if (game.phase !== 'milestone') return;
    $('milestone-modal').classList.add('hidden');
    game.century++;
    game.oracles = WD.ORACLES_PER_CENTURY;
    game.centuryStart = { params: Object.assign({}, game.params), month: nowMonth() };
    const d = dateAt(nowMonth());
    showBanner('第' + (game.century + 1) + '世紀 ― 次の100年へ', fmtDate(d), '神託が★★★に回復した');
    logEl('log-era', '◆ 第' + (game.century + 1) + '世紀　' + esc(fmtDate(d)) + '〜　神託が回復した');
    $('hud-era').textContent = game.era.name + '（' + game.era.sub + '）／第' + (game.century + 1) + '世紀';
    Sfx.play('start');
    dealCards();
    updateDropLeft();
    game.phase = 'live';
    refreshForm();
    renderSteps();
    renderClock(true);
    setSpeed(clock.lastSpeed || 1, true);
    saveGame();
  }

  /* ---------- オートセーブ ---------- */
  function saveGame() {
    if (!game.era || !game.world || (game.phase !== 'live' && game.phase !== 'milestone')) return;
    const logNodes = [...$('log').children].slice(-150).map((n) => n.outerHTML).join('');
    const data = {
      v: 1, savedAt: Date.now(), mode: game.mode.key, eraId: game.era.id, phase: game.phase,
      params: game.params, century: game.century, oracles: game.oracles, centuryStart: game.centuryStart,
      clock: { m: clock.m, nextMini: clock.nextMini, speed: clock.lastSpeed },
      drops: game.drops, schedule: game.schedule, usedWords: [...game.usedWords],
      cooldownUntil: game.cooldownUntil, histEvents: game.histEvents, histDone: game.histDone, view: game.world.view,
      log: logNodes, world: game.world.serialize(),
    };
    try { localStorage.setItem(WD.SAVE_KEY, JSON.stringify(data)); } catch (e) { /* 容量不足などは無視 */ }
  }
  function loadSave() {
    try {
      const d = JSON.parse(localStorage.getItem(WD.SAVE_KEY) || 'null');
      return d && d.v === 1 && WD.ERAS.some((e) => e.id === d.eraId) ? d : null;
    } catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(WD.SAVE_KEY); } catch (e) { /* ignore */ } }

  function resumeGame() {
    const sv = loadSave();
    if (!sv) { toast('セーブデータが見つかりません'); return; }
    const mode = WD.MODES[sv.mode] || WD.MODES.chaos;
    const era = WD.ERAS.find((e) => e.id === sv.eraId);
    titleWorld.stop();
    $('title-screen').classList.add('hidden');
    $('game-screen').classList.remove('hidden');
    hideModals();
    if (game.world) game.world.stop();
    Object.assign(game, {
      mode, era, params: sv.params, phase: 'idle', usedWords: new Set(sv.usedWords || []),
      drops: sv.drops || [], schedule: sv.schedule || [], collapsed: false, currentWord: '', result: null, autoPaused: 0,
      century: sv.century || 0, oracles: sv.oracles, centuryStart: sv.centuryStart,
      cooldownUntil: sv.cooldownUntil === undefined ? -1 : sv.cooldownUntil,
      histEvents: sv.histEvents || [], histDone: sv.histDone || [],
    });
    const mi = Math.floor(sv.clock.m);
    Object.assign(clock, { m: sv.clock.m, month: mi, nextMini: sv.clock.nextMini, lastSpeed: sv.clock.speed || 1, shown: '' });
    game.world = WD.IsoWorld.restore($('world'), { onImpact: () => Sfx.play('impact'), onLand: () => Sfx.play('thud') }, sv.world);
    game.world.setParams(game.params);
    if (sv.view) game.world.view = sv.view;
    game.world.setSeason(dateAt(mi).month, era);
    game.world.start();

    $('panel-course').textContent = mode.name;
    $('log').innerHTML = sv.log || '';
    $('hud-era').textContent = era.name + '（' + era.sub + '）' + (game.century ? '／第' + (game.century + 1) + '世紀' : '');
    $('btn-next').classList.add('hidden');
    $('drop-form').classList.remove('hidden');
    buildParams();
    renderParams();
    fitCanvas();
    updateSourceHud();
    dealCards();
    updateDropLeft();
    logEl('log-era', '◆ ' + esc(fmtDate(dateAt(mi))) + '　続きから再開（一時停止中）');
    game.phase = 'live';
    setSpeed(0, true);
    refreshForm();
    renderClock(true);
    renderSteps();
    startClock();
    if (sv.phase === 'milestone') openMilestone();
    else toast('続きから再開しました。▶ で時間が動き出します', 4000);
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

  function gameOver(kind, trigger) {
    game.phase = 'ended';
    game.collapsed = true;
    clearSave();
    setSpeed(0, true);
    setFormEnabled(false);
    renderSteps();
    game.world.collapse();
    Sfx.play('collapse');
    const era = game.era;
    const mi = nowMonth();
    const date = trigger.date;
    const [reason, text] = COLLAPSE[kind];
    const brokenKey = kind.split('-')[0];
    const brokenParam = WD.PARAMS.find((p) => p.key === brokenKey);
    const words = game.drops.map((d) => d.word);
    const cause = trigger.type === 'event'
      ? '「' + trigger.drop.word + '」の投下から' + trigger.ev.offset + '年後の' + fmtDate(date) + '、'
      : trigger.type === 'history'
        ? fmtDate(date) + '、史実の『' + trigger.he.name + '』が「' + trigger.r.title + '」として起きたことで、'
        : fmtDate(date) + '、日常のささいな出来事が最後のひと押しとなり、';
    const findings = WD.fmtYear(era.year) + 'に始まった' + era.name + '（' + era.sub + '）の' + era.place + '。' +
      (game.drops.length ? '神託として投下された「' + words.slice(-4).join('」「') + '」' + (words.length > 4 ? 'など' : '') + 'は' + game.drops.slice(-4).map((d) => '「' + d.title + '」').join('、') + 'を引き起こした。' : '神託は一度も下されなかった。') +
      'そして開始から' + Math.floor(mi / 12) + '年後、' + cause + brokenParam.name + 'が' + (kind.endsWith('-lo') ? '0を下回り' : '100を突破し') + '、' + text;
    const triggerText = trigger.type === 'event'
      ? '「' + WD.GENERATIONS[WD.generationOf(trigger.ev.offset)].name + '・+' + trigger.ev.offset + '年」' + trigger.ev.text
      : trigger.type === 'history'
        ? '「史実イベント」『' + trigger.he.name + '』→「' + trigger.r.title + '」' + trigger.r.text
        : '「日常の出来事」' + trigger.text;
    let no = 0;
    for (const ch of words.join('') + era.name) no = (no * 31 + ch.charCodeAt(0)) % 9000;
    const sns = '【WORDROP 滅亡調査報告書】' + era.name + '（' + WD.fmtYear(era.year) + '〜）' + (words.length ? 'に「' + words.join('」「') + '」を投下したら、' : 'で、') +
      Math.floor(mi / 12) + '年後の' + fmtDate(date) + 'に「' + reason + '」で文明が崩壊しました…。 #WORDROP #歴史改変';
    let rows = game.drops.map((d) => ['第' + (d.century + 1) + '世紀 ' + fmtDate(d.date), '「' + d.word + '」→ ' + d.title + '（' + d.fired.length + '/' + d.total + '件）', trigger.type === 'event' && d === trigger.drop]);
    if (trigger.type === 'daily') rows.push([fmtDate(date), '日常：' + trigger.text, true]);
    if (trigger.type === 'history') rows.push([fmtDate(date) + ' 史実', '『' + trigger.he.name + '』→「' + trigger.r.title + '」', true]);
    const imgRows = rows.length > 4 ? rows.slice(-4) : rows;

    // 崩れ落ちていく瞬間の浮島を撮影してから報告書を開く
    let snapshot = null;
    setTimeout(() => { snapshot = game.world.snapshot(); }, 1300);
    setTimeout(() => {
      snapshot = snapshot || game.world.snapshot();
      $('rp-no').textContent = '報告書 第' + String(1000 + no) + '号';
      $('collapse-reason').textContent = '「' + reason + '」（' + brokenParam.name + (kind.endsWith('-lo') ? '消滅' : '暴走') + '）';
      $('collapse-text').textContent = findings;
      $('rp-trigger').textContent = triggerText;
      $('rp-image').src = snapshot;
      $('rp-history').innerHTML = rows.map(([l, r, hot]) => '<tr' + (hot ? ' class="hot"' : '') + '><td>' + esc(l) + '</td><td>' + esc(r) + '</td></tr>').join('');
      $('rp-params').innerHTML = WD.PARAMS.map((p) => {
        const broken = p.key === brokenKey;
        return '<span' + (broken ? ' class="broken"' : '') + '>' + p.name + ' <b>' + game.params[p.key] + '</b>' + (broken ? '（臨界突破）' : '') + '</span>';
      }).join('');
      $('collapse-sns').value = sns;
      $('btn-share-x-collapse').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(sns);
      setResultImage({
        kind: 'collapse',
        banner: 'GAME OVER ― 文明崩壊',
        header: '時空省 歴史改変事故調査委員会　報告書 第' + String(1000 + no) + '号',
        stamp: '滅亡',
        heading: '滅亡調査報告書：「' + reason + '」',
        body: findings,
        extra: { label: '直接の引き金（' + fmtDate(date) + '）', text: triggerText },
        rows: imgRows,
        params: WD.PARAMS.map((p) => ({ name: p.name, value: game.params[p.key], color: p.dark, broken: p.key === brokenKey })),
        caption: '証拠写真1　崩壊直後の浮島（' + fmtDate(date) + '）',
        snapshot,
      });
      $('collapse-modal').classList.remove('hidden');
    }, 2200);
  }

  /* ---------- エンディング（百年史の到達点で「確定」を選んだとき） ---------- */
  async function finale() {
    if (game.phase !== 'milestone') return;
    $('milestone-modal').classList.add('hidden');
    game.phase = 'final';
    clearSave();
    setSpeed(0, true);
    setFormEnabled(false);
    const mi = nowMonth();
    const end = dateAt(mi);
    const centuries = game.century + 1;
    const targetYear = Math.max(2026, end.year);
    const msg = centuries * 100 + '年の歴史を確定した';
    showBanner('HISTORY CONFIRMED', msg, fmtDate(end) + ' → そして' + targetYear + '年へ');
    logEl('log-era', '◆ ' + esc(fmtDate(end)) + '　' + esc(msg));
    const thinking = logEl('log-thinking', 'この' + centuries * 100 + '年が' + targetYear + '年をどう変えたか、教科書を編纂中');
    Sfx.play('fanfare');
    game.world.setEnv({ sky: game.params.distortion > 60 ? 'aurora' : game.params.technology > 70 ? 'cyber' : 'golden', weather: 'none' });
    game.world.syncAuto();

    const ctx = {
      mode: game.mode, era: game.era, params: Object.assign({}, game.params), end, centuries, targetYear,
      start: { year: game.era.year },
      drops: game.drops.map((d) => ({ word: d.word, title: d.title, date: d.date, fired: d.fired, century: d.century })),
      history: game.histDone,
    };
    const [res] = await Promise.all([WD.Oracle.finale(ctx, settings), sleep(2600)]);
    if (game.phase !== 'final') return;
    thinking.remove();
    if (res.error) toast('Gemini通信エラー：' + res.error + '　→ オフラインで編纂しました', 6000);
    const r = res.result;
    logEl('log-title', '【' + esc(r.chapter) + '】');
    $('hud-year').textContent = targetYear + '年';
    $('hud-era').textContent = '最終到達点';

    const rows = game.drops.map((d) => ['第' + (d.century + 1) + '世紀 ' + fmtDate(d.date), '「' + d.word + '」→ ' + d.title + '（' + d.fired.length + '/' + d.total + '件）', false]);
    rows.push(...game.histDone.map((h) => [WD.fmtYear(h.year) + ' 史実', '『' + h.name + '』→「' + h.title + '」', false]));
    const last = [targetYear + '年', WD.describeState(game.params), true];
    $('tb-title').textContent = r.title;
    $('tb-chapter').textContent = r.chapter;
    $('tb-text').textContent = r.body;
    $('tb-image').src = game.world.snapshot();
    $('tb-caption').textContent = '図1　' + fmtDate(end) + '、' + centuries * 100 + '年を経た浮島（空撮）';
    $('tb-keywords').innerHTML = r.keywords.map((k) => '<span class="kw">' + esc(k) + '</span>').join('');
    $('tb-history').innerHTML =
      '<tr><td>' + esc(WD.fmtYear(game.era.year)) + '〜</td><td>' + esc(game.era.name) + '（' + esc(game.era.sub) + '）から' + centuries * 100 + '年</td></tr>' +
      rows.concat([last]).map(([l, rr]) => '<tr><td>' + esc(l) + '</td><td>' + esc(rr) + '</td></tr>').join('');
    $('tb-params').innerHTML = WD.PARAMS.map((p) => '<span>' + p.name + ' <b style="color:' + p.dark + '">' + game.params[p.key] + '</b></span>').join('');
    $('sns-text').value = r.sns;
    $('btn-share-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(r.sns);
    // 画像の表は収まる分だけ（最近の神託を優先）
    const imgRows = rows.length > 4 ? [['…', '（ほか' + (rows.length - 3) + '件の神託）', false]].concat(rows.slice(-3)) : rows;
    setResultImage({
      kind: 'clear',
      banner: targetYear + '年 ― 最終到達点',
      header: r.title,
      stamp: '時空省検定済',
      heading: r.chapter,
      body: r.body,
      rows: [[WD.fmtYear(game.era.year) + '〜', game.era.name + 'から' + centuries * 100 + '年', false]].concat(imgRows, [last]),
      params: WD.PARAMS.map((p) => ({ name: p.name, value: game.params[p.key], color: p.dark, broken: false })),
      caption: '図1　' + fmtDate(end) + 'の浮島（空撮）',
      snapshot: $('tb-image').src,
    });
    game.phase = 'ended';
    await sleep(900);
    $('ending-modal').classList.remove('hidden');
  }

  function hideModals() {
    $('ending-modal').classList.add('hidden');
    $('collapse-modal').classList.add('hidden');
    $('draft-modal').classList.add('hidden');
    $('milestone-modal').classList.add('hidden');
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

  /* ---------- 結果カード画像（PNG） ---------- */
  // 共有ボタンはユーザー操作の直後に呼ぶ必要があるため、モーダルを開いた時点で先に描いておく
  function setResultImage(data) {
    game.result = { data, blob: null, pending: WD.ShareImage.blob(data) };
    game.result.pending.then((b) => { if (game.result && game.result.data === data) game.result.blob = b; }).catch(() => {});
  }
  function resultBlob() {
    if (!game.result) return Promise.reject(new Error('結果がありません'));
    return game.result.blob ? Promise.resolve(game.result.blob) : game.result.pending;
  }
  function imageName() {
    const kind = game.result && game.result.data.kind === 'collapse' ? 'report' : 'textbook';
    return 'wordrop-' + kind + '-' + new Date().toISOString().slice(0, 10) + '.png';
  }
  async function saveImage() {
    try {
      const blob = await resultBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = imageName();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('画像を保存しました。Xの投稿に添付してください');
      Sfx.play('select');
    } catch (e) { toast('画像の生成に失敗しました：' + (e.message || e)); }
  }
  async function copyImage() {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': resultBlob() })]);
      toast('画像をコピーしました。Xの投稿欄に貼り付けできます');
      Sfx.play('select');
    } catch (e) {
      toast('このブラウザでは画像をコピーできません。「画像を保存」をお使いください');
    }
  }
  async function shareImage(textId) {
    try {
      const blob = await resultBlob();
      const file = new File([blob], imageName(), { type: 'image/png' });
      await navigator.share({ files: [file], text: $(textId).value });
    } catch (e) {
      if (e && e.name !== 'AbortError') toast('共有できませんでした：' + (e.message || e));
    }
  }

  /* ---------- キャンバスのフィット ---------- */
  function fitCanvas() {
    const pane = $('map-pane');
    const pad = window.matchMedia('(max-width: 760px), (max-width: 1024px) and (orientation: portrait)').matches ? 6 : 24;
    const pw = pane.clientWidth - pad, ph = pane.clientHeight - pad;
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
    $('btn-reroll').addEventListener('click', reroll);
    $('btn-skip').addEventListener('click', skipToNextEvent);
    $('btn-ms-continue').addEventListener('click', continueCentury);
    $('btn-ms-finish').addEventListener('click', () => finale());
    // タブを閉じる・隠すときにもセーブ
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
    window.addEventListener('pagehide', saveGame);
    document.querySelectorAll('.spd').forEach((b) => b.addEventListener('click', () => {
      if (game.phase !== 'live') return;
      setSpeed(+b.dataset.speed);
    }));
    document.addEventListener('keydown', (e) => {
      if (!$('settings-modal').classList.contains('hidden')) return;
      if (game.phase === 'draft' && !$('draft-modal').classList.contains('hidden')) {
        if (e.key >= '1' && e.key <= '3' && game.draft[+e.key - 1]) pickEra(game.draft[+e.key - 1]);
        else if (e.key === 'r' || e.key === 'R') reroll();
        return;
      }
      if (game.phase !== 'live' || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
      if (e.key === ' ') { e.preventDefault(); setSpeed(clock.speed ? 0 : clock.lastSpeed || 1); }
      else if (e.key === '1' || e.key === '2' || e.key === '4') setSpeed(+e.key);
      else if (e.key === 's' || e.key === 'S') skipToNextEvent();
    });
    $('log').addEventListener('click', () => { skipTyping = true; });
    $('btn-mute').addEventListener('click', () => {
      const m = Sfx.toggle();
      $('btn-mute').classList.toggle('off', m);
    });
    $('btn-mute').classList.toggle('off', Sfx.muted);
    $('btn-copy').addEventListener('click', () => copyText($('sns-text').value));
    $('btn-copy-collapse').addEventListener('click', () => copyText($('collapse-sns').value));
    document.querySelectorAll('.btn-img-save').forEach((b) => b.addEventListener('click', saveImage));
    document.querySelectorAll('.btn-img-copy').forEach((b) => {
      if (!WD.ShareImage.canCopy()) b.classList.add('hidden');
      b.addEventListener('click', copyImage);
    });
    document.querySelectorAll('.btn-img-share').forEach((b) => {
      if (WD.ShareImage.canShareFiles()) b.classList.remove('hidden');
      b.addEventListener('click', () => shareImage(b.dataset.result === 'collapse' ? 'collapse-sns' : 'sns-text'));
    });
    $('btn-retry').addEventListener('click', () => { hideModals(); startGame(game.mode.key); });
    document.querySelectorAll('.btn-restart').forEach((b) => b.addEventListener('click', () => { hideModals(); showTitle(); }));

    // 島のズーム・パン（ホイール／ドラッグ／ピンチ／ボタン）
    const canvas = $('world');
    const tip = $('tooltip');
    const toCanvas = (cx, cy) => { const r = canvas.getBoundingClientRect(); return { x: ((cx - r.left) * W) / r.width, y: ((cy - r.top) * H) / r.height, k: W / r.width }; };
    canvas.addEventListener('wheel', (e) => {
      if (!game.world) return;
      e.preventDefault();
      const p = toCanvas(e.clientX, e.clientY);
      game.world.zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
    }, { passive: false });
    const pointers = new Map();
    let pinch = 0;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!game.world || !pointers.has(e.pointerId)) return;
      const prev = pointers.get(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        const k = toCanvas(0, 0).k;
        game.world.panBy((e.clientX - prev.x) * k, (e.clientY - prev.y) * k);
        canvas.classList.add('grabbing');
        tip.classList.add('hidden');
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const c = toCanvas((a.x + b.x) / 2, (a.y + b.y) / 2);
        if (pinch) game.world.zoomAt(d / pinch, c.x, c.y);
        pinch = d;
      }
    });
    const endPointer = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = 0; if (!pointers.size) canvas.classList.remove('grabbing'); };
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('dblclick', () => game.world && game.world.resetView());
    document.querySelectorAll('.map-ctrl button').forEach((b) => b.addEventListener('click', () => {
      if (!game.world) return;
      const z = b.dataset.zoom;
      if (z === 'in') game.world.zoomAt(1.25); else if (z === 'out') game.world.zoomAt(0.8); else game.world.resetView();
    }));

    // 建物ツールチップ
    canvas.addEventListener('mousemove', (e) => {
      if (!game.world || pointers.size) return;
      const p = toCanvas(e.clientX, e.clientY);
      const b = game.world.pick(p.x, p.y);
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
