// tests-run.mjs — run the data-structure tests in a terminal: node tests-run.mjs
import { runAll } from './tests.js';
const results = runAll({});
for (const r of results) console.log(`${r.pass ? 'PASS' : 'FAIL'} [${r.kind}] ${r.name}${r.pass ? '' : `\n     ${r.error}`}`);
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed} of ${results.length} passed.`);
process.exit(failed ? 1 : 0);
