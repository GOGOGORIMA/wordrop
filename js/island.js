/* WORDROP — 100×100 アイソメトリックの浮島
 * 地形（海・陸・水・岩）と土地利用（田畑・道・線路）はキャッシュ画像に描き、変化があったときだけ描き直す。
 * 建物・乗り物・住人・吹き出しは毎フレーム描く。時間の流れ（timeScale）はゲーム側が決める。 */
(function () {
  const N = 100, OX = N * 4, TOP = 20, CLIFF = 120;
  const CW = N * 8, CH = TOP + N * 4 + CLIFF;
  const SEA = 0, LAND = 1, WATER = 2, ROCK = 3, SAND = 4;
  const FIELD = 1, ROAD = 2;
  const HIGHWAY = 3;
  const idx = (x, y) => y * N + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
  const wx = (x, y) => (x - y) * 4 + OX;          // タイル座標 → 画像上の座標（ひし形の中心）
  const wy = (x, y) => (x + y) * 2 + TOP + 2;

  /* ---------- 乱数とノイズ ---------- */
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function noise(seed) {
    const r = rng(seed), G = 32, v = new Float32Array(G * G);
    for (let i = 0; i < v.length; i++) v[i] = r();
    const at = (x, y) => v[((y % G) + G) % G * G + ((x % G) + G) % G];
    const s = (t) => t * t * (3 - 2 * t);
    return (x, y) => {
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = s(x - x0), fy = s(y - y0);
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx;
      const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
      return a + (b - a) * fy;
    };
  }

  /* ---------- 色 ---------- */
  const GREEN = { spring: '#78b848', summer: '#4e9a32', autumn: '#a89a40', winter: '#d0d8d4' };
  const BIOME = {
    temperate: { ground: GREEN, tree: 'broad', forest: 0.6 },
    urban: { ground: GREEN, tree: 'broad', forest: 0.72 },
    water: { ground: GREEN, tree: 'broad', forest: 0.68, lakes: 0.58 },
    desert: { ground: { spring: '#dcbc74', summer: '#e0bc6c', autumn: '#d8b470', winter: '#d0b078' }, tree: 'palm', forest: 0.8 },
    snow: { ground: { spring: '#d8e4e0', summer: '#a8c098', autumn: '#c4c8a8', winter: '#eef4f8' }, tree: 'pine', forest: 0.55 },
    jungle: { ground: { spring: '#3c9032', summer: '#348828', autumn: '#4a8a30', winter: '#4a8434' }, tree: 'palm', forest: 0.4 },
    wasteland: { ground: { spring: '#8c7a50', summer: '#94804e', autumn: '#8a7048', winter: '#a09070' }, tree: 'dead', forest: 0.75 },
  };
  const CROP = { spring: '#8ad060', summer: '#3a9a2a', autumn: '#e0b030', winter: '#8a6a40' };
  const ROAD_COL = ['#b8945a', '#b0aca0', '#5c5c64', '#3a3a42'];
  const SKY = { spring: ['#3a6ac8', '#bfe4ff'], summer: ['#1a5ad0', '#a8dcff'], autumn: ['#4a5aa8', '#ffd8a8'], winter: ['#5a6a8a', '#e0e8f0'] };
  const PEOPLE = ['#d83a3a', '#3a6ad8', '#e8c040', '#f4f4f4', '#5aa84a', '#8a5ad0', '#e88a3a'];

  class Island {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cache = document.createElement('canvas');
      this.cache.width = CW; this.cache.height = CH;
      this.season = 'spring';
      this.timeScale = 1;
      this.zoom = 1; this.pan = { x: 0, y: 0 };
      this.t = 0;
      this.fx = { shake: 0, flash: 0, alert: 0, drop: null, collapse: -1 };
      this.bubbles = [];
      this.clouds = Array.from({ length: 7 }, (_, i) => ({ x: Math.random(), y: 0.05 + Math.random() * 0.35, s: 0.6 + Math.random(), v: 0.004 + Math.random() * 0.006 }));
      this.bindInput();
    }

    /* ================= 生成 ================= */
    generate(era, seed) {
      this.era = era;
      this.biome = BIOME[era ? era.biome : 'temperate'];
      this.house = era ? era.house : 'jp';
      const r = (this.rand = rng(seed || (Math.random() * 1e9) | 0));
      const n1 = noise(r() * 1e9), n2 = noise(r() * 1e9), n3 = noise(r() * 1e9), n4 = noise(r() * 1e9);
      const ground = (this.ground = new Uint8Array(N * N));
      this.tree = new Uint8Array(N * N);
      this.use = new Uint8Array(N * N);
      this.level = new Uint8Array(N * N);
      this.rail = new Uint8Array(N * N);
      this.occ = new Int32Array(N * N);
      this.depth = new Uint8Array(N * N);
      this.blds = new Map();
      this.nextId = 1;
      this.people = [];
      this.cars = [];
      this.trains = [];
      this.bubbles = [];
      this.fx.collapse = -1;
      const c = (N - 1) / 2;
      // 島の形：中心からの距離にノイズを足して、ギザギザの海岸線にする
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const d = Math.hypot(x - c, y - c) / 47;
        const e = d - (n1(x / 9, y / 9) - 0.5) * 0.36 - (n2(x / 4, y / 4) - 0.5) * 0.1;
        if (e < 0.86) ground[idx(x, y)] = LAND;
      }
      // 中心とつながっていない小島は消す
      const keep = new Uint8Array(N * N), q = [idx(50, 50)];
      keep[q[0]] = 1;
      while (q.length) {
        const i = q.pop(), x = i % N, y = (i / N) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const X = x + dx, Y = y + dy;
          if (inside(X, Y) && !keep[idx(X, Y)] && ground[idx(X, Y)]) { keep[idx(X, Y)] = 1; q.push(idx(X, Y)); }
        }
      }
      for (let i = 0; i < N * N; i++) if (!keep[i]) ground[i] = SEA;
      const near = (x, y, rad) => Math.hypot(x - 50, y - 50) < rad;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = idx(x, y);
        if (!ground[i]) continue;
        const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !inside(x + dx, y + dy) || !ground[idx(x + dx, y + dy)]);
        const d = Math.hypot(x - c, y - c) / 47;
        this.depth[i] = Math.min(CLIFF - 4, 10 + Math.max(0, 1 - d) * 80 + n2(x / 3, y / 3) * 22);
        if (edge && this.era && this.era.biome !== 'snow') ground[i] = SAND;
        else if (!near(x, y, 14) && n3(x / 7 + 40, y / 7) > 0.8) ground[i] = ROCK;
        else if (!near(x, y, 12) && n4(x / 6, y / 6 + 20) > (this.biome.lakes || 0.8)) ground[i] = WATER;
      }
      // 川：島の内側から海まで
      let rx = 50 + (r() - 0.5) * 30, ry = 50 + (r() - 0.5) * 30;
      if (near(rx, ry, 14)) { rx += 16; ry -= 6; }
      const ang = r() * Math.PI * 2;
      for (let k = 0; k < 90; k++) {
        const X = Math.round(rx), Y = Math.round(ry);
        if (!inside(X, Y) || ground[idx(X, Y)] === SEA) break;
        ground[idx(X, Y)] = WATER;
        if (inside(X + 1, Y) && ground[idx(X + 1, Y)] !== SEA && k % 3) ground[idx(X + 1, Y)] = WATER;
        rx += Math.cos(ang) + (r() - 0.5) * 1.2; ry += Math.sin(ang) + (r() - 0.5) * 1.2;
      }
      // 森
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = idx(x, y);
        if (ground[i] === LAND && !near(x, y, 8) && n2(x / 5 + 9, y / 5) > this.biome.forest) this.tree[i] = 1 + ((r() * 3) | 0);
      }
      this.dirty = true;
    }

    /* ================= 建物 ================= */
    free(x, y, n, opts) {
      opts = opts || {};
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const X = x + i, Y = y + j;
        if (!inside(X, Y)) return false;
        const k = idx(X, Y), g = this.ground[k];
        if (g !== LAND && g !== SAND) return false;
        if (this.rail[k] || this.level[k] === HIGHWAY) return false;
        const o = this.occ[k];
        if (o && !(opts.bulldoze && this.blds.get(o).kind === 'house')) return false;
        if (!opts.bulldoze && this.use[k]) return false;
      }
      return true;
    }
    place(type, x, y, kind) {
      const n = WD.Sprites.size(type), id = this.nextId++;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const k = idx(x + i, y + j), o = this.occ[k];
        if (o && o !== id) this.remove(o);
        this.occ[k] = id; this.tree[k] = 0; this.use[k] = 0; this.level[k] = 0;
      }
      const b = { id, type, x, y, n, kind, born: this.t };
      this.blds.set(id, b);
      this.dirty = true;
      return b;
    }
    remove(id) {
      const b = this.blds.get(id);
      if (!b) return;
      for (let j = 0; j < b.n; j++) for (let i = 0; i < b.n; i++) this.occ[idx(b.x + i, b.y + j)] = 0;
      this.blds.delete(id);
    }
    count(kind) { let c = 0; for (const b of this.blds.values()) if (b.kind === kind) c++; return c; }
    pick(list) { return list[(this.rand() * list.length) | 0]; }

    // 中心から外側へ渦巻き状に空き地を探す
    findSpot(n, rMin, rMax, opts) {
      const r = this.rand;
      for (let rad = rMin; rad <= rMax; rad++) {
        const tries = Math.max(8, rad * 6), a0 = r() * Math.PI * 2;
        for (let k = 0; k < tries; k++) {
          const a = a0 + (k / tries) * Math.PI * 2;
          const x = Math.round(50 + Math.cos(a) * rad - n / 2), y = Math.round(50 + Math.sin(a) * rad - n / 2);
          if (this.free(x, y, n, opts)) return [x, y];
        }
      }
      return null;
    }

    /* 道：家から近くの道（なければ島の中心）まで L 字に敷く */
    road(x, y, level) {
      let best = null, bd = 1e9;
      for (let Y = Math.max(0, y - 14); Y < Math.min(N, y + 15); Y++) for (let X = Math.max(0, x - 14); X < Math.min(N, x + 15); X++) {
        if (this.use[idx(X, Y)] !== ROAD) continue;
        const d = Math.abs(X - x) + Math.abs(Y - y);
        if (d < bd) { bd = d; best = [X, Y]; }
      }
      if (!best) best = [50, 50];
      let cx = x, cy = y + 1;
      const step = (X, Y) => {
        if (!inside(X, Y)) return false;
        const k = idx(X, Y), g = this.ground[k];
        if (g === SEA || g === ROCK || this.occ[k] || this.rail[k]) return false;
        if (this.use[k] === ROAD) return true;
        this.use[k] = ROAD; this.level[k] = level; this.tree[k] = 0;
        return true;
      };
      if (!step(cx, cy)) return;
      while (cx !== best[0]) { cx += Math.sign(best[0] - cx); if (!step(cx, cy)) return; }
      while (cy !== best[1]) { cy += Math.sign(best[1] - cy); if (!step(cx, cy)) return; }
      this.dirty = true;
    }

    /* 時代の始まり：シンボル建築と最初の集落 */
    settle(params) {
      for (const [type, cnt] of this.era.landmarks) {
        for (let k = 0; k < cnt; k++) {
          const n = WD.Sprites.size(type), s = this.findSpot(n, 8, 30);
          if (!s) continue;
          this.place(type, s[0], s[1], 'landmark');
          this.road(s[0] + ((n / 2) | 0), s[1] + n - 1, 0);
        }
      }
      for (let k = 0; k < 40; k++) this.grow(params, true);
    }

    /* 1ヶ月ぶんの自然な発展：人口に応じて家と田畑、技術に応じて道が良くなる */
    grow(params, fast) {
      const r = this.rand;
      const target = Math.max(2, Math.min(60, Math.round(3 + params.population * 0.55)));
      const houses = [...this.blds.values()].filter((b) => b.kind === 'house');
      const level = params.technology < 35 ? 0 : params.technology < 70 ? 1 : 2;
      const adds = fast ? 2 : 1;
      for (let a = 0; a < adds && houses.length < target; a++) {
        const anchors = houses.length ? houses.concat([...this.blds.values()].filter((b) => b.kind === 'landmark')) : null;
        const base = anchors ? this.pick(anchors) : { x: 50, y: 50, n: 1 };
        for (let k = 0; k < 24; k++) {
          const x = base.x + Math.round((r() - 0.5) * 10), y = base.y + Math.round((r() - 0.5) * 10);
          if (!this.free(x, y, 1)) continue;
          const b = this.place(this.house, x, y, 'house');
          b.born = this.t - 10; // 家はふつうに建つ（落下演出なし）
          houses.push(b);
          this.road(x, y, level);
          break;
        }
      }
      if (houses.length > target + 3) this.remove(this.pick(houses).id);
      // 田畑
      const fields = this.countUse(FIELD), want = houses.length * (this.era && this.era.biome === 'desert' ? 1.5 : 3);
      for (let a = 0; a < (fast ? 4 : 2) && fields < want && houses.length; a++) {
        const h = this.pick(houses);
        for (let k = 0; k < 8; k++) {
          const x = h.x + Math.round((r() - 0.5) * 7), y = h.y + Math.round((r() - 0.5) * 7);
          if (this.free(x, y, 1)) { this.use[idx(x, y)] = FIELD; this.tree[idx(x, y)] = 0; this.dirty = true; break; }
        }
      }
      // 道の格上げ（技術が下がれば荒れる）
      let changed = 0;
      for (let k = 0; k < 400 && changed < 30; k++) {
        const i = (r() * N * N) | 0;
        if (this.use[i] === ROAD && this.level[i] !== HIGHWAY && this.level[i] !== level) { this.level[i] = level; changed++; }
      }
      if (changed) this.dirty = true;
      // 住人の数は人口に合わせる
      const want2 = Math.min(30, 3 + Math.round(params.population / 4));
      while (this.people.length < want2 && houses.length) {
        const h = this.pick(houses);
        this.people.push({ x: h.x + 0.5, y: h.y + 1.5, tx: h.x, ty: h.y, col: this.pick(PEOPLE), v: 0.5 + r() * 0.5 });
      }
      if (this.people.length > want2) this.people.length = want2;
    }
    countUse(u) { let c = 0; for (let i = 0; i < N * N; i++) if (this.use[i] === u) c++; return c; }

    /* ================= オーパーツ ================= */
    spawnOpa(type) {
      const def = WD.OPA[type];
      this.fx.shake = Math.max(this.fx.shake, 1.2);
      this.fx.flash = 0.6;
      if (def.line) return this.spawnLine(type, def.line);
      const s = this.findSpot(def.size, 0, 40, { bulldoze: true });
      if (!s) return null;
      const b = this.place(type, s[0], s[1], 'opa');
      return { x: s[0] + def.size / 2, y: s[1] + def.size / 2, id: b.id };
    }
    // 高速道路（横一直線）と新幹線（縦一直線）は島の中央を貫く
    spawnLine(type, kind) {
      for (const off of [0, 3, -3, 6, -6, 9, -9, 12, -12]) {
        const line = 50 + off, tiles = [];
        let ok = true;
        for (let t = 0; t < N; t++) {
          const x = kind === 'road' ? t : line, y = kind === 'road' ? line : t, k = idx(x, y);
          if (this.ground[k] === SEA) continue;
          const o = this.occ[k];
          if ((o && this.blds.get(o).kind !== 'house') || (kind === 'road' ? this.rail[k] : this.level[k] === HIGHWAY)) { ok = false; break; }
          tiles.push([x, y, k]);
        }
        if (!ok || tiles.length < 20) continue;
        for (const [, , k] of tiles) {
          if (this.occ[k]) this.remove(this.occ[k]);
          this.tree[k] = 0;
          if (kind === 'road') { this.use[k] = ROAD; this.level[k] = HIGHWAY; } else { this.rail[k] = 1; }
        }
        const a = kind === 'road' ? tiles[0][0] : tiles[0][1], b = kind === 'road' ? tiles[tiles.length - 1][0] : tiles[tiles.length - 1][1];
        if (kind === 'road') {
          for (let c = 0; c < 8; c++) this.cars.push({ line, a, b, p: a + this.rand() * (b - a), dir: c % 2 ? 1 : -1, v: 3 + this.rand() * 3, type: 'car' + (c % 4) });
        } else {
          this.trains.push({ line, a, b, p: a, dir: 1, v: 9 });
        }
        this.dirty = true;
        return { x: kind === 'road' ? 50 : line, y: kind === 'road' ? line : 50 };
      }
      return null;
    }

    /* ================= 演出 ================= */
    setSeason(s) { if (s !== this.season) { this.season = s; this.dirty = true; } }
    say(text, at) {
      if (!text) return;
      let anchor = at;
      if (!anchor && this.people.length) anchor = { person: this.pick(this.people) };
      if (!anchor) anchor = { x: 50, y: 50 };
      this.bubbles.push({ text, anchor, life: 4.5 });
      if (this.bubbles.length > 3) this.bubbles.shift();
    }
    dropWord(word) { this.fx.drop = { word, t: 0 }; }
    alert() { this.fx.alert = 2.5; this.fx.shake = Math.max(this.fx.shake, 0.6); }
    collapse() { this.fx.collapse = 0; this.fx.shake = 3; }

    /* ================= 更新 ================= */
    update(dt) {
      this.t += dt;
      const ts = this.timeScale;
      const fx = this.fx;
      fx.shake = Math.max(0, fx.shake - dt);
      fx.flash = Math.max(0, fx.flash - dt);
      fx.alert = Math.max(0, fx.alert - dt);
      if (fx.drop) { fx.drop.t += dt; if (fx.drop.t > 1.6) fx.drop = null; else if (fx.drop.t > 1.0 && !fx.drop.hit) { fx.drop.hit = true; fx.shake = 0.8; fx.flash = 0.5; } }
      if (fx.collapse >= 0) fx.collapse += dt;
      for (const b of this.bubbles) b.life -= dt;
      this.bubbles = this.bubbles.filter((b) => b.life > 0);
      for (const c of this.clouds) { c.x += c.v * dt * (ts ? 1 : 0.3); if (c.x > 1.2) c.x = -0.2; }
      if (!ts) return;
      // 住人：近くの家のまわりを歩き回る
      for (const p of this.people) {
        const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
        if (d < 0.1) {
          const hs = [...this.blds.values()];
          const h = hs.length ? this.pick(hs) : { x: 50, y: 50, n: 1 };
          const x = h.x + Math.round((this.rand() - 0.5) * 8), y = h.y + h.n + Math.round(this.rand() * 3);
          if (inside(x, y) && this.ground[idx(x, y)] !== SEA && this.ground[idx(x, y)] !== WATER && !this.occ[idx(x, y)]) { p.tx = x + 0.5; p.ty = y + 0.5; }
        } else {
          const s = Math.min(d, p.v * dt * ts);
          p.x += (dx / d) * s; p.y += (dy / d) * s;
        }
      }
      for (const c of this.cars) {
        c.p += c.dir * c.v * dt * ts;
        if (c.p > c.b) { c.p = c.b; c.dir = -1; } else if (c.p < c.a) { c.p = c.a; c.dir = 1; }
      }
      for (const tr of this.trains) {
        tr.p += tr.dir * tr.v * dt * ts;
        if (tr.p > tr.b + 6) tr.dir = -1; else if (tr.p < tr.a - 6) tr.dir = 1;
      }
    }

    /* ================= 地形キャッシュ ================= */
    paintCache() {
      const g = this.cache.getContext('2d');
      g.clearRect(0, 0, CW, CH);
      const s = this.season, B = this.biome;
      const snowy = this.era && this.era.biome === 'snow';
      // 1) 島の底（崖）を奥から手前へ
      for (let sum = 0; sum < N * 2 - 1; sum++) for (let x = Math.max(0, sum - N + 1); x <= Math.min(N - 1, sum); x++) {
        const y = sum - x, i = idx(x, y);
        if (!this.ground[i]) continue;
        const X = wx(x, y), Y = wy(x, y), d = this.depth[i];
        g.fillStyle = '#7a5030'; g.fillRect(X - 4, Y, 4, 4); g.fillStyle = '#5a3a20'; g.fillRect(X, Y, 4, 4);
        const bands = [['#6a5a50', '#4a3e38'], ['#5a4c46', '#3e3430'], ['#463c3a', '#2e2826'], ['#342e30', '#221e20']];
        for (let k = 0; k < 4; k++) {
          const y0 = Y + 4 + (k * (d - 4)) / 4, h = Math.ceil((d - 4) / 4);
          g.fillStyle = bands[k][0]; g.fillRect(X - 4, y0, 4, h);
          g.fillStyle = bands[k][1]; g.fillRect(X, y0, 4, h);
        }
      }
      // 2) 地表
      const diamond = (X, Y, col) => { g.fillStyle = col; g.fillRect(X - 2, Y - 2, 4, 1); g.fillRect(X - 4, Y - 1, 8, 2); g.fillRect(X - 2, Y + 1, 4, 1); };
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = idx(x, y), gr = this.ground[i];
        if (!gr) continue;
        const X = wx(x, y), Y = wy(x, y), v = ((x * 7 + y * 13) % 5) / 40 - 0.05;
        let col;
        if (gr === WATER) col = snowy && s === 'winter' ? '#b8d8ec' : (x + y) % 3 ? '#3a7ad0' : '#4a8ae0';
        else if (gr === ROCK) col = WD.Sprites.shade('#8a8a86', v);
        else if (gr === SAND) col = WD.Sprites.shade('#e8d090', v);
        else col = WD.Sprites.shade(B.ground[s], v);
        diamond(X, Y, col);
        const u = this.use[i];
        if (u === FIELD) {
          diamond(X, Y, snowy && s === 'winter' ? '#e4ecf0' : CROP[s]);
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(X - 3, Y, 6, 1);
        } else if (u === ROAD) {
          const lv = this.level[i];
          diamond(X, Y, gr === WATER ? '#7a5a3a' : ROAD_COL[lv]);
          if (lv === HIGHWAY) { g.fillStyle = '#f4f4f4'; if (x % 2) g.fillRect(X - 1, Y, 2, 1); }
        }
        if (this.rail[i]) {
          diamond(X, Y, '#8a8478');
          g.fillStyle = '#4a3a2a'; g.fillRect(X - 1, Y - 1, 2, 2);
          g.fillStyle = '#c8ccd4'; g.fillRect(X + 1, Y - 2, 1, 1); g.fillRect(X - 2, Y + 1, 1, 1);
        }
      }
      // 3) 木と岩山（奥から手前へ）
      for (let sum = 0; sum < N * 2 - 1; sum++) for (let x = Math.max(0, sum - N + 1); x <= Math.min(N - 1, sum); x++) {
        const y = sum - x, i = idx(x, y), X = wx(x, y), Y = wy(x, y);
        if (this.ground[i] === ROCK && (x + y) % 2 === 0) {
          g.fillStyle = '#9a9a96'; g.beginPath(); g.moveTo(X - 4, Y + 1); g.lineTo(X, Y - 6); g.lineTo(X + 4, Y + 1); g.fill();
          g.fillStyle = '#6a6a68'; g.beginPath(); g.moveTo(X, Y - 6); g.lineTo(X + 4, Y + 1); g.lineTo(X, Y + 1); g.fill();
          if (snowy || s === 'winter') { g.fillStyle = '#f4f8fc'; g.fillRect(X - 1, Y - 5, 2, 2); }
        }
        if (!this.tree[i]) continue;
        const t = B.tree;
        if (t === 'pine') { g.fillStyle = '#2a5a3a'; g.fillRect(X - 1, Y - 6, 2, 2); g.fillRect(X - 2, Y - 4, 4, 2); g.fillRect(X - 3, Y - 2, 6, 2); if (s === 'winter' || snowy) { g.fillStyle = '#f0f4f8'; g.fillRect(X - 1, Y - 6, 2, 1); } }
        else if (t === 'palm') { g.fillStyle = '#7a5a30'; g.fillRect(X, Y - 5, 1, 5); g.fillStyle = '#2a8a3a'; g.fillRect(X - 3, Y - 6, 7, 1); g.fillRect(X - 2, Y - 7, 5, 1); }
        else if (t === 'dead') { g.fillStyle = '#5a4a3a'; g.fillRect(X, Y - 5, 1, 5); g.fillRect(X - 2, Y - 4, 2, 1); g.fillRect(X + 1, Y - 3, 2, 1); }
        else {
          const leaf = s === 'autumn' ? (this.tree[i] === 1 ? '#d8602a' : '#e0a030') : s === 'winter' ? '#7a6a58' : s === 'spring' && this.tree[i] === 3 ? '#f0b0c8' : '#2e7a2a';
          g.fillStyle = '#5a3a20'; g.fillRect(X, Y - 2, 1, 2);
          g.fillStyle = leaf; g.fillRect(X - 2, Y - 5, 5, 3); g.fillRect(X - 1, Y - 6, 3, 1);
        }
      }
      this.dirty = false;
    }

    /* ================= カメラ ================= */
    resize() {
      const r = this.canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      this.vw = Math.max(1, r.width); this.vh = Math.max(1, r.height); this.dpr = dpr;
      this.canvas.width = Math.round(this.vw * dpr); this.canvas.height = Math.round(this.vh * dpr);
    }
    cam(vw, vh, zoom, pan) {
      const fit = Math.min(vw / 830, vh / 560);
      const s = fit * zoom;
      return { s, ox: vw / 2 - (OX + pan.x) * s, oy: vh / 2 - (TOP + 240 + pan.y) * s };
    }
    zoomAt(f, sx, sy) {
      const z = Math.max(0.7, Math.min(8, this.zoom * f));
      const c = this.cam(this.vw, this.vh, this.zoom, this.pan);
      if (sx === undefined) { sx = this.vw / 2; sy = this.vh / 2; }
      const wxp = (sx - c.ox) / c.s, wyp = (sy - c.oy) / c.s; // 画面上の点を固定したまま拡大
      this.zoom = z;
      const c2 = this.cam(this.vw, this.vh, z, { x: 0, y: 0 });
      this.pan.x = wxp - (sx - c2.ox) / c2.s; this.pan.y = wyp - (sy - c2.oy) / c2.s;
    }
    resetView() { this.zoom = 1; this.pan = { x: 0, y: 0 }; }
    bindInput() {
      const cv = this.canvas, pts = new Map();
      let last = null, pinch = 0;
      cv.addEventListener('wheel', (e) => { e.preventDefault(); const r = cv.getBoundingClientRect(); this.zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); last = [e.clientX, e.clientY]; pinch = 0; });
      cv.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        const c = this.cam(this.vw, this.vh, this.zoom, this.pan);
        if (pts.size === 2) {
          const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
          const r = cv.getBoundingClientRect();
          if (pinch) this.zoomAt(d / pinch, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
          pinch = d;
        } else if (last) {
          this.pan.x -= (e.clientX - last[0]) / c.s; this.pan.y -= (e.clientY - last[1]) / c.s;
          last = [e.clientX, e.clientY];
        }
      });
      const up = (e) => { pts.delete(e.pointerId); pinch = 0; last = pts.size ? [...pts.values()][0] : null; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('dblclick', () => this.resetView());
    }

    /* ================= 描画 ================= */
    render() {
      if (!this.ground) return;
      if (this.dirty) this.paintCache();
      this.draw(this.ctx, this.vw, this.vh, this.dpr, this.cam(this.vw, this.vh, this.zoom, this.pan), true);
    }
    draw(g, vw, vh, dpr, c, live) {
      const fx = this.fx, s = this.season;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 空
      const sky = fx.collapse >= 0 ? ['#2a0606', '#a03a1a'] : SKY[s];
      const grd = g.createLinearGradient(0, 0, 0, vh);
      grd.addColorStop(0, sky[0]); grd.addColorStop(1, sky[1]);
      g.fillStyle = grd; g.fillRect(0, 0, vw, vh);
      g.fillStyle = 'rgba(255,255,255,0.75)';
      for (const cl of this.clouds) {
        const x = cl.x * vw, y = cl.y * vh, w = 50 * cl.s;
        g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(8 * cl.s));
        g.fillRect(Math.round(x + w * 0.2), Math.round(y - 5 * cl.s), Math.round(w * 0.5), Math.round(6 * cl.s));
      }
      // 島（揺れ・崩落）
      let ox = c.ox, oy = c.oy;
      if (live && fx.shake > 0) { ox += (Math.random() - 0.5) * 8 * fx.shake; oy += (Math.random() - 0.5) * 8 * fx.shake; }
      if (fx.collapse > 0) oy += fx.collapse * fx.collapse * 30 * c.s;
      g.imageSmoothingEnabled = false;
      g.setTransform(dpr * c.s, 0, 0, dpr * c.s, dpr * ox, dpr * oy);
      if (fx.collapse > 0) g.globalAlpha = Math.max(0, 1 - fx.collapse / 5);
      g.drawImage(this.cache, 0, 0);
      // 建物・乗り物・住人を奥から手前へ
      const items = [];
      for (const b of this.blds.values()) items.push([b.x + b.y + 2 * (b.n - 1), 0, b]);
      for (const p of this.people) items.push([p.x + p.y, 1, p]);
      for (const car of this.cars) { const x = car.p, y = car.line; items.push([x + y, 2, car, x, y]); }
      for (const tr of this.trains) for (let k = 0; k < 6; k++) { const y = tr.p - k * tr.dir; if (y >= tr.a && y <= tr.b) items.push([tr.line + y, 3, tr, tr.line, y]); }
      items.sort((a, b) => a[0] - b[0]);
      for (const it of items) {
        if (it[1] === 0) {
          const b = it[2], sp = WD.Sprites.get(b.type), cx = b.x + (b.n - 1) / 2, cy = b.y + (b.n - 1) / 2;
          let dy = 0;
          const age = this.t - b.born;
          if (age < 0.7) dy = -Math.pow(1 - age / 0.7, 2) * 260;
          g.drawImage(sp.c, Math.round(wx(cx, cy) - sp.ax), Math.round(wy(cx, cy) - sp.ay + dy));
        } else if (it[1] === 1) {
          const p = it[2], X = Math.round(wx(p.x - 0.5, p.y - 0.5)), Y = Math.round(wy(p.x - 0.5, p.y - 0.5));
          g.fillStyle = '#f0c8a0'; g.fillRect(X, Y - 4, 1, 1);
          g.fillStyle = p.col; g.fillRect(X, Y - 3, 1, 2);
        } else {
          const sp = WD.Sprites.get(it[1] === 2 ? it[2].type : 'train');
          g.drawImage(sp.c, Math.round(wx(it[3], it[4]) - sp.ax), Math.round(wy(it[3], it[4]) - sp.ay - (it[1] === 3 ? 1 : 0)));
        }
      }
      g.globalAlpha = 1;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!live) return;
      // 吹き出し（画面座標）
      g.font = '12px "DotGothic16", sans-serif';
      g.textBaseline = 'middle';
      for (const bb of this.bubbles) {
        const a = bb.anchor;
        const tx = a.person ? a.person.x - 0.5 : a.x, ty = a.person ? a.person.y - 0.5 : a.y;
        const X = ox + wx(tx, ty) * c.s, Y = oy + (wy(tx, ty) - (a.person ? 5 : 30)) * c.s;
        const w = g.measureText(bb.text).width + 12, h = 20;
        const bx = Math.max(4, Math.min(vw - w - 4, X - w / 2)), by = Math.max(4, Math.min(vh - h - 12, Y - h - 8));
        g.globalAlpha = Math.min(1, bb.life * 2);
        g.fillStyle = '#000'; g.fillRect(bx - 2, by - 2, w + 4, h + 4);
        g.fillStyle = '#fffbe8'; g.fillRect(bx, by, w, h);
        g.fillRect(Math.max(bx + 4, Math.min(bx + w - 8, X - 3)), by + h, 6, 4);
        g.fillStyle = '#1a1424'; g.fillText(bb.text, bx + 6, by + h / 2 + 1);
        g.globalAlpha = 1;
      }
      // 神託の落下
      if (fx.drop && fx.drop.t < 1.0) {
        const k = fx.drop.t / 1.0, X = ox + wx(50, 50) * c.s, Y = oy + wy(50, 50) * c.s;
        g.font = 'bold 26px "DotGothic16", sans-serif'; g.textAlign = 'center';
        g.fillStyle = '#000'; g.fillText('「' + fx.drop.word + '」', X + 2, Y * k * k + 2);
        g.fillStyle = '#ffe680'; g.fillText('「' + fx.drop.word + '」', X, Y * k * k);
        g.textAlign = 'left';
      }
      if (fx.flash > 0) { g.fillStyle = 'rgba(255,255,230,' + fx.flash * 0.8 + ')'; g.fillRect(0, 0, vw, vh); }
      if (fx.alert > 0) {
        const a = 0.25 * Math.abs(Math.sin(fx.alert * 6));
        g.strokeStyle = 'rgba(255,40,30,' + (a + 0.2) + ')'; g.lineWidth = 14; g.strokeRect(0, 0, vw, vh);
      }
    }

    /* 結果カード用の空撮（吹き出しなしで全体を写す） */
    snapshot(w, h) {
      if (this.dirty) this.paintCache();
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      this.draw(c.getContext('2d'), w, h, 1, this.cam(w, h, 1, { x: 0, y: 0 }), false);
      return c;
    }
  }

  WD.Island = Island;
})();
