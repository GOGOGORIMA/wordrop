/* WORDROP — 結果カード（教科書／滅亡報告書＋浮島空撮）を1枚のPNGに描き出す */
(function () {
  const W = 1200, H = 675;
  const FONT = '"DotGothic16", sans-serif';
  const PIXEL = '"Press Start 2P", monospace';

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /* 日本語は1文字ずつ折り返す。maxLines を超えたら末尾を「…」に */
  function wrap(g, text, maxW, maxLines) {
    const lines = [];
    let cur = '';
    for (const ch of Array.from(text)) {
      if (ch === '\n') { lines.push(cur); cur = ''; continue; }
      if (g.measureText(cur + ch).width > maxW && cur) {
        // 行頭禁則：句読点は前の行にぶら下げる
        if ('、。」）！？'.includes(ch)) { lines.push(cur + ch); cur = ''; continue; }
        lines.push(cur); cur = ch;
      } else cur += ch;
    }
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) {
      const cut = lines.slice(0, maxLines);
      let last = cut[maxLines - 1];
      while (last.length && g.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      cut[maxLines - 1] = last + '…';
      return cut;
    }
    return lines;
  }

  function fitText(g, text, maxW) {
    if (g.measureText(text).width <= maxW) return text;
    let t = text;
    while (t.length && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  async function render(d) {
    try {
      await Promise.all([document.fonts.load('20px "DotGothic16"'), document.fonts.load('12px "Press Start 2P"')]);
    } catch (e) { /* フォントが無くても描画は続ける */ }
    const clear = d.kind === 'clear';
    const C = clear
      ? { bg: '#120f22', frame: '#ffd23f', frame2: '#5a3a0a', banner: '#ffd23f', paper: '#f6efdc', ink: '#2a2418', head: '#6a5a3a', accent: '#b8402a', rule: '#a89870', rowBg: '#e8dcbc' }
      : { bg: '#1a0606', frame: '#ff4a3a', frame2: '#4a0a0a', banner: '#ff5a4a', paper: '#ece4d6', ink: '#2a1a14', head: '#7a2a20', accent: '#c0201a', rule: '#b89a8a', rowBg: '#e0cfc0' };

    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');

    // 背景とドット枠
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.04)';
    for (let y = 0; y < H; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) g.fillRect(x, y, 1, 1);
    g.fillStyle = C.frame2; g.fillRect(0, 0, W, 10); g.fillRect(0, H - 10, W, 10); g.fillRect(0, 0, 10, H); g.fillRect(W - 10, 0, 10, H);
    g.fillStyle = C.frame; g.fillRect(4, 4, W - 8, 3); g.fillRect(4, H - 7, W - 8, 3); g.fillRect(4, 4, 3, H - 8); g.fillRect(W - 7, 4, 3, H - 8);

    // 上部バナー
    g.textBaseline = 'middle';
    g.font = '22px ' + PIXEL;
    g.fillStyle = '#3a1a0a'; g.fillText('WORDROP', 34, 43);
    g.fillStyle = '#ffd23f'; g.fillText('WORDROP', 31, 40);
    g.font = '22px ' + FONT;
    g.fillStyle = C.banner;
    g.textAlign = 'right';
    g.fillText(d.banner, W - 30, 40);
    g.textAlign = 'left';

    // 左：浮島の空撮
    const ix = 26, iy = 70, iw = 590, ih = 579;
    g.fillStyle = '#000'; g.fillRect(ix - 4, iy - 4, iw + 8, ih + 8);
    if (d.snapshot) {
      try {
        const img = await loadImage(d.snapshot);
        g.imageSmoothingEnabled = false;
        // 島が収まる中央部分を等倍で切り出す
        const sx = Math.max(0, Math.round((img.width - iw) / 2)), sy = Math.max(0, Math.min(img.height - ih, 20));
        g.drawImage(img, sx, sy, iw, ih, ix, iy, iw, ih);
      } catch (e) { /* 画像なしで続行 */ }
    }
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(ix, iy + ih - 30, iw, 30);
    g.font = '15px ' + FONT; g.fillStyle = '#f2ecd8';
    g.fillText(d.caption, ix + 12, iy + ih - 15);

    // 右：教科書／報告書
    const px = 640, py = 70, pw = 534, ph = 579;
    g.fillStyle = C.paper; g.fillRect(px, py, pw, ph);
    g.fillStyle = 'rgba(120,90,40,0.07)';
    for (let y = py + 30; y < py + ph; y += 26) g.fillRect(px, y, pw, 1);
    g.strokeStyle = C.head; g.lineWidth = 2; g.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
    if (!clear) { g.fillStyle = C.accent; g.fillRect(px, py, pw, 6); }

    const L = px + 22, R = px + pw - 22, TW = R - L;
    let y = py + 28;
    g.font = '14px ' + FONT; g.fillStyle = C.head;
    g.fillText(fitText(g, d.header, TW - 130), L, y);
    // 判子
    g.save();
    g.translate(R - 52, y + 6); g.rotate(clear ? -0.07 : -0.14);
    g.strokeStyle = C.accent; g.lineWidth = 3; g.fillStyle = C.accent;
    g.font = (clear ? '14px ' : '26px ') + FONT;
    const sw = g.measureText(d.stamp).width + 16, sh = clear ? 26 : 40;
    g.strokeRect(-sw / 2, -sh / 2, sw, sh);
    g.textAlign = 'center'; g.fillText(d.stamp, 0, 1);
    g.restore();
    y += 18;
    g.fillStyle = C.head; g.fillRect(L, y, TW, 2); g.fillRect(L, y + 4, TW, 1);

    // 見出し
    y += 30;
    g.font = '25px ' + FONT; g.fillStyle = C.ink;
    for (const line of wrap(g, d.heading, TW, 2)) { g.fillText(line, L, y); y += 32; }

    // 本文
    y += 4;
    g.font = '15px ' + FONT; g.fillStyle = C.ink;
    const bodyLines = wrap(g, d.body, TW, d.rows.length > 3 ? 7 : 8);
    for (const line of bodyLines) { g.fillText(line, L, y); y += 24; }

    // 補足（滅亡報告書の「直接の引き金」など）
    if (d.extra) {
      y += 6;
      g.font = '13px ' + FONT;
      g.fillStyle = C.accent; g.fillRect(L, y - 10, 3, 20 + 22 * Math.min(2, Math.max(0, d.rows.length > 2 ? 1 : 2)));
      g.fillText(d.extra.label, L + 10, y);
      y += 22;
      g.font = '14px ' + FONT; g.fillStyle = C.ink;
      for (const line of wrap(g, d.extra.text, TW - 12, d.rows.length > 2 ? 2 : 3)) { g.fillText(line, L + 10, y); y += 22; }
    }

    // 経緯の表
    y += 8;
    g.font = '13px ' + FONT;
    const col = 168;
    for (const [left, right, hot] of d.rows) {
      g.fillStyle = C.rowBg; g.fillRect(L, y - 12, col, 24);
      g.strokeStyle = C.rule; g.lineWidth = 1; g.strokeRect(L + 0.5, y - 11.5, TW - 1, 24);
      g.fillStyle = C.ink; g.fillText(fitText(g, left, col - 10), L + 6, y);
      g.fillStyle = hot ? C.accent : C.ink;
      g.fillText(fitText(g, right, TW - col - 12), L + col + 6, y);
      y += 24;
    }

    // パラメータ
    y += 18;
    let x = L;
    for (const p of d.params) {
      g.font = '14px ' + FONT; g.fillStyle = p.broken ? C.accent : C.ink;
      g.fillText(p.name, x, y);
      x += g.measureText(p.name).width + 6;
      g.font = '12px ' + PIXEL; g.fillStyle = p.broken ? C.accent : p.color;
      g.fillText(String(p.value), x, y + 1);
      x += g.measureText(String(p.value)).width + 18;
    }

    // フッター
    g.font = '13px ' + FONT; g.fillStyle = 'rgba(42,36,24,0.6)';
    g.textAlign = 'right';
    g.fillText('#WORDROP #歴史改変', R, py + ph - 14);
    g.textAlign = 'left';
    return c;
  }

  function toBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNGの生成に失敗'))), 'image/png'));
  }

  WD.ShareImage = {
    render,
    async blob(d) { return toBlob(await render(d)); },
    canCopy: () => !!(navigator.clipboard && window.ClipboardItem),
    canShareFiles() {
      try {
        return !!(navigator.canShare && navigator.canShare({ files: [new File([new Blob()], 'w.png', { type: 'image/png' })] }));
      } catch (e) { return false; }
    },
  };
})();
