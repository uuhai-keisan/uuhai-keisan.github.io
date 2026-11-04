# uuhai計算帳

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
- 10/17以降に足すツールは spec に `"late": true`(最初の12本の関連リンクに入れない。トップとsitemapには載る)
- `725e701dc9cb54dd9576d164875403d2.txt` はIndexNow(Bing)の鍵で消さない。ページを足す・大きく直したら、そのURLを `api.indexnow.org/indexnow` に送る(host・key・keyLocation・urlList)

## 楽天(spec.json の `shop.rakuten`)

- `links` は楽天アフィリエイトの公式「URLからリンク作成」(計測ID keisan)の出力をそのまま貼る。`<a>` の属性・URLは変えない(規約)。変えてよいのはリンクの文言だけ
- `by` = 結果のどの値で段階を切り替えるか(空なら固定の検索語 `all`)。`keywords` = 段階ごとの検索語(商品カードの検索にも使う)
- `card` = 写真つき商品カード(楽天の商品検索API、最大3件)の絞り込み: `unit`(容量の単位の正規表現)・`span`(段階の幅)・`alias`・`single`(容量の数字が1種類の商品だけ)・`ng`(除外語)・`min`(最低価格)
- 商品名は加工しない(楽天ウェブサービス規約で取得した情報の改変は不可)。効能・順位・最上級の語を含む商品は `assets/site.js` の `CLAIMS` で出さない
- APIを使うページはフッターに楽天ウェブサービスの公式クレジットが入る(build.pyで自動)。APIの上限は1秒1回で相場ノートと共用

## 計測(GA4、`assets/site.js`)

- calc_result(入力を書き換えて結果が出た)・result_view(操作後に結果が画面に入った、edited)・shop_view・cards_result(cards_count・cards_status)・affiliate_click(link_type=text/card)・share_click・copy_click・follow_click
- localhost と `?no_ga=1` を付けて開いた端末では送らない。アフィリエイトのリンクは確認のために開かない(自分のクリックが記録される)
