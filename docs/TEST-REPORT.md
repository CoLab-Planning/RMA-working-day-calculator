# Calculator testing report — 7 September 2026

Baseline: `60b00c55b6504f2f45e4487df601f5aa1468a7b9` on `main`.

## Reproduced defects and fixes

| Case | Original result | Corrected behaviour |
| --- | --- | --- |
| 3–10 August 2026, hold only on lodgement day | 4 processing days | 5; Day 0 cannot be deducted twice |
| 4–10 January 2022 | 3 processing days in NZ/UTC | 0; whole period is in shutdown |
| 3–10 August 2026, viewed in Los Angeles timezone | 4 days, versus 5 in NZ | 5 in every tested timezone |
| Extension of −2 days | Accepted; reduced 20-day limit to 18 | Explicit validation error |
| Blank/decimal/partial extension values | Silently ignored or truncated | Whole-number validation |
| Exclusion with start but no end in decision mode | Silently ignored | Explicit validation error |
| Weekend-only 8–9 August 2026 with 10-day extension | Dropped extension; limit 20 in NZ | Retains extension; limit 30 |
| Holiday file missing/loading/failing | Could calculate using weekends alone | Holiday data bundled; no runtime request |
| Edited inputs after calculation | Old result remained alongside new inputs | Result cleared until recalculated |
| Detailed calculations accordion | Nested button elements | Single accordion button |
| 320px screen | Horizontal document overflow | Responsive card and bounded input widths |

## Verification

- 93 automated tests, all passing in Pacific/Auckland, UTC, America/Los_Angeles and Europe/London (372 test executions).
- Calendar oracle checks every date in 2022–2030: weekends, Easter, national holidays, Mondayisation, Matariki, memorial holiday and full shutdown.
- 2,000 deterministic generated scenarios per timezone: reconciliation of all calendar days, no negative counts, hold-order invariance and duplicate/overlap invariance.
- Hand-checked examples: ordinary days, weekend lodgement, holiday lodgement, Day 0 holds, leap day, both NZ DST transitions, overtime boundary, every existing consent category, s37 extensions.
- s107G: commencement boundary, one suspension only, no invented fixed cap, older lodgement with later suspension, interaction with s37 and overlapping holds.
- Current-day: ongoing/future/clipped holds, inclusive endpoint, matching decision results when inputs match, Auckland today across UTC midnight.
- Browser checks: current mode with no decision, result invalidation, ongoing s107G, duplicate s107G rejection, switching modes, required decision-mode hold end, negative extension rejection, s107G plus s37 (3/25 example), clear/reset, responsive views, console errors.
- Production TypeScript/Vite build and ESLint pass.
- Original dependency audit: 21 findings (12 high, 5 moderate, 4 low). Compatible updates and removal of unused dependencies result in zero reported findings. This is the package audit result, not a claim of comprehensive security certification.

Run with Node 24 LTS (minimum 22.18):

```sh
npm ci
npm run test:timezones
npm run lint
npm run build
npm audit
```

GitHub Actions repeats timezone tests, lint and build on pushes and pull requests with read-only repository permissions.

## Test strategy and limits

Pure calculation tests cover every documented counting rule and validation family. Integration checks exercise the React UI through a real browser. Every bug fix has either a calculation regression or a recorded browser reproduction. The test suite does not certify legal eligibility of each entered suspension, bespoke consent pathways, actual mobile hardware, or every browser engine. The inclusive hold-date and shifted-Day-0 conventions are explicit; users should verify them against the authority's recorded dates. Future legislation/holiday changes require maintenance.
