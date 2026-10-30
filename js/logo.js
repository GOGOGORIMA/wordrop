/* WORDROP — ドット絵ロゴ（文字が1つずつ落ちてくる） */
(function () {
  const GLYPHS = {
    W: ['XX...XX', 'XX...XX', 'XX.X.XX', 'XX.X.XX', 'XXXXXXX', 'XXX.XXX', 'XX...XX'],
    O: ['.XXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', '.XXXX.'],
    R: ['XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX.XX.', 'XX..XX', 'XX..XX'],
    D: ['XXXXX.', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XX..XX', 'XXXXX.'],
    P: ['XXXXX.', 'XX..XX', 'XX..XX', 'XXXXX.', 'XX....', 'XX....', 'XX....'],
  };
  const WORD = 'WORDROP';
  const B = 10;           // 1ドットのサイズ
  const EXT = 3;          // 立体の押し出し量（ドット）
  const ROW_COL = ['#fffbd0', '#fff27a', '#ffd23a', '#ffb02a', '#ff8a1a', '#f0601a', '#d63a12'];

  function layout() {
    const letters = [];
    let x = 0;
    for (const ch of WORD) {
      const g = GLYPHS[ch];
      letters.push({ ch, g, x });
      x += g[0].length + 1;
    }
    return { letters, cols: x - 1 };
  }

  WD.Logo = {
    mount(canvas, onDone) {
      const { letters, cols } = layout();
      const pad = 2;
      const W = (cols + EXT + pad * 2) * B;
      const H = (7 + EXT + pad * 2 + 4) * B;
      canvas.width = W; canvas.height = H;
      const g = canvas.getContext('2d');
      const start = performance.now();
      letters.forEach((l, i) => { l.delay = 0.15 + i * 0.12; l.y = -12; l.vy = 0; l.done = false; });
      let finished = false;

      function drawLetter(l, oy) {
        const ox = (l.x + pad) * B;
        const baseY = (pad + 2) * B + oy;
        const lit = (r, c) => l.g[r] && l.g[r][c] === 'X';
        // 押し出し影
        for (let e = EXT; e >= 1; e--) {
          g.fillStyle = e === EXT ? '#1a0820' : e === 1 ? '#7a1a3a' : '#4a0e30';
          for (let r = 0; r < 7; r++) for (let c = 0; c < l.g[r].length; c++) {
            if (lit(r, c)) g.fillRect(ox + (c + e) * B, baseY + (r + e) * B, B, B);
          }
        }
        // 縁取り
        g.fillStyle = '#12061a';
        for (let r = 0; r < 7; r++) for (let c = 0; c < l.g[r].length; c++) {
          if (!lit(r, c)) continue;
          g.fillRect(ox + c * B - 3, baseY + r * B - 3, B + 6, B + 6);
        }
        // 面
        for (let r = 0; r < 7; r++) for (let c = 0; c < l.g[r].length; c++) {
          if (!lit(r, c)) continue;
          g.fillStyle = ROW_COL[r];
          g.fillRect(ox + c * B, baseY + r * B, B, B);
          g.fillStyle = 'rgba(255,255,255,0.55)';
          if (!lit(r - 1, c)) g.fillRect(ox + c * B, baseY + r * B, B, 2);
          g.fillStyle = 'rgba(120,20,0,0.35)';
          if (!lit(r + 1, c)) g.fillRect(ox + c * B, baseY + r * B + B - 2, B, 2);
        }
      }

      function frame(now) {
        const t = (now - start) / 1000;
        g.clearRect(0, 0, W, H);
        let all = true;
        for (const l of letters) {
          if (t < l.delay) { all = false; continue; }
          if (!l.done) {
            l.vy += 0.9; l.y += l.vy;
            if (l.y >= 0) {
              l.y = 0;
              if (Math.abs(l.vy) < 3) { l.done = true; l.vy = 0; }
              else l.vy = -l.vy * 0.38;
              if (WD.Sfx && l.vy !== 0) WD.Sfx.play('land');
            }
            all = false;
          }
          drawLetter(l, Math.round(l.y) * B / 2);
        }
        // 下の波線（雫）
        if (t > 1.2) {
          const a = Math.min(1, (t - 1.2) * 2);
          g.globalAlpha = a;
          const y = (pad + 2 + 7 + EXT + 1) * B;
          for (let c = 0; c < cols + EXT; c++) {
            const yy = y + Math.round(Math.sin(c * 0.6 + t * 3) * 3);
            g.fillStyle = c % 2 ? '#4fd8ff' : '#9fe8ff';
            g.fillRect((c + pad) * B, yy, B, 4);
          }
          g.globalAlpha = 1;
        }
        if (all && !finished) { finished = true; if (onDone) onDone(); }
        if (canvas.isConnected && !canvas.closest('.hidden')) requestAnimationFrame(frame);
        else canvas._paused = frame;
      }
      canvas._resume = () => { if (canvas._paused) { const f = canvas._paused; canvas._paused = null; requestAnimationFrame(f); } };
      requestAnimationFrame(frame);
    },
  };
})();
