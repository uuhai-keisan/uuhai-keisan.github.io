# -*- coding: utf-8 -*-
"""_src/ の仕様からサイト全体を生成する。手で編集するのは _src/ と assets/ だけ。

    python _tools/build.py

- _src/tools/<slug>/spec.json + calc.js → <slug>/index.html と <slug>/calc.js
- トップ(index.html)・about/・sitemap.xml・robots.txt・og/(シェア用画像)
- 早見表: spec.json の table を、calc.js で計算して表にする(node _tools/table.mjs を呼ぶ)
- CSS/JSの読み込みURLに内容ハッシュ(?v=)を付ける(GitHub Pagesのキャッシュ10分対策、相場ノートのstamp_assetsと同じ考え方)
- 日付3信号(可視「最終更新」・JSON-LD dateModified・sitemap lastmod)は spec.json の updated 1か所から出すので食い違わない
- "draft": true のツールは noindex で生成し、トップ・関連リンク・sitemap には載せない
"""
import datetime
import hashlib
import html
import json
import os
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(APP, '_src')
esc = html.escape


def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)


def asset_hash(path):
    with open(path, 'rb') as f:
        return hashlib.sha1(f.read().replace(b'\r\n', b'\n')).hexdigest()[:8]


SITE = load_json(os.path.join(SRC, 'site.json'))
BASE = SITE['base_url']
X_URL = f"https://x.com/{SITE['x_handle']}"
X_ICON = ('<svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" '
          'd="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08'
          'l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>')


def load_tools():
    tools = []
    root = os.path.join(SRC, 'tools')
    for slug in sorted(os.listdir(root)):
        spec = load_json(os.path.join(root, slug, 'spec.json'))
        assert spec['slug'] == slug, f'slugとフォルダ名が不一致: {slug}'
        assert spec['category'] in SITE['categories'], f'未定義のカテゴリ: {slug}'
        spec['_dir'] = os.path.join(root, slug)
        tools.append(spec)
    return tools


def jp_date(iso):
    y, m, d = iso.split('-')
    return f'{int(y)}年{int(m)}月{int(d)}日'


def ld(obj):
    return '<script type="application/ld+json">\n' + json.dumps(obj, ensure_ascii=False, indent=2) + '\n</script>'


# ---- シェア用画像(OGP 1200x630) ----
OG_FONT_B = 'C:/Windows/Fonts/YuGothB.ttc'
OG_FONT_M = 'C:/Windows/Fonts/YuGothM.ttc'


def wrap(draw, text, font, width):
    lines, line = [], ''
    for ch in text:
        if draw.textlength(line + ch, font=font) > width:
            lines.append(line)
            line = ch
        else:
            line += ch
    return lines + [line] if line else lines


def make_og(path, title, sub):
    img = Image.new('RGB', (1200, 630), '#f7f7f4')
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 1200, 14], fill='#0b6e5f')
    d.rounded_rectangle([60, 70, 1140, 560], radius=36, fill='#ffffff', outline='#e1e3e0', width=3)
    size = 76
    while True:
        f = ImageFont.truetype(OG_FONT_B, size)
        lines = wrap(d, title, f, 960)
        if len(lines) <= 3 or size <= 52:
            break
        size -= 6
    y = 300 - len(lines) * (size + 18) // 2
    for line in lines:
        d.text((120, y), line, font=f, fill='#1f2328')
        y += size + 18
    fs = ImageFont.truetype(OG_FONT_M, 34)
    d.text((120, 470), sub, font=fs, fill='#0b6e5f')
    d.text((1080, 470), f"@{SITE['x_handle']}", font=fs, fill='#59616b', anchor='ra')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)


def head(title, description, canonical, prefix, og_image, noindex=False, extra=''):
    a = lambda name: f'{prefix}assets/{name}?v={asset_hash(os.path.join(APP, "assets", name))}'
    robots = '<meta name="robots" content="noindex">\n' if noindex else ''
    return f'''<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-hashes' 'sha256-zLXvjLa9sIHSxNVWxionB3S4ohIwc94xIEu4u3pfU5g='; img-src 'self' data: https://www.googletagmanager.com; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com; object-src 'none'; base-uri 'self'; form-action 'self'">
{robots}<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{esc(SITE['name'])}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:url" content="{canonical}">
<meta property="og:locale" content="ja_JP">
<meta property="og:image" content="{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@{SITE['x_handle']}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%A7%AE%3C/text%3E%3C/svg%3E">
<meta name="theme-color" content="#f7f7f4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15181b" media="(prefers-color-scheme: dark)">
<script src="{a('theme-init.js')}"></script>
<link rel="stylesheet" href="{a('style.css')}">
{extra}</head>
<body data-ga="{SITE['ga_id']}" data-x="{SITE['x_handle']}">
<a class="skip-link" href="#main">本文へスキップ</a>
<header class="site-header"><div class="wrap">
  <a class="site-logo" href="{prefix or './'}">uuhai<span>計算帳</span></a>
  <button class="theme-btn" id="theme-btn" type="button" aria-label="ダークモードに切り替え">🌓</button>
</div></header>
'''


def foot(prefix, scripts=(), note=''):
    a = lambda name: f'{prefix}assets/{name}?v={asset_hash(os.path.join(APP, "assets", name))}'
    tags = ''.join(f'<script src="{s}"></script>\n' for s in scripts)
    return f'''<footer class="site-footer"><div class="wrap">
  {note}<p>計算結果は入力値にもとづく目安です。大事な判断の前には、公式の情報もあわせて確認してください。文章の作成にAIを活用しています。</p>
  <p><a href="{prefix}about/">運営者・プライバシーポリシー</a> / 運営: <a href="{X_URL}" rel="noopener" data-track="follow_click">@{SITE['x_handle']}</a></p>
  <p>同じ作者のサイト: <a href="https://uuhai0625.github.io/life-event-calculators/" data-track="sister_click">相場ノート(ご祝儀・香典の相場)</a> / <a href="https://uuhai0625.github.io/side-hustle-calculators/" data-track="sister_click">AI副業そろばん</a> / <a href="https://uuhai0625.github.io/" data-track="sister_click">作品一覧</a></p>
</div></footer>
{tags}<script src="{a('site.js')}"></script>
</body>
</html>
'''


def field_html(f):
    fid, label = f['id'], esc(f['label'])
    cls = 'field field-half' if f.get('half') else 'field'
    if f['type'] == 'select' and len(f['options']) <= 5 and f.get('control') != 'select':
        # 選択肢が少ない項目はボタン並び(中身はラジオボタンなので矢印キーでも選べる)
        opts = ''.join(
            f'<label class="seg-opt"><input type="radio" name="{fid}" value="{esc(v)}"'
            f'{" checked" if v == f.get("default") else ""}><span>{esc(t)}</span></label>'
            for v, t in f['options'])
        return f'<fieldset class="{cls}"><legend>{label}</legend><div class="seg">{opts}</div></fieldset>'
    if f['type'] == 'select':
        opts = ''.join(
            f'<option value="{esc(v)}"{" selected" if v == f.get("default") else ""}>{esc(t)}</option>'
            for v, t in f['options'])
        return f'<div class="{cls}"><label for="in-{fid}">{label}</label><select id="in-{fid}" name="{fid}">{opts}</select></div>'

    attrs = [f'type="{f["type"]}"', f'id="in-{fid}"', f'name="{fid}"']
    if f['type'] == 'number':
        attrs.append('inputmode="decimal"' if '.' in str(f.get('step', '')) else 'inputmode="numeric"')
        for k in ('min', 'max', 'step'):
            if k in f:
                attrs.append(f'{k}="{f[k]}"')
    if 'default' in f:
        attrs.append(f'value="{esc(str(f["default"]))}"')
    if 'default_offset_days' in f:
        attrs.append(f'data-offset-days="{f["default_offset_days"]}"')
    if 'placeholder' in f:
        attrs.append(f'placeholder="{esc(f["placeholder"])}"')
    unit = f.get('unit')
    unit_sr = f'<span class="sr-only">(単位: {esc(unit)})</span>' if unit else ''
    unit_html = f'<span class="unit" aria-hidden="true">{esc(unit)}</span>' if unit else ''
    wrap_cls = 'input-wrap has-unit' if unit else 'input-wrap'
    return (f'<div class="{cls}"><label for="in-{fid}">{label}{unit_sr}</label>'
            f'<div class="{wrap_cls}"><input {" ".join(attrs)}>{unit_html}</div></div>')


def table_html(t, today):
    spec = t.get('table')
    if not spec:
        return ''
    res = subprocess.run(['node', os.path.join(APP, '_tools', 'table.mjs'), os.path.join(t['_dir'], 'calc.js'), today],
                         input=json.dumps(spec, ensure_ascii=False), capture_output=True, text=True, encoding='utf-8', check=True)
    cells = json.loads(res.stdout)
    head_row = ''.join(f'<th scope="col">{esc(c)}</th>' for c in spec['cols']['labels'])
    body = ''.join(
        f'<tr><th scope="row">{esc(rl)}</th>' + ''.join(f'<td>{esc(c)}</td>' for c in row) + '</tr>'
        for rl, row in zip(spec['rows']['labels'], cells))
    return f'''
    <h2>{esc(t['kw'])}の早見表</h2>
    <p>{esc(spec['note'])}</p>
    <div class="table-scroll" tabindex="0" role="region" aria-label="{esc(spec['title'])}">
      <table class="quick-table"><caption>{esc(spec['title'])}</caption>
        <thead><tr><th scope="col">{esc(spec['corner'])}</th>{head_row}</tr></thead>
        <tbody>{body}</tbody>
      </table>
    </div>'''


def tool_page(t, tools, today):
    url = f'{BASE}{t["slug"]}/'
    # 関連リンク: 同じカテゴリは全部、残りの枠はページごとに開始位置をずらして選ぶ(被リンクの偏りを防ぐ)
    live = [o for o in tools if not o.get('draft')]
    same = [o for o in live if o is not t and o['category'] == t['category']]
    others = [o for o in live if o['category'] != t['category']]
    if others:
        k = (live.index(t) if t in live else 0) % len(others)
        others = others[k:] + others[:k]
    related = same + others
    related_html = ''.join(
        f'<li><a href="../{o["slug"]}/">{o["icon"]} {esc(o["h1"])}</a></li>' for o in related[:8])
    faq_html = ''.join(
        f'<details><summary>{esc(q["q"])}</summary><p>{esc(q["a"])}</p></details>' for q in t['faq'])
    if t['sources']:
        src_html = '<ul class="sources">' + ''.join(
            f'<li><a href="{esc(s["url"])}" rel="noopener">{esc(s["name"])}</a>'
            + (f'({esc(s["note"])})' if s.get('note') else '') + '</li>' for s in t['sources']) + '</ul>'
    else:
        src_html = '<p>この計算は入力値どうしの四則演算だけで、外部のデータは使っていません。</p>'

    schema = [
        ld({
            '@context': 'https://schema.org', '@type': 'WebApplication',
            'name': t['h1'], 'url': url, 'description': t['description'],
            'applicationCategory': 'UtilitiesApplication', 'operatingSystem': 'Any',
            'inLanguage': 'ja', 'dateModified': t['updated'], 'isAccessibleForFree': True,
            'offers': {'@type': 'Offer', 'price': 0, 'priceCurrency': 'JPY'},
            'author': {'@type': 'Person', 'name': SITE['operator'], 'url': X_URL},
        }),
        ld({
            '@context': 'https://schema.org', '@type': 'BreadcrumbList',
            'itemListElement': [
                {'@type': 'ListItem', 'position': 1, 'name': SITE['name'], 'item': BASE},
                {'@type': 'ListItem', 'position': 2, 'name': t['h1'], 'item': url},
            ],
        }),
    ]
    make_og(os.path.join(APP, 'og', f'{t["slug"]}.png'), t['h1'], SITE['name'])
    calc_v = asset_hash(os.path.join(t['_dir'], 'calc.js'))
    # 結果の下のリンク。rakutenは楽天アフィリエイトの「URLからリンク作成」で作ったHTMLをそのまま段階ごとに埋め込み、
    # 結果に合う段階だけを表示する(規約上、生成されたHTMLはリンクの文言以外を変えない。計測はリンクの外側で拾う)。urlなら普通のリンク
    shop = t.get('shop') or {}
    rk = shop.get('rakuten')
    shop_html = ''
    if rk:
        missing = [k for k, h in rk['links'].items() if not h.strip()]
        if missing:
            sys.exit(f"{t['slug']}: 楽天のリンクが未作成の段階があります: {', '.join(missing)}")
        items = ''.join(f'<span class="shop-item" data-key="{esc(k)}" hidden>{h}</span>' for k, h in rk['links'].items())
        shop_html = f'''
        <div class="shop" id="shop" data-by="{esc(rk['by'])}" hidden>
          <p class="shop-link"><span class="pr-badge">PR</span>{items}</p>
          <p class="shop-note">楽天市場の検索結果が新しいタブで開きます。検索語には結果の数字が入ります。</p>
        </div>'''
    elif shop:
        shop_html = f'''
        <p class="shop shop-plain"><a href="{esc(shop['url'])}" data-track="shop_click">{esc(shop['text'])}</a></p>'''
    pr_note = ('<p>このページには楽天アフィリエイトの紹介リンクがあり、「PR」と表示しています。リンク先で購入されると運営者に紹介料が入ることがあります。計算結果には影響しません。</p>\n  '
               if rk else '')
    pr_top = '\n  <p class="pr-top">このページには広告(PR)を含みます。</p>' if rk else ''
    # 買う前に確認すること(spec.jsonのchecks)。結果の次に読む位置に置く
    ck = t.get('checks')
    checks_html = ''
    if ck:
        items = ''.join(f'<li><h3>{esc(i["h"])}</h3>{i["html"]}</li>' for i in ck['items'])
        checks_html = f'''
    <h2>{esc(ck['title'])}</h2>
    <ol class="checks">{items}</ol>'''
    privacy = ('シェアボタンか、楽天市場へのリンク(PR)を押したときだけ、結果の数字が相手先に渡ります。' if rk
               else 'シェアボタンを押したときだけ、結果の一文がXの投稿画面に渡ります。')
    body = f'''<main class="wrap" id="main">
  <nav class="breadcrumb" aria-label="パンくずリスト"><a href="../">{esc(SITE['name'])}</a> › <span aria-current="page">{esc(t['h1'])}</span></nav>
  <h1>{esc(t['h1'])}</h1>
  <p class="lead">{esc(t['description'])}</p>
  <p class="updated">最終更新: <time datetime="{t['updated']}">{jp_date(t['updated'])}</time></p>{pr_top}
  <p class="tldr">{esc(t['tldr'])}</p>
  <p class="privacy-note">🔒 入力した数字はこの端末の中だけで計算し、サーバーには送りません。{privacy}</p>

  <div class="calc">
    <form class="card calc-input" id="calc-form" method="dialog" data-share="{esc(t['share'])}" novalidate>
      {''.join(field_html(f) for f in t['inputs'])}
      <button class="btn btn-block btn-calc" type="submit">結果を見る</button>
    </form>
    <section class="calc-output" aria-label="計算結果">
      <div class="result-card" id="result-card">
        <p class="result-placeholder" id="result-placeholder">数字を入れると、ここに結果が出ます。</p>
        <p class="result-error" id="result-error" hidden></p>
        <div id="result" hidden>
          <p class="result-example" id="result-example" hidden>例の値で計算しています。自分の数字に変えてみてください。</p>
          <p class="result-label" id="result-label"></p>
          <p class="result-main"><span class="result-value" id="result-value"></span><span class="result-unit" id="result-unit"></span></p>
          <dl class="result-details" id="result-details"></dl>
          <p class="result-note" id="result-note" hidden></p>
        </div>
      </div>
      <div class="result-actions" id="result-actions" hidden>
        <button class="btn btn-x" type="button" id="share-btn">{X_ICON}この結果をXにポスト</button>
        <button class="btn btn-sub" type="button" id="copy-btn">結果をコピー</button>
        <p class="share-sub">URLに入力した数字は含まれません。投稿文はXの画面で確認・編集できます。</p>
        <p class="maker">作った人: <a href="{X_URL}" rel="noopener" data-track="follow_click">@{SITE['x_handle']}</a>(個人開発)</p>{shop_html}
      </div>
      <p class="sr-only" id="result-live" aria-live="polite"></p>
    </section>
  </div>

  <section class="content">{checks_html}
    <h2>{esc(t['kw'])}計算の使い方</h2>
    {t['howto_html']}
    <h2>{esc(t['kw'])}の計算式</h2>
    {t['formula_html']}
    <h2>{esc(t['kw'])}の計算例</h2>
    {t['example_html']}{table_html(t, today)}
    <h2>{esc(t['kw'])}のよくある質問</h2>
    <div class="faq">{faq_html}</div>
    <h2>出典・前提</h2>
    {src_html}
  </section>
''' + (f'''
  <section class="content">
    <h2>ほかの計算ツール</h2>
    <ul class="related">{related_html}</ul>
  </section>
''' if related_html else '') + '</main>\n'
    return (head(t['title'], t['description'], url, '../', f'{BASE}og/{t["slug"]}.png',
                 noindex=t.get('draft', False), extra='\n'.join(schema) + '\n')
            + body + foot('../', [f'calc.js?v={calc_v}'], pr_note))


def index_page(tools):
    live = [t for t in tools if not t.get('draft')]
    sections = ''
    for key, name in SITE['categories'].items():
        items = [t for t in live if t['category'] == key]
        if not items:
            continue
        lis = ''.join(f'<li><a href="{t["slug"]}/">{t["icon"]} {esc(t["h1"])}</a></li>' for t in items)
        sections += f'<h2 class="cat-title">{esc(name)}</h2><ul class="related">{lis}</ul>\n'
    if not sections:
        sections = '<p>準備中です。</p>'
    schema = ld({
        '@context': 'https://schema.org', '@type': 'WebSite', 'name': SITE['name'], 'url': BASE,
        'publisher': {'@type': 'Person', 'name': SITE['operator'], 'url': X_URL},
    })
    make_og(os.path.join(APP, 'og', 'site.png'), SITE['name'], '会社員の数字まわり・暮らしの計算ツール')
    body = f'''<main class="wrap" id="main">
  <section class="hero"><h1>{esc(SITE['name'])}</h1><p>{esc(SITE['tagline'])}</p>
    <p>{esc(SITE['intro'])}</p>
    <p class="privacy-note">🔒 どのツールも、入力した数字はこの端末の中だけで計算し、サーバーには送りません。</p></section>
  {sections}
</main>
'''
    # 公開ツールが0本のトップは中身がないので、検索に出さない
    return (head(f"{SITE['name']}|無料の計算ツール集", SITE['tagline'] + SITE['intro'], BASE, '', f'{BASE}og/site.png', noindex=not live, extra=schema + '\n')
            + body + foot(''))


def about_page():
    body = f'''<main class="wrap" id="main">
  <h1>運営者・プライバシーポリシー</h1>
  <h2>運営者</h2>
  <p>{esc(SITE['name'])}は、個人の{esc(SITE['operator'])}(X: <a href="{X_URL}" rel="noopener" data-track="follow_click">@{SITE['x_handle']}</a>)が運営しています。AIを使った個人開発やLINEスタンプ、noteのことをXで書いています。ご連絡はXのDMでお願いします。</p>
  <h2>計算結果について</h2>
  <p>各ツールの計算結果は入力値にもとづく目安で、正確さを保証するものではありません。計算のしかたと前提は各ページに書いています。誤りに気づいた場合はお知らせください。</p>
  <h2>入力した内容の扱い</h2>
  <p>計算はすべてお使いのブラウザの中で行い、入力した数字をサーバーへ送ることはありません。ページのURLにも入力内容は含めません。</p>
  <p>「この結果をXにポスト」を押したときだけ、結果の一文とページのURLがXの投稿画面に渡ります(楽天市場へのリンクを押したときの扱いは次の「紹介(アフィリエイト)リンク」をご覧ください)。投稿するかどうかと文面は、Xの画面で確認・編集できます。「結果をコピー」は、お使いの端末のクリップボードにコピーするだけです。</p>
  <h2>紹介(アフィリエイト)リンク</h2>
  <p>一部のページには、楽天アフィリエイトの紹介リンクがあり、「PR」と表示しています。リンク先で商品を購入されると、運営者に紹介料が入ることがあります。紹介料の有無は計算結果に影響しません。リンクには、計算結果の数字(例: 洗濯機の「8kg」)を楽天市場の検索語として含めます。リンクを押したあとの楽天市場では、楽天のCookieが使われます。詳しくは<a href="https://privacy.rakuten.co.jp/" rel="noopener">楽天グループのプライバシーポリシー</a>をご覧ください。</p>
  <h2>端末に保存する情報</h2>
  <p>表示の設定(ライト/ダークモード)と、運営者が自分のアクセスを集計から外すための設定を、お使いのブラウザの中(localStorage)に保存することがあります。入力した数字は保存しません。</p>
  <h2>アクセス解析</h2>
  <p>サイト改善のため、Googleアナリティクスを使っています。Cookieを使って閲覧ページなどの情報を匿名で集めますが、個人を特定する情報は含みません。ブラウザの設定でCookieを無効にできます。詳しくは<a href="https://policies.google.com/technologies/partner-sites?hl=ja" rel="noopener">Googleのポリシー</a>をご覧ください。紹介リンクが押された回数も記録しますが、計算結果の数字は送りません。</p>
</main>
'''
    return head(f"運営者・プライバシーポリシー|{SITE['name']}", f"{SITE['name']}の運営者情報とプライバシーポリシー。",
                f'{BASE}about/', '../', f'{BASE}og/site.png') + body + foot('../')


def main():
    today = datetime.date.today().isoformat()
    tools = load_tools()
    for t in tools:
        out = os.path.join(APP, t['slug'])
        write(os.path.join(out, 'index.html'), tool_page(t, tools, today))
        shutil.copyfile(os.path.join(t['_dir'], 'calc.js'), os.path.join(out, 'calc.js'))
    write(os.path.join(APP, 'index.html'), index_page(tools))
    write(os.path.join(APP, 'about', 'index.html'), about_page())

    live = [t for t in tools if not t.get('draft')]
    site_updated = max([t['updated'] for t in live], default=None)
    urls = ([(BASE, site_updated)] if site_updated else []) + [(f'{BASE}{t["slug"]}/', t['updated']) for t in live]
    sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    sitemap += ''.join(f'  <url><loc>{u}</loc><lastmod>{d}</lastmod></url>\n' for u, d in urls)
    sitemap += '</urlset>\n'
    write(os.path.join(APP, 'sitemap.xml'), sitemap)
    write(os.path.join(APP, 'robots.txt'), f'User-agent: *\nAllow: /\nSitemap: {BASE}sitemap.xml\n')

    drafts = [t['slug'] for t in tools if t.get('draft')]
    print(f'生成: 公開{len(live)}本 / 下書き{len(drafts)}本 {drafts if drafts else ""}')


if __name__ == '__main__':
    main()
