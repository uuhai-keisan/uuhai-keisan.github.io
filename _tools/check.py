# -*- coding: utf-8 -*-
"""公開前の機械検査。build.py の後に実行する。  python _tools/check.py [--allow-drafts]

量産しても薄いページ・壊れたページを出さないための最低ライン(概念レビュー5名一致の条件)を検査する:
- 仕様: 解説・計算例・FAQ(3問以上)・共有文の差し込み・テスト3件以上がそろっているか
- 日付3信号(可視「最終更新」・JSON-LD dateModified・sitemap lastmod)の一致
- 内部リンク切れ、JSON-LDの構文、titleの重複
- 入力値をURLに載せる実装が紛れていないか(location.search/hash への書き込み)
- 下書き(draft)が残っていないか(--allow-drafts で警告のみ)
"""
import glob
import json
import os
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(APP, '_src')
errors, warnings = [], []


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def text_len(html_str):
    return len(re.sub(r'<[^>]+>|\s', '', html_str))


site = json.loads(read(os.path.join(SRC, 'site.json')))
live_count = sum(1 for p in glob.glob(os.path.join(SRC, 'tools', '*', 'spec.json')) if not json.loads(read(p)).get('draft'))
if live_count == 0 and '--allow-drafts' not in sys.argv:
    errors.append('公開するツールが0本(トップが「準備中」のままpushしない)')
sitemap = read(os.path.join(APP, 'sitemap.xml'))
lastmods = dict(re.findall(r'<loc>([^<]+)</loc><lastmod>([^<]+)</lastmod>', sitemap))
titles = {}

for spec_path in sorted(glob.glob(os.path.join(SRC, 'tools', '*', 'spec.json'))):
    spec = json.loads(read(spec_path))
    slug = spec['slug']
    tag = f'[{slug}]'
    if spec.get('draft'):
        (warnings if '--allow-drafts' in sys.argv else errors).append(f'{tag} 下書きのまま(draft: true)')

    # 中身の最低ライン(テンプレの数値差し替えだけのページにしない)
    for key, minimum in (('formula_html', 80), ('example_html', 40), ('howto_html', 30)):
        if text_len(spec.get(key, '')) < minimum:
            errors.append(f'{tag} {key} が短すぎる({text_len(spec.get(key, ""))}字 < {minimum}字)')
    if len(spec.get('faq', [])) < 3:
        errors.append(f'{tag} FAQが3問未満')
    if not spec.get('sources'):
        warnings.append(f'{tag} 出典なし(四則演算だけのツールならOK。事実・制度・相場を含むなら出典必須)')
    placeholders = re.findall(r'\{(\w+)\}', spec.get('share', ''))
    if not placeholders:
        errors.append(f'{tag} 共有文に結果の差し込み({{...}})がない')

    page_path = os.path.join(APP, slug, 'index.html')
    if not os.path.exists(page_path):
        errors.append(f'{tag} 未生成(build.pyを実行)')
        continue
    page = read(page_path)

    # 日付3信号
    visible = re.search(r'最終更新: <time datetime="([\d-]+)"', page)
    modified = re.search(r'"dateModified": "([\d-]+)"', page)
    url = f"{site['base_url']}{slug}/"
    signals = {'可視': visible and visible.group(1), 'JSON-LD': modified and modified.group(1)}
    if not spec.get('draft'):
        signals['sitemap'] = lastmods.get(url)
    if len(set(signals.values())) != 1 or None in signals.values():
        errors.append(f'{tag} 日付3信号が不一致: {signals}')

    title = re.search(r'<title>([^<]+)</title>', page).group(1)
    if title in titles:
        errors.append(f'{tag} titleが{titles[title]}と重複')
    titles[title] = slug

# 全HTML共通: リンク切れ・JSON-LD構文
pages = [os.path.join(APP, 'index.html')] + sorted(glob.glob(os.path.join(APP, '*', 'index.html')))
for page_path in pages:
    page = read(page_path)
    rel = os.path.relpath(page_path, APP)
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S):
        try:
            json.loads(block)
        except json.JSONDecodeError as e:
            errors.append(f'[{rel}] JSON-LDの構文エラー: {e}')
    for og in re.findall(r'<meta property="og:image" content="([^"]+)"', page):
        local = os.path.join(APP, og.replace(site['base_url'], '').replace('/', os.sep))
        if not og.startswith(site['base_url']) or not os.path.exists(local):
            errors.append(f'[{rel}] og:imageの画像がない: {og}')
    for ref in re.findall(r'(?:href|src)="([^"#]+)', page):
        if re.match(r'(https?:|data:|mailto:|//)', ref):
            continue
        target = os.path.normpath(os.path.join(os.path.dirname(page_path), ref.split('?')[0]))
        if os.path.isdir(target):
            target = os.path.join(target, 'index.html')
        if not os.path.exists(target):
            errors.append(f'[{rel}] リンク切れ: {ref}')

# 入力値をURLに載せない(GA4にURLとして記録されるため)
for js in glob.glob(os.path.join(APP, 'assets', '*.js')) + glob.glob(os.path.join(SRC, 'tools', '*', 'calc.js')):
    src = read(js)
    if re.search(r'(location\.(hash|search)\s*=|history\.(push|replace)State)', src):
        errors.append(f'[{os.path.relpath(js, APP)}] URLを書き換える処理がある(入力値をURLに載せない)')

for w in warnings:
    print('注意', w)
for e in errors:
    print('NG  ', e)
print(f'NG {len(errors)}件 / 注意 {len(warnings)}件')
sys.exit(1 if errors else 0)
