// 描画前に手動テーマを反映する(ちらつき防止のため<head>内で同期読み込み)。
try { var t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
