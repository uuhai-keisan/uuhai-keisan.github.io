// build.py から呼ばれ、calc.js を使って早見表のセルを計算する。
//   node _tools/table.mjs <calc.jsのパス> <today YYYY-MM-DD>   (標準入力に表の定義JSON)
// 定義: { base: {...}, rows: {input, values}, cols: {input, values}, offset_days?: "入力名" }
// offset_days に指定した入力は、値を「今日から何日後」として日付に変換して渡す。
// cell に結果の明細の項目名を指定すると、value の代わりにその明細の値を表に出す。
// 出力: [[セル文字列, ...], ...](行×列)。エラーになるセルは "—"。
import fs from 'node:fs';
import vm from 'node:vm';

const [calcPath, today] = process.argv.slice(2);
const def = JSON.parse(fs.readFileSync(0, 'utf8'));
const sandbox = {};
sandbox.globalThis = sandbox;
vm.runInNewContext(fs.readFileSync(calcPath, 'utf8'), sandbox);

const addDays = (iso, n) => {
  const d = new Date(Date.parse(iso));
  d.setUTCDate(d.getUTCDate() + Number(n));
  return d.toISOString().slice(0, 10);
};
const fmt = (r) => {
  if (!r || r.error) return '—';
  if (def.cell) return (r.details || []).find(([k]) => k === def.cell)?.[1] ?? '—';
  const v = typeof r.value === 'number' ? r.value.toLocaleString('ja-JP') : r.value;
  return `${v}${r.unit && !r.unit.startsWith('/') ? r.unit : ''}`;
};

const cells = def.rows.values.map((rv) => def.cols.values.map((cv) => {
  const input = { ...def.base, [def.rows.input]: rv, [def.cols.input]: cv };
  if (def.offset_days) input[def.offset_days] = addDays(today, input[def.offset_days]);
  try { return fmt(sandbox.CALC.compute(input, { today })); } catch (e) { return '—'; }
}));
process.stdout.write(JSON.stringify(cells));
