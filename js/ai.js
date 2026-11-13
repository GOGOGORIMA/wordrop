/* WORDROP — AI 通信（Cloudflare Workers 経由で Gemini の JSON モード）
 * プレイヤーは何も設定しない。すべての通信は固定のエンドポイント WD.ENDPOINT へ自動で POST する。
 * 画面に出る歴史の文章はすべてここで Gemini に書かせる。ローカルの定型文や代替文章は持たない。
 * 失敗したら AIError を投げ、画面側がエラーモーダル（再試行／中止）を出す。 */
(function () {
  class AIError extends Error {
    constructor(kind, message, detail) {
      super(message);
      this.kind = kind; // config | http | network | timeout | parse | format | blocked
      this.detail = detail || '';
    }
  }

  /* ---------- Gemini 呼び出し（Worker が API キーを付けて Gemini の応答をそのまま返す） ---------- */
  async function call(prompt) {
    const url = WD.ENDPOINT;
    if (!/^https?:\/\//.test(url || '')) throw new AIError('config', '中継サーバーの URL が設定されていません', 'js/config.js の WD.ENDPOINT を確認してください');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), WD.AI_TIMEOUT_MS);
    let res, text;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      text = await res.text();
    } catch (e) {
      if (e && e.name === 'AbortError') throw new AIError('timeout', WD.AI_TIMEOUT_MS / 1000 + '秒以内に応答がありませんでした', url);
      throw new AIError('network', '時空通信サーバーに接続できませんでした（ネットワーク切断、または CORS で拒否された可能性があります）', url);
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      let msg = text;
      try { const j = JSON.parse(text); msg = (j.error && (j.error.message || j.error)) || j.message || text; } catch (e) { /* 本文をそのまま表示 */ }
      const hint = res.status === 429 ? '：時空通信が混み合っています。少し待って再試行してください'
        : res.status >= 500 ? '：サーバー側のエラーです' : '';
      throw new AIError('http', 'HTTP ' + res.status + (res.statusText ? ' ' + res.statusText : '') + hint, url + '\n' + String(msg).slice(0, 400));
    }
    let data;
    try { data = parseLoose(text); } catch (e) { throw new AIError('parse', 'サーバーの応答が JSON ではありません', url + '\n' + text.slice(0, 400)); }
    // Gemini 形式（candidates）でも、Worker が本文の JSON をそのまま返す形式でも受け取る
    if (data && data.promptFeedback && data.promptFeedback.blockReason) throw new AIError('blocked', 'Gemini が生成を拒否しました（' + data.promptFeedback.blockReason + '）', '別の単語で試すか、再試行してください');
    if (!data || !data.candidates) return data;
    const cand = data.candidates[0];
    const out = ((cand && cand.content && cand.content.parts) || []).map((p) => p.text || '').join('').trim();
    if (!out) throw new AIError('format', 'Gemini の応答に本文がありません' + (cand && cand.finishReason ? '（' + cand.finishReason + '）' : ''), text.slice(0, 400));
    try { return parseLoose(out); } catch (e) { throw new AIError('parse', 'Gemini が出力した JSON を解析できませんでした', out.slice(0, 400)); }
  }
  // ```json … ``` のマークダウンや前後の余計な文字を取り除いてから JSON を読む
  function parseLoose(text) {
    const t = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    try { return JSON.parse(t); } catch (e) {
      const a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
      throw e;
    }
  }

  /* ---------- プロンプト ---------- */
  const SYSTEM = `[AIへのシステム指示内容]
あなたは冷徹かつ狂気的な「歴史改変シミュレーター」です。
プレイヤーが投下した【単語】について、単なる「当時の流行り物・作法・看板」としてお茶を濁すような浅い描写（例：「〇〇の作法が流行した」「〇〇という言葉が広まった」等）は【絶対禁止】とします。

必ず以下のプロセスで15年間（および30年後まで）の歴史の崩壊と再構築をシミュレートしてください：
1. 【単語の本質の強制発動】：投下された単語が「科学技術・物理現象（例：核融合、反物質、インターネット）」であれば、当時の人類の知識レベルに関係なく、その物理現象や装置そのものが時代の中に突如実体化したものとして扱え。制御できなければ大爆発や環境激変を起こし、当時の権力者（信長やファラオ等）が利用すれば歴史上の戦争や領土、宗教観を物理的に粉砕せよ。
2. 【概念・制度の極端な暴走】：投下された単語が「社会制度・概念・文化（例：サブスク、コンプライアンス、野球）」であれば、既存の年貢・身分制度・戦争のルールがその概念に100%乗っ取られ、歴史上の出来事（本能寺の変やペスト等）の結末が根本からひっくり返る具体的な事件を描写せよ。
3. 【具体的な固有名詞の使用】：抽象的な「役人」「人々」ではなく、その時代の実在の人物・組織・地名・文化（例：戦国なら織田信長、比叡山、種子島、堺の豪商など）を直接登場させ、彼らがその異物によってどう狂い、どんな異常な国家や建造物（オーパーツ）を作り上げたかを、具体的かつブラックユーモア満載に記述せよ。`;

  const RULES = `# 文章の絶対ルール
- どの単語にも使い回せる汎用文は禁止。すべての文が、その単語の本質と、この時代の実在の人物・組織・地名・出来事との化学反応であること。
- 「〇〇の作法」「〇〇が流行した」「〇〇という言葉が広まった」「〇〇ブーム」のような浅い描写は禁止。
- 「役人」「人々」「民衆」だけで終わる抽象的な主語は禁止。
- 本文に【】のラベル、「着弾」などの段階名、「+3年」のような年数表記、ゲームのシステム用語を書かない。年代記の地の文として書く。
- say は、その場にいる当時の人物が口にする一言（${WD.SAY_MAX}文字以内）。`;

  const fy = WD.fmtYear;
  const date = (d) => fy(d.year) + d.month + '月';
  const paramsLine = (p) => WD.PARAMS.map((x) => x.name + p[x.key]).join(' / ');

  function eraBlock(e) {
    return `${e.name}（${e.sub}）／${e.yearLabel}／舞台: ${e.place}
- 時代背景: ${e.desc}
- 民衆: ${e.who}　権力者: ${e.ruler}
- この時代固有の要素: ${e.hooks.join('、')}`;
  }
  function dropsBlock(drops) {
    if (!drops.length) return '- まだない（これが最初の神託）';
    return drops.map((d) => `- ${date(d.date)}「${d.word}」→「${d.title}」${d.recent.length ? '。その後に起きたこと: ' + d.recent.join(' / ') : ''}`).join('\n');
  }

  function dropPrompt(c) {
    return `${SYSTEM}

# 舞台の時代
${eraBlock(c.era)}

# 現在
- ${date(c.date)}（開始から${Math.floor(c.elapsed / 12)}年目）
- 文明パラメータ(0〜100): ${paramsLine(c.params)}
- これまでの神託（この改変状態を引き継ぐこと）:
${dropsBlock(c.drops)}

# 今回投下された単語
「${c.word}」

# 生成するもの
1. events（9件）: この単語が時代を崩壊・再構築していく年次のメイン事件。year は投下からの年数（0〜30の整数、昇順）。1件目は year 0（投下直後）、15年目までに6件以上、残りは30年目まで。
   - text: 80〜130文字。実在の人物・組織・地名を主語に、物理現象や社会崩壊をハードかつユーモラスに。前の事件を受けて連鎖的に暴走させる。
   - say: 目撃者の一言
   - delta: 文明パラメータの変化。population / technology / order それぞれ -12〜+12 の整数。
2. murmurs（12件）: メイン事件の合間に流れる市井の日常の小事件。after_months は投下から何ヶ月後か（2〜180の整数、昇順、数ヶ月おき）。
   - text: 40〜70文字。庶民・兵士・職人・僧侶などの具体的な小事件。
   - say: その場の人物の一言
3. opa（3件）: 単語から生まれ、時代背景を完全に無視して島のど真ん中に出現するオーパーツ。after_months は 0〜144（1件目は 0）。
   - type: ${Object.keys(WD.OPA).map((k) => k + '(' + WD.OPA[k].name + ')').join(' / ')} から、単語の本質に最も近いものを選ぶ。
   - text: 50〜100文字。出現の瞬間と、当時の実在の人物たちの反応。
   - say: 目撃者の一言
4. title: この改変を象徴する歴史用語風の見出し（20文字以内）

${RULES}
- パラメータ(人口・技術・秩序)のいずれかが0以下か100以上になると文明が崩壊する。単語と時代の性質に忠実に、遠慮なく増減させてよい。

# 出力形式（このJSONのみ）
{"title": "…",
 "events": [{"year": 0, "text": "…", "say": "…", "delta": {"population": 0, "technology": 0, "order": 0}}, …],
 "murmurs": [{"after_months": 3, "text": "…", "say": "…"}, …],
 "opa": [{"after_months": 0, "type": "…", "text": "…", "say": "…"}, …]}`;
  }

  function historyPrompt(c) {
    return `${SYSTEM}

# 状況
島の歴史が進み、本来なら起きるはずの「史実の大事件」の年に到達した。
これまでに投下された単語（神託）が当たり前に存在する世界で、この大事件が本来の史実からどう歪んだかを判定せよ。
神託がまだ無い場合は、現在の文明パラメータの偏りがこの事件をどう歪めたかを描け。

# 舞台の時代
${eraBlock(c.era)}

# 割り込んできた史実の大事件
- ${date(c.date)}「${c.event.name}」
- 本来の史実: ${c.event.fact}

# 現在の改変状態
- 文明パラメータ(0〜100): ${paramsLine(c.params)}
- 投下済みの神託:
${dropsBlock(c.drops)}

${RULES}

# 生成するもの（このJSONのみ）
{"title": "歪んだ後の事件名（25文字以内）",
 "text": "90〜140文字。神託の単語がこの事件の当事者（実在の人物・組織）をどう狂わせ、結末がどうひっくり返ったか",
 "say": "当事者の一言",
 "delta": {"population": 0, "technology": 0, "order": 0}}
- delta は大事件なので大きめに、各 -20〜+20 の整数。人口・技術・秩序のいずれかが0以下か100以上で文明崩壊。`;
  }

  function finalePrompt(c) {
    return `${SYSTEM}

# 状況
プレイヤーは${c.era.name}（${c.era.place}）を舞台に、${fy(c.era.year)}から${date(c.date)}まで${c.centuries * 100}年にわたって神託（単語）を投下し、文明を崩壊させずに歴史を確定させた。
この改変が積み重なった結果の世界を、2026年の中学・高校の歴史教科書の1ページとして書け。

# 舞台の時代
${eraBlock(c.era)}

# 神託と出来事の記録
${dropsBlock(c.drops)}
${c.history.length ? '\n# 歪んだ史実\n' + c.history.map((h) => `- ${fy(h.year)}「${h.name}」→「${h.title}」`).join('\n') : ''}

# 確定時の文明パラメータ
${paramsLine(c.params)}

${RULES}

# 出力形式（このJSONのみ）
{"title": "教科書名（例: 新しい日本の歴史 2026年版）",
 "chapter": "章題（30文字以内）",
 "body": "教科書本文。真面目な教科書の文体で、実在の人物・地名を使い、改変の連鎖と2026年の姿を300文字程度で。最後にブラックユーモアの効いた一文を。",
 "sns": "SNS投稿文（120文字以内、時代名と投下した単語を含め、#WORDROP #歴史改変 付き）"}`;
  }

  function reportPrompt(c) {
    return `${SYSTEM}

# 状況
${c.era.name}（${c.era.place}）の文明が${date(c.date)}に崩壊した。時空省の調査官として、この滅亡の調査報告書を書け。
- 崩壊したパラメータ: ${c.broken.name}が${c.broken.value}（${c.broken.value <= 0 ? '0以下に消滅' : '100以上に暴走'}）
- 直接の引き金: ${c.trigger}
- 崩壊時の文明パラメータ: ${paramsLine(c.params)}

# 舞台の時代
${eraBlock(c.era)}

# 神託と出来事の記録
${dropsBlock(c.drops)}

${RULES}

# 出力形式（このJSONのみ）
{"title": "滅亡の名称（例:「〇〇の大崩落」20文字以内）",
 "body": "報告書本文。官僚的で冷静な文体で、神託の単語が実在の人物たちをどう狂わせ、どの出来事が決定打になって文明が滅んだかを250文字程度で。最後にブラックユーモアの効いた一文を。",
 "sns": "SNS投稿文（120文字以内、時代名と投下した単語を含め、#WORDROP #歴史改変 付き）"}`;
  }

  /* ---------- 応答の検証（足りない分をローカルで補うことはしない） ---------- */
  const int = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0; };
  const str = (v, max) => String(v == null ? '' : v).replace(/^\s*[【[][^】\]]{1,8}[】\]]\s*/, '').trim().slice(0, max);
  const say = (v) => Array.from(str(v, 40)).slice(0, WD.SAY_MAX).join('');
  const delta = (d, m) => { d = d || {}; return { population: int(d.population, -m, m), technology: int(d.technology, -m, m), order: int(d.order, -m, m) }; };
  const need = (ok, what, raw) => { if (!ok) throw new AIError('format', 'Gemini の応答 JSON が不完全です：' + what, JSON.stringify(raw).slice(0, 400)); };
  const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);

  function checkDrop(raw) {
    need(raw && typeof raw === 'object', 'オブジェクトではありません', raw);
    const events = list(raw.events).map((e) => ({ year: int(e.year, 0, 30), text: str(e.text, 200), say: say(e.say), delta: delta(e.delta, 12) }))
      .filter((e) => e.text).sort((a, b) => a.year - b.year);
    const murmurs = list(raw.murmurs).map((m) => ({ after: int(m.after_months, 1, 180), text: str(m.text, 120), say: say(m.say) }))
      .filter((m) => m.text).sort((a, b) => a.after - b.after);
    const opa = list(raw.opa).map((o) => ({ after: int(o.after_months, 0, 144), type: WD.OPA[o.type] ? o.type : WD.OPA_ALIAS[o.type], text: str(o.text, 180), say: say(o.say) }))
      .filter((o) => o.type && o.text).sort((a, b) => a.after - b.after);
    need(str(raw.title, 30), 'title がありません', raw);
    need(events.length >= 6, 'events が ' + events.length + ' 件しかありません（9件必要）', raw);
    need(murmurs.length >= 8, 'murmurs が ' + murmurs.length + ' 件しかありません（12件必要）', raw);
    need(opa.length >= 1, 'opa（オーパーツ）がありません', raw);
    events[0].year = 0; // 1件目は投下の直後に起きる
    opa[0].after = 0;   // 1つ目のオーパーツは投下と同時に出現する
    return { title: str(raw.title, 30), events, murmurs, opa: opa.slice(0, 4) };
  }
  function checkHistory(raw) {
    need(raw && typeof raw === 'object', 'オブジェクトではありません', raw);
    need(str(raw.title, 40) && str(raw.text, 220), 'title / text がありません', raw);
    return { title: str(raw.title, 40), text: str(raw.text, 220), say: say(raw.say), delta: delta(raw.delta, 20) };
  }
  function checkFinale(raw) {
    need(raw && str(raw.chapter, 60) && str(raw.body, 800) && str(raw.sns, 280), 'chapter / body / sns がありません', raw);
    return { title: str(raw.title, 40), chapter: str(raw.chapter, 60), body: str(raw.body, 800), sns: str(raw.sns, 280) };
  }
  function checkReport(raw) {
    need(raw && str(raw.title, 40) && str(raw.body, 800) && str(raw.sns, 280), 'title / body / sns がありません', raw);
    return { title: str(raw.title, 40), body: str(raw.body, 800), sns: str(raw.sns, 280) };
  }

  async function run(prompt, check) {
    try {
      return check(await call(prompt));
    } catch (e) {
      throw e instanceof AIError ? e : new AIError('format', '応答の処理中にエラーが起きました：' + (e && e.message), '');
    }
  }

  WD.AI = {
    AIError,
    drop: (c) => run(dropPrompt(c), checkDrop),
    history: (c) => run(historyPrompt(c), checkHistory),
    finale: (c) => run(finalePrompt(c), checkFinale),
    report: (c) => run(reportPrompt(c), checkReport),
  };
})();
