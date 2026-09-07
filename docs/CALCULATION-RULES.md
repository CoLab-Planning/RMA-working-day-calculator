# Calculation rules and legal sources

Checked 7 September 2026 against the consolidated Resource Management Act 1991, version as at 25 August 2026.

## s107G: review of draft consent conditions

- An applicant may request draft conditions once, before the earlier of the decision or provision of the s42A report.
- If requested, the authority must provide the draft conditions to the applicant and, for a notified application, submitters.
- The authority **may** suspend the processing timeframe to allow review. A request alone does not create a suspension.
- Section 107G(3)(b) allows this suspension only once per application. Providing further drafts under subsection (6) does not authorise another s107G suspension.
- Subsection (4) requires comments within a reasonable time specified by the authority. There is no fixed five-, ten- or twenty-working-day review period to add automatically.
- The authority may continue processing during the suspension. Comments it considers under subsection (5) are limited to technical or minor matters.
- Section 41 of the 2025 Amendment Act inserted s107G; section 2(2) brought it into force on 20 October 2025. Validation uses the suspension start, not lodgement: an application lodged earlier may have a suspension after commencement.

Implementation: one optional `s107G` row among excluded periods, requiring actual first and last suspended dates. The last excluded day is inclusive; users must not enter the day processing resumed as an excluded day. In current-day mode an unfinished suspension may leave its end blank. Do not also add the same period as an s37 extension unless there is a distinct authorised extension.

Sources:
- [Current RMA s107G](https://www.legislation.govt.nz/act/public/1991/69/en/latest/#LMS1532937)
- [Enacted amendment s41](https://www.legislation.govt.nz/act/public/2025/41/en/latest/sections/LMS1015051/#LMS1015050)
- [Amendment commencement s2](https://www.legislation.govt.nz/act/public/2025/41/en/latest/sections/LMS1014954/)
- [MfE consenting factsheet](https://environment.govt.nz/publications/consenting-rm2/): contextual guidance; the enacted Act controls the once-only suspension rule.

## Working days and counting conventions

The calculator retains the existing convention: lodgement is Day 0, moving to the next working day if lodged on a non-working date. Counting starts **after** Day 0 and includes the selected as-at/decision date if it is a processing day. Each hold is entered as actual inclusive excluded dates. Only otherwise-countable working days are deducted; Day 0, weekends, holidays and overlapping holds cannot be deducted twice.

This remains a date-counting aid. It does not determine legal receipt, whether an s92 request qualifies to stop the clock, whether an extension was lawfully granted, staged hearing/notification deadlines, bespoke statutory pathways or final discount entitlement. Users select the applicable existing application category and supply authorised periods. No new one-year renewable-energy/wood-processing pathway is implied by this update.

RMA s2 excludes weekends, specified national holidays, Mondayised Waitangi/Anzac days, and **20 December–10 January inclusive**. Regional anniversaries remain working days. Queen Elizabeth II Memorial Day (26 September 2022) is separately excluded by its 2022 Act.

Holiday coverage is explicitly 1 January 2022–31 December 2030. Dates outside this range fail validation. `src/data/holidays.ts` bundles the national dates; shutdown days are determined by rule, eliminating omissions and runtime CSV fetch failures. The older public CSV is retained for compatibility, with its missing January 2022 dates corrected, but is no longer a runtime dependency.

Sources and cross-checks:
- [RMA s2](https://www.legislation.govt.nz/act/public/1991/69/en/latest/#DLM230272)
- [Employment NZ historical holidays](https://www.employment.govt.nz/leave-and-holidays/public-holidays/previous-years-public-holidays-and-anniversary-dates)
- [Matariki Advisory Committee dates, MBIE](https://www.mbie.govt.nz/assets/matariki-dates-2022-to-2052-matariki-advisory-group.pdf)
- [Queen Elizabeth II Memorial Day, MBIE](https://www.mbie.govt.nz/business-and-employment/employment-and-skills/employment-legislation-reviews/queen-elizabeth-ii-memorial-day)

Tests independently generate Gregorian Easter and statutory Monday dates and compare every supported calendar date with the production calendar. Matariki fixtures use the published dates. Calculations use integer UTC calendar days, and “today” explicitly uses Pacific/Auckland.

## Current-day mode

No decision date is required. The as-at date defaults to today in New Zealand and can be changed. The result is the cumulative working day reached through that date, not a live elapsed-hours calculation. Weekends and holds leave the count unchanged. Ongoing holds are capped at the as-at date; future holds do not affect a historical result. Completed-application mode requires end dates for all holds. Changing any input invalidates the old result.
