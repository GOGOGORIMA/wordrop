/* WORDROP — 結果カードの PNG（1200×675：左に浮島の空撮、右に教科書／報告書） */
(function () {
  function wrap(g, text, maxW) {
    const lines = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const ch of Array.from(para)) {
        if (g.measureText(line + ch).width > maxW) { lines.push(line); line = ch; } else line += ch;
      }
      lines.push(line);
    }
    return lines;
  }

  /* data: { kind: 'textbook' | 'report', label, title, heading, body, footer, snapshot(canvas) } */
  function render(data) {
    const W = 1200, H = 675, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const report = data.kind === 'report';
    g.fillStyle = report ? '#1a0a0a' : '#14102a'; g.fillRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;
    g.drawImage(data.snapshot, 24, 24, 520, 627);
    g.strokeStyle = '#000'; g.lineWidth = 4; g.strokeRect(24, 24, 520, 627);
    // 紙面
    g.fillStyle = report ? '#efe6d2' : '#f6f0de'; g.fillRect(568, 24, 608, 627);
    g.fillStyle = report ? '#a8241a' : '#2a3a7a'; g.fillRect(568, 24, 608, 46);
    const font = (px, bold) => (g.font = (bold ? 'bold ' : '') + px + 'px "DotGothic16", sans-serif');
    g.textBaseline = 'top';
    font(20, true); g.fillStyle = '#fff'; g.fillText(data.label, 588, 36);
    font(30, true); g.fillStyle = '#1a1424';
    let y = 88;
    for (const l of wrap(g, data.title, 568).slice(0, 2)) { g.fillText(l, 588, y); y += 38; }
    if (data.heading) { font(20, true); g.fillStyle = report ? '#a8241a' : '#2a3a7a'; g.fillText(data.heading, 588, y + 2); y += 34; }
    g.fillStyle = '#c8bca0'; g.fillRect(588, y, 568, 2); y += 14;
    font(19); g.fillStyle = '#2a2430';
    const lines = wrap(g, data.body, 568), maxLines = Math.floor((600 - y) / 28);
    lines.slice(0, maxLines).forEach((l, i) => g.fillText(i === maxLines - 1 && lines.length > maxLines ? l.slice(0, -1) + '…' : l, 588, y + i * 28));
    font(16); g.fillStyle = '#6a6070'; g.fillText(data.footer, 588, 618);
    g.textAlign = 'right'; g.fillText('#WORDROP', 1160, 618); g.textAlign = 'left';
    if (report) {
      g.save(); g.translate(1080, 120); g.rotate(-0.25);
      g.strokeStyle = 'rgba(200,30,20,0.85)'; g.lineWidth = 5; g.strokeRect(-70, -26, 140, 52);
      font(30, true); g.fillStyle = 'rgba(200,30,20,0.85)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('滅 亡', 0, 2);
      g.restore();
    }
    return c;
  }

  WD.Card = {
    blob: (data) => new Promise((res, rej) => render(data).toBlob((b) => (b ? res(b) : rej(new Error('PNG を作れませんでした'))), 'image/png')),
  };
})();
