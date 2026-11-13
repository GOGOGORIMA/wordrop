/* WORDROP — 建物・乗り物・住人のドット絵（Canvas でプログラム描画）
 * 1タイル＝横8px×縦4px のアイソメトリック。スプライトは等倍で描いてキャッシュし、カメラ側で拡大する。
 * 各スプライトの (ax, ay) は「足元のひし形の中心」。 */
(function () {
  /* ---------- 色 ---------- */
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))));
    return 'rgb(' + c.join(',') + ')';
  }

  /* ---------- 図形 ---------- */
  function poly(g, col, pts) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    g.fill();
  }
  // 足元中心 (x, y)、半幅 a（奥行きは a/2）、高さ h の箱
  function box(g, x, y, a, h, col) {
    const b = a / 2;
    poly(g, shade(col, -0.25), [x - a, y, x, y + b, x, y + b - h, x - a, y - h]);
    poly(g, shade(col, -0.45), [x, y + b, x + a, y, x + a, y - h, x, y + b - h]);
    poly(g, shade(col, 0.12), [x, y - h - b, x + a, y - h, x, y - h + b, x - a, y - h]);
  }
  // 箱の上に載る四角錐の屋根（寄棟）
  function roof(g, x, y, a, rh, col) {
    const b = a / 2;
    poly(g, shade(col, -0.1), [x - a, y, x, y + b, x, y - rh]);
    poly(g, shade(col, -0.4), [x, y + b, x + a, y, x, y - rh]);
  }
  function dome(g, x, y, r, col) {
    g.fillStyle = shade(col, -0.3);
    g.beginPath(); g.ellipse(x, y, r, r / 2, 0, 0, Math.PI); g.fill();
    g.fillStyle = col;
    g.beginPath(); g.ellipse(x, y, r, r * 0.95, 0, Math.PI, 0); g.fill();
    g.fillStyle = shade(col, 0.45);
    g.fillRect(Math.round(x - r * 0.45), Math.round(y - r * 0.7), Math.max(1, Math.round(r * 0.3)), Math.max(1, Math.round(r * 0.25)));
  }
  function cyl(g, x, y, r, h, col) { // 円柱
    g.fillStyle = shade(col, -0.35);
    g.beginPath(); g.ellipse(x, y, r, r / 2, 0, 0, Math.PI); g.fill();
    g.fillRect(x - r, y - h, r * 2, h);
    g.fillStyle = shade(col, -0.15);
    g.fillRect(x - r, y - h, r, h);
    g.fillStyle = shade(col, 0.15);
    g.beginPath(); g.ellipse(x, y - h, r, r / 2, 0, 0, Math.PI * 2); g.fill();
  }
  // 壁面の窓（左面 L／右面 R）
  function windows(g, side, x, y, a, h, rows, cols, col) {
    g.fillStyle = col;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const u = (i + 0.5) / cols, v = (j + 0.6) / rows;
        const px = side === 'L' ? x - a + u * a : x + u * a;
        const py = side === 'L' ? y + (u * a) / 2 - v * h : y + a / 2 - (u * a) / 2 - v * h;
        g.fillRect(Math.round(px), Math.round(py), 1, 1);
      }
    }
  }
  const px = (g, col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); };

  /* ---------- 定義：[タイル数, 高さの余白, 描画] ---------- */
  const DEF = {
    /* 時代相応の民家 */
    hut: [1, 9, (g, x, y) => { roof(g, x, y, 4, 7, '#b08848'); px(g, '#3a2410', x - 2, y - 1, 1, 2); }],
    jp: [1, 9, (g, x, y) => { box(g, x, y, 3, 3, '#e6dcc4'); roof(g, x, y - 3, 4.5, 4, '#4a5060'); }],
    china: [1, 9, (g, x, y) => { box(g, x, y, 3, 3, '#b8603e'); roof(g, x, y - 3, 4.5, 4, '#3c3c48'); }],
    west: [1, 10, (g, x, y) => { box(g, x, y, 3, 4, '#d8c8a8'); roof(g, x, y - 4, 3.6, 4, '#b04a30'); }],
    adobe: [1, 7, (g, x, y) => { box(g, x, y, 3, 4, '#d8b07a'); px(g, '#5a3a20', x - 2, y - 2, 1, 2); }],
    wood: [1, 9, (g, x, y) => { box(g, x, y, 3, 3, '#8a5a30'); roof(g, x, y - 3, 4, 4, '#5a3a22'); }],
    yurt: [1, 7, (g, x, y) => { dome(g, x, y, 3.5, '#eee6d6'); px(g, '#c03a30', x - 1, y - 4, 2, 1); }],
    modern: [1, 12, (g, x, y) => { box(g, x, y, 3, 8, '#c4c4ca'); windows(g, 'L', x, y, 3, 8, 3, 2, '#5a7aa0'); windows(g, 'R', x, y, 3, 8, 3, 2, '#3a5a80'); }],

    /* 時代のシンボル建築 */
    fort: [2, 12, (g, x, y) => { box(g, x, y, 7, 3, '#8a6034'); box(g, x, y - 3, 3, 5, '#a07040'); roof(g, x, y - 8, 4, 3, '#5a3a20'); }],
    shrine: [2, 10, (g, x, y) => {
      box(g, x, y - 1, 5, 4, '#f0e8dc'); roof(g, x, y - 5, 6.5, 4, '#5a4030');
      px(g, '#d83a2a', x - 6, y - 4, 1, 6); px(g, '#d83a2a', x - 2, y - 2, 1, 6); px(g, '#d83a2a', x - 7, y - 5, 7, 1);
    }],
    kofun: [4, 6, (g, x, y) => {
      g.fillStyle = '#3a7ac0'; g.beginPath(); g.ellipse(x, y, 15, 7.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#3c7a30'; g.beginPath(); g.ellipse(x + 3, y - 1, 8, 5, 0, 0, Math.PI * 2); g.fill();
      poly(g, '#4a8a3a', [x - 2, y - 2, x - 11, y + 2, x - 6, y + 4, x + 1, y + 1]);
      g.fillStyle = '#5a9a4a'; g.beginPath(); g.ellipse(x + 3, y - 3, 6, 3.5, 0, 0, Math.PI * 2); g.fill();
    }],
    pagoda: [2, 24, (g, x, y) => {
      for (let k = 0; k < 5; k++) { box(g, x, y - k * 4, 4 - k * 0.4, 2, '#c08850'); roof(g, x, y - k * 4 - 2, 6 - k * 0.5, 2, '#3c3c44'); }
      px(g, '#d8b040', x, y - 26, 1, 5);
    }],
    hall: [3, 16, (g, x, y) => { box(g, x, y, 10, 6, '#c8a070'); roof(g, x, y - 6, 12.5, 9, '#3c3c44'); px(g, '#ffd23f', x - 1, y - 16, 2, 2); }],
    goldhall: [2, 14, (g, x, y) => { box(g, x, y, 5, 3, '#c8a878'); box(g, x, y - 3, 5, 4, '#e8b828'); roof(g, x, y - 7, 6.5, 5, '#4a4048'); px(g, '#ffe066', x, y - 13, 1, 2); }],
    ziggurat: [4, 14, (g, x, y) => { box(g, x, y, 15, 4, '#c8a068'); box(g, x, y - 4, 10, 4, '#d0aa72'); box(g, x, y - 8, 5, 4, '#d8b47c'); }],
    pyramid: [5, 22, (g, x, y) => { roof(g, x, y, 19, 22, '#e2c080'); }],
    statue: [1, 14, (g, x, y) => { box(g, x, y, 3, 3, '#a8a8a0'); box(g, x, y - 3, 1.2, 8, '#8a7a50'); px(g, '#8a7a50', x - 1, y - 12, 2, 2); }],
    wall: [3, 8, (g, x, y) => { box(g, x, y, 11, 4, '#a09a8a'); for (let i = -10; i <= 10; i += 3) px(g, '#c8c0b0', x + i, y - 5 + Math.abs(i) * 0.5 * (i < 0 ? -1 : 1) * 0, 1, 1); }],
    temple: [3, 14, (g, x, y) => {
      box(g, x, y, 11, 2, '#e8e4dc'); box(g, x, y - 2, 9, 7, '#f4f0e8');
      for (let i = 1; i < 9; i += 2) { px(g, '#b8b4ac', x - 9 + i, y - 8 + i / 2, 1, 6); px(g, '#9a968e', x + i, y - 3.5 - i / 2, 1, 6); }
      roof(g, x, y - 9, 10, 4, '#d8d4cc');
    }],
    palace: [3, 14, (g, x, y) => { box(g, x, y, 11, 2, '#d8d0c0'); box(g, x, y - 2, 9, 5, '#b8382c'); roof(g, x, y - 7, 11.5, 6, '#d8a030'); }],
    chateau: [3, 12, (g, x, y) => { box(g, x, y, 11, 6, '#ece0c8'); windows(g, 'L', x, y, 11, 6, 2, 6, '#5a6a90'); windows(g, 'R', x, y, 11, 6, 2, 6, '#3a4a70'); roof(g, x, y - 6, 11, 4, '#5a6478'); px(g, '#ffd23f', x, y - 11, 1, 2); }],
    colosseum: [5, 12, (g, x, y) => {
      cyl(g, x, y, 18, 9, '#d8c0a0');
      g.fillStyle = '#8a7058'; g.beginPath(); g.ellipse(x, y - 9, 12, 6, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c8b090'; g.beginPath(); g.ellipse(x, y - 7, 9, 4.5, 0, 0, Math.PI * 2); g.fill();
      for (let i = -16; i <= 16; i += 3) { px(g, '#7a6048', x + i, y - 6, 1, 2); px(g, '#7a6048', x + i, y - 2, 1, 2); }
    }],
    maya: [4, 20, (g, x, y) => { for (let k = 0; k < 4; k++) box(g, x, y - k * 4, 15 - k * 3.2, 4, '#a8a890'); box(g, x, y - 16, 2.5, 4, '#8a8a70'); px(g, '#7a6a50', x - 1, y - 4, 2, 14); }],
    moai: [1, 12, (g, x, y) => { box(g, x, y, 2, 10, '#6a6a68'); px(g, '#3a3a38', x - 2, y - 8, 1, 1); px(g, '#4a4a48', x - 1, y - 6, 1, 3); }],
    ruins: [2, 8, (g, x, y) => { box(g, x - 3, y, 2, 6, '#9a9488'); box(g, x + 3, y + 1, 2, 3, '#8a8478'); box(g, x, y + 2, 2, 2, '#a8a294'); }],
    market: [2, 8, (g, x, y) => {
      box(g, x - 3, y, 3, 3, '#c8a878'); roof(g, x - 3, y - 3, 4, 2, '#d84a3a');
      box(g, x + 3, y + 1, 3, 3, '#c8a878'); roof(g, x + 3, y - 2, 4, 2, '#3a8ad8');
    }],
    castleJP: [3, 26, (g, x, y) => {
      box(g, x, y, 11, 4, '#8a8a8a');
      box(g, x, y - 4, 8, 4, '#f4f2ec'); roof(g, x, y - 8, 9.5, 3, '#3a4458');
      box(g, x, y - 11, 6, 4, '#f4f2ec'); roof(g, x, y - 15, 7.5, 3, '#3a4458');
      box(g, x, y - 18, 4, 3, '#f4f2ec'); roof(g, x, y - 21, 5.5, 4, '#3a4458');
      px(g, '#ffd23f', x - 3, y - 23, 1, 1); px(g, '#ffd23f', x + 3, y - 23, 1, 1);
    }],
    castleEU: [3, 22, (g, x, y) => {
      box(g, x, y, 10, 10, '#9a9890');
      for (const [dx, dy] of [[-9, 0], [9, 0], [0, -4.5], [0, 4.5]]) { box(g, x + dx, y + dy, 2.5, 13, '#a8a69e'); roof(g, x + dx, y + dy - 13, 3, 5, dy < 0 ? '#3a5ab0' : '#b03a30'); }
    }],
    church: [2, 22, (g, x, y) => { box(g, x, y, 6, 6, '#d8d0c0'); roof(g, x, y - 6, 6.5, 4, '#6a5048'); box(g, x - 3, y + 1, 2, 12, '#c8c0b0'); roof(g, x - 3, y - 11, 2.5, 7, '#5a6478'); }],
    duomo: [3, 22, (g, x, y) => { box(g, x, y, 10, 7, '#f0e8d8'); windows(g, 'L', x, y, 10, 7, 1, 5, '#3a8a5a'); dome(g, x, y - 9, 7, '#c8583a'); px(g, '#f0e8d8', x - 1, y - 18, 2, 3); }],
    mosque: [3, 26, (g, x, y) => { box(g, x, y, 10, 5, '#ece4d4'); dome(g, x, y - 7, 6.5, '#d8d0c0'); box(g, x + 8, y - 2, 1.5, 16, '#f0e8dc'); roof(g, x + 8, y - 18, 2, 6, '#3a7ab0'); }],
    windmill: [2, 18, (g, x, y) => {
      box(g, x, y, 3.5, 10, '#d8c8a0'); roof(g, x, y - 10, 4, 4, '#8a4a30');
      g.strokeStyle = '#f4f0e8'; g.lineWidth = 1; g.beginPath();
      g.moveTo(x - 7, y - 16); g.lineTo(x + 5, y - 4); g.moveTo(x + 5, y - 16); g.lineTo(x - 7, y - 4); g.stroke();
    }],
    mill: [3, 22, (g, x, y) => {
      box(g, x, y, 10, 6, '#a0503a'); windows(g, 'L', x, y, 10, 6, 2, 5, '#f0d080');
      for (let k = -1; k <= 1; k++) roof(g, x + k * 5, y - 6 + k * -2.5, 4, 3, '#5a5a60');
      box(g, x + 6, y - 2, 1.5, 18, '#7a3a2a');
    }],
    clocktower: [2, 30, (g, x, y) => {
      box(g, x, y, 4, 22, '#c8a878'); roof(g, x, y - 22, 4.5, 7, '#3a5a48');
      g.fillStyle = '#f8f4e8'; g.beginPath(); g.arc(x - 2, y - 17, 1.6, 0, Math.PI * 2); g.fill();
      px(g, '#2a2a2a', x - 2, y - 18, 1, 1);
    }],
    office: [2, 16, (g, x, y) => { box(g, x, y, 6, 12, '#b0583e'); windows(g, 'L', x, y, 6, 12, 4, 3, '#f0e0b0'); windows(g, 'R', x, y, 6, 12, 4, 3, '#d8c890'); }],
    rocket: [2, 34, (g, x, y) => {
      box(g, x + 4, y - 1, 1.5, 28, '#c84a3a');
      cyl(g, x - 1, y, 2.5, 24, '#f0f0f0'); poly(g, '#d0d0d8', [x - 3.5, y - 24, x + 1.5, y - 24, x - 1, y - 31]);
      px(g, '#c83a30', x - 4, y - 4, 1, 4); px(g, '#c83a30', x + 1, y - 4, 1, 4); px(g, '#3a3a8a', x - 2, y - 14, 2, 3);
    }],
    antenna: [2, 22, (g, x, y) => {
      g.strokeStyle = '#a8b0b8'; g.lineWidth = 1; g.beginPath();
      g.moveTo(x - 4, y + 1); g.lineTo(x, y - 20); g.lineTo(x + 4, y + 1); g.moveTo(x - 3, y - 4); g.lineTo(x + 3, y - 4); g.moveTo(x - 2, y - 10); g.lineTo(x + 2, y - 10); g.stroke();
      dome(g, x - 6, y + 1, 3, '#e8e8f0');
    }],

    /* オーパーツ（時代無視の突然変異） */
    dome: [7, 22, (g, x, y) => {
      cyl(g, x, y, 27, 5, '#c8ccd8');
      g.fillStyle = '#f4f6ff'; g.beginPath(); g.ellipse(x, y - 5, 26, 18, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#dde2f0'; g.beginPath(); g.ellipse(x + 6, y - 5, 18, 15, 0, Math.PI * 1.35, 0); g.fill();
      g.strokeStyle = '#b8c0d8'; g.lineWidth = 1;
      for (const r of [8, 16]) { g.beginPath(); g.ellipse(x, y - 5, 26, r, 0, Math.PI, 0); g.stroke(); }
      px(g, '#ffffff', x - 12, y - 18, 6, 2);
      for (const dx of [-26, 26]) { px(g, '#808898', x + dx, y - 24, 1, 20); px(g, '#fffbd0', x + dx - 2, y - 26, 5, 2); }
    }],
    skyscraper: [3, 56, (g, x, y) => {
      box(g, x, y, 10, 48, '#5aa8d8');
      windows(g, 'L', x, y, 10, 48, 16, 5, '#d8f4ff'); windows(g, 'R', x, y, 10, 48, 16, 5, '#9ad0f0');
      px(g, '#c8d0d8', x, y - 60, 1, 8); px(g, '#ff3a3a', x, y - 61, 1, 1);
    }],
    konbini: [2, 10, (g, x, y) => {
      box(g, x, y, 6, 5, '#f8f8f8');
      poly(g, '#2aa84a', [x - 6, y - 4, x, y - 1, x, y - 2, x - 6, y - 5]); poly(g, '#ff8a2a', [x - 6, y - 3, x, y, x, y - 1, x - 6, y - 4]);
      poly(g, '#2a6ad8', [x, y - 1, x + 6, y - 4, x + 6, y - 5, x, y - 2]);
      poly(g, '#a8e0ff', [x - 5, y - 1, x - 1, y + 1, x - 1, y - 1, x - 5, y - 3]);
      px(g, '#ffd23f', x + 5, y - 9, 2, 4);
    }],
    factory: [6, 40, (g, x, y) => {
      box(g, x, y, 22, 12, '#9aa0a8'); windows(g, 'L', x, y, 22, 12, 2, 10, '#f8e080'); windows(g, 'R', x, y, 22, 12, 2, 10, '#d8c060');
      for (let k = 0; k < 3; k++) cyl(g, x - 12 + k * 7, y - 6 + k * 2, 3, 10, '#d0d4d8');
      for (const dx of [6, 13]) {
        box(g, x + dx, y - 8, 2, 30, '#e8e8e8');
        for (let k = 0; k < 3; k++) px(g, '#d83a2a', x + dx - 2, y - 36 + k * 8, 4, 3);
      }
    }],
    radiotower: [3, 72, (g, x, y) => {
      for (let k = 0; k < 8; k++) {
        const t = k / 8, t2 = (k + 1) / 8, w1 = 9 * (1 - t) + 1, w2 = 9 * (1 - t2) + 1;
        const y1 = y - t * 60, y2 = y - t2 * 60;
        poly(g, k % 2 ? '#f4f4f4' : '#e8402a', [x - w1, y1, x - w2, y2, x + w2, y2, x + w1, y1]);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(Math.round(x), Math.round(y2), Math.round(w1), Math.round(y1 - y2));
      }
      box(g, x, y - 34, 4, 4, '#d8dce0'); box(g, x, y - 52, 2.5, 3, '#d8dce0');
      px(g, '#c8c8c8', x, y - 70, 1, 10); px(g, '#ff3a3a', x, y - 71, 1, 1);
    }],

    /* 乗り物 */
    car0: [1, 4, (g, x, y) => { box(g, x, y, 2, 2, '#e83a3a'); px(g, '#a8e0ff', x - 1, y - 3, 2, 1); }],
    car1: [1, 4, (g, x, y) => { box(g, x, y, 2, 2, '#f8f8f8'); px(g, '#a8e0ff', x - 1, y - 3, 2, 1); }],
    car2: [1, 4, (g, x, y) => { box(g, x, y, 2, 2, '#3a7ae8'); px(g, '#a8e0ff', x - 1, y - 3, 2, 1); }],
    car3: [1, 4, (g, x, y) => { box(g, x, y, 2, 2, '#ffd23f'); px(g, '#a8e0ff', x - 1, y - 3, 2, 1); }],
    train: [1, 6, (g, x, y) => { box(g, x, y, 3.5, 3, '#f8f8fc'); poly(g, '#2a5ad8', [x, y + 1.75, x + 3.5, y, x + 3.5, y - 1, x, y + 0.75]); px(g, '#1a2a5a', x - 3, y - 2, 2, 1); }],
  };

  /* ---------- キャッシュ ---------- */
  const cache = {};
  function get(type) {
    if (cache[type]) return cache[type];
    const [n, top, draw] = DEF[type];
    const w = n * 8 + 18, h = n * 4 + top + 12;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const ax = Math.floor(w / 2), ay = h - n * 2 - 4;
    draw(g, ax, ay);
    // 縁のにじみを消して、拡大してもくっきりしたドットにする
    const img = g.getImageData(0, 0, w, h);
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] < 110 ? 0 : 255;
    g.putImageData(img, 0, 0);
    return (cache[type] = { c, ax, ay, n });
  }

  WD.Sprites = { get, size: (type) => DEF[type][0], has: (type) => !!DEF[type], shade };
})();
