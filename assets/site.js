// 全ページ共通: GA4・テーマ切替・計算フォームの配線・結果の共有/コピー・スマホの結果バー。
// 入力値はURL(クエリ・フラグメント)に一切載せない(GA4にページURLとして記録されるため。相場ノートでの実害の教訓)。
(function () {
  const body = document.body;
  const X_HANDLE = body.dataset.x || '';

  // ---- GA4(ローカル・?no_ga=1で自己除外した端末では読み込まない) ----
  let gtag = function () {};
  (function initGA() {
    const id = body.dataset.ga;
    try {
      if (new URLSearchParams(location.search).get('no_ga') === '1') localStorage.setItem('no_ga', '1');
      if (localStorage.getItem('no_ga') === '1') return;
    } catch (e) {}
    if (!id || ['localhost', '127.0.0.1', ''].includes(location.hostname)) return;
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    gtag = function () { window.dataLayer.push(arguments); };
    window.gtag = gtag;
    gtag('js', new Date());
    // 万一URLにクエリが付いていても送らない(入力値をGA4に記録しないため)
    gtag('config', id, { page_location: location.origin + location.pathname });
  })();

  // ---- テーマ切替(既定はOS追従、手動で選んだ時だけ記憶) ----
  (function initTheme() {
    const btn = document.getElementById('theme-btn');
    if (!btn) return;
    const root = document.documentElement;
    const isDark = () => root.dataset.theme === 'dark' ||
      (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    const label = () => {
      const t = root.dataset.theme;
      btn.textContent = t === 'dark' ? '☀️' : t === 'light' ? '🌙' : '🌓';
      btn.setAttribute('aria-label', isDark() ? 'ライトモードに切り替え' : 'ダークモードに切り替え');
    };
    btn.addEventListener('click', () => {
      root.dataset.theme = isDark() ? 'light' : 'dark';
      try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
      label();
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', label);
    label();
  })();

  // ---- 外部リンクのクリック計測(Xのプロフィール等) ----
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-track]');
    if (a) gtag('event', a.dataset.track, { page_path: location.pathname });
    // 楽天の紹介リンクは規約上タグに属性を足せないので、外側の.shop-itemで判定する
    else if (e.target.closest('.shop-item a')) gtag('event', 'affiliate_click', { page_path: location.pathname });
  });

  // ---- 計算フォーム ----
  const form = document.getElementById('calc-form');
  if (!form || !globalThis.CALC) return;
  const $ = (id) => document.getElementById(id);
  const out = {
    card: $('result-card'), placeholder: $('result-placeholder'), error: $('result-error'), result: $('result'),
    example: $('result-example'), label: $('result-label'), value: $('result-value'), unit: $('result-unit'),
    details: $('result-details'), note: $('result-note'), actions: $('result-actions'), live: $('result-live'),
  };
  const shareTemplate = form.dataset.share || '';
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => iso(new Date());

  // 日付の初期値は「今日から○日後」で入れる(固定日付だと古くなるため)
  for (const el of form.querySelectorAll('input[data-offset-days]')) {
    const d = new Date();
    d.setDate(d.getDate() + Number(el.dataset.offsetDays));
    el.value = iso(d);
  }

  function readValues() {
    const v = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'radio') { if (el.checked) v[el.name] = el.value; continue; }
      if (el.type === 'number') v[el.name] = el.value === '' ? null : Number(el.value);
      else v[el.name] = el.value;
    }
    return v;
  }
  // 必須の欄(任意と書かれた欄以外)に空欄があるか
  const hasEmpty = () => [...form.querySelectorAll('input[type=number], input[type=date]')]
    .some((el) => el.value === '' && !/任意/.test(form.querySelector(`label[for="${el.id}"]`)?.textContent || ''));

  let last = null;          // 直近の計算結果
  let shownError = '';      // 画面に出しているエラー文
  let userEdited = false;   // 初期値(例の値)から一度でも変えたか
  let reported = false;

  function show(state) {
    out.placeholder.hidden = state !== 'empty';
    out.error.hidden = state !== 'error';
    out.result.hidden = state !== 'ok';
    out.actions.hidden = state !== 'ok';
    out.card.classList.toggle('is-ok', state === 'ok');
  }

  // strict=false(入力中)は、空欄やエラーを赤字にせず「入力待ち」の表示にとどめる
  function update(strict) {
    let r;
    try { r = globalThis.CALC.compute(readValues(), { today: today() }); }
    catch (err) { r = { error: '計算できませんでした。入力を見直してください。' }; }
    last = r && !r.error ? r : null;
    if (!last) {
      if (strict && !(hasEmpty() && !userEdited)) {
        out.error.textContent = r.error;
        show('error');
        if (out.live.textContent !== r.error) out.live.textContent = r.error;
        shownError = r.error;
      } else {
        show('empty');
        shownError = '';
      }
      bar.render();
      return;
    }
    out.example.hidden = userEdited;
    out.label.textContent = r.label;
    out.value.textContent = typeof r.value === 'number' ? r.value.toLocaleString('ja-JP') : r.value;
    // 「都度払いが月2,200円安い」「2026年11月20日(金)」のような文字の結果は、数字用の特大サイズだと折り返すので小さくする
    out.value.classList.toggle('is-text', typeof r.value !== 'number' && String(r.value).length > 6);
    out.unit.textContent = r.unit || '';
    out.details.replaceChildren(...(r.details || []).map(([k, val]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = k;
      const dd = document.createElement('dd'); dd.textContent = val;
      row.append(dt, dd);
      return row;
    }));
    out.note.textContent = r.note || '';
    out.note.hidden = !r.note;
    show('ok');
    shownError = '';
    const liveText = `${r.label} ${out.value.textContent}${r.unit || ''}`;
    if (out.live.textContent !== liveText) out.live.textContent = liveText;
    renderShop(r);
    if (userEdited && !reported) { reported = true; gtag('event', 'calc_result', { page_path: location.pathname }); }
    bar.render();
  }

  // 楽天の紹介リンク(spec.jsonのshop.rakuten)。段階ごとに埋め込んだリンクのうち、計算結果(vars[data-by])に合う1本だけ表示する
  const shopEl = $('shop');
  function renderShop(r) {
    if (!shopEl) return;
    const key = String((r.vars || {})[shopEl.dataset.by]);
    let found = false;
    shopEl.querySelectorAll('.shop-item').forEach((el) => {
      el.hidden = el.dataset.key !== key;
      if (!el.hidden) found = true;
    });
    shopEl.hidden = !found;
  }

  form.addEventListener('input', () => { userEdited = true; update(false); });
  form.addEventListener('change', () => update(true));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    update(true);
    if (document.activeElement) document.activeElement.blur();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    out.card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  const resultText = () => [
    `${out.label.textContent}: ${out.value.textContent}${out.unit.textContent}`,
    ...[...out.details.querySelectorAll('div')].map((d) => `${d.querySelector('dt').textContent}: ${d.querySelector('dd').textContent}`),
  ].join('\n');
  const canonical = () => document.querySelector('link[rel="canonical"]').href;

  // 共有: 投稿文に結果の一文+ツール名 by @handle、URLはページの正規URL(入力値は含めない)
  $('share-btn').addEventListener('click', () => {
    if (!last) return;
    const line = shareTemplate.replace(/\{(\w+)\}/g, (_, k) => {
      const x = (last.vars || {})[k];
      return typeof x === 'number' ? x.toLocaleString('ja-JP') : (x ?? '');
    });
    const text = `${line}\n${document.title.split('|')[0]} by @${X_HANDLE}`;
    gtag('event', 'share_click', { page_path: location.pathname });
    window.open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(canonical()), '_blank', 'noopener');
  });

  // コピー: 結果の一覧+ページURL
  const copyBtn = $('copy-btn');
  copyBtn.addEventListener('click', async () => {
    if (!last) return;
    const text = `${resultText()}\n${document.title.split('|')[0]} ${canonical()}`;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e2) {}
      ta.remove();
    }
    copyBtn.textContent = ok ? 'コピーしました' : 'コピーできませんでした';
    out.live.textContent = copyBtn.textContent;
    setTimeout(() => { copyBtn.textContent = '結果をコピー'; }, 2000);
    gtag('event', 'copy_click', { page_path: location.pathname });
  });

  // ---- スマホの結果バー: 結果カードが画面より下にある間だけ、主な値を画面下に出す ----
  const bar = (function initBar() {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'result-bar';
    el.innerHTML = '<span class="result-bar-text"><span class="result-bar-label"></span><span class="result-bar-value"></span></span><span class="result-bar-go">結果を見る ↓</span>';
    document.body.appendChild(el);
    let below = false;
    const render = () => {
      el.classList.toggle('is-error', !!shownError);
      el.querySelector('.result-bar-go').textContent = shownError ? '確認する ↓' : '結果を見る ↓';
      el.querySelector('.result-bar-label').textContent = shownError ? '入力を確認してください' : last ? last.label : '';
      el.querySelector('.result-bar-value').textContent = shownError ? shownError : last ? `${out.value.textContent}${out.unit.textContent}` : '';
      el.classList.toggle('is-visible', (!!last || !!shownError) && below);
    };
    const position = () => {
      const rect = out.card.getBoundingClientRect();
      below = rect.height > 0 && rect.top >= window.innerHeight - 40;
      render();
    };
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; position(); });
    }, { passive: true });
    window.addEventListener('resize', position);
    new ResizeObserver(position).observe(out.card);
    el.addEventListener('click', () => {
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      out.card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      gtag('event', 'result_bar_click', { page_path: location.pathname });
    });
    return { render: position };
  })();

  update(false);
})();
