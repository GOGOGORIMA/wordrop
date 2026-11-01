/* WORDROP — 建物のプロシージャル・ドット絵スプライト */
(function () {
  const cache = {};

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* スプライト作成。(ax, ay) がタイル中心に重なる点 */
  function make(w, h, ay, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const ax = w >> 1;
    const lights = [];
    const emit = [];
    const half = (a, adx) => Math.floor((a - adx) / 2);

    const api = {
      g, cx: ax, cy: ay,
      px(x, y, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); },
      rect(x, y, ww, hh, col) { if (ww > 0 && hh > 0) { g.fillStyle = col; g.fillRect(x | 0, y | 0, ww, hh); } },
      light(x, y, col) { g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); lights.push([(x | 0) - ax, (y | 0) - ay, col]); },
      emit(x, y, kind) { emit.push([(x | 0) - ax, (y | 0) - ay, kind]); },
      /* 地面ひし形の前端 y (列 dx) */
      front(cx, cy, a, dx) { const adx = dx < 0 ? -dx - 1 : dx; return cy + half(a, adx); },
      back(cx, cy, a, dx) { const adx = dx < 0 ? -dx - 1 : dx; return cy - half(a, adx); },
      /* アイソメトリックの箱。(cx, cy) は底面ひし形の中心 */
      box(cx, cy, a, hgt, top, left, right, opt) {
        opt = opt || {};
        for (let dx = -a; dx < a; dx++) {
          const adx = dx < 0 ? -dx - 1 : dx;
          const yF = cy + half(a, adx), yB = cy - half(a, adx);
          const x = cx + dx;
          const colH = typeof hgt === 'function' ? hgt(dx) : hgt;
          api.rect(x, yB - colH, 1, yF - yB + 1, top);
          api.rect(x, yF - colH + 1, 1, colH, dx < 0 ? left : right);
          if (opt.edge) api.px(x, yF - colH, opt.edge);
          if (opt.rim) api.px(x, yB - colH, opt.rim);
        }
      },
      /* 寄棟屋根。baseH は屋根の付け根の高さ */
      roof(cx, cy, a, baseH, peak, left, right, opt) {
        opt = opt || {};
        for (let dx = -a; dx < a; dx++) {
          const adx = dx < 0 ? -dx - 1 : dx;
          const yF = cy + half(a, adx) - baseH;
          const yT = cy - baseH - peak + Math.round((adx * peak) / a);
          let col = dx < 0 ? left : right;
          if (opt.stripe && (dx & 1)) col = opt.stripe;
          api.rect(cx + dx, yT, 1, yF - yT + 1, col);
          if (opt.ridge && adx === 0) api.px(cx + dx, yT, opt.ridge);
          if (opt.eave) api.px(cx + dx, yF, opt.eave);
        }
      },
      cone(cx, cy, r, height, left, right) {
        for (let dx = -r; dx < r; dx++) {
          const adx = dx < 0 ? -dx - 1 : dx;
          const yB = cy + Math.floor(Math.sqrt(Math.max(0, r * r - (adx + 0.5) * (adx + 0.5))) / 2);
          const yT = cy - height + Math.round((adx * height) / r);
          api.rect(cx + dx, yT, 1, yB - yT + 1, dx < 0 ? left : right);
        }
      },
      dome(cx, cy, r, light, mid, dark) {
        for (let dx = -r; dx < r; dx++) {
          const adx = dx < 0 ? -dx - 1 : dx;
          const hh = Math.sqrt(Math.max(0, r * r - (adx + 0.5) * (adx + 0.5)));
          const yB = cy + Math.floor(hh / 2);
          const yT = cy - Math.round(hh * 0.95);
          const col = dx < -r / 3 ? light : dx < r / 3 ? mid : dark;
          api.rect(cx + dx, yT, 1, yB - yT + 1, col);
        }
        api.px(cx - Math.round(r / 2), cy - Math.round(r * 0.7), '#ffffff');
      },
      tree(x, y, c0, c1, c2, trunk) {
        api.rect(x, y - 2, 1, 3, trunk);
        api.rect(x - 2, y - 5, 5, 3, c1);
        api.rect(x - 1, y - 7, 3, 2, c1);
        api.rect(x + 1, y - 5, 2, 3, c0);
        api.px(x - 1, y - 6, c2); api.px(x - 2, y - 4, c2); api.px(x, y - 8, c1);
      },
    };
    draw(api);
    return { canvas: c, ax, ay, w, h, lights, emit };
  }

  const WIN = '#ffe08a';

  const DRAW = {
    hut(v) {
      return make(20, 22, 15, (s) => {
        const { cx, cy } = s;
        s.cone(cx, cy, 6, 11, '#d0a656', '#9a7434');
        for (let i = -4; i < 4; i += 2) s.px(cx + i, cy - 3 + Math.abs(i) / 2, '#b08440');
        s.rect(cx - 1, cy + 1, 2, 2, '#3a2410');
        s.px(cx, cy - 12, '#7a5a2a');
        if (v % 2) s.light(cx - 1, cy + 1, '#ff9a3a');
      });
    },
    house(v, course) {
      const roofs = course === 'japan'
        ? [['#5a5f6e', '#3c404c'], ['#6e5a48', '#4c3e30'], ['#8a3a2e', '#5e281e']]
        : [['#c0503a', '#8a3424'], ['#3f6496', '#2c4668'], ['#7a5a3a', '#54402a'], ['#c08a3a', '#8a6024']];
      const [rl, rr] = roofs[v % roofs.length];
      return make(22, 24, 16, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 5, 4, '#d8cba8', '#efe4c8', '#c4b48e');
        s.rect(cx - 3, s.front(cx, cy, 5, -3) - 2, 1, 2, '#5a3a20');
        s.light(cx + 2, s.front(cx, cy, 5, 2) - 2, WIN);
        s.roof(cx, cy, 6, 4, 4, rl, rr, { eave: '#2a2018' });
      });
    },
    field(v, course) {
      const japan = course === 'japan';
      const c1 = japan ? '#7cc890' : v % 2 ? '#d8b84a' : '#9ac04a';
      const c2 = japan ? '#3f9a46' : v % 2 ? '#b8942c' : '#6a9a2a';
      return make(28, 18, 9, (s) => {
        const { cx, cy } = s;
        const a = 10;
        for (let dx = -a; dx < a; dx++) {
          const yB = s.back(cx, cy, a, dx), yF = s.front(cx, cy, a, dx);
          for (let y = yB; y <= yF; y++) {
            let col = (y + (dx >> 1)) % 3 === 0 ? c2 : c1;
            if (y === yB || y === yF) col = '#7a5a30';
            s.px(cx + dx, y, col);
          }
        }
      });
    },
    shrine(v, course) {
      if (course !== 'japan') return DRAW.church(v + 1, course, true);
      return make(24, 26, 18, (s) => {
        const { cx, cy } = s;
        s.box(cx + 2, cy - 2, 4, 3, '#e8dcc0', '#f2ead8', '#c8b898');
        s.roof(cx + 2, cy - 2, 5, 3, 3, '#4a4a5a', '#30303c', { ridge: '#c8a040' });
        const red = '#d8342a', dk = '#9a2018';
        s.rect(cx - 6, cy - 4, 1, 8, red); s.rect(cx - 1, cy - 1, 1, 8, dk);
        for (let i = -8; i <= 1; i++) s.px(cx + i, cy - 6 + Math.round((i + 8) / 2), '#1a1a1a');
        for (let i = -7; i <= 0; i++) s.px(cx + i, cy - 4 + Math.round((i + 7) / 2), red);
        s.light(cx + 3, cy + 1, '#ff8a3a');
      });
    },
    pagoda(v) {
      return make(24, 44, 38, (s) => {
        const { cx } = s;
        let cy = s.cy;
        const sizes = [5, 4, 4, 3, 3];
        for (let i = 0; i < sizes.length; i++) {
          const a = sizes[i];
          s.box(cx, cy, a, 3, '#8a3a2a', '#b84a32', '#7a2a1e');
          s.roof(cx, cy, a + 2, 3, 2, '#4a4a58', '#2e2e3a', { eave: '#1a1a22' });
          if (i === 0) s.light(cx - 2, s.front(cx, cy, a, -2) - 1, WIN);
          cy -= 5;
        }
        s.rect(cx, cy - 6, 1, 8, '#d8b040');
        s.px(cx - 1, cy - 3, '#d8b040'); s.px(cx + 1, cy - 3, '#d8b040');
      });
    },
    temple(v) {
      return make(30, 34, 24, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 8, 2, '#d8d2c2', '#ece8dc', '#bab29e');
        s.box(cx, cy - 2, 5, 9, '#c8c0aa', '#a89e86', '#8a826c');
        for (let dx = -7; dx < 7; dx += 2) {
          const yF = s.front(cx, cy, 8, dx) - 2;
          s.rect(cx + dx, yF - 8, 1, 9, dx < 0 ? '#f6f4ec' : '#d6d0bc');
        }
        s.box(cx, cy - 11, 8, 2, '#e6e0d0', '#f4f0e6', '#c8c0aa');
        s.roof(cx, cy - 11, 9, 2, 4, '#d8cfa8', '#b0a684', { ridge: '#fff8e0' });
        s.light(cx - 1, cy - 4, '#ffb04a');
      });
    },
    church(v, course, small) {
      return make(26, 44, 36, (s) => {
        const { cx, cy } = s;
        const a = small ? 4 : 6;
        s.box(cx, cy, a, small ? 4 : 6, '#e2dcd0', '#f2eee6', '#c6beb0');
        s.roof(cx, cy, a + 1, small ? 4 : 6, small ? 5 : 7, '#a8402e', '#7a2c20', { eave: '#4a1a12' });
        const tx = cx - 2, ty = cy + 1;
        s.box(tx, ty, 2, small ? 9 : 14, '#e8e2d6', '#f6f2ea', '#cac2b4');
        const th = small ? 9 : 14;
        s.roof(tx, ty, 3, th, 7, '#5a6a8a', '#3a4866');
        s.rect(tx, ty - th - 13, 1, 5, '#e8c040'); s.rect(tx - 1, ty - th - 12, 3, 1, '#e8c040');
        s.light(tx - 1, s.front(tx, ty, 2, -1) - th + 3, '#ffd06a');
        s.light(cx + 3, s.front(cx, cy, a, 3) - 3, '#c0d8ff');
      });
    },
    castle(v, course) {
      if (course !== 'japan') {
        return make(34, 42, 32, (s) => {
          const { cx, cy } = s;
          const st = ['#9a968c', '#b4b0a4', '#7a766c'];
          s.box(cx, cy, 7, 13, st[0], st[1], st[2], { edge: '#c8c4b8' });
          for (let dx = -7; dx < 7; dx += 2) s.px(cx + dx, s.back(cx, cy, 7, dx) - 14, st[1]);
          for (let dx = -7; dx < 7; dx += 2) s.px(cx + dx, s.front(cx, cy, 7, dx) - 14, st[1]);
          s.rect(cx - 1, cy + 1, 2, 3, '#2a2018');
          for (const ox of [-8, 8]) {
            s.box(cx + ox, cy - 1, 3, 17, st[0], st[1], st[2]);
            s.roof(cx + ox, cy - 1, 4, 17, 7, '#3a5aa8', '#28407a');
            s.px(cx + ox, cy - 26, '#d84040');
          }
          s.light(cx - 4, s.front(cx, cy, 7, -4) - 7, WIN);
          s.light(cx + 4, s.front(cx, cy, 7, 4) - 7, WIN);
        });
      }
      return make(34, 46, 36, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 9, 5, '#9a968c', '#b4b0a4', '#7e7a70');
        for (let dx = -9; dx < 9; dx += 3) s.px(cx + dx, s.front(cx, cy, 9, dx) - 2, '#6a665c');
        let y = cy - 5;
        const tiers = [[7, 5, 3], [5, 4, 3], [3, 3, 4]];
        for (const [a, hgt, pk] of tiers) {
          s.box(cx, y, a, hgt, '#f4f4f0', '#ffffff', '#d4d4d0');
          s.light(cx - 2, s.front(cx, y, a, -2) - 2, WIN);
          s.roof(cx, y, a + 2, hgt, pk, '#3c4658', '#262e3e', { eave: '#161c26' });
          y -= hgt + pk - 1;
        }
        s.px(cx - 2, y + 1, '#ffd040'); s.px(cx + 1, y + 1, '#ffd040');
      });
    },
    fort(v, course) {
      const japan = course === 'japan';
      const stake = japan ? '#7a5230' : '#8a867c';
      const stakeHi = japan ? '#a87848' : '#b0aca0';
      return make(30, 30, 20, (s) => {
        const { cx, cy } = s;
        const a = 9;
        const ring = (front) => {
          for (let dx = -a; dx < a; dx += 2) {
            const y = front ? s.front(cx, cy, a, dx) : s.back(cx, cy, a, dx);
            s.rect(cx + dx, y - 5, 1, 6, dx < 0 ? stakeHi : stake);
            if (japan) s.px(cx + dx, y - 6, stakeHi);
          }
        };
        ring(false);
        s.box(cx, cy - 1, 2, 10, japan ? '#8a6038' : '#9a968c', japan ? '#a87848' : '#b4b0a4', japan ? '#6a4626' : '#7a766c');
        s.roof(cx, cy - 1, 3, 10, 3, japan ? '#5a4a3a' : '#7a3a2a', japan ? '#3a2e24' : '#5a2a1e');
        s.light(cx, cy - 9, '#ff8a3a');
        ring(true);
      });
    },
    market(v) {
      return make(30, 24, 15, (s) => {
        const { cx, cy } = s;
        const tents = [[-5, -2, '#d83a3a'], [5, -1, '#3a6ad8'], [0, 3, '#e8b030']];
        for (const [ox, oy, col] of tents) {
          s.box(cx + ox, cy + oy, 3, 2, '#8a6038', '#a87848', '#6a4626');
          s.roof(cx + ox, cy + oy, 4, 3, 3, col, col, { stripe: '#f6f2e6' });
          s.light(cx + ox, cy + oy + 1, '#ffcf6a');
        }
      });
    },
    konbini(v) {
      const brands = [['#2aa04a', '#3a6fd0'], ['#f08a1a', '#2a8a3a'], ['#d8262a', '#f4a020'], ['#2a5ad0', '#ffffff']];
      const [b1, b2] = brands[v % brands.length];
      return make(28, 26, 16, (s) => {
        const { cx, cy } = s;
        const a = 8, hgt = 6;
        s.box(cx, cy, a, hgt, '#e4e4e8', '#fafafa', '#d0d0d8', { rim: '#b8b8c0' });
        for (let dx = -a; dx < a; dx++) {
          const yF = s.front(cx, cy, a, dx);
          s.px(cx + dx, yF - hgt + 1, b1);
          s.px(cx + dx, yF - hgt + 2, b2);
          if (dx > -a + 1 && dx < -1) {
            s.light(cx + dx, yF - 2, '#c8f0ff');
            s.light(cx + dx, yF - 3, '#c8f0ff');
          }
          if (dx > 1 && dx < a - 2 && dx % 3 !== 0) s.light(cx + dx, yF - 3, '#e8f8ff');
        }
        s.rect(cx + a + 1, cy - 9, 1, 9, '#7a7a80');
        s.light(cx + a, cy - 12, b1); s.light(cx + a + 1, cy - 12, b1); s.light(cx + a + 2, cy - 12, b1);
        s.light(cx + a, cy - 11, b2); s.light(cx + a + 1, cy - 11, b2); s.light(cx + a + 2, cy - 11, b2);
      });
    },
    school(v) {
      return make(30, 34, 24, (s) => {
        const { cx, cy } = s;
        const a = 9, hgt = 8;
        s.box(cx, cy, a, hgt, '#e0d0b0', '#f0e4c8', '#c8b490', { rim: '#a89070' });
        for (let dx = -a + 1; dx < a - 1; dx += 2) {
          const yF = s.front(cx, cy, a, dx);
          s.light(cx + dx, yF - 2, '#ffe7a0');
          s.light(cx + dx, yF - 5, '#ffe7a0');
        }
        s.box(cx, cy - hgt, 2, 6, '#e0d0b0', '#f0e4c8', '#c8b490');
        s.roof(cx, cy - hgt, 3, 6, 3, '#5a6a7a', '#3a4a5a');
        s.px(cx - 1, cy - hgt - 4, '#ffffff'); s.px(cx - 1, cy - hgt - 3, '#222');
      });
    },
    factory(v) {
      return make(32, 44, 34, (s) => {
        const { cx, cy } = s;
        s.rect(cx + 4, cy - 26, 3, 22, '#8a3a2a'); s.rect(cx + 6, cy - 26, 1, 22, '#6a2a1e');
        s.rect(cx + 4, cy - 22, 3, 1, '#f0f0f0');
        s.emit(cx + 5, cy - 28, 'smoke');
        const a = 9, hgt = 5;
        s.box(cx, cy, a, hgt, '#9aa0a8', '#b4bac2', '#7a8088', { rim: '#6a7078' });
        for (const [ox, oy] of [[-5, -2], [0, 0], [5, 2]]) s.roof(cx + ox - 1, cy - 1 + oy - 2, 3, hgt, 3, '#c0c6ce', '#5a6068');
        for (let dx = -a + 1; dx < -1; dx++) s.light(cx + dx, s.front(cx, cy, a, dx) - 2, '#ffd27a');
      });
    },
    tower(v) {
      return make(20, 60, 56, (s) => {
        const { cx, cy } = s;
        const H = 46;
        for (let k = 0; k < H; k++) {
          const y = cy - k;
          const spread = Math.round(5 * (1 - k / H)) + 1;
          const col = Math.floor(k / 6) % 2 ? '#f4f4f4' : '#e0382a';
          s.px(cx - spread, y, col); s.px(cx + spread - 1, y, col);
          if (k % 6 === 0) s.rect(cx - spread, y, spread * 2, 1, col);
          else if (spread > 1) {
            const t = (k % 6) / 6;
            s.px(cx - spread + Math.round(t * (spread * 2 - 1)), y, '#b02a20');
          }
        }
        s.rect(cx, cy - H - 6, 1, 6, '#c0c0c0');
        s.emit(cx, cy - H - 7, 'blink');
      });
    },
    building(v) {
      const r = rng(v * 977 + 13);
      const sets = [['#8fb0c8', '#a8c4d8', '#6a8aa4'], ['#c8b89a', '#dccbb0', '#a49478'], ['#4a5a7a', '#5e6e90', '#36425a'], ['#b8c4cc', '#d0dae0', '#8a98a2']];
      const [t, l, rr] = sets[v % sets.length];
      const hgt = 20 + Math.floor(r() * 18);
      return make(18, hgt + 18, hgt + 12, (s) => {
        const { cx, cy } = s;
        const a = 5;
        s.box(cx, cy, a, hgt, t, l, rr, { rim: '#ffffff40' });
        for (let dx = -a; dx < a; dx++) {
          if ((dx & 1) === 0) continue;
          const yF = s.front(cx, cy, a, dx);
          for (let k = 3; k < hgt - 1; k += 3) {
            if (r() < 0.55) s.light(cx + dx, yF - k, r() < 0.8 ? '#fff2a8' : '#a8e8ff');
            else s.px(cx + dx, yF - k, '#2a3240');
          }
        }
        s.rect(cx, cy - hgt - a / 2 - 4, 1, 4, '#c0c0c0');
        if (v % 2) s.emit(cx, cy - hgt - a / 2 - 5, 'blink');
      });
    },
    dome(v) {
      return make(28, 26, 18, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 8, 2, '#8a9098', '#a0a8b0', '#6a7078');
        s.dome(cx, cy - 2, 7, '#f4f8fc', '#d4dce4', '#a0aab4');
        for (let dx = -6; dx < 6; dx += 2) s.light(cx + dx, cy - 1 + Math.abs(dx) / 3, '#7af0ff');
        s.rect(cx + 1, cy - 9, 1, 4, '#2a3a4a');
      });
    },
    rocket(v) {
      return make(22, 44, 38, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 6, 1, '#7a7a80', '#9a9aa0', '#5a5a60');
        s.rect(cx - 5, cy - 26, 1, 26, '#c03a2a');
        for (let k = 0; k < 26; k += 4) s.rect(cx - 5, cy - k - 1, 3, 1, '#c03a2a');
        s.rect(cx - 1, cy - 24, 3, 22, '#f4f4f4'); s.rect(cx + 1, cy - 24, 1, 22, '#c4c4cc');
        s.rect(cx - 1, cy - 14, 3, 1, '#2a2a3a');
        s.rect(cx, cy - 28, 1, 4, '#d82a2a'); s.rect(cx - 1, cy - 26, 3, 2, '#d82a2a');
        s.rect(cx - 2, cy - 5, 1, 4, '#d82a2a'); s.rect(cx + 2, cy - 5, 1, 4, '#a81a1a');
        s.light(cx, cy - 18, '#7af0ff');
        s.emit(cx, cy - 29, 'blink');
      });
    },
    statue(v) {
      const mats = [['#f0c838', '#b88a10'], ['#6aa88a', '#3a7058'], ['#c8c4b8', '#8a867c'], ['#e8e8f0', '#a0a0b0']];
      const [m1, m2] = mats[v % mats.length];
      return make(20, 34, 28, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 3, 4, '#9a968c', '#b4b0a4', '#7a766c');
        const by = cy - 6;
        s.rect(cx - 1, by - 7, 3, 8, m1); s.rect(cx + 1, by - 7, 1, 8, m2);
        s.rect(cx - 1, by - 10, 2, 3, m1); s.px(cx, by - 10, m2);
        s.rect(cx + 2, by - 13, 1, 7, m1);
        s.rect(cx - 2, by - 6, 1, 4, m1);
        s.px(cx + 2, by - 14, '#ffffff');
        s.light(cx + 2, by - 14, '#fff6c0');
      });
    },
    pyramid(v) {
      return make(30, 28, 18, (s) => {
        const { cx, cy } = s;
        for (let k = 0; k < 6; k++) s.box(cx, cy - k * 2, 10 - k * 2 + (k === 5 ? 1 : 0), 2, '#e8c870', '#f6dc90', '#b8984a');
        s.px(cx, cy - 13, '#fff0a0'); s.px(cx - 1, cy - 13, '#ffe060');
      });
    },
    windmill(v) {
      return make(26, 36, 30, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 3, 11, '#e4dccb', '#f4ecdc', '#c4b8a0');
        s.roof(cx, cy, 4, 11, 4, '#7a4a2a', '#5a341c');
        const hx = cx - 1, hy = cy - 13;
        for (let i = -8; i <= 8; i++) {
          if (i === 0) continue;
          s.px(hx + i, hy + i, '#5a3a20'); s.px(hx + i, hy - i, '#5a3a20');
          if (Math.abs(i) > 2) { s.px(hx + i, hy + i - 1, '#f4f0e4'); s.px(hx + i, hy - i - 1, '#f4f0e4'); }
        }
        s.px(hx, hy, '#2a1a10');
        s.light(cx + 1, cy - 2, WIN);
      });
    },
    solar(v) {
      return make(28, 18, 9, (s) => {
        const { cx, cy } = s;
        const a = 10;
        for (let dx = -a; dx < a; dx++) {
          const yB = s.back(cx, cy, a, dx), yF = s.front(cx, cy, a, dx);
          for (let y = yB; y <= yF; y++) {
            let col = '#1e3a6e';
            if ((dx + 20) % 4 === 0 || (y + 40) % 3 === 0) col = '#7aa0d8';
            if (y === yB || y === yF) col = '#8a8a90';
            s.px(cx + dx, y, col);
          }
        }
      });
    },
    tree(v, course) {
      return make(22, 22, 15, (s) => {
        const { cx, cy } = s;
        const c = course === 'japan' && v % 3 === 0 ? ['#c05a8a', '#f29ac0', '#ffd0e4'] : ['#1f5e22', '#3f9a3a', '#7ccc5a'];
        s.tree(cx - 4, cy - 1, c[0], c[1], c[2], '#5a3a1e');
        s.tree(cx + 3, cy - 2, c[0], c[1], c[2], '#5a3a1e');
        s.tree(cx, cy + 2, c[0], c[1], c[2], '#5a3a1e');
      });
    },
    ruins(v) {
      const r = rng(v * 31 + 7);
      return make(24, 22, 15, (s) => {
        const { cx, cy } = s;
        const hs = [];
        for (let i = 0; i < 12; i++) hs.push(r() < 0.35 ? 0 : 1 + Math.floor(r() * 7));
        s.box(cx, cy, 6, (dx) => hs[dx + 6] || 0, '#8a8478', '#a49e90', '#6e685c');
        for (let i = 0; i < 9; i++) s.px(cx - 7 + Math.floor(r() * 14), cy + Math.floor(r() * 4) - 1, r() < 0.5 ? '#6e685c' : '#4a7a3a');
        s.px(cx - 3, cy - 4, '#4a7a3a'); s.px(cx + 2, cy - 2, '#4a7a3a');
      });
    },
    portal(v) {
      return make(22, 34, 28, (s) => {
        const { cx, cy } = s;
        const oy = cy - 11, rx = 6, ry = 10;
        for (let y = -ry; y <= ry; y++) {
          const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
          s.rect(cx - w + 1, oy + y, Math.max(0, w * 2 - 2), 1, '#1a0030');
          s.light(cx - w, oy + y, '#d060ff');
          s.light(cx + w - 1, oy + y, '#ff80f0');
        }
        for (let i = 0; i < 10; i++) {
          const a = i * 0.9, rr = i * 0.6;
          s.light(cx + Math.round(Math.cos(a) * rr * 0.6), oy + Math.round(Math.sin(a) * rr), '#a040ff');
        }
        s.rect(cx - 3, cy - 1, 6, 1, '#3a1a4a');
        s.emit(cx, oy, 'sparkle');
      });
    },
    moai(v) {
      return make(16, 30, 24, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 4, 2, '#7a756c', '#948e82', '#5e584e');
        const by = cy - 2;
        s.rect(cx - 2, by - 5, 5, 5, '#8a8478'); s.rect(cx + 2, by - 5, 1, 5, '#625c52');
        s.rect(cx - 2, by - 16, 4, 11, '#948e82'); s.rect(cx + 1, by - 16, 1, 11, '#6a6458');
        s.rect(cx - 2, by - 12, 4, 1, '#5a5448');
        s.px(cx - 1, by - 10, '#5a5448'); s.px(cx - 1, by - 9, '#5a5448');
        s.px(cx - 3, by - 13, '#7a746a'); s.px(cx - 3, by - 12, '#7a746a'); s.px(cx - 3, by - 11, '#7a746a');
        s.rect(cx - 1, by - 7, 2, 1, '#5a5448');
        if (v % 3 === 0) s.rect(cx - 2, by - 18, 4, 2, '#a04a30');
      });
    },
    colosseum(v) {
      return make(34, 30, 18, (s) => {
        const { cx, cy } = s;
        const rx = 13, ry = 6.5, hh = 9;
        const wall = '#d8c09a', inner = '#a88a64', top = '#ecdcbc';
        for (let x = -rx; x < rx; x++) {
          const e = Math.sqrt(Math.max(0, 1 - ((x + 0.5) * (x + 0.5)) / (rx * rx)));
          const yb = Math.round(cy - e * ry), yf = Math.round(cy + e * ry);
          s.rect(cx + x, yb - hh, 1, hh + 1, inner);
          s.px(cx + x, yb - hh, top);
          s.rect(cx + x, yb + 1, 1, Math.max(0, yf - yb - hh), '#d8c088');
        }
        for (let x = -rx; x < rx; x++) {
          const e = Math.sqrt(Math.max(0, 1 - ((x + 0.5) * (x + 0.5)) / (rx * rx)));
          const yf = Math.round(cy + e * ry);
          const h = x > 6 ? 5 : hh;
          s.rect(cx + x, yf - h, 1, h + 1, x < 0 ? wall : '#bca07a');
          s.px(cx + x, yf - h, top);
          if ((x & 1) === 0) { s.px(cx + x, yf - 2, '#5a4430'); s.px(cx + x, yf - 5, '#5a4430'); if (h > 7) s.px(cx + x, yf - 8, '#5a4430'); }
        }
        s.light(cx - 2, cy - 1, '#ffb04a');
      });
    },
    kofun(v) {
      return make(34, 22, 12, (s) => {
        const { cx, cy } = s;
        for (let y = -7; y <= 7; y++) {
          const w = Math.round(15 * Math.sqrt(1 - (y * y) / 56));
          s.rect(cx - w, cy + Math.round(y / 1.4), w * 2, 1, '#3a78b8');
        }
        s.box(cx - 5, cy + 2, 5, 3, '#4e9a3a', '#5aac44', '#3a7a2a');
        s.dome(cx + 4, cy - 1, 7, '#64b84c', '#4e9a3a', '#3a7a2a');
        for (const [x, y] of [[-6, -2], [-3, 0], [3, -5], [6, -3], [1, -3]]) s.px(cx + x, cy + y, '#2a5a1e');
        s.px(cx - 9, cy + 3, '#c87a4a'); s.px(cx - 8, cy + 4, '#c87a4a');
      });
    },
    daibutsu(v) {
      return make(36, 40, 30, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 10, 2, '#b8b0a0', '#d0c8b8', '#9a9282');
        s.box(cx, cy - 2, 9, 8, '#f0e8d8', '#f4ecdc', '#c8bca4');
        for (let dx = -9; dx < 9; dx += 3) s.rect(cx + dx, s.front(cx, cy - 2, 9, dx) - 8, 1, 8, '#8a3a2a');
        s.rect(cx - 3, cy + 1, 6, 4, '#2a1a10');
        s.light(cx - 1, cy + 2, '#ffd040'); s.light(cx, cy + 2, '#ffd040'); s.light(cx - 1, cy + 3, '#e8b020'); s.light(cx, cy + 3, '#e8b020');
        s.roof(cx, cy - 2, 11, 8, 6, '#5a5a66', '#3a3a46', { eave: '#1a1a22' });
        s.px(cx - 4, cy - 17, '#e8c040'); s.px(cx + 3, cy - 17, '#e8c040');
        s.roof(cx, cy - 14, 5, 3, 3, '#5a5a66', '#3a3a46');
      });
    },
    ziggurat(v) {
      return make(30, 32, 22, (s) => {
        const { cx, cy } = s;
        let y = cy;
        for (const a of [10, 8, 6, 4]) { s.box(cx, y, a, 3, '#e0b878', '#ecc88a', '#a87e44'); y -= 3; }
        for (let k = 0; k < 12; k++) s.px(cx - 1, cy + 4 - k, '#f8e0a8');
        s.box(cx, y, 2, 4, '#3a6ab8', '#4a80d0', '#2a5090');
        s.light(cx - 1, y - 1, '#ffd060');
      });
    },
    maya(v) {
      return make(28, 38, 28, (s) => {
        const { cx, cy } = s;
        let y = cy;
        for (const a of [9, 7, 5, 3]) { s.box(cx, y, a, 4, '#a8a890', '#c0c0a6', '#82826a'); y -= 4; }
        for (let k = 0; k < 17; k++) s.px(cx - 1, cy + 4 - k, '#e0e0c8');
        s.box(cx, y, 3, 4, '#c0b8a0', '#d8d0b8', '#9a927a');
        s.rect(cx - 1, y - 10, 2, 4, '#b8b098');
        s.rect(cx - 1, y + 1, 2, 2, '#2a2018');
        for (let k = 0; k < 8; k++) s.px(cx - 8 + ((k * 7) % 16), cy - (k * 3) % 12, '#4a7a3a');
        s.light(cx, y - 1, '#ff8a3a');
      });
    },
    ship(v) {
      return make(26, 28, 20, (s) => {
        const { cx, cy } = s;
        const kind = v % 3;
        const hull = kind === 2 ? ['#2a2a30', '#18181c'] : ['#8a5a2a', '#5a3418'];
        s.rect(cx - 10, cy + 2, 20, 1, '#cfefff');
        s.rect(cx - 8, cy - 2, 16, 2, hull[0]);
        s.rect(cx - 7, cy, 14, 1, hull[1]);
        s.rect(cx - 6, cy + 1, 12, 1, hull[1]);
        s.px(cx - 9, cy - 3, hull[0]); s.px(cx + 8, cy - 3, hull[0]);
        if (kind === 0) {
          s.px(cx - 10, cy - 5, hull[0]); s.px(cx - 9, cy - 4, hull[0]);
          s.rect(cx, cy - 16, 1, 14, '#4a2a14');
          for (let r = 0; r < 8; r++) s.rect(cx - 5, cy - 14 + r, 11, 1, r % 2 ? '#c83a2a' : '#f0ead8');
          for (let k = -6; k < 7; k += 2) s.px(cx + k, cy - 2, '#d8b040');
        } else if (kind === 1) {
          s.rect(cx - 3, cy - 18, 1, 16, '#4a2a14'); s.rect(cx + 3, cy - 14, 1, 12, '#4a2a14');
          s.rect(cx - 7, cy - 16, 9, 6, '#f4f0e4'); s.rect(cx - 6, cy - 9, 7, 5, '#e8e2d0');
          s.rect(cx + 1, cy - 12, 6, 5, '#f4f0e4');
          s.px(cx - 3, cy - 19, '#c83a2a'); s.px(cx - 2, cy - 19, '#c83a2a');
          s.light(cx + 6, cy - 3, '#ffd06a');
        } else {
          s.rect(cx - 1, cy - 9, 3, 7, '#3a3a40'); s.rect(cx - 1, cy - 9, 3, 1, '#c83a2a');
          s.rect(cx - 6, cy - 14, 1, 12, '#3a2a1a'); s.rect(cx + 5, cy - 12, 1, 10, '#3a2a1a');
          s.rect(cx - 8, cy - 11, 5, 4, '#d8d0c0');
          s.emit(cx, cy - 10, 'smoke');
          s.light(cx + 4, cy - 3, '#ffd06a');
        }
      });
    },
    guillotine(v) {
      return make(16, 30, 24, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 5, 3, '#8a5a30', '#a87040', '#6a4020');
        const wood = '#6a3a1e';
        s.rect(cx - 3, cy - 19, 1, 16, wood); s.rect(cx + 2, cy - 19, 1, 16, '#4a2810');
        s.rect(cx - 3, cy - 20, 6, 1, wood);
        s.rect(cx - 2, cy - 15, 4, 2, '#d0d8e0'); s.px(cx + 1, cy - 13, '#d0d8e0');
        s.rect(cx - 2, cy - 7, 4, 2, '#5a3018'); s.px(cx - 1, cy - 6, '#1a0a04');
      });
    },
    mosque(v) {
      return make(36, 46, 34, (s) => {
        const { cx, cy } = s;
        const mn = (x) => {
          s.rect(x, cy - 30, 2, 28, '#f0e8d8'); s.rect(x + 1, cy - 30, 1, 28, '#c8bca8');
          s.rect(x - 1, cy - 22, 4, 1, '#c8bca8');
          s.px(x, cy - 32, '#5a8ab8'); s.px(x + 1, cy - 32, '#3a6a98'); s.px(x, cy - 31, '#5a8ab8'); s.px(x + 1, cy - 31, '#3a6a98');
          s.px(x, cy - 34, '#e8c040'); s.px(x, cy - 33, '#5a8ab8');
          s.light(x, cy - 21, '#ffe08a');
        };
        mn(cx - 14);
        s.box(cx, cy, 9, 6, '#e8dcc4', '#f4ecdc', '#c4b494', { rim: '#d8ccb0' });
        s.dome(cx, cy - 8, 7, '#8ab4dc', '#5a8ab8', '#3a6a98');
        s.rect(cx, cy - 17, 1, 3, '#e8c040');
        s.dome(cx - 6, cy - 4, 3, '#8ab4dc', '#5a8ab8', '#3a6a98');
        s.dome(cx + 6, cy - 4, 3, '#8ab4dc', '#5a8ab8', '#3a6a98');
        for (let dx = -8; dx < 8; dx += 3) s.light(cx + dx, s.front(cx, cy, 9, dx) - 3, '#ffd88a');
        mn(cx + 12);
      });
    },
    duomo(v) {
      return make(38, 48, 36, (s) => {
        const { cx, cy } = s;
        s.box(cx - 13, cy - 1, 2, 22, '#efe6d6', '#f6efe2', '#cfc4b0');
        for (let k = 0; k < 22; k += 4) s.rect(cx - 15, s.front(cx - 13, cy - 1, 2, -2) - k, 4, 1, '#3a7a5a');
        s.roof(cx - 13, cy - 1, 3, 22, 3, '#c0603a', '#8a3a20');
        s.box(cx, cy, 9, 7, '#efe6d6', '#f6efe2', '#cfc4b0');
        for (let dx = -9; dx < 9; dx += 3) s.rect(cx + dx, s.front(cx, cy, 9, dx) - 7, 1, 7, '#3a7a5a');
        s.roof(cx, cy, 10, 7, 3, '#c0603a', '#8a3a20');
        s.box(cx, cy - 9, 4, 3, '#efe6d6', '#f6efe2', '#cfc4b0');
        s.dome(cx, cy - 12, 6, '#e0784a', '#c0603a', '#8a3a20');
        for (const dx of [-4, -1, 2]) s.rect(cx + dx, cy - 17 + Math.abs(dx), 1, 6 - Math.abs(dx), '#f6efe2');
        s.rect(cx - 1, cy - 22, 2, 4, '#f6efe2'); s.px(cx, cy - 24, '#e8c040'); s.px(cx, cy - 23, '#e8c040');
        s.light(cx - 4, s.front(cx, cy, 9, -4) - 3, '#ffd88a');
        s.light(cx + 3, s.front(cx, cy, 9, 3) - 3, '#ffd88a');
      });
    },
    yurt(v) {
      return make(18, 18, 12, (s) => {
        const { cx, cy } = s;
        const r = 6;
        for (let dx = -r; dx < r; dx++) {
          const adx = dx < 0 ? -dx - 1 : dx;
          const yb = cy + Math.floor(Math.sqrt(Math.max(0, r * r - (adx + 0.5) * (adx + 0.5))) / 2);
          s.rect(cx + dx, yb - 4, 1, 5, dx < 0 ? '#f4eee2' : '#cfc6b4');
          s.px(cx + dx, yb - 2, '#c83a2a');
        }
        s.cone(cx, cy - 4, 6, 4, '#ece4d4', '#bcb2a0');
        s.px(cx, cy - 8, '#8a5a30');
        s.rect(cx - 1, cy + 1, 2, 2, '#e88a2a');
        s.light(cx - 1, cy + 1, '#ffb050');
      });
    },
    clocktower(v) {
      return make(18, 54, 48, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 4, 28, '#c8a870', '#dcbc84', '#a08454', { rim: '#e8d0a0' });
        for (let k = 4; k < 22; k += 4) { s.px(cx - 2, s.front(cx, cy, 4, -2) - k, '#6a5434'); s.px(cx + 1, s.front(cx, cy, 4, 1) - k, '#6a5434'); }
        const fy = cy - 24;
        s.light(cx - 3, fy, '#fff6d8'); s.light(cx - 2, fy, '#fff6d8'); s.light(cx - 3, fy + 1, '#fff6d8'); s.light(cx - 2, fy + 1, '#fff6d8');
        s.light(cx + 1, fy, '#fff6d8'); s.light(cx + 2, fy, '#fff6d8'); s.light(cx + 1, fy + 1, '#fff6d8'); s.light(cx + 2, fy + 1, '#fff6d8');
        s.px(cx - 2, fy, '#2a2a2a'); s.px(cx + 1, fy, '#2a2a2a');
        s.roof(cx, cy, 5, 28, 9, '#4a6a5a', '#2e4a3c');
        s.rect(cx, cy - 42, 1, 3, '#e8c040');
      });
    },
    palace(v) {
      return make(36, 34, 24, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 10, 3, '#e8e4dc', '#f4f2ec', '#c8c2b6');
        for (let k = 0; k < 5; k++) s.rect(cx - 2, cy + 4 - k, 4, 1, k % 2 ? '#f4f2ec' : '#d8d2c6');
        s.box(cx, cy - 3, 8, 5, '#b8302a', '#d8402a', '#90241e');
        for (let dx = -7; dx < 8; dx += 3) s.light(cx + dx, s.front(cx, cy - 3, 8, dx) - 2, '#ffcf6a');
        s.roof(cx, cy - 3, 10, 5, 3, '#f0c040', '#b8841a', { eave: '#6a4a10' });
        s.box(cx, cy - 10, 5, 2, '#b8302a', '#d8402a', '#90241e');
        s.roof(cx, cy - 10, 7, 2, 4, '#f0c040', '#b8841a', { ridge: '#fff0a0' });
      });
    },
    chateau(v) {
      return make(42, 30, 20, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 12, 6, '#e8dcc0', '#f4ead2', '#c8b894', { rim: '#d8c8a4' });
        for (let dx = -11; dx < 12; dx += 2) s.light(cx + dx, s.front(cx, cy, 12, dx) - 3, '#ffd870');
        s.roof(cx, cy, 12, 6, 2, '#4a5a6a', '#34404c');
        s.box(cx, cy + 1, 4, 9, '#efe4cc', '#f8f0dc', '#d0c2a0');
        s.roof(cx, cy + 1, 5, 9, 4, '#4a5a6a', '#34404c', { ridge: '#e8c040' });
        s.light(cx - 2, s.front(cx, cy + 1, 4, -2) - 5, '#ffd870'); s.light(cx + 1, s.front(cx, cy + 1, 4, 1) - 5, '#ffd870');
        for (let x = -3; x <= 3; x += 2) s.px(cx + x, cy + 6, '#e8c040');
      });
    },
    saloon(v) {
      return make(22, 26, 18, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 5, 7, '#a0703a', '#c08a4a', '#7a5228');
        for (let dx = -5; dx < 0; dx++) s.rect(cx + dx, s.front(cx, cy, 5, dx) - 11, 1, 4, '#c8945a');
        for (let dx = -5; dx < 0; dx++) s.px(cx + dx, s.front(cx, cy, 5, dx) - 9, '#f0dca0');
        s.rect(cx - 4, s.front(cx, cy, 5, -4) - 3, 1, 3, '#3a2010');
        s.light(cx - 2, s.front(cx, cy, 5, -2) - 3, '#ffcf6a');
        s.light(cx + 2, s.front(cx, cy, 5, 2) - 4, '#ffcf6a');
        s.light(cx + 3, s.front(cx, cy, 5, 3) - 4, '#ffcf6a');
        s.px(cx + 5, cy - 1, '#5a3418'); s.px(cx + 5, cy - 2, '#5a3418');
      });
    },
    mammoth(v) {
      return make(22, 20, 15, (s) => {
        const { cx, cy } = s;
        const f = v % 2 ? 1 : -1;
        const X = (x) => cx + x * f - (f < 0 ? 1 : 0);
        const fur = '#7a5030', dk = '#5a3820', hi = '#9a6a40';
        for (const lx of [-3, -1, 2, 4]) s.rect(X(lx), cy - 3, 1, 4, dk);
        s.rect(Math.min(X(-4), X(5)), cy - 9, 10, 6, fur);
        s.rect(Math.min(X(-3), X(4)), cy - 10, 8, 1, hi);
        s.rect(Math.min(X(-4), X(5)), cy - 4, 10, 1, dk);
        s.rect(Math.min(X(5), X(7)), cy - 10, 3, 5, fur);
        s.px(X(6), cy - 9, '#1a0a04');
        s.px(X(8), cy - 6, fur); s.px(X(8), cy - 5, fur); s.px(X(8), cy - 4, fur); s.px(X(9), cy - 3, fur);
        s.px(X(7), cy - 5, '#f4f0e0'); s.px(X(8), cy - 7 + 4, '#f4f0e0'); s.px(X(9), cy - 4, '#f4f0e0');
        s.px(X(-5), cy - 7, dk);
      });
    },
    tulip(v) {
      return make(28, 18, 9, (s) => {
        const { cx, cy } = s;
        const a = 10;
        const cols = ['#e8302a', '#f0d020', '#f070b0', '#f4f4f4', '#ff8a2a'];
        for (let dx = -a; dx < a; dx++) {
          const yB = s.back(cx, cy, a, dx), yF = s.front(cx, cy, a, dx);
          for (let y = yB; y <= yF; y++) {
            let col = '#4a9a3a';
            const row = y + (dx >> 1);
            if (((row % 3) + 3) % 3 === 0) col = cols[(((dx >> 2) % cols.length) + cols.length) % cols.length];
            if (y === yB || y === yF) col = '#6a4a28';
            s.px(cx + dx, y, col);
          }
        }
      });
    },
    wall(v) {
      return make(36, 28, 16, (s) => {
        const { cx, cy } = s;
        const st = ['#a89e88', '#c0b6a0', '#867c68'];
        for (let k = -3; k <= 3; k++) {
          const x = cx + k * 4, y = cy + k * 2;
          if (k === 0) {
            s.box(x, y, 3, 10, st[0], st[1], st[2]);
            s.roof(x, y, 4, 10, 3, '#7a4a2a', '#5a341c');
            s.light(x - 1, y - 6, '#ffb04a');
          } else {
            s.box(x, y, 2, 6, st[0], st[1], st[2]);
            s.px(x - 2, y - 7, st[1]); s.px(x, y - 7, st[0]);
          }
        }
      });
    },
    goldhall(v) {
      return make(26, 36, 26, (s) => {
        const { cx, cy } = s;
        for (let y = -5; y <= 5; y++) {
          const w = Math.round(11 * Math.sqrt(1 - (y * y) / 30));
          s.rect(cx - w, cy + 2 + Math.round(y / 1.3), w * 2, 1, '#3a78b8');
        }
        s.box(cx, cy, 6, 4, '#e8dcc4', '#f4ecdc', '#c4b494');
        s.roof(cx, cy, 7, 4, 2, '#4a3a2a', '#2e2418');
        s.box(cx, cy - 5, 5, 4, '#f0c838', '#ffe070', '#c89a18');
        s.roof(cx, cy - 5, 6, 4, 2, '#4a3a2a', '#2e2418');
        s.box(cx, cy - 10, 4, 4, '#f0c838', '#ffe070', '#c89a18');
        s.roof(cx, cy - 10, 5, 4, 4, '#4a3a2a', '#2e2418');
        s.px(cx, cy - 19, '#ffe070'); s.px(cx - 1, cy - 18, '#ffe070');
        s.light(cx - 3, s.front(cx, cy - 5, 5, -3) - 2, '#fff2a0');
        s.light(cx + 2, s.front(cx, cy - 10, 4, 2) - 2, '#fff2a0');
      });
    },
    /* ---------- 時代相応の街並み ---------- */
    nagaya(v) {
      return make(30, 22, 15, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 9, 4, '#c8b088', '#dcc49c', '#a89068');
        for (let dx = -8; dx < 0; dx += 3) s.rect(cx + dx, s.front(cx, cy, 9, dx) - 3, 1, 3, '#4a3020');
        for (let dx = -7; dx < 0; dx += 3) s.light(cx + dx, s.front(cx, cy, 9, dx) - 2, '#ffcf6a');
        s.roof(cx, cy, 10, 4, 3, '#5a5650', '#3e3a36', { eave: '#26221e' });
      });
    },
    yagura(v) {
      return make(18, 34, 28, (s) => {
        const { cx, cy } = s;
        for (const ox of [-3, 2]) s.rect(cx + ox, cy - 14, 1, 14, '#6a4426');
        for (let k = 0; k < 14; k += 4) s.rect(cx - 3, cy - k - 2, 6, 1, '#8a5a30');
        s.box(cx, cy - 14, 4, 5, '#a87848', '#c08a52', '#7a5230');
        s.light(cx - 2, cy - 17, '#ffb04a');
        s.roof(cx, cy - 14, 5, 5, 4, '#4a3a2a', '#2e2418', { eave: '#1a140e' });
      });
    },
    brick(v) {
      const r = rng(v * 13 + 5);
      return make(22, 34, 26, (s) => {
        const { cx, cy } = s;
        const hgt = 12 + (v % 3) * 3;
        s.box(cx, cy, 6, hgt, '#9a4a32', '#b85a3a', '#8a3a26', { rim: '#d8d0c0' });
        for (let dx = -5; dx < 6; dx += 2) {
          const yF = s.front(cx, cy, 6, dx);
          for (let k = 3; k < hgt - 1; k += 4) { if (r() < 0.7) s.light(cx + dx, yF - k, '#ffe7a0'); else s.px(cx + dx, yF - k, '#f0ece0'); }
        }
        s.roof(cx, cy, 7, hgt, 3, '#4a5058', '#343a42');
      });
    },

    /* ---------- オーパーツ（神託による時代無視の突然変異） ---------- */
    stadium(v) {
      return make(56, 46, 30, (s) => {
        const { cx, cy } = s;
        const rx = 22, ry = 11, hh = 7;
        for (let x = -rx; x < rx; x++) {
          const e = Math.sqrt(Math.max(0, 1 - ((x + 0.5) * (x + 0.5)) / (rx * rx)));
          const yb = Math.round(cy - e * ry), yf = Math.round(cy + e * ry);
          s.rect(cx + x, yb - hh, 1, hh + 1, '#8a8e98');
          s.px(cx + x, yb - hh, '#e8eaf0');
          // グラウンド（芝と内野の土）
          for (let y = yb + 1; y < yf - hh + 1; y++) {
            const inner = Math.abs(x) + Math.abs(y - cy + 2) * 2 < 10;
            s.px(cx + x, y, inner ? '#c89a5a' : ((x + y) & 2 ? '#3aa83a' : '#4ab84a'));
          }
        }
        for (const [dx, dy] of [[0, -4], [6, -1], [0, 2], [-6, -1]]) s.px(cx + dx, cy + dy, '#ffffff');
        for (let x = -rx; x < rx; x++) {
          const e = Math.sqrt(Math.max(0, 1 - ((x + 0.5) * (x + 0.5)) / (rx * rx)));
          const yf = Math.round(cy + e * ry);
          s.rect(cx + x, yf - hh, 1, hh + 1, x < 0 ? '#c8ccd4' : '#a4a8b2');
          s.px(cx + x, yf - hh, '#f4f6fa');
          if ((x & 3) === 0) s.light(cx + x, yf - 3, '#8ad0ff');
        }
        // ナイター照明塔
        for (const [ox, oy] of [[-rx + 2, -4], [rx - 3, -4], [-rx + 6, 6], [rx - 7, 6]]) {
          s.rect(cx + ox, cy + oy - 22, 1, 22, '#6a6e78');
          s.rect(cx + ox - 2, cy + oy - 25, 5, 3, '#3a3e48');
          for (let k = -2; k < 3; k++) s.light(cx + ox + k, cy + oy - 24, '#ffffe0');
        }
      });
    },
    glasstower(v) {
      const r = rng(v * 71 + 3);
      const hgt = 34 + Math.floor(r() * 18);
      return make(20, hgt + 20, hgt + 13, (s) => {
        const { cx, cy } = s;
        const a = 6;
        s.box(cx, cy, a, hgt, '#9adcf0', '#6ac8ec', '#3a8ab8', { rim: '#ffffff' });
        for (let dx = -a; dx < a; dx++) {
          const yF = s.front(cx, cy, a, dx);
          for (let k = 2; k < hgt; k += 3) s.px(cx + dx, yF - k, dx < 0 ? '#4ab0dc' : '#2a6a98');
          if ((dx + 20) % 4 === 1) for (let k = 4; k < hgt - 2; k += 6) if (r() < 0.5) s.light(cx + dx, yF - k, '#fffbe0');
        }
        s.rect(cx - 1, cy - hgt - a / 2 - 6, 1, 6, '#c0c0c0');
        s.emit(cx - 1, cy - hgt - a / 2 - 7, 'blink');
      });
    },
    tapioca(v) {
      const pastel = [['#ffb0d0', '#e880a8'], ['#a8e0ff', '#70b8e0'], ['#d0b0ff', '#a080e0']][v % 3];
      return make(22, 30, 20, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 5, 6, '#f8f4ec', '#ffffff', '#d8d0c4');
        for (let dx = -5; dx < 5; dx++) { const yF = s.front(cx, cy, 5, dx); s.px(cx + dx, yF - 6, (dx & 1) ? pastel[0] : '#ffffff'); s.px(cx + dx, yF - 5, pastel[1]); }
        // 巨大タピオカカップの看板
        s.rect(cx + 1, cy - 16, 5, 7, '#f4e8d8'); s.rect(cx + 1, cy - 17, 5, 1, pastel[1]);
        s.rect(cx + 3, cy - 20, 1, 4, '#ff6a8a');
        s.px(cx + 2, cy - 11, '#3a2010'); s.px(cx + 4, cy - 10, '#3a2010'); s.px(cx + 3, cy - 12, '#3a2010');
        s.light(cx - 3, cy + 1, '#ffe0f0'); s.light(cx - 2, cy + 1, '#ffe0f0');
      });
    },
    vending(v) {
      const c = [['#d82a2a', '#a01818'], ['#2a6ad8', '#1a4aa0'], ['#f0f0f0', '#c0c0c8']][v % 3];
      return make(12, 18, 13, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 2, 8, c[0], c[0], c[1]);
        s.light(cx - 2, cy - 6, '#e8f8ff'); s.light(cx - 1, cy - 6, '#e8f8ff'); s.light(cx - 2, cy - 5, '#ffe060'); s.light(cx - 1, cy - 4, '#60ff90');
      });
    },
    neon(v) {
      const cols = ['#ff3ad0', '#25e0ff', '#ffe03a', '#7aff6a'];
      return make(26, 36, 30, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 6, 7, '#3a3448', '#4a4458', '#2a2438');
        s.rect(cx - 6, cy - 26, 1, 22, '#5a5a66'); s.rect(cx + 5, cy - 24, 1, 20, '#5a5a66');
        for (let k = 0; k < 4; k++) {
          const col = cols[(k + v) % 4];
          for (let x = -5; x < 5; x++) if ((x + k) % 3) s.light(cx + x, cy - 24 + k * 4, col);
        }
        for (let x = -5; x < 5; x++) s.light(cx + x, s.front(cx, cy, 6, x) - 3, cols[v % 4]);
      });
    },
    parabola(v) {
      return make(26, 28, 20, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 4, 3, '#9a9aa4', '#b4b4be', '#7a7a84');
        s.rect(cx, cy - 10, 2, 8, '#8a8a94');
        for (let y = -7; y <= 7; y++) {
          const w = Math.round(9 * Math.sqrt(1 - (y * y) / 50));
          s.rect(cx - w + 1, cy - 14 + y, w * 2, 1, y < 0 ? '#ffffff' : '#d0d4dc');
        }
        s.rect(cx, cy - 14, 2, 2, '#5a5a66'); s.rect(cx + 1, cy - 20, 1, 6, '#5a5a66');
        s.emit(cx + 1, cy - 21, 'blink');
      });
    },
    kombinat(v) {
      return make(46, 50, 34, (s) => {
        const { cx, cy } = s;
        for (const ox of [-10, -3, 4]) {
          s.rect(cx + ox, cy - 34, 3, 30, '#a8a8b0'); s.rect(cx + ox + 2, cy - 34, 1, 30, '#7a7a84');
          s.rect(cx + ox, cy - 30, 3, 2, '#d83a2a'); s.rect(cx + ox, cy - 22, 3, 2, '#f0f0f0');
          s.emit(cx + ox + 1, cy - 36, 'smoke');
        }
        s.box(cx - 2, cy, 11, 6, '#8a929c', '#a4acb6', '#6a727c', { rim: '#5a626c' });
        for (const ox of [10, 15]) s.dome(cx + ox, cy - 1, 4, '#f0f0f4', '#c8ccd4', '#9aa0aa');
        s.rect(cx + 6, cy - 6, 10, 1, '#c8a040');
        for (let dx = -12; dx < -2; dx += 2) s.light(cx + dx, s.front(cx - 2, cy, 11, dx + 2) - 2, '#ffd27a');
      });
    },
    reactor(v) {
      return make(34, 46, 34, (s) => {
        const { cx, cy } = s;
        // 冷却塔（双曲面）
        for (let k = 0; k < 26; k++) {
          const t = k / 26;
          const w = Math.round(8 - Math.sin(t * Math.PI) * 3 + t * 1.5);
          s.rect(cx - 6 - w, cy - k, w, 1, '#c8ccd4'); s.rect(cx - 6, cy - k, w, 1, '#9aa0aa');
        }
        s.emit(cx - 6, cy - 28, 'smoke');
        s.box(cx + 8, cy + 2, 5, 3, '#c8ccd4', '#e0e4ea', '#9aa0aa');
        s.dome(cx + 8, cy - 1, 5, '#ffffff', '#d8dce4', '#a8aeb8');
        s.light(cx + 8, cy - 6, '#7affb0');
        s.light(cx + 6, cy + 2, '#ffd27a');
      });
    },
    ferris(v) {
      return make(44, 58, 52, (s) => {
        const { cx, cy } = s;
        const hy = cy - 26, R = 19;
        for (let a = 0; a < Math.PI * 2; a += 0.05) s.px(cx + Math.round(Math.cos(a) * R), hy + Math.round(Math.sin(a) * R), '#e8e8f0');
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2;
          for (let rr = 0; rr < R; rr += 2) s.px(cx + Math.round(Math.cos(a) * rr), hy + Math.round(Math.sin(a) * rr), '#a8a8b8');
          const gx = cx + Math.round(Math.cos(a) * R), gy = hy + Math.round(Math.sin(a) * R);
          const col = ['#ff5a5a', '#ffd23f', '#4fd8ff', '#7aff8a'][k % 4];
          s.rect(gx - 1, gy + 1, 3, 3, col);
          s.light(gx, gy, '#fff6c0');
        }
        for (let k = 0; k < 26; k++) { s.px(cx - 1 - Math.round(k * 0.35), hy + k, '#8a8a98'); s.px(cx + 1 + Math.round(k * 0.35), hy + k, '#8a8a98'); }
        s.rect(cx - 1, hy - 1, 3, 3, '#f0d040');
        s.box(cx, cy, 6, 2, '#d0c0a0', '#e0d0b0', '#b0a080');
      });
    },
    goldmonument(v) {
      return make(30, 64, 56, (s) => {
        const { cx, cy } = s;
        s.box(cx, cy, 7, 6, '#3a3040', '#4a4050', '#2a2030');
        const by = cy - 8;
        // 謎の黄金巨像
        s.rect(cx - 3, by - 20, 7, 20, '#f0c838'); s.rect(cx + 2, by - 20, 2, 20, '#b88a10');
        s.rect(cx - 2, by - 27, 5, 7, '#ffe070'); s.rect(cx + 1, by - 27, 2, 7, '#c89a18');
        s.rect(cx - 6, by - 26, 2, 12, '#f0c838'); s.rect(cx + 5, by - 34, 2, 14, '#f0c838');
        s.rect(cx + 4, by - 38, 4, 4, '#fff6a0');
        s.light(cx - 1, by - 25, '#ff4a4a'); s.light(cx + 1, by - 25, '#ff4a4a');
        for (let k = 0; k < 6; k++) s.light(cx - 4 + k * 2, by - 2, '#fff6c0');
        s.light(cx + 5, by - 37, '#ffffff');
      });
    },

  };

  WD.Sprites = {
    get(type, variant, course) {
      const key = type + ':' + variant + ':' + course;
      if (!cache[key]) {
        const fn = DRAW[type] || DRAW.house;
        cache[key] = fn(variant, course);
      }
      return cache[key];
    },
    hashStr,
    rng,
  };
})();
