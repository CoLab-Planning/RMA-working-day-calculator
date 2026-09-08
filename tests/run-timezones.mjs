// Copyright (c) 2024-2026 CoLab Planning Limited
// SPDX-License-Identifier: MPL-2.0
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { spawnSync } from 'node:child_process';
for (const TZ of ['Pacific/Auckland','UTC','America/Los_Angeles','Europe/London']) {
  const run = spawnSync(process.execPath, ['--test','tests/calculator.test.mjs'], { env: {...process.env,TZ}, encoding:'utf8' });
  const summary=run.stdout.split('\n').filter(line=>/^(ℹ|#) (tests|pass|fail|duration)/.test(line));
  console.log(TZ, summary.join('; '));
  if(run.status!==0) { console.error(run.stdout,run.stderr); process.exit(run.status||1); }
}
