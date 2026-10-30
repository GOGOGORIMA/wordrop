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
