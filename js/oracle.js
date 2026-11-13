/* WORDROP — 歴史改変エンジン（Gemini API 専用）
 * 表示する歴史の文章は 100% Gemini が単語と時代から専用に生成したものだけ。
 * ローカルの穴埋めテンプレートやデモ生成は持たない。通信や応答に問題があれば AIError を投げ、
 * 画面側がエラーダイアログ（再試行／API設定）を出す。 */
(function () {
  const TYPES = Object.keys(WD.BUILDINGS);

  function fmtYear(y) { return y < 0 ? '紀元前' + -y + '年' : y + '年'; }
  WD.fmtYear = fmtYear;
  function fmtDate(d) { return fmtYear(d.year) + d.month + '月'; }
  WD.fmtDate = fmtDate;
  WD.REGION_NAME = { japan: '日本史', world: '世界史' };

  const clampInt = (v, lo, hi) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0;
  };
  const clipSay = (s) => Array.from(String(s || '').trim()).slice(0, WD.SAY_MAX).join('');

  /* 文明パラメータの状態を表す短い呼び名（教科書・到達点の表に使う） */
  function describe(p) {
    const tags = [];
    if (p.technology >= 75) tags.push('超技術');
    else if (p.technology <= 25) tags.push('牧歌的');
    if (p.order >= 75) tags.push('超管理');
    else if (p.order <= 25) tags.push('無法地帯');
    if (p.population >= 75) tags.push('過密');
    else if (p.population <= 25) tags.push('過疎');
    if (p.distortion >= 60) tags.push('時空のねじれた');
    if (!tags.length) tags.push('奇妙に安定した');
    return tags.join('・') + '浮島国家';
  }
  WD.describeState = describe;

  // AI の本文に、ゲームのシステム用語（段階名など）が紛れ込んだ場合に取り除く
  const STAGE_RE = new RegExp('^\\s*[【\\[［]?\\s*(?:' + ['着弾', '試行', '流行', '摩擦', '副作用', '魔改造', '制度化', '世代交代', '定着', '長期余波', '市井'].join('|') + ')(?:期)?\\s*[】\\]］]?\\s*[:：]?\\s*');
  const cleanText = (t) => String(t || '').replace(STAGE_RE, '').replace(/[（(]時間停止[）)]/g, '').replace(/^\s*\+?\d+年(目|後)[:：、]?\s*/, '').trim();

  /* ================= エラー ================= */
  class AIError extends Error {
    constructor(kind, message, detail) {
      super(message);
      this.kind = kind; // config / http / network / timeout / parse / format / blocked
      this.detail = detail || '';
    }
  }
  WD.AIError = AIError;

  /* ================= 通信 ================= */
  /* 経路：個人キーが入力されていれば Gemini に直接、なければ Cloudflare Workers 経由 */
  const routeOf = (settings) => (settings.apiKey ? 'direct' : 'worker');
  WD.routeLabel = (route) => (route === 'direct' ? '直接APIキー経由' : 'Worker経由');
  WD.routeOf = routeOf;

  async function callGemini(settings, prompt) {
    const way = routeOf(settings);
    const model = (settings.model || WD.DEFAULT_MODEL).trim();
    let url;
    if (way === 'direct') {
      url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(settings.apiKey);
    } else {
      url = (WD.PROXY_URL || '').trim();
      if (!/^https?:\/\//.test(url)) throw new AIError('config', '中継サーバー（Cloudflare Workers）の URL が設定されていません', 'js/config.js の WD.PROXY_URL を確認してください');
    }
    const where = way === 'worker' ? url : 'generativelanguage.googleapis.com（' + model + '）';
    const body = JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 1.0 },
    });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), WD.AI_TIMEOUT_MS);
    let res, text;
    try {
      res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal, body });
      text = await res.text();
    } catch (e) {
      if (e && e.name === 'AbortError') throw new AIError('timeout', (WD.AI_TIMEOUT_MS / 1000) + '秒以内に応答がありませんでした（タイムアウト）', where);
      throw new AIError('network', '通信できませんでした（ネットワーク切断、または CORS で拒否された可能性があります）', where);
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) {
      let msg = '';
      try { const j = JSON.parse(text); msg = (j.error && (j.error.message || j.error)) || j.message || text; } catch (e) { msg = text; }
      const hint = res.status === 429 ? '：利用回数の上限に達しています。しばらく待って再試行してください'
        : res.status === 401 || res.status === 403 ? '：API キーまたはアクセス権限を確認してください'
          : res.status === 404 ? '：URL またはモデル名を確認してください'
            : res.status >= 500 ? '：サーバー側のエラーです' : '';
      throw new AIError('http', 'HTTP ' + res.status + (res.statusText ? ' ' + res.statusText : '') + hint, where + '\n' + String(msg || '').slice(0, 300));
    }
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new AIError('parse', 'サーバーの応答が JSON ではありません', where + '\n' + text.slice(0, 300)); }
    if (data.promptFeedback && data.promptFeedback.blockReason) throw new AIError('blocked', 'Gemini が生成を拒否しました（' + data.promptFeedback.blockReason + '）', '別の単語で試すか、再試行してください');
    const cand = data.candidates && data.candidates[0];
    const out = ((cand && cand.content && cand.content.parts) || []).map((p) => p.text || '').join('');
    if (!out) throw new AIError('format', 'Gemini の応答に本文がありません' + (cand && cand.finishReason ? '（finishReason: ' + cand.finishReason + '）' : ''), text.slice(0, 300));
    return parseJSON(out);
  }

  function parseJSON(text) {
    const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(t); } catch (e) {
      const a = t.indexOf('{'), b = t.lastIndexOf('}');
      if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e2) { /* 下で失敗扱い */ } }
      throw new AIError('parse', 'Gemini の出力した JSON を解析できませんでした', t.slice(0, 300));
    }
  }

  /* ================= プロンプト ================= */
  /* 歴史改変シミュレーターとしての絶対命令（すべての生成の冒頭に置く） */
  const SYSTEM = `[AIへのシステム指示内容]
あなたは冷徹かつ狂気的な「歴史改変シミュレーター」です。
プレイヤーが投下した【単語】について、単なる「当時の流行り物・作法・看板」としてお茶を濁すような浅い描写（例：「〇〇の作法が流行した」「〇〇という言葉が広まった」等）は【絶対禁止】とします。

必ず以下のプロセスで15年間（および30年後まで）の歴史の崩壊と再構築をシミュレートしてください：
1. 【単語の本質の強制発動】：投下された単語が「科学技術・物理現象（例：核融合、反物質、インターネット）」であれば、当時の人類の知識レベルに関係なく、その物理現象や装置そのものが時代の中に突如実体化したものとして扱え。制御できなければ大爆発や環境激変を起こし、当時の権力者（信長やファラオ等）が利用すれば歴史上の戦争や領土、宗教観を物理的に粉砕せよ。
2. 【概念・制度の極端な暴走】：投下された単語が「社会制度・概念・文化（例：サブスク、コンプライアンス、野球）」であれば、既存の年貢・身分制度・戦争のルールがその概念に100%乗っ取られ、歴史上の出来事（本能寺の変やペスト等）の結末が根本からひっくり返る具体的な事件を描写せよ。
3. 【具体的な固有名詞の使用】：抽象的な「役人」「人々」ではなく、その時代の実在の人物・組織・地名・文化（例：戦国なら織田信長、比叡山、種子島、堺の豪商など）を直接登場させ、彼らがその異物によってどう狂い、どんな異常な国家や建造物（オーパーツ）を作り上げたかを、具体的かつブラックユーモア満載に記述せよ。`;

  // すべての文章に共通する禁止事項
  const STYLE_BANS = `# 文章の絶対ルール
- どの単語にも使い回せる汎用文は禁止。すべての文が、その単語の本質と、この時代の固有の人物・組織・地名・出来事との化学反応でなければならない。
- 「〇〇の作法」「〇〇が流行した」「〇〇という言葉が広まった」「〇〇ブーム」「〇〇の看板」「〇〇ごっこ」のような浅い描写は禁止。
- 「役人」「人々」「民衆」「商人」だけで終わる抽象的な主語は禁止。実在の人物名・組織名・地名を必ず使う。
- 本文に「着弾」「試行」「魔改造」などの段階名、【】などのラベル、「+3年」のような年数表記、ゲームのシステム用語は書かない。プレイヤーが読む歴史年代記の地の文として書く。`;

  const typeList = TYPES.map((k) => k + '(' + WD.BUILDINGS[k].name + ')').join(', ');

  function eraBlock(e) {
    return `${e.name}（${e.sub}）／${e.yearLabel}／舞台: ${e.place}／${WD.REGION_NAME[e.region]}／風土: ${WD.BIOMES[e.biome].name}
  - 時代背景: ${e.desc}
  - 民衆: ${e.who}　権力者: ${e.ruler}
  - この時代固有の要素: ${e.hooks.join('、')}`;
  }

  function dropsBlock(drops) {
    if (!drops.length) return '- なし（最初の神託）';
    return drops.map((d) => {
      const fired = d.fired.slice(-4);
      return `- 第${d.century + 1}世紀 ${fmtDate(d.date)}に「${d.word}」→「${d.title}」。実際に起きたこと${d.fired.length > 4 ? '（最近の4件）' : ''}: ${fired.length ? fired.map((f) => fmtDate(f) + ' ' + f.text).join(' / ') : 'まだ何も起きていない'}`;
    }).join('\n');
  }

  function dropPrompt(ctx) {
    const p = ctx.params;
    const e = ctx.era;
    const stages = WD.MAIN_STAGES.map((st) => `  - offset ${st.offset}（${fmtYear(ctx.date.year + st.offset)}）: ${st.desc}`).join('\n');
    const pending = ctx.pending.length
      ? '\n- 並行して進行中の別の神託の予定（矛盾せず絡み合うように）: ' + ctx.pending.slice(0, 8).map((x) => `${fmtDate(x)}「${x.word}」${x.text}`).join(' / ')
      : '';
    return `${SYSTEM}

# 舞台の時代（途中で変わらない）
${eraBlock(e)}

# 現在の状況
- 現在: ${fmtDate(ctx.date)}（開始から${Math.floor(ctx.date.elapsed / 12)}年経過、第${ctx.century + 1}世紀）
- 文明パラメータ(0〜100): 人口${p.population} / 技術${p.technology} / 秩序${p.order} / 歪み${p.distortion}
- これまでの神託と、すでに起きた出来事（この改変状態を引き継ぐこと）:
${dropsBlock(ctx.drops)}${pending}

# 今回投下された単語
「${ctx.word}」

# 生成するもの
1. events（${WD.EVENT_OFFSETS.length}件）：この単語がこの時代を15年かけて崩壊・再構築し、30年後まで暴走していく年次の大事件。offset は投下からの年数で、各 offset で描くべき局面は次のとおり（局面名は本文に書かない）:
${stages}
   - text: 70〜120文字。その年に起きた具体的な事件を、実在の人物・組織・地名を主語にして描く。前の年の事件を受けて連鎖的に悪化・暴走させる。
   - say: その事件を目撃した当時の人物の叫びや一言（${WD.SAY_MAX}文字以内）。浮島の上に吹き出しで表示される。
2. murmurs（${WD.MURMUR_COUNT[1]}件）：メインの事件の合間に起きる、庶民・兵士・職人・貴族・僧侶などの具体的な小事件。15年間の時系列順。
   - month: 投下から何ヶ月後か（3〜178の整数、重複なし、昇順）
   - text: 40〜70文字。この単語とこの時代の固有名詞が化学反応した具体的な出来事。
   - say: その場の人物の一言（${WD.SAY_MAX}文字以内）
3. mutant_objects（4件）：単語から生まれた、時代背景を完全に無視したオーパーツの出現。year は 1・4・8・12。
   - category: ${Object.keys(WD.MUTANTS).join('|')} から、この単語の本質に最も近いもの（例: 野球→stadium、核融合→factory、インターネット→tower、新幹線→railway、車→highway、コンビニ→convenience、株式会社→skyscraper、テーマパーク→amusement）
   - text: 60〜110文字。そのオーパーツが出現した瞬間と、当時の実在の人物たちの反応を具体的に。
   - say: 目撃者の一言（${WD.SAY_MAX}文字以内）
4. title: この改変を象徴する歴史用語風の見出し（20文字以内）

${STYLE_BANS}

# 数値・描画のルール
- 人口・技術・秩序のいずれかが0以下または100以上になると文明崩壊（ゲームオーバー）。単語と時代の性質に忠実に、遠慮なく増減させてよい。
- events の delta: population/technology/order は -12〜+12 の整数、distortion（時代錯誤による時空の歪み）は -5〜+12 の整数。
- events の map は箱庭の島の見た目の変化。add/remove の type は次から選ぶ: ${typeList}。count は1〜2。
- sky は ${WD.SKIES.join('|')}、sea は ${WD.SEAS.join('|')}、land は ${WD.LANDS.join('|')}、weather は ${WD.WEATHERS.join('|')} から選ぶ。変化がなければ null。

# 出力形式（このJSONのみを出力）
{
  "title": "…",
  "events": [
    {"offset": 0, "text": "…", "say": "…", "delta": {"population": 0, "technology": 0, "order": 0, "distortion": 0},
     "map": {"add": [{"type": "…", "count": 1}], "remove": [], "sky": null, "sea": null, "land": null, "weather": null}},
    …（offset ${WD.EVENT_OFFSETS.join(', ')} の${WD.EVENT_OFFSETS.length}件）
  ],
  "murmurs": [{"month": 4, "text": "…", "say": "…"}, …],
  "mutant_objects": [{"year": 1, "category": "…", "text": "…", "say": "…"}, …]
}`;
  }

  function historyPrompt(ctx) {
    const p = ctx.params;
    return `${SYSTEM}

# 状況
箱庭の島で歴史が1年ずつ進む中、本来なら起きるはずの「史実の大事件」の年に到達した。
これまでに投下された単語（神託）が当たり前に存在する世界で、この大事件が本来の史実からどう狂ったかを判定せよ。
単語がまだ1つも無い場合は、現在の文明パラメータの偏りがこの事件をどう歪めたかを、実在の人物を主語に描け。

# 舞台の時代
${eraBlock(ctx.era)}

# 割り込んできた史実の大事件
- ${fmtDate(ctx.date)}「${ctx.event.name}」
- 本来の史実: ${ctx.event.fact}

# 現在の改変状態
- 文明パラメータ(0〜100): 人口${p.population} / 技術${p.technology} / 秩序${p.order} / 歪み${p.distortion}
- 投下済みの神託と起きた出来事:
${dropsBlock(ctx.drops)}

${STYLE_BANS}

# 生成するもの
- title: 狂った後の事件名（25文字以内）
- text: 90〜140文字。単語の本質がこの事件の当事者（実在の人物・組織）をどう狂わせ、結末がどうひっくり返ったか。
- say: 当事者の一言（${WD.SAY_MAX}文字以内）
- delta: 大事件なので大きめに。population/technology/order は -20〜+20、distortion は -5〜+15 の整数。人口・技術・秩序のいずれかが0以下か100以上になると文明崩壊。
- map: add/remove の type は次から選ぶ: ${typeList}。count は1〜2。sky は ${WD.SKIES.join('|')}、sea は ${WD.SEAS.join('|')}、land は ${WD.LANDS.join('|')}、weather は ${WD.WEATHERS.join('|')}、変化がなければ null。

# 出力形式（このJSONのみを出力）
{"title": "…", "text": "…", "say": "…", "delta": {"population": 0, "technology": 0, "order": 0, "distortion": 0},
 "map": {"add": [], "remove": [], "sky": null, "sea": null, "land": null, "weather": null}}`;
  }

  function finalePrompt(ctx) {
    const p = ctx.params;
    const e = ctx.era;
    const T = ctx.targetYear;
    return `${SYSTEM}

# 状況
プレイヤーは${e.name}（${e.sub}、${e.place}）を舞台に、${fmtYear(ctx.start.year)}から${fmtDate(ctx.end)}までの${ctx.centuries}世紀にわたって神託（単語）を投下し、文明を崩壊させずに歴史を確定させた。
この改変が世代を超えて積み重なった結果、${T}年の世界がどうなったかを、${T}年の中学・高校の歴史教科書の1ページとして書け。

# 舞台の時代
${eraBlock(e)}

# ${ctx.centuries * 100}年間の神託と出来事の記録
${dropsBlock(ctx.drops)}
${ctx.history && ctx.history.length ? '\n# 狂ってしまった史実の大事件\n' + ctx.history.map((h) => `- ${fmtYear(h.year)}「${h.name}」→「${h.title}」: ${h.text}`).join('\n') : ''}

# 確定時点の文明パラメータ(0〜100)
人口${p.population} / 技術${p.technology} / 秩序${p.order} / 歪み${p.distortion}

${STYLE_BANS}

# 出力形式（このJSONのみを出力）
{
  "title": "教科書名（例: ${ctx.mode.textbook} ${T}年版）",
  "chapter": "章題（30文字以内）",
  "body": "教科書本文。真面目な教科書の文体で、実在の人物・地名を使い、世紀ごとの改変の連鎖と${T}年の姿を300文字程度で。最後にブラックユーモアの効いた一文を。",
  "keywords": ["重要語句を3〜5個"],
  "sns": "SNS投稿用の文章（120文字以内、時代名と投下した単語を含め、#WORDROP #歴史改変 のハッシュタグ付き）"
}`;
  }

  /* ================= 応答の検証（足りない文章をローカルで補うことはしない） ================= */
  const pickEnum = (v, l) => (typeof v === 'string' && l.includes(v) ? v : null);
  const items = (arr) => (Array.isArray(arr) ? arr : [])
    .filter((a) => a && TYPES.includes(a.type)).slice(0, 3)
    .map((a) => ({ type: a.type, count: clampInt(a.count || 1, 1, 2) }));
  const mapOf = (m) => {
    m = m || {};
    return { add: items(m.add), remove: items(m.remove), sky: pickEnum(m.sky, WD.SKIES), sea: pickEnum(m.sea, WD.SEAS), land: pickEnum(m.land, WD.LANDS), weather: pickEnum(m.weather, WD.WEATHERS) };
  };
  const need = (cond, what, raw) => {
    if (!cond) throw new AIError('format', 'Gemini の応答 JSON が不完全です：' + what, JSON.stringify(raw).slice(0, 300));
  };

  function validateDrop(raw) {
    need(raw && typeof raw === 'object', 'オブジェクトではありません', raw);
    const events = (Array.isArray(raw.events) ? raw.events : [])
      .map((x) => x && { offset: Number(x.offset), text: cleanText(x.text), say: clipSay(x.say), delta: x.delta || {}, map: x.map })
      .filter((x) => x && WD.EVENT_OFFSETS.includes(x.offset) && x.text)
      .filter((x, i, a) => a.findIndex((y) => y.offset === x.offset) === i)
      .sort((a, b) => a.offset - b.offset)
      .map((x) => ({
        offset: x.offset, stage: WD.stageOf(x.offset).key, text: x.text.slice(0, 180), say: x.say,
        delta: { population: clampInt(x.delta.population, -12, 12), technology: clampInt(x.delta.technology, -12, 12), order: clampInt(x.delta.order, -12, 12), distortion: clampInt(x.delta.distortion, -5, 12) },
        map: mapOf(x.map),
      }));
    need(events.length >= 8, 'events が ' + events.length + ' 件しかありません（' + WD.EVENT_OFFSETS.length + '件必要）', raw);
    const murmurs = (Array.isArray(raw.murmurs) ? raw.murmurs : [])
      .map((m) => m && { month: clampInt(m.month, 1, 179), text: cleanText(m.text).slice(0, 100), say: clipSay(m.say) })
      .filter((m) => m && m.text);
    need(murmurs.length >= WD.MURMUR_COUNT[0], 'murmurs が ' + murmurs.length + ' 件しかありません（' + WD.MURMUR_COUNT[1] + '件必要）', raw);
    const mutants = (Array.isArray(raw.mutant_objects) ? raw.mutant_objects : [])
      .map((m) => m && { year: clampInt(m.year, 0, 15), category: WD.MUTANT_ALIAS[m.category] || m.category, text: cleanText(m.text).slice(0, 160), say: clipSay(m.say) })
      .filter((m) => m && WD.MUTANTS[m.category])
      .slice(0, 6);
    need(String(raw.title || '').trim(), 'title がありません', raw);
    return { title: String(raw.title).trim().slice(0, 30), events, murmurs, mutants };
  }

  function validateHistory(raw) {
    need(raw && typeof raw === 'object', 'オブジェクトではありません', raw);
    const text = cleanText(raw.text);
    need(text, 'text がありません', raw);
    need(String(raw.title || '').trim(), 'title がありません', raw);
    const d = raw.delta || {};
    return {
      title: String(raw.title).trim().slice(0, 40),
      text: text.slice(0, 200),
      say: clipSay(raw.say),
      delta: { population: clampInt(d.population, -20, 20), technology: clampInt(d.technology, -20, 20), order: clampInt(d.order, -20, 20), distortion: clampInt(d.distortion, -5, 15) },
      map: mapOf(raw.map),
    };
  }

  function validateFinale(raw) {
    need(raw && typeof raw === 'object', 'オブジェクトではありません', raw);
    need(raw.body && raw.chapter, 'chapter / body がありません', raw);
    need(raw.sns, 'sns がありません', raw);
    return {
      title: String(raw.title || '').slice(0, 40),
      chapter: String(raw.chapter).slice(0, 60),
      body: String(raw.body).slice(0, 700),
      keywords: (Array.isArray(raw.keywords) ? raw.keywords : []).slice(0, 6).map((k) => String(k).slice(0, 30)),
      sns: String(raw.sns).slice(0, 280),
    };
  }

  /* ================= 公開 API（通信の状態を画面に知らせる） ================= */
  async function run(settings, prompt, validate) {
    const route = routeOf(settings);
    WD.Oracle.status = { state: 'pending', route };
    if (WD.Oracle.onStatus) WD.Oracle.onStatus(WD.Oracle.status);
    try {
      const result = validate(await callGemini(settings, prompt));
      WD.Oracle.status = { state: 'ok', route, at: Date.now() };
      return result;
    } catch (e) {
      const err = e instanceof AIError ? e : new AIError('format', '応答の処理中にエラーが起きました：' + (e.message || e));
      WD.Oracle.status = { state: 'error', route, error: err };
      throw err;
    } finally {
      if (WD.Oracle.onStatus) WD.Oracle.onStatus(WD.Oracle.status);
    }
  }

  WD.Oracle = {
    status: { state: 'idle', route: 'worker' },
    onStatus: null,
    drop: (ctx, settings) => run(settings, dropPrompt(ctx), validateDrop),
    history: (ctx, settings) => run(settings, historyPrompt(ctx), validateHistory),
    finale: (ctx, settings) => run(settings, finalePrompt(ctx), validateFinale),
    test: (settings) => run(settings, '次のJSONをそのまま返してください: {"ok": true, "message": "WORDROP接続成功"}', (r) => r),
  };
})();
