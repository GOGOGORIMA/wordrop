/* WORDROP — 100×100 浮島のアイソメトリック・プロシージャル描画 */
(function () {
  const N = 100;           // 100×100 タイル
  const HS = 3;            // 高さ1段あたりのピクセル
  const W = 840, H = 640;  // 内部解像度（CSS で pixelated 拡大）
  const OX = W / 2, OY = 60;
  const SEA_Y = H - 78;

  const VOID = 0, WATER = 1, SAND = 2, GRASS = 3, FOREST = 4, ROCK = 5, SNOW = 6;

  /* ---------- 乱数・ノイズ ---------- */
  function mulberry32(a) {
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(x, y, s) {
    let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function makeNoise(seed) {
    return function (x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
      const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  }
  function fbm(noise, x, y, oct) {
    let s = 0, amp = 1, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += noise(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2; }
    return s / norm;
  }

  /* ---------- 色 ---------- */
  function hex2rgb(h) {
    h = h.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgb2css(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  function shade(hex, amt) {
    const c = hex2rgb(hex);
    const f = amt >= 0 ? (v) => v + (255 - v) * amt : (v) => v * (1 + amt);
    return rgb2css(c.map(f));
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpRGB(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

  const SKY = {
    clear:   { c: ['#2f6fd0', '#7cc4ff', '#d6f1ff'], stars: 0 },
    dusk:    { c: ['#241a52', '#b34f7c', '#ffb066'], stars: 0.3 },
    night:   { c: ['#03060f', '#0c1840', '#24366e'], stars: 1 },
    storm:   { c: ['#1f232c', '#3f4655', '#6d7483'], stars: 0 },
    toxic:   { c: ['#16210c', '#4d6a18', '#b2c444'], stars: 0 },
    aurora:  { c: ['#020a18', '#0b3a4e', '#2bbf8f'], stars: 1 },
    crimson: { c: ['#1e0006', '#7a0d1c', '#ff5233'], stars: 0.2 },
    golden:  { c: ['#c06a00', '#ffbe3d', '#fff1b8'], stars: 0 },
    cyber:   { c: ['#080018', '#330a5e', '#e0279f'], stars: 0.7 },
  };
  const NIGHTNESS = { night: 1, aurora: 0.9, cyber: 0.75, dusk: 0.35, storm: 0.35, crimson: 0.4, toxic: 0.2 };
  const SEA = {
    blue:    ['#123d7a', '#2a6fc4', '#9fdcff'],
    emerald: ['#0b4a3e', '#17907a', '#8ff0d0'],
    dark:    ['#05101e', '#0f2440', '#4a6a8f'],
    red:     ['#3a0508', '#8c1418', '#ff8a6a'],
    purple:  ['#200a3a', '#5a2192', '#d79bff'],
    frozen:  ['#8fb4c9', '#cfe6f2', '#ffffff'],
    golden:  ['#6b4300', '#c89412', '#fff0a0'],
    toxic:   ['#1d2a05', '#5b7a10', '#d9f25a'],
  };
  const BASE_LAND = {
    grass: ['#4fa83a', '#5cb844'], forest: ['#2f7a2a', '#3b8c30'],
    tree: ['#1f5e22', '#3f9a3a', '#7ccc5a'], trunk: '#5a3a1e', treeKind: 'tree',
    sand: ['#e3cf8a', '#d6bf76'], rock: ['#8a8478', '#9a9488'], snow: ['#f2f6fa', '#dfe8f0'],
    dirt: ['#a8763e', '#7a5228'], under: ['#6b5a4a', '#5a4a3c', '#4a3c30', '#3a2e26'],
  };
  const LAND = {
    normal: {},
    lush: { grass: ['#3fb03a', '#4cc246'], forest: ['#1f7a2a', '#2a8c30'], tree: ['#145a1c', '#2f9a34', '#6ce05a'] },
    sakura: { grass: ['#5aaa48', '#66b852'], forest: ['#4a9a3c', '#58a846'], tree: ['#c05a8a', '#f29ac0', '#ffd8ea'] },
    desert: { grass: ['#d8b45a', '#e0c070'], forest: ['#c8a050', '#d0aa5a'], tree: ['#3a6a2a', '#5a8a3a', '#7aaa4a'], treeKind: 'cactus', sand: ['#ecd496', '#e4c884'], snow: ['#e8d4a4', '#dcc694'], rock: ['#b89a6a', '#c4a676'], dirt: ['#c08a4a', '#946434'] },
    frozen: { grass: ['#e8f0f6', '#d8e4ee'], forest: ['#c8d8e4', '#d0dee8'], tree: ['#2a4a4a', '#e8f2f8', '#ffffff'], sand: ['#dce8f0', '#cfdde8'], rock: ['#a8b8c8', '#b8c6d4'], dirt: ['#a8b8c8', '#8090a4'], under: ['#7a8a9c', '#6a7a8c', '#5a6a7c', '#4a5a6c'] },
    wasteland: { grass: ['#7a6a52', '#6e604a'], forest: ['#5e5444', '#665a48'], tree: ['#2a2420', '#3a3228', '#4a4034'], treeKind: 'dead', sand: ['#8a7a60', '#7e6e56'], rock: ['#4a3e3a', '#564842'], snow: ['#3a3030', '#443836'], dirt: ['#6a5a44', '#4a3e30'], under: ['#4a4038', '#3e362e', '#322a24', '#28221c'], lava: ['#ff5a1a', '#ffb030'] },
    jungle: { grass: ['#2a8a2e', '#349a36'], forest: ['#1a6a22', '#207428'], tree: ['#0e4a18', '#1f7a28', '#4cc04a'], treeKind: 'palm', sand: ['#c8b878', '#bcaa6a'], dirt: ['#7a5a30', '#5a3e20'], extraTrees: 0.32 },
    urban: { grass: ['#8a8a8e', '#94949a'], forest: ['#3a7a3a', '#448a40'], sand: ['#b0a890', '#a49c84'], rock: ['#76747a', '#807e84'], snow: ['#c8c8d0', '#d4d4dc'], dirt: ['#8a8070', '#6a6254'], under: ['#6a6660', '#5a5650', '#4a4640', '#3a3632'], paving: '#6c6c72' },
    cyber: { grass: ['#1a1a2e', '#20203a'], forest: ['#14142a', '#18182e'], tree: ['#a0f8ff', '#25e0ff', '#ff3ad0'], treeKind: 'neon', sand: ['#2e2e4e', '#34345a'], rock: ['#2a2a40', '#30304a'], snow: ['#5a5aa0', '#6464aa'], dirt: ['#30305a', '#20203e'], under: ['#1a1a30', '#22223c', '#141428', '#0e0e1e'], grid: '#25e0ff' },
    flooded: { grass: ['#4a9a40', '#56a84a'], flood: 3 },
  };
  function landPalette(key) { return Object.assign({}, BASE_LAND, LAND[key] || {}); }

  function bytesToB64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /* ================================================================ */
  class IsoWorld {
    constructor(canvas, opts) {
      opts = opts || {};
      this.canvas = canvas;
      canvas.width = W; canvas.height = H;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.seed = opts.seed || ((Math.random() * 1e9) | 0);
      this.course = opts.course || 'japan';
      this.rnd = mulberry32(this.seed ^ 0x9e3779b9);
      this.cache = document.createElement('canvas');
      this.cache.width = W; this.cache.height = H;
      this.cctx = this.cache.getContext('2d');
      this.dirty = true;

      this.env = { sky: 'clear', sea: 'blue', land: 'normal', weather: 'none' };
      this.skyCur = SKY.clear.c.map(hex2rgb);
      this.seaCur = SEA.blue.map(hex2rgb);
      this.starsCur = 0;
      this.nightCur = 0;

      this.params = { population: 45, technology: 30, order: 50, distortion: 0 };
      this.buildings = [];
      this.people = [];
      this.particles = [];
      this.drops = [];
      this.flash = 0;
      this.shake = 0;
      this.time = 0;
      this.bob = 0;
      this.idle = !!opts.idle;
      this.onImpact = opts.onImpact || null;
      this.onLand = opts.onLand || null;
      this.spawnTimer = 0;
      this.timeScale = 1;          // 時計の速度（0 = 一時停止）。住人の歩く速さに反映
      this.seasonTint = null;      // 季節ごとの地表の色味
      this.seasonWeather = null;   // 季節の天気（環境の天気が none のときだけ使う）
      this.tcache = document.createElement('canvas');
      this.tcache.width = W; this.tcache.height = H;
      this.tintDirty = true;

      this.generate();
      this.makeSkyDecor();
      this.loop = this.loop.bind(this);
      this.running = false;
    }

    /* ---------- 地形生成 ---------- */
    generate() {
      const nA = makeNoise(this.seed + 1), nB = makeNoise(this.seed + 2), nC = makeNoise(this.seed + 3);
      const rnd = mulberry32(this.seed);
      this.h = new Int8Array(N * N);
      this.type = new Uint8Array(N * N);
      this.depth = new Int16Array(N * N);
      this.occ = new Uint8Array(N * N);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
          const i = y * N + x;
          const dx = (x - 49.5) / 50, dy = (y - 49.5) / 50;
          const d = Math.sqrt(dx * dx + dy * dy);
          const dd = d + (fbm(nA, x / 14, y / 14, 3) - 0.5) * 0.5;
          if (dd > 0.86) { this.type[i] = VOID; continue; }
          const e = 1 - dd / 0.86;
          const m = fbm(nB, x / 18, y / 18, 4);
          const ridge = 1 - Math.abs(fbm(nC, x / 22, y / 22, 3) * 2 - 1);
          let hv = 1.4 + e * 2.6 + (m - 0.5) * 4.5 + Math.max(0, ridge - 0.72) * Math.min(1, e * 1.6) * 34;
          this.h[i] = Math.max(1, Math.min(12, Math.round(hv)));
          this.depth[i] = Math.round(10 + Math.pow(e, 0.7) * 150 * (0.7 + nA(x / 5 + 50, y / 5) * 0.6) + hash2(x, y, 9) * 8);
          const hh = this.h[i];
          if (hh >= 11) this.type[i] = SNOW;
          else if (hh >= 8) this.type[i] = ROCK;
          else if (fbm(nB, x / 9 + 100, y / 9, 3) > 0.55) this.type[i] = FOREST;
          else this.type[i] = GRASS;
        }
      }
      this.carveRiver(rnd);
      // 水辺は砂浜
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const t = this.type[i];
        if (t === VOID || t === WATER) continue;
        let near = false;
        for (let oy = -1; oy <= 1 && !near; oy++) for (let ox = -1; ox <= 1; ox++) {
          const j = this.idx(x + ox, y + oy);
          if (j >= 0 && this.type[j] === WATER && this.h[i] <= this.h[j] + 1) { near = true; break; }
        }
        if (near) this.type[i] = SAND;
      }
      this.refreshLists();
    }

    carveRiver(rnd) {
      let best = -1, bh = -1;
      for (let k = 0; k < 400; k++) {
        const x = 25 + ((rnd() * 40) | 0), y = 15 + ((rnd() * 40) | 0);
        const i = y * N + x;
        if (this.type[i] !== VOID && this.h[i] > bh) { bh = this.h[i]; best = i; }
      }
      if (best < 0) return;
      let x = best % N, y = (best / N) | 0;
      let cur = Math.max(1, this.h[best] - 1);
      const visited = new Set([best]);
      this.mouth = null;
      let lakeAt = 20 + ((rnd() * 20) | 0);
      for (let step = 0; step < 260; step++) {
        const i = y * N + x;
        this.type[i] = WATER; this.h[i] = cur;
        if (step > 30) {
          const j = this.idx(x + 1, y);
          if (j >= 0 && this.type[j] !== VOID) { this.type[j] = WATER; this.h[j] = cur; }
        }
        if (step === lakeAt) {
          for (let oy = -4; oy <= 4; oy++) for (let ox = -4; ox <= 4; ox++) {
            if (ox * ox + oy * oy > 14) continue;
            const j = this.idx(x + ox, y + oy);
            if (j >= 0 && this.type[j] !== VOID) { this.type[j] = WATER; this.h[j] = cur; }
          }
        }
        let bestN = null, bs = 1e9;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + ox, ny = y + oy;
          const j = this.idx(nx, ny);
          if (j < 0) { bestN = { x: nx, y: ny, edge: true }; bs = -1e9; break; }
          if (visited.has(j)) continue;
          if (this.type[j] === VOID) { bestN = { x: nx, y: ny, edge: true }; bs = -1e9; break; }
          const sc = this.h[j] - 0.09 * (nx + ny) + rnd() * 0.5;
          if (sc < bs) { bs = sc; bestN = { x: nx, y: ny }; }
        }
        if (!bestN) break;
        if (bestN.edge) { this.mouth = { x, y, dx: bestN.x - x, dy: bestN.y - y }; break; }
        x = bestN.x; y = bestN.y;
        visited.add(y * N + x);
        cur = Math.max(1, Math.min(cur, this.h[y * N + x]));
      }
    }

    idx(x, y) { return x < 0 || y < 0 || x >= N || y >= N ? -1 : y * N + x; }
    heightAt(x, y) { const i = this.idx(x, y); return i < 0 || this.type[i] === VOID ? 0 : this.h[i]; }
    isWaterTile(i) {
      const t = this.type[i];
      if (t === WATER) return true;
      const fl = this.flood();
      return fl > 0 && t !== VOID && this.h[i] <= fl;
    }
    flood() { return LAND[this.env.land] && LAND[this.env.land].flood ? LAND[this.env.land].flood : 0; }
    walkable(i) { return i >= 0 && this.type[i] !== VOID && !this.isWaterTile(i) && !this.occ[i]; }

    refreshLists() {
      this.landList = [];
      this.waterList = [];
      for (let i = 0; i < N * N; i++) {
        if (this.type[i] === VOID) continue;
        if (this.isWaterTile(i)) this.waterList.push(i); else this.landList.push(i);
      }
      // 水からの距離（田畑の配置用）
      const dist = new Int16Array(N * N).fill(999);
      const q = [];
      for (const i of this.waterList) { dist[i] = 0; q.push(i); }
      for (let qi = 0; qi < q.length; qi++) {
        const i = q[qi], x = i % N, y = (i / N) | 0;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = this.idx(x + ox, y + oy);
          if (j >= 0 && this.type[j] !== VOID && dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; q.push(j); }
        }
      }
      this.waterDist = dist;
    }

    screen(x, y, h) { return { sx: OX + (x - y) * 4, sy: OY + (x + y) * 2 - h * HS }; }

    /* ---------- 地形をキャッシュに描く ---------- */
    renderTerrain() {
      const g = this.cctx;
      g.clearRect(0, 0, W, H);
      const L = landPalette(this.env.land);
      const sea = SEA[this.env.sea] || SEA.blue;
      const fl = this.flood();

      // 地層パターン
      const mk = (dark) => {
        const c = document.createElement('canvas'); c.width = 1; c.height = 26;
        const pg = c.getContext('2d');
        const bands = [[L.under[0], 7], [L.under[1], 5], [L.under[0], 4], [L.under[2], 6], [L.under[1], 4]];
        let y = 0;
        for (const [col, n] of bands) { pg.fillStyle = dark ? shade(col, -0.25) : col; pg.fillRect(0, y, 1, n); y += n; }
        return g.createPattern(c, 'repeat');
      };
      const patL = mk(false), patR = mk(true);
      const dirtL = L.dirt[0], dirtR = L.dirt[1];
      const tip = shade(L.under[3], -0.2);

      for (let s = 0; s <= 2 * N - 2; s++) {
        const x0 = Math.max(0, s - N + 1), x1 = Math.min(N - 1, s);
        for (let x = x0; x <= x1; x++) {
          const y = s - x;
          const i = y * N + x;
          const t = this.type[i];
          if (t === VOID) continue;
          let h = this.h[i];
          const water = t === WATER || (fl > 0 && h <= fl);
          if (water && fl > h) h = fl;
          const sx = OX + (x - y) * 4;
          const gy = OY + (x + y) * 2;
          const sy = gy - h * HS;
          const bottom = gy + 2 + this.depth[i];
          const dirtBottom = gy + 7;

          // 側面（崖・浮島の底）
          g.fillStyle = dirtL; g.fillRect(sx - 4, sy + 2, 4, dirtBottom - sy - 2);
          g.fillStyle = dirtR; g.fillRect(sx, sy + 2, 4, dirtBottom - sy - 2);
          g.fillStyle = patL; g.fillRect(sx - 4, dirtBottom, 4, bottom - dirtBottom);
          g.fillStyle = patR; g.fillRect(sx, dirtBottom, 4, bottom - dirtBottom);
          g.fillStyle = tip; g.fillRect(sx - 3, bottom - 2, 6, 2);

          // 上面
          let col;
          const r = hash2(x, y, 3);
          if (water) {
            col = r < 0.5 ? sea[1] : shade(sea[1], -0.08);
          } else {
            let pal;
            if (t === SAND) pal = L.sand;
            else if (t === FOREST) pal = L.forest;
            else if (t === ROCK) pal = L.rock;
            else if (t === SNOW) pal = L.snow;
            else pal = L.grass;
            const base = r < 0.5 ? pal[0] : pal[1];
            const slope = (this.heightAt(x - 1, y) + this.heightAt(x, y - 1)) - (this.heightAt(x + 1, y) + this.heightAt(x, y + 1));
            const amt = Math.max(-0.22, Math.min(0.22, -slope * 0.07)) + (h - 4) * 0.012;
            col = shade(base, amt);
            if (L.grid && (x % 6 === 0 || y % 6 === 0)) col = L.grid;
            if (L.paving && t !== FOREST && (x % 4 === 0 || y % 4 === 0)) col = L.paving;
            if (L.lava && (t === ROCK || t === SNOW) && hash2(x, y, 13) < 0.22) col = L.lava[r < 0.5 ? 0 : 1];
          }
          g.fillStyle = col;
          g.fillRect(sx - 2, sy, 4, 1);
          g.fillRect(sx - 4, sy + 1, 8, 2);
          g.fillRect(sx - 2, sy + 3, 4, 1);
          if (water && r > 0.85) { g.fillStyle = sea[2]; g.fillRect(sx - 1, sy + 1, 2, 1); }

          // 木
          if (!water && !this.occ[i]) {
            const tr = hash2(x, y, 7);
            if ((t === FOREST && tr < (L.extraTrees ? 0.85 : 0.5)) || (L.extraTrees && t === GRASS && tr < L.extraTrees)) this.drawTree(g, sx, sy + 2, L, hash2(x, y, 11));
          }
        }
      }
      this.dirty = false;
    }

    drawTree(g, x, y, L, r) {
      const [c0, c1, c2] = L.tree;
      const px = (xx, yy, w, h, c) => { g.fillStyle = c; g.fillRect(xx, yy, w, h); };
      switch (L.treeKind) {
        case 'cactus':
          if (r < 0.5) return;
          px(x, y - 6, 1, 6, c1); px(x - 2, y - 4, 1, 2, c1); px(x - 1, y - 3, 1, 1, c1);
          px(x + 2, y - 5, 1, 2, c0); px(x + 1, y - 3, 1, 1, c0);
          return;
        case 'dead':
          px(x, y - 6, 1, 6, c1); px(x - 2, y - 5, 2, 1, c1); px(x + 1, y - 4, 2, 1, c0); px(x - 1, y - 7, 1, 1, c2);
          return;
        case 'palm':
          if (r < 0.4) break;
          px(x, y - 7, 1, 7, '#6a4a24');
          px(x - 3, y - 8, 7, 1, c1); px(x - 2, y - 9, 5, 1, c2); px(x - 3, y - 7, 1, 1, c0); px(x + 3, y - 7, 1, 1, c0);
          px(x - 1, y - 6, 1, 1, '#8a5a20');
          return;
        case 'neon':
          px(x, y - 2, 1, 2, '#3a3a5a');
          px(x - 2, y - 6, 5, 4, r < 0.5 ? c2 : c1); px(x - 1, y - 7, 3, 1, c0);
          return;
      }
      px(x, y - 2, 1, 3, L.trunk);
      px(x - 2, y - 5, 5, 3, c1);
      px(x - 1, y - 7, 3, 2, c1);
      px(x + 1, y - 5, 2, 3, c0);
      px(x - 1, y - 6, 1, 1, c2); px(x - 2, y - 4, 1, 1, c2); px(x, y - 8, 1, 1, c1);
    }

    /* ---------- 空の装飾 ---------- */
    makeSkyDecor() {
      const r = mulberry32(this.seed + 77);
      this.stars = [];
      for (let i = 0; i < 140; i++) this.stars.push({ x: (r() * W) | 0, y: (r() * (SEA_Y - 20)) | 0, p: r() * 6.28, b: r() });
      this.clouds = [];
      for (let i = 0; i < 9; i++) {
        const blobs = [];
        const n = 3 + ((r() * 4) | 0);
        for (let k = 0; k < n; k++) blobs.push([k * 10 + ((r() * 6) | 0), ((r() * 6) | 0) - 3, 10 + ((r() * 12) | 0), 6 + ((r() * 6) | 0)]);
        this.clouds.push({ x: r() * W, y: 20 + r() * (SEA_Y - 120), speed: 3 + r() * 8, blobs, front: i < 2 });
      }
      this.waves = [];
      for (let i = 0; i < 70; i++) this.waves.push({ x: r() * W, y: SEA_Y + 4 + Math.pow(r(), 1.4) * (H - SEA_Y - 6), l: 2 + ((r() * 6) | 0), s: 4 + r() * 10 });
    }

    /* ---------- 環境 ---------- */
    setEnv(env) {
      if (!env) return;
      let changed = false;
      for (const k of ['sky', 'sea', 'land', 'weather']) {
        if (env[k] && env[k] !== this.env[k]) { this.env[k] = env[k]; changed = true; if (k === 'land' || k === 'sea') this.dirty = true; }
      }
      if (env.land) this.refreshLists();
      return changed;
    }

    setParams(p) { this.params = Object.assign({}, this.params, p); }

    /* 月ごとの季節変化。地表にうっすら色を重ね、季節の天気を決める */
    setSeason(month, era) {
      const season = month <= 2 || month === 12 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn';
      const biome = era ? era.biome : 'temperate';
      const mild = biome === 'desert' || biome === 'jungle' || biome === 'water' ? 0.5 : biome === 'snow' ? 0.6 : 1;
      // 季節の中でも月ごとに少しずつ濃淡を変える
      const k = [0.7, 1, 0.8][(month + 1) % 3];
      const T = {
        spring: [255, 190, 220, 0.09], summer: [90, 220, 60, 0.07],
        autumn: [235, 120, 30, 0.15], winter: [235, 242, 255, 0.24],
      }[season];
      this.seasonTint = 'rgba(' + T[0] + ',' + T[1] + ',' + T[2] + ',' + (T[3] * mild * k).toFixed(3) + ')';
      this.tintDirty = true;
      this.season = season;
      let wx = null;
      if (season === 'winter' && (biome === 'temperate' || biome === 'urban' || biome === 'snow')) wx = 'snow';
      else if (month === 4 && era && era.region === 'japan' && biome === 'temperate') wx = 'petals';
      else if (season === 'summer' && (biome === 'jungle' || biome === 'water') && month === 7) wx = 'rain';
      else if (season === 'autumn' && month === 11 && biome === 'temperate') wx = 'leaves';
      this.seasonWeather = wx;
    }

    /* ---------- 建物 ---------- */
    findWaterSpot() {
      const fl = this.flood();
      let fallback = null;
      for (let k = 0; k < 80; k++) {
        const i = this.waterList[(this.rnd() * this.waterList.length) | 0];
        if (i === undefined) break;
        const x = i % N, y = (i / N) | 0;
        if (this.occ[i]) continue;
        let wet = 0, busy = false;
        for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
          const j = this.idx(x + ox, y + oy);
          if (j >= 0 && this.isWaterTile(j)) wet++;
          if (j >= 0 && this.occ[j]) busy = true;
        }
        if (busy) continue;
        if (wet >= 6) return { x, y, i, h: Math.max(this.h[i], fl), water: true };
        if (!fallback && wet >= 3) fallback = { x, y, i, h: Math.max(this.h[i], fl), water: true };
      }
      return fallback;
    }

    findSpot(type) {
      if (type === 'ship') { const w = this.findWaterSpot(); if (w) return w; }
      const def = WD.BUILDINGS[type] || { r: 1 };
      const rr = def.r;
      let best = null, bestScore = -1e9;
      const tries = 60;
      for (let k = 0; k < tries; k++) {
        const i = this.landList[(this.rnd() * this.landList.length) | 0];
        if (i === undefined) break;
        const x = i % N, y = (i / N) | 0;
        if (x < 3 || y < 3 || x > N - 4 || y > N - 4) continue;
        const h0 = this.h[i];
        if (h0 > 10) continue;
        let ok = true;
        for (let oy = -rr - 1; oy <= rr + 1 && ok; oy++) for (let ox = -rr - 1; ox <= rr + 1; ox++) {
          const j = this.idx(x + ox, y + oy);
          if (j < 0 || this.type[j] === VOID || this.occ[j]) { ok = false; break; }
          if (Math.abs(ox) <= rr && Math.abs(oy) <= rr && (this.isWaterTile(j) || Math.abs(this.h[j] - h0) > 2)) { ok = false; break; }
        }
        if (!ok) continue;
        let near = 99;
        for (const b of this.buildings) { const d = Math.max(Math.abs(b.x - x), Math.abs(b.y - y)); if (d < near) near = d; }
        let score = this.buildings.length ? -Math.abs(near - 5) : -Math.hypot(x - 50, y - 52) / 5;
        if (type === 'field' || type === 'solar') score += -this.waterDist[i] * 0.6;
        if (type === 'castle' || type === 'tower' || type === 'statue' || type === 'temple' || type === 'pagoda') score += h0 * 0.9;
        if (type === 'portal' || type === 'ruins' || type === 'rocket') score = this.rnd() * 10;
        if (type === 'tree') score = -this.waterDist[i] * 0.1 + this.rnd() * 6;
        if (type === 'moai' || type === 'ship') score = Math.hypot(x - 50, y - 50) * 0.3 - (type === 'ship' ? this.waterDist[i] : 0) + this.rnd() * 3;
        if (type === 'mammoth' || type === 'yurt') score = this.rnd() * 8 - Math.abs(near - 4) * 0.3;
        score += this.rnd() * 2.5;
        if (score > bestScore) { bestScore = score; best = { x, y, i }; }
      }
      return best;
    }

    addBuilding(type, opts) {
      opts = opts || {};
      if (!WD.BUILDINGS[type]) return null;
      if (this.buildings.filter((b) => !b.removing).length > 150) return null;
      const spot = this.findSpot(type);
      if (!spot) return null;
      const rr = spot.water ? 0 : WD.BUILDINGS[type].r;
      const h0 = spot.water ? spot.h : this.h[spot.i];
      if (spot.water) this.occ[spot.i] = 1;
      // ポピュラス式：建設地をならす
      else for (let oy = -rr; oy <= rr; oy++) for (let ox = -rr; ox <= rr; ox++) {
        const j = this.idx(spot.x + ox, spot.y + oy);
        if (j < 0) continue;
        this.occ[j] = 1;
        this.h[j] = h0;
        if (this.type[j] === FOREST) this.type[j] = GRASS;
      }
      if (!spot.water) this.dirty = true;
      const variant = opts.variant !== undefined ? opts.variant : (this.rnd() * 8) | 0;
      const b = {
        type, x: spot.x, y: spot.y, h: h0, r: rr, variant,
        sprite: WD.Sprites.get(type, variant, this.course),
        fall: opts.instant ? 0 : -(240 + (opts.delay || 0) * 70 + this.rnd() * 40),
        vy: 0, alpha: 1, removing: false, sink: 0,
        auto: !!opts.auto, symbol: !!opts.symbol, label: opts.label || '', emitT: this.rnd(), course: this.course,
      };
      this.buildings.push(b);
      return b;
    }

    /* 時代（地域）の切替：以後に建つ建物の様式が変わる */
    setCourse(region) { this.course = region; }

    /* 前の時代のシンボル建築を崩して、新しい時代のシンボルを落とす */
    switchSymbols(symbols, label, variantOf) {
      this.buildings.filter((b) => b.symbol && !b.removing).forEach((b) => this.removeBuilding(b));
      let delay = 0;
      for (const [type, n] of symbols) for (let k = 0; k < n; k++) {
        this.addBuilding(type, { delay: delay++, label, symbol: true, variant: variantOf ? variantOf(type, k) : undefined });
      }
    }

    bh(b) { return Math.max(b.h, this.flood()); }

    removeBuilding(b) {
      if (b.removing) return;
      b.removing = true;
      const p = this.screen(b.x, b.y, this.bh(b));
      for (let k = 0; k < 14; k++) this.particles.push({ x: p.sx + (this.rnd() - 0.5) * 16, y: p.sy - this.rnd() * 10, vx: (this.rnd() - 0.5) * 20, vy: -10 - this.rnd() * 20, life: 1.2, max: 1.2, color: '#9a948a', size: 2, grav: 0 });
    }

    removeType(type, count, filter) {
      const list = this.buildings.filter((b) => !b.removing && b.type === type && (!filter || filter(b)));
      for (let k = 0; k < count && list.length; k++) {
        const j = (this.rnd() * list.length) | 0;
        this.removeBuilding(list.splice(j, 1)[0]);
      }
    }

    count(type, filter) { return this.buildings.filter((b) => !b.removing && b.type === type && (!filter || filter(b))).length; }

    /* AI が返した map 指示を反映 */
    applyMap(map, label) {
      if (!map) return;
      let delay = 0;
      for (const r of map.remove || []) this.removeType(r.type, r.count);
      for (const a of map.add || []) {
        for (let k = 0; k < a.count; k++) this.addBuilding(a.type, { delay: delay++, label });
      }
      this.setEnv(map);
    }

    applyPreset(preset, label) {
      let delay = 0;
      for (const [type, n] of preset) for (let k = 0; k < n; k++) this.addBuilding(type, { delay: delay++, label });
    }

    /* パラメータに連動する「自然増減」の建物 */
    syncAuto(instant) {
      const p = this.params;
      const tier = p.technology < 35 ? 'hut' : p.technology < 70 ? 'house' : 'building';
      const targets = {
        hut: tier === 'hut' ? Math.floor(p.population / 6) : 0,
        house: tier === 'house' ? Math.floor(p.population / 6) : 0,
        building: tier === 'building' ? Math.floor(p.population / 7) : 0,
        factory: p.technology >= 50 ? Math.floor((p.technology - 40) / 18) : 0,
        tower: p.technology >= 62 ? Math.floor((p.technology - 50) / 14) : 0,
        field: Math.max(0, Math.floor((p.population - 20) / 18)),
        ruins: p.order < 30 ? Math.floor((30 - p.order) / 6) + 1 : 0,
        statue: p.order > 78 ? Math.floor((p.order - 70) / 10) : 0,
        portal: p.distortion > 35 ? Math.floor((p.distortion - 25) / 22) : 0,
      };
      let delay = 0;
      for (const type in targets) {
        const cur = this.count(type, (b) => b.auto);
        const want = targets[type];
        if (cur > want) this.removeType(type, cur - want, (b) => b.auto);
        else for (let k = cur; k < want; k++) this.addBuilding(type, { auto: true, instant, delay: delay++, label: '自然発展' });
      }
    }

    /* 文明崩壊演出 */
    collapse() {
      this.setEnv({ sky: 'crimson', sea: 'red', land: 'wasteland', weather: 'ash' });
      const alive = this.buildings.filter((b) => !b.removing && b.type !== 'ruins');
      alive.forEach((b, k) => {
        setTimeout(() => {
          this.removeBuilding(b);
          if (k % 2 === 0) this.addBuilding('ruins', { instant: true, label: '文明の残骸' });
        }, k * 60);
      });
      this.params.population = 0;
      this.shake = 10;
    }

    /* ---------- 単語投下 ---------- */
    dropWord(text) {
      this.drops.push({ text, y: -30, vy: 0, x: OX, ty: OY + 200 - 40, state: 'fall', t: 0, trail: [] });
    }

    /* ---------- 住人 ---------- */
    personColors() {
      const t = this.params.technology;
      if (t < 35) return ['#a0522d', '#c8a070', '#8a6a3a', '#d8c090'];
      if (t < 60) return ['#3a5a9a', '#9a3a3a', '#d8d0b0', '#5a8a4a', '#c87a2a'];
      if (t < 85) return ['#3a3a4a', '#e8e8f0', '#d84a6a', '#3a7ad8', '#f0c040'];
      return ['#25e0ff', '#ff3ad0', '#c0c8d0', '#7aff9a'];
    }
    spawnPerson() {
      let i;
      const homes = this.buildings.filter((b) => !b.removing && b.fall === 0);
      if (homes.length && this.rnd() < 0.8) {
        const b = homes[(this.rnd() * homes.length) | 0];
        for (let k = 0; k < 10; k++) {
          const j = this.idx(b.x + (((this.rnd() * 9) | 0) - 4), b.y + (((this.rnd() * 9) | 0) - 4));
          if (this.walkable(j)) { i = j; break; }
        }
      }
      if (i === undefined) {
        for (let k = 0; k < 20; k++) { const j = this.landList[(this.rnd() * this.landList.length) | 0]; if (this.walkable(j)) { i = j; break; } }
      }
      if (i === undefined) return;
      const cols = this.personColors();
      const x = i % N, y = (i / N) | 0;
      this.people.push({
        x, y, fx: x, fy: y, tx: x, ty: y, t: 1, speed: 0.6 + this.rnd() * 0.9,
        body: cols[(this.rnd() * cols.length) | 0], hair: this.rnd() < 0.2 ? '#d8c060' : '#2a1a10',
        alpha: 0, dying: false, wait: this.rnd() * 2,
      });
    }

    updatePeople(dt) {
      const target = Math.max(0, Math.min(170, Math.round(this.params.population * 1.6)));
      const living = this.people.filter((p) => !p.dying);
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = 0.04;
        if (living.length < target) this.spawnPerson();
        else if (living.length > target) living[(this.rnd() * living.length) | 0].dying = true;
      }
      for (const p of this.people) {
        p.alpha = p.dying ? p.alpha - dt * 1.5 : Math.min(1, p.alpha + dt * 2);
        if (p.wait > 0) { p.wait -= dt; continue; }
        if (p.t >= 1) {
          p.fx = p.tx; p.fy = p.ty;
          const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          const [ox, oy] = dirs[(this.rnd() * 4) | 0];
          const j = this.idx(p.tx + ox, p.ty + oy);
          const ci = this.idx(p.tx, p.ty);
          if (this.walkable(j) && Math.abs(this.h[j] - this.h[ci]) <= 2) { p.tx += ox; p.ty += oy; p.t = 0; }
          else if (this.rnd() < 0.05) p.wait = 0.5 + this.rnd() * 2;
        } else {
          p.t = Math.min(1, p.t + dt * p.speed);
        }
      }
      this.people = this.people.filter((p) => !(p.dying && p.alpha <= 0));
    }

    /* ---------- メインループ ---------- */
    start() {
      if (this.running) return;
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame(this.loop);
    }
    stop() { this.running = false; }

    loop(now) {
      if (!this.running) return;
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.draw();
      requestAnimationFrame(this.loop);
    }

    update(dt) {
      this.time += dt;
      // 色の補間
      const sk = SKY[this.env.sky] || SKY.clear;
      const k = Math.min(1, dt * 1.2);
      for (let i = 0; i < 3; i++) this.skyCur[i] = lerpRGB(this.skyCur[i], hex2rgb(sk.c[i]), k);
      const se = SEA[this.env.sea] || SEA.blue;
      for (let i = 0; i < 3; i++) this.seaCur[i] = lerpRGB(this.seaCur[i], hex2rgb(se[i]), k);
      this.starsCur = lerp(this.starsCur, sk.stars, k);
      this.nightCur = lerp(this.nightCur, NIGHTNESS[this.env.sky] || 0, k);

      for (const c of this.clouds) { c.x += c.speed * dt; if (c.x > W + 60) c.x = -120; }

      // 建物の落下・沈下
      let landed = 0;
      for (const b of this.buildings) {
        if (b.fall < 0) {
          b.vy += 900 * dt;
          b.fall += b.vy * dt;
          if (b.fall >= 0) {
            b.fall = 0; b.vy = 0; landed++;
            const p = this.screen(b.x, b.y, this.bh(b));
            for (let q = 0; q < 8; q++) this.particles.push({ x: p.sx, y: p.sy + 2, vx: (this.rnd() - 0.5) * 50, vy: -this.rnd() * 18, life: 0.6, max: 0.6, color: '#d8ccb0', size: 1, grav: 40 });
          }
        }
        if (b.removing) { b.sink += dt * 14; b.alpha -= dt * 0.9; }
        // 煙・点滅など
        if (!b.removing && b.fall === 0) {
          for (const e of b.sprite.emit) {
            if (e[2] === 'smoke') {
              b.emitT -= dt;
              if (b.emitT <= 0) {
                b.emitT = 0.25 + this.rnd() * 0.3;
                const p = this.screen(b.x, b.y, this.bh(b));
                this.particles.push({ x: p.sx + e[0], y: p.sy + 2 + e[1], vx: 4 + this.rnd() * 4, vy: -8 - this.rnd() * 5, life: 2.5, max: 2.5, color: this.params.distortion > 60 ? '#b080c0' : '#c8c8c8', size: 2, grav: 0, grow: true });
              }
            } else if (e[2] === 'sparkle' && this.rnd() < dt * 8) {
              const p = this.screen(b.x, b.y, this.bh(b));
              this.particles.push({ x: p.sx + e[0] + (this.rnd() - 0.5) * 10, y: p.sy + 2 + e[1] + (this.rnd() - 0.5) * 16, vx: 0, vy: -6, life: 0.8, max: 0.8, color: this.rnd() < 0.5 ? '#ff80f0' : '#c060ff', size: 1, grav: 0 });
            }
          }
        }
      }
      if (landed) {
        this.shake = Math.max(this.shake, Math.min(5, 1.5 + landed));
        if (this.onLand) this.onLand(landed);
      }
      for (const b of this.buildings) {
        if (b.removing && b.alpha <= 0) {
          for (let oy = -b.r; oy <= b.r; oy++) for (let ox = -b.r; ox <= b.r; ox++) { const j = this.idx(b.x + ox, b.y + oy); if (j >= 0) this.occ[j] = 0; }
        }
      }
      this.buildings = this.buildings.filter((b) => !(b.removing && b.alpha <= 0));

      this.updatePeople(dt * Math.min(2.5, this.timeScale));

      // 天候
      const wx = this.env.weather && this.env.weather !== 'none' ? this.env.weather : this.seasonWeather;
      if (wx && wx !== 'none') {
        const rate = { rain: 140, snow: 50, ash: 40, petals: 22, neon: 30, leaves: 18 }[wx] || 0;
        let n = rate * dt;
        while (n > 0) {
          if (this.rnd() < n) {
            const col = { rain: '#a8c8f0', snow: '#ffffff', ash: '#6a6260', petals: this.rnd() < 0.5 ? '#ffb0d0' : '#ffd8e8', leaves: ['#e8782a', '#d84a1a', '#f0b030'][(this.rnd() * 3) | 0], neon: this.rnd() < 0.5 ? '#25e0ff' : '#ff3ad0' }[wx];
            const vy = { rain: 260, snow: 30, ash: 22, petals: 26, neon: 60, leaves: 24 }[wx];
            this.particles.push({ x: this.rnd() * W, y: -4, vx: wx === 'rain' ? -40 : (this.rnd() - 0.5) * 20, vy: vy + this.rnd() * 20, life: 6, max: 6, color: col, size: wx === 'rain' ? 0 : 1, grav: 0, wobble: wx !== 'rain', weather: true });
          }
          n -= 1;
        }
      }

      for (const p of this.particles) {
        p.life -= dt;
        p.vy += (p.grav || 0) * dt;
        p.x += (p.vx + (p.wobble ? Math.sin(this.time * 3 + p.y * 0.05) * 10 : 0)) * dt;
        p.y += p.vy * dt;
      }
      this.particles = this.particles.filter((p) => p.life > 0 && p.y < H + 10);
      if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);

      // 単語投下
      for (const d of this.drops) {
        d.t += dt;
        if (d.state === 'fall') {
          d.vy += 520 * dt;
          d.y += d.vy * dt;
          d.trail.unshift(d.y);
          if (d.trail.length > 6) d.trail.pop();
          if (d.y >= d.ty) {
            d.y = d.ty; d.state = 'hit'; d.t = 0;
            this.flash = 0.8; this.shake = 9;
            for (let q = 0; q < 60; q++) {
              const a = this.rnd() * Math.PI * 2, sp = 40 + this.rnd() * 120;
              this.particles.push({ x: d.x, y: d.y + 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5 - 40, life: 1, max: 1, color: this.rnd() < 0.5 ? '#ffe060' : '#ffffff', size: 2, grav: 120 });
            }
            if (this.onImpact) this.onImpact();
          }
        }
      }
      this.drops = this.drops.filter((d) => !(d.state === 'hit' && d.t > 2.2));

      this.flash = Math.max(0, this.flash - dt * 1.6);
      this.shake = Math.max(0, this.shake - dt * 14);
    }

    /* ---------- 描画 ---------- */
    draw() {
      if (this.dirty) { this.renderTerrain(); this.tintDirty = true; }
      if (this.tintDirty) {
        const tg = this.tcache.getContext('2d');
        tg.clearRect(0, 0, W, H);
        tg.drawImage(this.cache, 0, 0);
        if (this.seasonTint) {
          tg.globalCompositeOperation = 'source-atop';
          tg.fillStyle = this.seasonTint;
          tg.fillRect(0, 0, W, H);
          tg.globalCompositeOperation = 'source-over';
        }
        this.tintDirty = false;
      }
      const g = this.ctx;
      const t = this.time;
      g.save();
      const shx = this.shake > 0 ? Math.round((this.rnd() - 0.5) * this.shake) : 0;
      const shy = this.shake > 0 ? Math.round((this.rnd() - 0.5) * this.shake) : 0;

      // 空（段階的グラデーション）
      const bands = 40;
      const bh = Math.ceil(SEA_Y / bands);
      for (let b = 0; b < bands; b++) {
        const f = b / (bands - 1);
        const c = f < 0.55 ? lerpRGB(this.skyCur[0], this.skyCur[1], f / 0.55) : lerpRGB(this.skyCur[1], this.skyCur[2], (f - 0.55) / 0.45);
        g.fillStyle = rgb2css(c);
        g.fillRect(0, b * bh, W, bh);
      }
      // 星
      if (this.starsCur > 0.02) {
        for (const s of this.stars) {
          const a = this.starsCur * (0.4 + 0.6 * Math.abs(Math.sin(t * (0.5 + s.b) + s.p)));
          g.fillStyle = 'rgba(255,255,240,' + a.toFixed(2) + ')';
          g.fillRect(s.x, s.y, s.b > 0.85 ? 2 : 1, s.b > 0.85 ? 2 : 1);
        }
      }
      // オーロラ
      if (this.env.sky === 'aurora' || this.env.sky === 'cyber') {
        const col = this.env.sky === 'aurora' ? ['rgba(80,255,170,', 'rgba(170,90,255,'] : ['rgba(255,60,210,', 'rgba(40,220,255,'];
        for (let band = 0; band < 2; band++) {
          for (let x = 0; x < W; x += 3) {
            const y = 60 + band * 50 + Math.sin(x * 0.012 + t * 0.6 + band) * 22 + Math.sin(x * 0.03 - t) * 6;
            g.fillStyle = col[band] + (0.18 + 0.1 * Math.sin(x * 0.05 + t)).toFixed(2) + ')';
            g.fillRect(x, y, 3, 26);
          }
        }
      }
      // 時空の裂け目
      if (this.params.distortion > 50) {
        const w = 1 + Math.floor((this.params.distortion - 50) / 12);
        g.fillStyle = '#ff80f0';
        let x = 640, y = 30;
        for (let k = 0; k < 16; k++) {
          const nx = x + Math.round(Math.sin(k * 2.1) * 8), ny = y + 7;
          g.fillRect(Math.min(x, nx), y, Math.abs(nx - x) + w, 7);
          x = nx; y = ny;
        }
        g.fillStyle = 'rgba(255,128,240,' + (0.15 + 0.1 * Math.sin(t * 4)).toFixed(2) + ')';
        g.fillRect(612, 24, 56, 124);
      }
      // 遠景の雲
      for (const c of this.clouds) if (!c.front) this.drawCloud(g, c, 0.85);

      // 海
      this.drawSea(g);

      g.translate(shx, shy + Math.round(Math.sin(t * 0.8) * 2));

      // 裏側の滝
      const mouthFront = this.mouth && (this.mouth.dx > 0 || this.mouth.dy > 0);
      if (this.mouth && !mouthFront) this.drawWaterfall(g);
      g.drawImage(this.tcache, 0, 0);
      this.drawWaterSparkle(g);
      if (this.mouth && mouthFront) this.drawWaterfall(g);

      // スプライト（深度ソート）
      const items = [];
      for (const b of this.buildings) items.push({ d: b.x + b.y + 0.6, b });
      for (const p of this.people) {
        const x = lerp(p.fx, p.tx, p.t), y = lerp(p.fy, p.ty, p.t);
        items.push({ d: x + y + 0.5, p, x, y });
      }
      items.sort((a, b) => a.d - b.d);
      for (const it of items) {
        if (it.b) this.drawBuilding(g, it.b);
        else this.drawPerson(g, it.p, it.x, it.y);
      }

      // 夜の暗さ＋窓明かり
      if (this.nightCur > 0.05) {
        g.fillStyle = 'rgba(6,8,30,' + (0.42 * this.nightCur).toFixed(2) + ')';
        g.fillRect(-10, 0, W + 20, H);
        for (const b of this.buildings) {
          if (b.removing || b.fall < 0) continue;
          const p = this.screen(b.x, b.y, this.bh(b));
          for (const l of b.sprite.lights) {
            g.fillStyle = l[2];
            g.globalAlpha = 0.25 * this.nightCur;
            g.fillRect(p.sx + l[0] - 1, p.sy + 2 + l[1] - 1, 3, 3);
            g.globalAlpha = 1;
            g.fillRect(p.sx + l[0], p.sy + 2 + l[1], 1, 1);
          }
        }
      }
      // 点滅灯
      if ((t * 1.5) % 1 < 0.5) {
        for (const b of this.buildings) {
          if (b.removing || b.fall < 0) continue;
          for (const e of b.sprite.emit) {
            if (e[2] !== 'blink') continue;
            const p = this.screen(b.x, b.y, this.bh(b));
            g.fillStyle = 'rgba(255,40,40,0.35)'; g.fillRect(p.sx + e[0] - 1, p.sy + 2 + e[1] - 1, 3, 3);
            g.fillStyle = '#ff3030'; g.fillRect(p.sx + e[0], p.sy + 2 + e[1], 1, 1);
          }
        }
      }

      // パーティクル
      for (const p of this.particles) {
        const a = Math.max(0, Math.min(1, p.life / p.max));
        g.globalAlpha = p.weather ? 0.85 : a;
        g.fillStyle = p.color;
        if (p.size === 0) g.fillRect(p.x | 0, p.y | 0, 1, 4);
        else {
          const s = p.grow ? Math.round(p.size + (1 - a) * 4) : p.size;
          g.fillRect(p.x | 0, p.y | 0, s, s);
        }
      }
      g.globalAlpha = 1;

      // 単語の落下
      for (const d of this.drops) this.drawDrop(g, d);

      g.restore();
      // 手前の雲
      for (const c of this.clouds) if (c.front) this.drawCloud(g, c, 0.55);

      if (this.flash > 0) {
        g.fillStyle = 'rgba(255,255,230,' + Math.min(0.8, this.flash).toFixed(2) + ')';
        g.fillRect(0, 0, W, H);
      }
      this.drawGlitch(g);
    }

    drawCloud(g, c, alpha) {
      const sky = this.skyCur[2];
      const base = lerpRGB([255, 255, 255], sky, 0.25);
      const shadowC = lerpRGB(base, this.skyCur[1], 0.35);
      g.globalAlpha = alpha;
      for (const [bx, by, w, h] of c.blobs) {
        g.fillStyle = rgb2css(shadowC);
        g.fillRect((c.x + bx) | 0, (c.y + by + 2) | 0, w, h);
        g.fillStyle = rgb2css(base);
        g.fillRect((c.x + bx + 1) | 0, (c.y + by) | 0, w - 2, h - 1);
      }
      g.globalAlpha = 1;
    }

    drawSea(g) {
      const rows = H - SEA_Y;
      for (let y = 0; y < rows; y += 2) {
        const f = y / rows;
        const c = f < 0.15 ? lerpRGB(this.seaCur[2], this.seaCur[1], f / 0.15) : lerpRGB(this.seaCur[1], this.seaCur[0], (f - 0.15) / 0.85);
        g.fillStyle = rgb2css(c);
        g.fillRect(0, SEA_Y + y, W, 2);
      }
      // 島の影
      g.fillStyle = 'rgba(0,0,20,0.28)';
      for (let k = 0; k < 6; k++) {
        const w = 360 - k * 40;
        g.fillRect(OX - w / 2, SEA_Y + 22 + k * 3, w, 3);
      }
      g.fillStyle = rgb2css(lerpRGB(this.seaCur[2], [255, 255, 255], 0.3));
      for (const wv of this.waves) {
        const x = (wv.x + this.time * wv.s) % (W + 20) - 10;
        if ((this.time * 2 + wv.x) % 3 < 2) g.fillRect(x | 0, wv.y | 0, wv.l, 1);
      }
    }

    drawWaterfall(g) {
      const m = this.mouth;
      const i = m.y * N + m.x;
      const p = this.screen(m.x, m.y, this.h[i]);
      const sx = p.sx + m.dx * 4 - m.dy * 4, sy = p.sy + 2 + (m.dx + m.dy) * 2;
      const seaTop = SEA_Y + 10;
      const sea = this.seaCur;
      for (let y = sy; y < seaTop; y++) {
        const f = (y - sy) / (seaTop - sy);
        const a = Math.max(0, 1 - f * 1.15);
        if (a <= 0) break;
        const spread = Math.round(f * 6);
        const band = ((y - this.time * 90) | 0) % 7;
        g.globalAlpha = a;
        g.fillStyle = band < 2 ? '#ffffff' : rgb2css(lerpRGB(sea[2], [255, 255, 255], 0.3));
        g.fillRect(sx - 2 - spread, y, 4 + spread * 2, 1);
      }
      g.globalAlpha = 1;
    }

    drawWaterSparkle(g) {
      const wl = this.waterList;
      if (!wl.length) return;
      const fl = this.flood();
      g.fillStyle = rgb2css(lerpRGB(this.seaCur[2], [255, 255, 255], 0.4));
      const n = Math.min(40, wl.length >> 2);
      const seedT = Math.floor(this.time * 3);
      for (let k = 0; k < n; k++) {
        const i = wl[Math.floor(hash2(k, seedT, 5) * wl.length)];
        const x = i % N, y = (i / N) | 0;
        const p = this.screen(x, y, Math.max(this.h[i], fl));
        g.fillRect(p.sx - 1, p.sy + 1, 2, 1);
      }
    }

    drawBuilding(g, b) {
      const s = b.sprite;
      const p = this.screen(b.x, b.y, this.bh(b));
      const x = p.sx - s.ax, y = p.sy + 2 - s.ay;
      if (b.fall < 0) {
        const k = Math.max(0, 1 + b.fall / 300);
        g.fillStyle = 'rgba(0,0,0,' + (0.35 * k).toFixed(2) + ')';
        const w = Math.round(6 + 10 * k);
        g.fillRect(p.sx - w, p.sy + 1, w * 2, 3);
      }
      if (b.removing) {
        g.globalAlpha = Math.max(0, b.alpha);
        const cut = Math.min(s.h, Math.round(b.sink));
        g.drawImage(s.canvas, 0, 0, s.w, s.h - cut, x, y + cut, s.w, s.h - cut);
        g.globalAlpha = 1;
      } else {
        g.drawImage(s.canvas, x, Math.round(y + b.fall));
      }
    }

    drawPerson(g, p, x, y) {
      const fl = this.flood();
      const h0 = this.heightAt(p.fx, p.fy), h1 = this.heightAt(p.tx, p.ty);
      const h = Math.max(lerp(h0, h1, p.t), fl);
      const s = this.screen(x, y, h);
      const px = Math.round(s.sx) - 1, py = Math.round(s.sy) + 2;
      const step = p.t < 1 && Math.floor(this.time * 8 + p.speed * 10) % 2;
      g.globalAlpha = Math.max(0, p.alpha);
      g.fillStyle = p.hair; g.fillRect(px + 1, py - 6, 1, 1);
      g.fillStyle = '#f0c8a0'; g.fillRect(px + 1, py - 5, 1, 1);
      g.fillStyle = p.body; g.fillRect(px, py - 4, 3, 2);
      g.fillStyle = '#2a2a3a';
      if (step) { g.fillRect(px, py - 2, 1, 2); g.fillRect(px + 2, py - 2, 1, 2); }
      else g.fillRect(px + 1, py - 2, 1, 2);
      g.globalAlpha = 1;
    }

    drawDrop(g, d) {
      g.font = '22px "DotGothic16", monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const alpha = d.state === 'hit' ? Math.max(0, 1 - Math.max(0, d.t - 1.2)) : 1;
      if (d.state === 'fall') {
        d.trail.forEach((ty, k) => {
          g.globalAlpha = 0.15 * (6 - k) / 6;
          g.fillStyle = '#fff6a0';
          g.fillText(d.text, d.x, ty - k * 6);
        });
      } else {
        // 着弾リング
        const r = d.t * 220;
        g.globalAlpha = Math.max(0, 1 - d.t);
        g.fillStyle = '#fff6a0';
        for (let a = 0; a < Math.PI * 2; a += 0.04) {
          g.fillRect((d.x + Math.cos(a) * r) | 0, (d.y + 14 + Math.sin(a) * r * 0.5) | 0, 2, 2);
        }
      }
      g.globalAlpha = alpha;
      const y = d.state === 'hit' ? d.y - Math.min(30, d.t * 40) : d.y;
      g.lineWidth = 5; g.strokeStyle = '#1a0a2a';
      g.strokeText(d.text, d.x, y);
      g.fillStyle = '#ffe14a';
      g.fillText(d.text, d.x, y);
      g.globalAlpha = 1;
    }

    drawGlitch(g) {
      const d = this.params.distortion;
      if (d < 30) return;
      const chance = (d - 30) / 260;
      if (this.rnd() < chance) {
        const n = 1 + ((this.rnd() * 3) | 0);
        for (let k = 0; k < n; k++) {
          const y = (this.rnd() * H) | 0, h = 2 + ((this.rnd() * 14) | 0);
          const off = ((this.rnd() - 0.5) * (d / 4)) | 0;
          g.drawImage(this.canvas, 0, y, W, h, off, y, W, h);
        }
        if (d > 65) {
          g.fillStyle = 'rgba(255,0,200,0.12)';
          g.fillRect(0, (this.rnd() * H) | 0, W, 3);
        }
      }
    }

    /* マウス位置の建物を返す */
    pick(mx, my) {
      const sorted = this.buildings.slice().sort((a, b) => (b.x + b.y) - (a.x + a.y));
      for (const b of sorted) {
        if (b.removing || b.fall < 0) continue;
        const s = b.sprite;
        const p = this.screen(b.x, b.y, this.bh(b));
        const x = p.sx - s.ax, y = p.sy + 2 - s.ay;
        if (mx >= x && mx < x + s.w && my >= y && my < y + s.h) {
          const ctx = s.canvas.getContext('2d');
          const a = ctx.getImageData((mx - x) | 0, (my - y) | 0, 1, 1).data[3];
          if (a > 0) return b;
        }
      }
      return null;
    }

    snapshot() {
      return this.canvas.toDataURL('image/png');
    }

    /* ---------- オートセーブ用 ---------- */
    serialize() {
      return {
        seed: this.seed,
        course: this.course,
        env: Object.assign({}, this.env),
        h: bytesToB64(new Uint8Array(this.h.buffer)),
        type: bytesToB64(this.type),
        buildings: this.buildings.filter((b) => !b.removing).map((b) => ({
          type: b.type, x: b.x, y: b.y, h: b.h, r: b.r, variant: b.variant, auto: b.auto, symbol: b.symbol, label: b.label, course: b.course,
        })),
      };
    }

    /* 保存データから島を復元（地形の整地・建物・環境をそのまま戻す） */
    static restore(canvas, opts, data) {
      const w = new IsoWorld(canvas, Object.assign({}, opts, { seed: data.seed, course: data.course }));
      w.h.set(new Int8Array(b64ToBytes(data.h).buffer));
      w.type.set(b64ToBytes(data.type));
      w.env = Object.assign({}, w.env, data.env);
      w.refreshLists();
      for (const d of data.buildings) {
        if (!WD.BUILDINGS[d.type]) continue;
        for (let oy = -d.r; oy <= d.r; oy++) for (let ox = -d.r; ox <= d.r; ox++) {
          const j = w.idx(d.x + ox, d.y + oy);
          if (j >= 0) w.occ[j] = 1;
        }
        w.buildings.push(Object.assign({}, d, {
          sprite: WD.Sprites.get(d.type, d.variant, d.course || w.course),
          fall: 0, vy: 0, alpha: 1, removing: false, sink: 0, emitT: w.rnd(),
        }));
      }
      w.dirty = true;
      return w;
    }
  }

  IsoWorld.W = W;
  IsoWorld.palette = landPalette;
  IsoWorld.H = H;
  WD.IsoWorld = IsoWorld;
})();
