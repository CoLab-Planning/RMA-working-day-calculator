// Copyright (c) 2024-2026 CoLab Planning Limited
// SPDX-License-Identifier: MPL-2.0
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import { HOLIDAYS } from '../data/holidays.ts';

export const MIN_DATE = '2022-01-01';
export const MAX_DATE = '2030-12-31';
export const S107G_COMMENCEMENT = '2025-10-20';
export const HOLD_PERIOD_TYPES = {
  s88E: 'Written Approvals s88E',
  s88H: 'Awaiting Deposit s88H',
  s91: 'Additional Consents s91',
  s91A: 'Suspension Notified Application s91A',
  s91D: 'Suspension Non-Notified Application s91D',
  's92(1)': 'Request for Information s92(1)',
  's92(2)': 'Request to Commission Report s92(2)',
  s107G: 'Review of Draft Consent Conditions s107G',
  other: 'Other',
} as const;
export const CONSENT_TYPES = {
  standard: { label: 'Standard (Non-Notified) — 20 days', baseDays: 20 },
  fastTrack: { label: 'Fast-Track — 10 days', baseDays: 10 },
  notifiednohearing: { label: 'Limited or Publicly Notified with no hearing — 60 days', baseDays: 60 },
  limitedNotified: { label: 'Limited Notified with hearing — 100 days', baseDays: 100 },
  publiclyNotified: { label: 'Publicly Notified with hearing — 130 days', baseDays: 130 },
} as const;
export type CalculationMode = 'current' | 'decision';
export interface HoldPeriod { id: string; type: string; start: string; end: string }
export interface Extension { id: string; days: string }
export interface CalculationInput {
  startDate: string;
  endDate: string;
  mode: CalculationMode;
  applicationType: keyof typeof CONSENT_TYPES;
  holdPeriods: HoldPeriod[];
  extensions: Extension[];
}
export interface CalculationResult {
  totalDays: number;
  holdDays: number;
  elapsedWorkingDays: number;
  extensionDays: number;
  finalDays: number;
  maxDays: number;
  isOvertime: boolean;
  details: {
    weekends: number;
    holidays: number;
    holdPeriodDetails: Array<{ type: string; days: number; start: string; end: string; ongoing: boolean }>;
  };
  calendarStats: { totalCalendarDays: number; weekendDays: number; holidayDays: number };
  excludedDaysSummary: number;
  day0Adjustment: number;
  adjustedStart: string;
  asAtDate: string;
  isOnHold: boolean;
  isAsAtWorkingDay: boolean;
}

// Calendar dates are integer UTC day numbers, never local instants. This avoids
// UTC parsing/local setHours mutations and daylight-saving arithmetic errors.
const DAY_MS = 86_400_000;
export function dateNumber(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Enter a valid date.');
  const instant = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(instant) || new Date(instant).toISOString().slice(0, 10) !== value) {
    throw new Error('Enter a valid date.');
  }
  return instant / DAY_MS;
}
export function dateString(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}
function checkedDate(value: string, label: string): number {
  let day: number;
  try { day = dateNumber(value); } catch { throw new Error(`${label}: enter a valid date.`); }
  if (value < MIN_DATE || value > MAX_DATE) {
    throw new Error(`${label}: supported dates are 1 January 2022 to 31 December 2030.`);
  }
  return day;
}
export function isWeekend(day: number): boolean {
  const weekday = new Date(day * DAY_MS).getUTCDay();
  return weekday === 0 || weekday === 6;
}
export function isWorkingDay(day: number): boolean {
  const date = dateString(day);
  const monthDay = date.slice(5);
  return !isWeekend(day) && !(monthDay >= '12-20' || monthDay <= '01-10') && !HOLIDAYS.has(date);
}
export function todayInNewZealand(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-NZ', {
    timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function calculate(input: CalculationInput): CalculationResult {
  const { startDate, endDate, mode, applicationType, holdPeriods, extensions } = input;
  if (mode !== 'current' && mode !== 'decision') throw new Error('Select a calculation mode.');
  if (!Object.prototype.hasOwnProperty.call(CONSENT_TYPES, applicationType)) throw new Error('Select an application type.');
  const start = checkedDate(startDate, 'Lodgement date');
  const end = checkedDate(endDate, mode === 'current' ? 'As-at date' : 'Decision issue date');
  if (end < start) throw new Error('The calculation date cannot be before the lodgement date.');

  let extensionDays = 0;
  for (const extension of extensions) {
    if (!/^\d+$/.test(extension.days) || !Number.isSafeInteger(Number(extension.days))) {
      throw new Error('Each s37 extension must contain a non-negative whole number of working days.');
    }
    extensionDays += Number(extension.days);
  }
  const maxDays = CONSENT_TYPES[applicationType].baseDays + extensionDays;
  if (!Number.isSafeInteger(maxDays)) throw new Error('The total extension is too large.');
  if (holdPeriods.filter(p => p.type === 's107G').length > 1) {
    throw new Error('Only one s107G suspension is permitted during an application process.');
  }
  const holds = holdPeriods.map((period, index) => {
    const label = `Excluded period ${index + 1}`;
    if (!Object.prototype.hasOwnProperty.call(HOLD_PERIOD_TYPES, period.type)) throw new Error(`${label}: select a hold type.`);
    const from = checkedDate(period.start, `${label} start`);
    if (from < start) throw new Error(`${label} starts before lodgement.`);
    if (period.type === 's107G' && period.start < S107G_COMMENCEMENT) {
      throw new Error('An s107G suspension cannot start before 20 October 2025.');
    }
    if (!period.end && mode === 'decision') throw new Error(`${label}: enter the last excluded date.`);
    const to = period.end ? checkedDate(period.end, `${label} end`) : end;
    if (period.end && to < from) throw new Error(`${label}: the end cannot be before the start.`);
    if (mode === 'decision' && to > end) throw new Error(`${label} ends after the decision date.`);
    return { ...period, from, to };
  });

  let day0 = start;
  while (!isWorkingDay(day0)) day0++;
  const calendarStats = { totalCalendarDays: end - start, weekendDays: 0, holidayDays: 0 };
  let totalDays = 0;
  let holdDays = 0;
  let day0Adjustment = 0;
  const details = holds.filter(p => p.from <= end).map(period => ({
    type: period.type, days: 0, start: period.start,
    end: dateString(Math.min(period.to, end)), ongoing: !period.end || period.to > end,
  }));
  const relevantHolds = holds.filter(p => p.from <= end);
  for (let day = start + 1; day <= end; day++) {
    if (isWeekend(day)) { calendarStats.weekendDays++; continue; }
    if (!isWorkingDay(day)) { calendarStats.holidayDays++; continue; }
    if (day <= day0) { day0Adjustment++; continue; }
    totalDays++;
    let excluded = false;
    relevantHolds.forEach((period, index) => {
      if (day >= period.from && day <= period.to) {
        details[index].days++;
        excluded = true;
      }
    });
    // Count the union: overlapping holds and Day 0 can never be deducted twice.
    if (excluded) holdDays++;
  }
  const finalDays = totalDays - holdDays;
  return {
    totalDays, elapsedWorkingDays: totalDays, holdDays, extensionDays, maxDays, finalDays,
    isOvertime: finalDays > maxDays,
    details: { weekends: calendarStats.weekendDays, holidays: calendarStats.holidayDays, holdPeriodDetails: details },
    calendarStats,
    excludedDaysSummary: calendarStats.totalCalendarDays - finalDays,
    day0Adjustment, adjustedStart: dateString(day0), asAtDate: endDate,
    isOnHold: holds.some(p => p.from <= end && p.to >= end),
    isAsAtWorkingDay: isWorkingDay(end),
  };
}
