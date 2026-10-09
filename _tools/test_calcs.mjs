// 各ツールの calc.js を tests.json の期待値で検証する。  node _tools/test_calcs.mjs
// expect は { value } / { error: true } / { details: { 項目: 値 } } の組み合わせ。
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '_src', 'tools');
let failed = 0, passed = 0;

for (const slug of fs.readdirSync(root).sort()) {
  const dir = path.join(root, slug);
  const testsPath = path.join(dir, 'tests.json');
  if (!fs.existsSync(testsPath)) { console.log(`NG ${slug}: tests.json がありません`); failed++; continue; }
  const sandbox = {};
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'calc.js'), 'utf8'), sandbox);
  const tests = JSON.parse(fs.readFileSync(testsPath, 'utf8'));
  if (tests.length < 3) { console.log(`NG ${slug}: テストは3件以上必要`); failed++; }
  for (const t of tests) {
    const r = sandbox.CALC.compute(t.input, { today: t.today });
    const problems = [];
    if (t.expect.error) { if (!r.error) problems.push('エラーになるはずが結果が出た'); }
    else {
      if (r.error) problems.push(`エラー: ${r.error}`);
      if ('value' in t.expect && r.value !== t.expect.value) problems.push(`value ${r.value} != ${t.expect.value}`);
      for (const [k, want] of Object.entries(t.expect.details || {})) {
        const got = (r.details || []).find(([name]) => name === k)?.[1];
        if (got !== want) problems.push(`${k}: ${got} != ${want}`);
      }
    }
    if (problems.length) { failed++; console.log(`NG ${slug} / ${t.name}: ${problems.join(', ')}`); }
    else passed++;
  }
}
console.log(`${passed}件OK / ${failed}件NG`);
process.exit(failed ? 1 : 0);
