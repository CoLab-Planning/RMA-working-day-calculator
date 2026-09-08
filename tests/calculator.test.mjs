// Copyright (c) 2024-2026 CoLab Planning Limited
// SPDX-License-Identifier: MPL-2.0
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, dateNumber, dateString, isWorkingDay, todayInNewZealand, CONSENT_TYPES } from '../src/lib/calculator.ts';

const base = { startDate: '2026-08-03', endDate: '2026-08-10', mode: 'decision', applicationType: 'standard', holdPeriods: [], extensions: [] };
const run = (changes = {}) => calculate({ ...base, ...changes });
const hold = (start, end, type = 's92(1)', id = 'hold') => ({ id, type, start, end });
const extension = days => ({ id: 'extension', days });
const fixtures = [
  ['same-day lodgement is Day 0', '2026-08-03', '2026-08-03', 0],
  ['following working day is Day 1', '2026-08-03', '2026-08-04', 1],
  ['Friday to Monday counts Monday', '2026-08-07', '2026-08-10', 1],
  ['Saturday lodgement moves Day 0 to Monday', '2026-08-08', '2026-08-10', 0],
  ['Sunday lodgement to Tuesday', '2026-08-09', '2026-08-11', 1],
  ['weekend-only period', '2026-08-08', '2026-08-09', 0],
  ['end on Saturday does not add a day', '2026-08-03', '2026-08-08', 4],
  ['Christmas shutdown includes 10 January', '2025-12-19', '2026-01-12', 1],
  ['shutdown lodgement adjusts Day 0', '2025-12-25', '2026-01-13', 1],
  ['missing January 2022 CSV days regression', '2022-01-04', '2022-01-10', 0],
  ['January 2022 day 1 is after adjusted Day 0', '2022-01-04', '2022-01-12', 1],
  ['Waitangi Day is excluded', '2026-02-05', '2026-02-09', 1],
  ['Mondayised Waitangi Day', '2027-02-05', '2027-02-09', 1],
  ['Mondayised Anzac Day', '2026-04-24', '2026-04-28', 1],
  ['Easter Friday and Monday', '2026-04-02', '2026-04-07', 1],
  ['Sovereign birthday', '2026-05-29', '2026-06-02', 1],
  ['Matariki', '2026-07-09', '2026-07-13', 1],
  ['Labour Day', '2026-10-23', '2026-10-27', 1],
  ['Queen memorial day', '2022-09-23', '2022-09-27', 1],
  ['Auckland anniversary remains working', '2026-01-23', '2026-01-26', 1],
  ['leap day', '2024-02-28', '2024-03-01', 2],
  ['NZ daylight saving starts', '2026-09-25', '2026-09-28', 1],
  ['NZ daylight saving ends', '2026-04-02', '2026-04-07', 1],
];
for (const [name, startDate, endDate, expected] of fixtures) test(name, () => assert.equal(run({startDate, endDate}).finalDays, expected));

test('hold on Day 0 cannot subtract Day 1', () => assert.equal(run({ holdPeriods: [hold('2026-08-03','2026-08-03')] }).finalDays, 5));
test('hold from Day 0 excludes only later working days', () => assert.equal(run({ holdPeriods: [hold('2026-08-03','2026-08-04')] }).holdDays, 1));
test('adjusted Day 0 cannot be subtracted twice', () => assert.equal(run({ startDate:'2026-08-01', holdPeriods:[hold('2026-08-03','2026-08-03')] }).finalDays, 5));
test('holds include both endpoints', () => assert.equal(run({ holdPeriods:[hold('2026-08-04','2026-08-05')] }).holdDays, 2));
test('single-day hold', () => assert.equal(run({ holdPeriods:[hold('2026-08-04','2026-08-04')] }).holdDays, 1));
test('weekend hold excludes no processing days', () => assert.equal(run({holdPeriods:[hold('2026-08-08','2026-08-09')]}).holdDays, 0));
test('overlapping holds count the union', () => {
  const result=run({holdPeriods:[hold('2026-08-04','2026-08-06'),hold('2026-08-05','2026-08-07','s91','second')]});
  assert.equal(result.holdDays,4); assert.equal(result.finalDays,1);
  assert.deepEqual(result.details.holdPeriodDetails.map(p=>p.days),[3,3]);
});
test('duplicate non-s107G holds do not double count',()=>assert.equal(run({holdPeriods:[hold('2026-08-04','2026-08-05'),hold('2026-08-04','2026-08-05')]}).holdDays,2));
test('full range hold yields zero',()=>assert.equal(run({holdPeriods:[hold('2026-08-03','2026-08-10')]}).finalDays,0));
test('extensions add to limit, not processing count',()=>{
  const result=run({extensions:[extension('10'),extension('3')]});
  assert.equal(result.maxDays,33); assert.equal(result.finalDays,5);
});
test('all-nonworking range retains extensions',()=>assert.equal(run({startDate:'2026-08-08',endDate:'2026-08-09',extensions:[extension('10')]}).maxDays,30));
test('zero extension is valid',()=>assert.equal(run({extensions:[extension('0')]}).maxDays,20));
for(const [applicationType, spec] of Object.entries(CONSENT_TYPES)) test(`base timeframe: ${applicationType}`,()=>assert.equal(run({applicationType}).maxDays,spec.baseDays));
test('exact deadline is within time; next day is overdue',()=>{
  assert.equal(run({endDate:'2026-08-31'}).finalDays,20);
  assert.equal(run({endDate:'2026-08-31'}).isOvertime,false);
  assert.equal(run({endDate:'2026-09-01'}).isOvertime,true);
});
test('current-day mode needs only lodgement and as-at dates',()=>assert.equal(run({mode:'current'}).finalDays,5));
test('ongoing hold stops through as-at date',()=>{
  const result=run({mode:'current',holdPeriods:[hold('2026-08-06','')]});
  assert.equal(result.finalDays,2); assert.equal(result.holdDays,3); assert.equal(result.isOnHold,true);
  assert.equal(result.details.holdPeriodDetails[0].ongoing,true);
});
test('known hold end after as-at is clipped',()=>assert.equal(run({mode:'current',holdPeriods:[hold('2026-08-06','2026-08-20')]}).holdDays,3));
test('future hold does not affect historical count',()=>assert.equal(run({mode:'current',holdPeriods:[hold('2026-08-12','2026-08-20')]}).holdDays,0));
test('future ongoing hold does not affect historical count',()=>assert.equal(run({mode:'current',holdPeriods:[hold('2026-08-12','')]}).isOnHold,false));
test('clock resumes after last excluded day',()=>assert.equal(run({mode:'current',holdPeriods:[hold('2026-08-04','2026-08-07')]}).isOnHold,false));
test('current and decision modes agree for completed holds',()=>assert.deepEqual(run({mode:'current'}),run()));
test('s107G is an exclusion, not a fixed extension',()=>{
  const result=run({holdPeriods:[hold('2026-08-04','2026-08-06','s107G')]});
  assert.equal(result.finalDays,2); assert.equal(result.maxDays,20); assert.equal(result.extensionDays,0);
});
test('s107G and s37 can coexist',()=>assert.equal(run({holdPeriods:[hold('2026-08-04','2026-08-06','s107G')],extensions:[extension('5')]}).maxDays,25));
test('s107G is permitted on commencement date including older applications',()=>assert.equal(run({startDate:'2025-10-17',endDate:'2025-10-21',holdPeriods:[hold('2025-10-20','2025-10-20','s107G')]}).finalDays,1));
test('s107G has no invented five or ten-day cap',()=>assert.equal(run({endDate:'2026-09-01',holdPeriods:[hold('2026-08-04','2026-08-31','s107G')]}).holdDays,20));

const invalid = [
 ['missing lodgement',{startDate:''},/Lodgement date/],
 ['missing as-at date',{mode:'current',endDate:''},/As-at date/],
 ['invalid date',{startDate:'2026-02-30'},/valid date/],
 ['invalid leap day',{startDate:'2025-02-29'},/valid date/],
 ['malformed date',{startDate:'03/08/2026'},/valid date/],
 ['outside lower bound',{startDate:'2021-12-31'},/supported dates/],
 ['outside upper bound',{endDate:'2031-01-11'},/supported dates/],
 ['reversed dates',{endDate:'2026-08-01'},/before/],
 ['unknown consent type',{applicationType:'toString'},/application type/],
 ['unknown mode',{mode:'invalid'},/mode/],
 ['empty hold',{holdPeriods:[hold('','')]},/valid date/],
 ['partial hold in decision mode',{holdPeriods:[hold('2026-08-04','')]},/last excluded date/],
 ['end-only hold in current mode',{mode:'current',holdPeriods:[hold('','2026-08-04')]},/valid date/],
 ['hold before lodgement',{holdPeriods:[hold('2026-08-01','2026-08-04')]},/before lodgement/],
 ['reversed hold',{holdPeriods:[hold('2026-08-06','2026-08-04')]},/before the start/],
 ['hold after decision',{holdPeriods:[hold('2026-08-06','2026-08-11')]},/after the decision/],
 ['invalid hold type',{holdPeriods:[hold('2026-08-04','2026-08-05','toString')]},/hold type/],
 ['s107G before commencement',{startDate:'2025-10-01',endDate:'2025-10-20',holdPeriods:[hold('2025-10-19','2025-10-20','s107G')]},/20 October 2025/],
 ['second s107G suspension',{holdPeriods:[hold('2026-08-04','2026-08-05','s107G'),hold('2026-08-06','2026-08-07','s107G')]},/Only one/],
];
for(const [name, changes, error] of invalid) test(`reject ${name}`,()=>assert.throws(()=>run(changes),error));
for(const days of ['','-1','1.5','1e3','abc',' 2','Infinity','9007199254740992']) test(`reject extension ${JSON.stringify(days)}`,()=>assert.throws(()=>run({extensions:[extension(days)]}),/whole number/));
test('reject extension sum overflow',()=>assert.throws(()=>run({extensions:[extension('9007199254740991')]}),/too large/));
test('today follows Auckland even before UTC midnight',()=>assert.equal(todayInNewZealand(new Date('2026-09-06T13:00:00Z')),'2026-09-07'));
test('today follows Auckland daylight saving',()=>assert.equal(todayInNewZealand(new Date('2026-12-01T11:30:00Z')),'2026-12-02'));

// Independent oracle: Gregorian Easter and statutory weekday rules, rather than
// copying the production holiday list. Matariki dates are from the Advisory Committee.
const matariki = ['06-24','07-14','06-28','06-20','07-10','06-25','07-14','07-06','06-21'];
const holidaysByYear = {};
for(let y=2022;y<=2030;y++) {
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;
  const easter=Date.UTC(y,month-1,day)/86400000;
  const md=n=>new Date(n*86400000).toISOString().slice(5,10);
  const monday=(month,nth)=>{
    const first=Date.UTC(y,month-1,1)/86400000;
    const weekday=new Date(first*86400000).getUTCDay();
    return md(first+(8-weekday)%7+7*(nth-1));
  };
  const observed=md=>{
    const date=new Date(`${y}-${md}T00:00:00Z`); const dow=date.getUTCDay();
    if(dow===6) date.setUTCDate(date.getUTCDate()+2);
    if(dow===0) date.setUTCDate(date.getUTCDate()+1);
    return date.toISOString().slice(5,10);
  };
  holidaysByYear[y]=[observed('02-06'),md(easter-2),md(easter+1),observed('04-25'),monday(6,1),matariki[y-2022],monday(10,4),...(y===2022?['09-26']:[])];
}
for(const [year, dates] of Object.entries(holidaysByYear)) test(`every calendar date agrees with independent holiday fixture: ${year}`,()=>{
  const national=new Set(dates.map(d=>`${year}-${d}`));
  for(let day=dateNumber(`${year}-01-01`);day<=dateNumber(`${year}-12-31`);day++) {
    const date=dateString(day); const weekday=new Date(date+'T12:00:00Z').getUTCDay();
    const expected=weekday!==0 && weekday!==6 && date.slice(5)>'01-10' && date.slice(5)<'12-20' && !national.has(date);
    assert.equal(isWorkingDay(day),expected,date);
  }
});
test('2,000 seeded scenarios preserve accounting, bounds, overlap and permutation invariants',()=>{
  let seed=41807; const random=n=>{seed=(seed*16807)%2147483647; return seed%n;};
  for(let i=0;i<2000;i++) {
    const start=dateNumber('2022-01-01')+random(2900); const end=start+random(180);
    const holds=Array.from({length:random(7)},(_,index)=>{
      const from=start+random(end-start+1); const to=from+random(end-from+1);
      return hold(dateString(from),dateString(to),'other',String(index));
    });
    const input={startDate:dateString(start),endDate:dateString(end),holdPeriods:holds};
    const r=run(input);
    assert.equal(r.calendarStats.totalCalendarDays,r.finalDays+r.holdDays+r.calendarStats.weekendDays+r.calendarStats.holidayDays+r.day0Adjustment);
    assert.equal(r.excludedDaysSummary+r.finalDays,r.calendarStats.totalCalendarDays);
    assert.ok(r.finalDays>=0 && r.finalDays<=r.elapsedWorkingDays);
    assert.equal(run({...input,holdPeriods:[...holds].reverse()}).finalDays,r.finalDays);
    assert.equal(run({...input,holdPeriods:[...holds,...holds]}).finalDays,r.finalDays);
  }
});
test('calculation does not mutate caller inputs',()=>{
  const input={...base,holdPeriods:[hold('2026-08-04','2026-08-06')],extensions:[extension('2')]};
  const before=JSON.stringify(input); calculate(input); assert.equal(JSON.stringify(input),before);
});
