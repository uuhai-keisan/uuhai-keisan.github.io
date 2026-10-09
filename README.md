# uuhai計算帳(仮)

公開URL: https://uuhai-keisan.github.io/ (GitHub Pages、Org `uuhai-keisan`)

## 構成

手で編集するのは `_src/` と `assets/` だけ。それ以外(各ツールの `index.html`・トップ・about・sitemap・robots)は生成物。

```
_src/site.json                サイト名・URL・Xハンドル・GA4 ID・カテゴリ
_src/tools/<slug>/spec.json   1ツールの仕様(入力欄・本文・FAQ・出典・共有文)
_src/tools/<slug>/calc.js     計算式(純粋関数 compute(v, {today}))
_src/tools/<slug>/tests.json  計算式のテスト(3件以上)
assets/                       共通CSS/JS
_tools/                       build.py / test_calcs.mjs / check.py
```

`_` で始まるフォルダはGitHub Pages(Jekyll)で公開されない。

## ツールを1本追加する手順

1. `_src/tools/<slug>/` に spec.json・calc.js・tests.json を作る(既存ツールをコピー)。最初は `"draft": true`
2. `python _tools/build.py` → `node _tools/test_calcs.mjs` → `python _tools/check.py --allow-drafts`
3. ローカル表示で確認(`python -m http.server 8765 --bind 127.0.0.1`、確認後はPIDで停止)
4. 公開するときは `"draft"` を消し、`updated` を実日付にして再ビルド → `python _tools/check.py`(--allow-drafts なし)がNG 0件
5. push前に `gh api user -q .login` が `uuhai0625` であることを確認

## 初回公開の手順(順番を守る)

- 公開するツールの `draft` を外してビルドし、`check.py`(--allow-drafts なし)がNG 0件になってから最初のpushをする。「準備中」のトップを先に出さない(公開0本のトップは自動でnoindexになるが、それでも先に出さない)
- コミットの作者メールはGitHubのnoreplyアドレス(このリポジトリのローカル設定済み)。個人のメールアドレスを履歴に残さない

## 守ること

- 入力値をURL(クエリ・フラグメント)に載せない。GA4にURLとして記録されるため(check.pyで検出)
- 日付は spec.json の `updated` 1か所だけを変える(可視・JSON-LD・sitemapに同じ値が出る)
- 税・医療・投資・保険・薬・妊娠週数は扱わない
- 事実・制度・相場を含むツールは `sources` に出典を書く
