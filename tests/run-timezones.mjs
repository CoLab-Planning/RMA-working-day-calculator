import { spawnSync } from 'node:child_process';
for (const TZ of ['Pacific/Auckland','UTC','America/Los_Angeles','Europe/London']) {
  const run = spawnSync(process.execPath, ['--test','tests/calculator.test.mjs'], { env: {...process.env,TZ}, encoding:'utf8' });
  const summary=run.stdout.split('\n').filter(line=>/^(ℹ|#) (tests|pass|fail|duration)/.test(line));
  console.log(TZ, summary.join('; '));
  if(run.status!==0) { console.error(run.stdout,run.stderr); process.exit(run.status||1); }
}
