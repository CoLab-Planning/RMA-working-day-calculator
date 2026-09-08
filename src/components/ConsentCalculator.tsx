// Copyright (c) 2024-2026 CoLab Planning Limited
// SPDX-License-Identifier: MPL-2.0
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

import React, { useState, useEffect, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Plus, Trash2, ChevronDown, ChevronUp, Calculator, Info } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { calculate, CONSENT_TYPES, HOLD_PERIOD_TYPES, MIN_DATE, MAX_DATE, todayInNewZealand } from '../lib/calculator';
import type { CalculationMode, CalculationResult, Extension, HoldPeriod } from '../lib/calculator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

// Detect if the user’s primary pointer is coarse (i.e. a touch device).
const isTouchDevice =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(pointer: coarse)').matches;

/**
 * A simple full-screen modal-based tooltip for mobile.
 * Shows content in a dismissible panel at bottom.
 */
interface MobileTooltipProps {
  content: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  hasLink?: boolean;
}

const MobileTooltip: React.FC<MobileTooltipProps> = ({ content, isOpen, onClose, hasLink }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-4 max-w-sm w-full shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm mb-4 text-gray-900">
          {typeof content === 'string' ? <p>{content}</p> : content}
          {hasLink && (
            <a
              href="https://environment.govt.nz/acts-and-regulations/regulations/discount-on-administrative-charges/"
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-[#3c5c17] hover:underline"
            >
              Learn more about the Discount Regulations
            </a>
          )}
        </div>
        <Button
          onClick={onClose}
          className="w-full bg-[#3c5c17] hover:bg-[#2e4512] text-white"
          type="button"
        >
          Close
        </Button>
      </div>
    </div>
  );
};

const ConsentCalculator: React.FC = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [holdPeriods, setHoldPeriods] = useState<HoldPeriod[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [mode, setMode] = useState<CalculationMode>('current');
  const [asAtDate, setAsAtDate] = useState(todayInNewZealand);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [applicationType, setApplicationType] = useState<keyof typeof CONSENT_TYPES>('standard');

  // store a note if original Day 0 is on a weekend/holiday
  const [nonWorkingDayNote, setNonWorkingDayNote] = useState<string>("");

  // For tooltips on mobile
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // For showing/hiding the “Important Notes”
  const [showImportantNotes, setShowImportantNotes] = useState<boolean>(false);

  // NEW: For disclaimers in a separate accordion
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);

  // A previous result must never appear to belong to edited inputs.
  useEffect(() => {
    setResult(null);
    setValidationError(null);
    setNonWorkingDayNote('');
  }, [startDate, endDate, asAtDate, mode, applicationType, holdPeriods, extensions]);

  const addHoldPeriod = () => {
    const newHoldPeriod: HoldPeriod = {
      id: crypto.randomUUID(),
      type: 's92(1)',
      start: '',
      end: '',
    };
    setHoldPeriods((prev) => [...prev, newHoldPeriod]);
  };

  const removeHoldPeriod = (id: string) => {
    setHoldPeriods((prev) => prev.filter((period) => period.id !== id));
  };

  const addExtension = () => {
    const newExtension: Extension = {
      id: crypto.randomUUID(),
      days: '',
    };
    setExtensions((prev) => [...prev, newExtension]);
  };

  const removeExtension = (id: string) => {
    setExtensions((prev) => prev.filter((ext) => ext.id !== id));
  };

  const calculateResult = () => {
    setResult(null);
    setValidationError(null);
    setNonWorkingDayNote('');
    try {
      const next = calculate({
        startDate, endDate: mode === 'current' ? asAtDate : endDate,
        mode, applicationType, holdPeriods, extensions,
      });
      setResult(next);
      if (next.adjustedStart !== startDate) {
        setNonWorkingDayNote(next.adjustedStart > next.asAtDate
          ? 'The selected period ends before the first working day after lodgement. No processing days are counted.'
          : `Lodgement falls on a non-working day. Day 0 is ${format(parseISO(next.adjustedStart), 'eeee, d MMM yyyy')}; processing days begin after that date.`);
      }
      setShowImportantNotes(false);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Unable to calculate. Check the dates entered.');
    }
  };

  // NEW: Clears all states to the default
  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setAsAtDate(todayInNewZealand());
    setMode('current');
    setHoldPeriods([]);
    setExtensions([]);
    setResult(null);
    setNonWorkingDayNote('');
    setValidationError(null);
    setApplicationType('standard');
    setShowAudit(false);
    setShowImportantNotes(false);
    setShowDisclaimer(false);
    setActiveTooltip(null);
  };

  /**
   * Renders the “Important Notes” accordion block.
   * Used both above and below the results.
   */
  const renderImportantNotesAccordion = () => {
    return (
      <div className="mt-4">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between bg-white hover:bg-gray-50"
          aria-expanded={showImportantNotes}
          onClick={() => setShowImportantNotes(!showImportantNotes)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">Important Notes</span>
          </div>
          {showImportantNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {showImportantNotes && (
          <div className="mt-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Header Section */}
            <div className="bg-gray-50 p-4 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900">Understanding RMA Timeframe Calculations</h4>
              <p className="text-sm text-gray-600 mt-1">
                Key information about how processing days are counted under the RMA
              </p>
            </div>

            {/* Content Section */}
            <div className="p-4 sm:p-6 space-y-4 text-sm leading-relaxed text-gray-800">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <p className="font-medium text-blue-900">
                  The RMA establishes two distinct approaches to counting time periods:
                </p>
                <ul className="mt-2 space-y-2 text-blue-800">
                  <li>
                    • For statutory timeframes, counting starts the day <span className="font-medium">after</span>{' '}
                    key trigger dates, e.g. date of lodgement, close of submissions, end of hearing
                  </li>
                  <li>
                    • Excluded periods can start on <span className="font-medium">any</span> working day, including trigger dates
                  </li>
                </ul>
                <p className="mt-3 text-blue-800 text-sm">
                  Excluded dates are inclusive. Enter the last day the clock was suspended, not the date processing resumed.
                  The calculator deducts only working days after Day 0, and counts overlapping exclusions once.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
                <p className="font-medium text-amber-900">Practical Examples:</p>

                <div className="pl-4 border-l-2 border-amber-300">
                  <p className="text-amber-900">
                    <strong>Example 1: Processing Timeframe (s115)</strong>
                    <br />
                    "Notice of the decision must be given within 20 working days <span className="font-medium underline">after</span> the date the application was first lodged..."
                    <br />
                    <span className="text-amber-700 text-xs mt-1 block">
                      → If lodged Monday, Day 1 starts Tuesday (the day after)
                    </span>
                  </p>
                </div>

                <div className="pl-4 border-l-2 border-amber-300">
                  <p className="text-amber-900">
                    <strong>Example 2: Excluded Period (s88C(2))</strong>
                    <br />
                    "The period that must be excluded... is the period <span className="font-medium underline">starting with</span> the date of..."
                    <br />
                    <span className="text-amber-700 text-xs mt-1 block">
                      → If started Monday, Monday is counted as Day 1 of the excluded period
                    </span>
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div>
                  <p className="font-medium text-gray-900 mb-2">Working Days Definition (RMA s2)</p>
                  <div className="prose prose-sm text-gray-700">
                    <p className="mb-2">
                      <strong>working day</strong> means a day of the week other than—
                    </p>
                    <ul className="list-none pl-4 space-y-1">
                      <li>(a) a Saturday, a Sunday, Waitangi Day, Good Friday, Easter Monday, Anzac Day, the Sovereign's birthday, Te Rā Aro ki a Matariki/Matariki Observance Day, and Labour Day; and</li>
                      <li>(b) if Waitangi Day or Anzac Day falls on a Saturday or a Sunday, the following Monday; and</li>
                      <li>(c) a day in the period commencing on 20 December in any year and ending with 10 January in the following year.</li>
                    </ul>
                  </div>
                  <p className="text-gray-700 mt-3 text-xs italic">
                    Note: Regional anniversary days in New Zealand, while holidays for that region, remain working days under this definition.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Edge Cases</p>
                <p className="text-gray-700">
                  A hold on Day 0 does not reduce later processing days. Overlapping holds are counted once in the total,
                  although each hold is shown separately in the breakdown. In current-day mode, a hold with no end date
                  continues through the selected as-at date; future dates are not deducted.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /**
   * Renders the new “Disclaimer” accordion block.
   */
  const renderDisclaimerAccordion = () => {
    return (
      <div className="mt-4">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between bg-white hover:bg-gray-50"
          aria-expanded={showDisclaimer}
          onClick={() => setShowDisclaimer(!showDisclaimer)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">Disclaimer</span>
          </div>
          {showDisclaimer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {showDisclaimer && (
          <div className="bg-gray-50 p-4 rounded-lg mt-2 border border-gray-200">
            <div className="text-gray-700 space-y-2">
              <p>
                While every effort has been made to ensure accuracy with this calculator, there may be some edge cases or errors that are not caught as part of its design.
                The calculator supports dates from 1 January 2022 to 31 December 2030.
                Users should verify the applicable statutory pathway, authorised extensions and actual suspension dates for their application.
              </p>
              <p>
                Please{' '}
                <a
                  href="mailto:contact@colabplanning.co.nz"
                  className="text-gray-900 underline hover:text-gray-700"
                >
                  contact us
                </a>{' '}
                if you encounter an error that you would like us to review.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-0 min-w-0 overflow-hidden bg-white sm:rounded-lg">
      <CardHeader className="bg-gradient-to-r from-[#3c5c17] to-[#6ba32a] text-white pb-6">
        <CardTitle className="text-2xl font-bold mb-2">RMA Timeframes Calculator</CardTitle>
        <p className="text-sm opacity-90">
          A tool for calculating processing timeframes for resource consent applications under the Resource Management Act 1991 (RMA).
        </p>
        <p className="text-sm mt-2">
          Part of the{' '}
          <a
            href="https://www.colabplanning.co.nz/tools"
            className="text-white underline decoration-white/50 hover:decoration-white transition-all duration-200 font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            CoLab Planning Tools
          </a>
          {' '}suite.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        {/* Application Type Box */}
        <div className="bg-gray-50 p-4 sm:p-6 border border-gray-200 shadow-inner rounded-lg">
          <div className="space-y-1">
            <label
              htmlFor="applicationType"
              className="text-base font-semibold text-gray-700 block"
            >
              Application Type
            </label>
            <p className="text-xs text-gray-600">
              Select the application type to set the timeframes that will apply
            </p>
          </div>

          <select
            id="applicationType"
            name="applicationType"
            title="Application Type"
            className="w-full mt-3 p-2 sm:p-2.5 border border-gray-200 rounded-md
           text-sm sm:text-base focus:ring-2 focus:ring-[#3c5c17] 
           focus:border-[#3c5c17] bg-white
           -webkit-appearance: none appearance-none"
            value={applicationType}
            onChange={(e) => setApplicationType(e.target.value as keyof typeof CONSENT_TYPES)}
          >
            {Object.entries(CONSENT_TYPES).map(([key, info]) => (
              <option key={key} value={key}>
                {info.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <label htmlFor="calculationMode" className="block font-semibold text-gray-700">What would you like to calculate?</label>
          <select id="calculationMode" className="w-full mt-2 p-3 border rounded-md bg-white"
            value={mode} onChange={e => setMode(e.target.value as CalculationMode)}>
            <option value="current">Working day as at a date</option>
            <option value="decision">Completed application — decision issued</option>
          </select>
          <p className="text-xs text-gray-600 mt-2">
            {mode === 'current' ? 'Check progress on any date without entering a decision date. The count includes that date if it is a processing day.' : 'Calculate the processing time up to and including the decision issue date.'}
            {' '}Supported dates: 1 January 2022–31 December 2030.
          </p>
        </div>

        {/* Date Inputs */}
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 shadow-inner">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
            {/* Lodgement Date */}
            <div className="space-y-3">
              <label htmlFor="lodgementDate" className="text-base font-semibold text-gray-700">
                Lodgement Date
                <span className="ml-1 font-normal text-gray-600">(Day 0)</span>
                <span className="block text-xs font-normal text-gray-600 mt-1">
                  Start of processing timeframe
                </span>
              </label>
              <input
                id="lodgementDate"
                name="lodgementDate"
                type="date"
                min={MIN_DATE}
                max={MAX_DATE}
                title="Lodgement Date"
                placeholder="dd/mm/yyyy"
                className="w-full p-2 sm:p-3 border border-gray-200 rounded-md
           focus:ring-2 focus:ring-[#3c5c17] focus:border-[#3c5c17]
           transition-colors duration-200 text-gray-900 text-sm sm:text-base
           bg-white
           -webkit-appearance: none appearance-none
           min-h-[42px] sm:min-h-[48px]"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* As-at or decision date */}
            <div className="space-y-3">
              <label htmlFor="decisionDate" className="text-base font-semibold text-gray-700">
                {mode === 'current' ? 'As-at Date' : 'Decision Issue Date'}
                <span className="block text-xs font-normal text-gray-600 mt-1">
                  {mode === 'current' ? 'Count working days through this date' : 'End of processing timeframe'}
                </span>
              </label>
              <input
                id="decisionDate"
                name="decisionDate"
                type="date"
                min={MIN_DATE}
                max={MAX_DATE}
                title={mode === 'current' ? 'As-at Date' : 'Decision Issue Date'}
                placeholder="dd/mm/yyyy"
                className="w-full p-2 sm:p-3 border border-gray-200 rounded-md
           focus:ring-2 focus:ring-[#3c5c17] focus:border-[#3c5c17]
           transition-colors duration-200 text-gray-900 text-sm sm:text-base
           bg-white
           -webkit-appearance: none appearance-none
           min-h-[42px] sm:min-h-[48px]"
                value={mode === 'current' ? asAtDate : endDate}
                onChange={(e) => mode === 'current' ? setAsAtDate(e.target.value) : setEndDate(e.target.value)}
              />
              {mode === 'current' && <Button type="button" variant="outline" size="sm" onClick={() => setAsAtDate(todayInNewZealand())}>Use today (New Zealand)</Button>}
            </div>
          </div>
        </div>

        {/* Excluded Time Periods */}
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 shadow-inner">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4 sm:mb-6">
            <div className="space-y-1 max-w-[70%] sm:max-w-none">
              <h3 className="text-base font-semibold text-gray-700">Excluded Time Periods</h3>
              <p className="text-xs text-gray-600">Enter actual suspension dates. Both dates are included.</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-label="Add excluded time period"
              onClick={addHoldPeriod}
              className="bg-white hover:bg-[#3c5c17] hover:text-white border-[#3c5c17]
                         text-[#3c5c17] transition-colors duration-200 flex items-center
                         gap-2 px-3 py-2 text-sm sm:text-base whitespace-nowrap self-end sm:self-auto"
              type="button"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Time Period</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>

          <div className="space-y-4">
            {holdPeriods.map((period) => (
              <div
                key={period.id}
                className="bg-white p-3 sm:p-4 rounded-md border border-gray-200 
                           shadow-sm relative"
              >
                <div className="absolute top-3 right-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remove excluded time period"
                    onClick={() => removeHoldPeriod(period.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 
                               h-8 w-8 p-0"
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mb-4 pr-12">
                  <label htmlFor={`hold-type-${period.id}`} className="block text-sm font-medium text-gray-600 mb-2">Hold Type</label>
                  <select id={`hold-type-${period.id}`}
                    className="w-full p-2 sm:p-3 border border-gray-200 rounded-md shadow-sm
                               focus:ring-2 focus:ring-[#3c5c17] focus:border-[#3c5c17]
                               transition-colors duration-200 text-gray-900 text-sm sm:text-base
                               -webkit-appearance: none appearance-none
                               min-h-[42px] sm:min-h-[48px] bg-white"
                    value={period.type}
                    onChange={(e) => {
                      const newPeriods = holdPeriods.map((p) =>
                        p.id === period.id ? { ...p, type: e.target.value } : p
                      );
                      setHoldPeriods(newPeriods);
                    }}
                  >
                    {Object.entries(HOLD_PERIOD_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {period.type === 's107G' && (
                  <p className="mb-4 text-sm text-blue-900 bg-blue-50 rounded-md p-3">
                    s107G applies from 20 October 2025. Add this period only if the consent authority has suspended the clock
                    for draft-condition review. Only one s107G suspension is allowed per application. There is no fixed number
                    of review days: the authority specifies a reasonable time for comments. Use its actual suspension dates. The applicant must request the conditions before the decision or the s42A report is provided, whichever happens first.
                    {' '}<a className="underline" target="_blank" rel="noopener noreferrer"
                      href="https://www.legislation.govt.nz/act/public/1991/69/en/latest/#LMS1532937">Read s107G</a>
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor={`hold-start-${period.id}`} className="block text-sm font-medium text-gray-600 mb-2">
                      First Excluded Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 sm:p-3 border border-gray-200 rounded-md
           focus:ring-2 focus:ring-[#3c5c17] focus:border-[#3c5c17]
           transition-colors duration-200 text-gray-900 text-sm sm:text-base
           bg-white
           -webkit-appearance: none appearance-none
           min-h-[42px] sm:min-h-[48px]"
                      id={`hold-start-${period.id}`}
                      min={period.type === 's107G' && startDate < '2025-10-20' ? '2025-10-20' : startDate || MIN_DATE}
                      max={MAX_DATE}
                      value={period.start}
                      onChange={(e) => {
                        const newPeriods = holdPeriods.map((p) =>
                          p.id === period.id ? { ...p, start: e.target.value } : p
                        );
                        setHoldPeriods(newPeriods);
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor={`hold-end-${period.id}`} className="block text-sm font-medium text-gray-600 mb-2">Last Excluded Date (inclusive)</label>
                    <input
                      type="date"
                      className="w-full p-2 sm:p-3 border border-gray-200 rounded-md
           focus:ring-2 focus:ring-[#3c5c17] focus:border-[#3c5c17]
           transition-colors duration-200 text-gray-900 text-sm sm:text-base
           bg-white
           -webkit-appearance: none appearance-none
           min-h-[42px] sm:min-h-[48px]"
                      id={`hold-end-${period.id}`}
                      min={period.start || MIN_DATE}
                      max={MAX_DATE}
                      value={period.end}
                      onChange={(e) => {
                        const newPeriods = holdPeriods.map((p) =>
                          p.id === period.id ? { ...p, end: e.target.value } : p
                        );
                        setHoldPeriods(newPeriods);
                      }}
                    />
                    {mode === 'current' && <p className="text-xs text-gray-600 mt-2">Leave blank if still on hold. Counted only through the as-at date.</p>}
                  </div>
                </div>
              </div>
            ))}

            {holdPeriods.length === 0 && (
              <div
                className="text-center py-6 text-gray-600 bg-white rounded-md 
                              border border-dashed border-gray-300"
              >
                <p className="text-sm">No hold periods added yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Extensions (s37) */}
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200 shadow-inner">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4 sm:mb-6">
            <div className="space-y-1 max-w-[70%] sm:max-w-none">
              <h3 className="text-base font-semibold text-gray-700">Extension of Time (s37)</h3>
              <p className="text-xs text-gray-600">Add additional time under s37</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-label="Add s37 extension"
              onClick={addExtension}
              className="bg-white hover:bg-[#3c5c17] hover:text-white border-[#3c5c17]
                         text-[#3c5c17] transition-colors duration-200 flex items-center
                         gap-2 px-3 py-2 text-sm sm:text-base whitespace-nowrap
                         self-end sm:self-auto"
              type="button"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Extension</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>

          <div className="space-y-4">
            {extensions.map((extension) => (
              <div
                key={extension.id}
                className="bg-white p-3 sm:p-4 rounded-md border border-gray-200 
                           shadow-sm relative"
              >
                <div className="absolute top-3 right-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remove s37 extension"
                    onClick={() => removeExtension(extension.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50
                               h-8 w-8 p-0"
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="pr-12">
                  <label htmlFor={`extension-${extension.id}`} className="block text-sm font-medium text-gray-600 mb-2">
                    Additional Days
                  </label>
                  <input
                    id={`extension-${extension.id}`}
                    type="number"
                    step="1"
                    className="w-48 max-w-full p-2 sm:p-2.5 border border-gray-200 rounded-md
                               shadow-sm text-sm sm:text-base focus:ring-2
                               focus:ring-[#3c5c17] focus:border-[#3c5c17]
                               -webkit-appearance: none"
                    value={extension.days}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      const newExtensions = extensions.map((ext) =>
                        ext.id === extension.id ? { ...ext, days: newVal } : ext
                      );
                      setExtensions(newExtensions);
                    }}
                    placeholder="Number of days"
                    min="0"
                  />
                </div>
              </div>
            ))}

            {extensions.length === 0 && (
              <div
                className="text-center py-6 text-gray-600 bg-white rounded-md
                              border border-dashed border-gray-300"
              >
                <p className="text-sm">No extensions added yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertDescription className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="text-red-800">{validationError}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Non-Working Day Note */}
        {nonWorkingDayNote && (
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <AlertDescription className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="text-blue-800">{nonWorkingDayNote}</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Calculate + Clear Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            className={`w-full flex items-center justify-center gap-2 text-sm sm:text-base py-3 ${
              validationError ? 'bg-opacity-90' : ''
            }`}
            onClick={calculateResult}
            type="button"
          >
            <Calculator className="w-4 h-4" />
            <span>Calculate</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            className="w-full flex items-center justify-center gap-2 text-sm sm:text-base py-3 
                       text-[#3c5c17] border-[#3c5c17] hover:bg-[#3c5c17] hover:text-white"
            type="button"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </Button>
        </div>

        {/* Show Important Notes and Disclaimer before results when not calculated */}
        {!result && (
          <>
            {renderImportantNotesAccordion()}
            {renderDisclaimerAccordion()}
          </>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4 sm:space-y-6">
            {/* Main Results Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#3c5c17] to-[#6ba32a] p-4 sm:p-6">
                <h3 className="text-xl sm:text-2xl font-semibold text-white">
                  {mode === 'current' ? 'Current Working Day' : 'Calculation Results'}
                </h3>
              </div>

              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                <p className="text-sm text-gray-600">{mode === 'current' ? 'As at' : 'Decision issued'} {format(parseISO(result.asAtDate), 'd MMMM yyyy')} (inclusive)</p>
                {mode === 'current' && <p className="text-sm text-gray-700">
                  {result.isOnHold ? 'The clock is on hold on this date.' : !result.isAsAtWorkingDay ? 'This is a non-working day; the count does not advance.' : 'The count includes processing days through this date.'}
                </p>}
                {/* Working Days */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="mb-2 sm:mb-0">
                    <div className="flex items-center gap-1 text-gray-700 font-medium">
                      {mode === 'current' ? 'Working Day Reached' : 'Final Working Day Count'}
                      {isTouchDevice ? (
                        <>
                          <button
                            aria-label="More information"
                            onClick={() => setActiveTooltip('working-days')}
                            className="p-1 -m-1 text-gray-400 hover:text-gray-600 relative z-20"
                            type="button"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                          <MobileTooltip
                            content={
                              <div className="font-normal text-left">
                                Working days as defined in s2 of the RMA – excludes weekends, public
                                holidays, and the period between 20 December and 10 January.
                              </div>
                            }
                            isOpen={activeTooltip === 'working-days'}
                            onClose={() => setActiveTooltip(null)}
                          />
                        </>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger aria-label="More information">
                              <Info className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm font-normal">
                                Working days as defined in s2 of the RMA – excludes weekends, public
                                holidays, and the period between 20 December and 10 January.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {result.finalDays}
                    <span className="text-gray-400 mx-1">/</span>
                    {result.maxDays}
                  </div>
                </div>

                {/* Status Alert */}
                {result.isOvertime ? (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                      <div className="flex items-start sm:items-center gap-2 mb-2 sm:mb-0">
                        <span className="text-red-800 font-medium">
                          Over time limit by {result.finalDays - result.maxDays} working{' '}
                          {(result.finalDays - result.maxDays) === 1 ? 'day' : 'days'}
                        </span>
                        {isTouchDevice ? (
                          <>
                            <button
                              aria-label="More information"
                            onClick={() => setActiveTooltip('discount-regulations')}
                              className="p-1 -m-1 text-gray-400 hover:text-gray-600 relative z-20"
                              type="button"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                            <MobileTooltip
                              content="A discount on administrative charges applies when a resource consent or s127 application is processed outside statutory timeframes."
                              isOpen={activeTooltip === 'discount-regulations'}
                              onClose={() => setActiveTooltip(null)}
                              hasLink
                            />
                          </>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger aria-label="More information">
                                <Info className="h-4 w-4 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs p-4">
                                <div className="space-y-2">
                                  <p>
                                    A discount on administrative charges applies when a resource
                                    consent or s127 application is processed outside statutory
                                    timeframes.
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    Learn more about the{' '}
                                    <a
                                      href="https://environment.govt.nz/acts-and-regulations/regulations/discount-on-administrative-charges/"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline"
                                    >
                                      Discount Regulations
                                    </a>
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <span className="text-sm text-red-600">{mode === 'current' ? 'Time limit exceeded as at this date' : 'Check discount requirements'}</span>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                      <span className="text-green-800 font-medium">Application is within time</span>
                      <span className="text-sm text-green-600">{result.maxDays - result.finalDays} working days remaining</span>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Total Calendar Days</div>
                    <div className="text-2xl sm:text-3xl font-semibold text-gray-900">
                      {result.calendarStats?.totalCalendarDays ?? 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Calendar Days Not Counted</div>
                    <div className="text-2xl sm:text-3xl font-semibold text-gray-900">
                      {result.excludedDaysSummary ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between bg-white hover:bg-gray-50"
                aria-expanded={showAudit}
                onClick={() => setShowAudit(!showAudit)}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">Detailed Calculations</span>
                </div>
                {showAudit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>

              {showAudit && (
                <div className="mt-2 bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {/* Elapsed Time */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-medium text-gray-900">Elapsed Time</h4>
                      {isTouchDevice ? (
                        <>
                          <button
                            aria-label="More information"
                            onClick={() => setActiveTooltip('elapsed-time')}
                            className="p-1 -m-1 text-gray-400 hover:text-gray-600 relative z-20"
                            type="button"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                          <MobileTooltip
                            content="Total elapsed time before considering excluded time periods"
                            isOpen={activeTooltip === 'elapsed-time'}
                            onClose={() => setActiveTooltip(null)}
                          />
                        </>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger aria-label="More information">
                              <Info className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Total elapsed time before considering excluded time periods
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="flex justify-between">
                        <span className="text-gray-600">Calendar Days:</span>
                        <span className="font-medium">
                          {result.calendarStats?.totalCalendarDays ?? 0}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-600">Weekend Days:</span>
                        <span className="font-medium">
                          -{result.calendarStats?.weekendDays ?? 0}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-600">Holidays:</span>
                        <span className="font-medium">
                          -{result.calendarStats?.holidayDays ?? 0}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-600">Day 0 Adjustment:</span>
                        <span className="font-medium">
                          -{result.day0Adjustment ?? 0}
                        </span>
                      </p>
                      <p className="flex justify-between text-gray-900 font-medium border-t border-gray-100 pt-2">
                        <span>Working Days (Before Exclusions)</span>
                        <span>{result.elapsedWorkingDays}</span>
                      </p>
                    </div>
                  </div>

                  {/* Excluded Time Periods */}
                  {result.details.holdPeriodDetails.length > 0 && (
                    <div className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">Excluded Time Periods</h4>
                          {isTouchDevice ? (
                            <>
                              <button
                                aria-label="More information"
                            onClick={() => setActiveTooltip('excluded-time')}
                                className="p-1 -m-1 text-gray-400 hover:text-gray-600 relative z-20"
                                type="button"
                              >
                                <Info className="h-4 w-4" />
                              </button>
                              <MobileTooltip
                                content="Excluded working days under the selected RMA suspension provisions"
                                isOpen={activeTooltip === 'excluded-time'}
                                onClose={() => setActiveTooltip(null)}
                              />
                            </>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger aria-label="More information">
                                  <Info className="h-4 w-4 text-gray-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-sm">
                                    Excluded working days under the selected RMA suspension provisions
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>

                        <div
                          className="flex flex-col sm:flex-row items-start sm:items-center
                                     gap-2 text-sm text-blue-800 bg-blue-50 p-3
                                     rounded-md border border-blue-100"
                        >
                          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-1 sm:mt-0" />
                          <span>
                            Date ranges shown here include all calendar days for the excluded period, but working day is as defined in s2 of the RMA – excludes weekends, public holidays, and the period between 20 December and 10 January.

                          </span>
                        </div>

                        <div className="space-y-3">
                          {result.details.holdPeriodDetails.map((period, index) => (
                            <div
                              key={index}
                              className="flex flex-col sm:flex-row justify-between 
                                         items-start sm:items-center text-sm space-y-1 sm:space-y-0 pb-2"
                            >
                              <span className="text-gray-600">
                                {
                                  HOLD_PERIOD_TYPES[
                                    period.type as keyof typeof HOLD_PERIOD_TYPES
                                  ]
                                }
                              </span>
                              <span className="font-medium whitespace-nowrap">
                                {period.days} {period.days === 1 ? 'day ' : 'days '}
                                <span className="block sm:inline text-gray-500">
                                  ({format(parseISO(period.start), 'dd/MM/yyyy')}
                                  <span className="mx-1">–</span>
                                  {format(parseISO(period.end), 'dd/MM/yyyy')})
                                  {period.ongoing && <span className="block text-xs">Still on hold at the as-at date</span>}
                                </span>
                              </span>
                            </div>
                          ))}
                          {result.details.holdPeriodDetails.length > 1 && (
                            <p className="text-xs text-gray-500 italic">
                              Note: Overlapping periods are only counted once in the total
                            </p>
                          )}
                          <p className="flex justify-between text-sm text-gray-900 font-medium pt-2">
                            <span>Total Working Days Excluded:</span>
                            <span>-{result.holdDays}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Extensions */}
                  {extensions.length > 0 && (
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="font-medium text-gray-900">Extension of Time</h4>
                        {isTouchDevice ? (
                          <>
                            <button
                              aria-label="More information"
                            onClick={() => setActiveTooltip('extension-time')}
                              className="p-1 -m-1 text-gray-400 hover:text-gray-600 relative z-20"
                              type="button"
                            >
                              <Info className="h-4 w-4" />
                            </button>
                            <MobileTooltip
                              content="Additional working days under s37 of the RMA"
                              isOpen={activeTooltip === 'extension-time'}
                              onClose={() => setActiveTooltip(null)}
                            />
                          </>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger aria-label="More information">
                                <Info className="h-4 w-4 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Additional working days under s37 of the RMA</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        {extensions.map((ext, index) => {
                          const parsed = parseInt(ext.days, 10);
                          const displayVal = isNaN(parsed) ? 0 : parsed;
                          return (
                            <p key={ext.id} className="flex justify-between">
                              <span className="text-gray-600">Extension {index + 1}:</span>
                              <span className="font-medium">
                                {displayVal} {displayVal === 1 ? 'day' : 'days'}
                              </span>
                            </p>
                          );
                        })}
                        <p className="flex justify-between text-gray-900 font-medium pt-2">
                          <span>Total Extension Days:</span>
                          <span>+{result.extensionDays}</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Summary of Final Calculations */}
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="font-medium text-gray-900">Summary of Final Calculations</h4>
                      {isTouchDevice ? (
                        <>
                          <button
                            aria-label="More information"
                            onClick={() => setActiveTooltip('final-statutory')}
                            className="p-1 -m-1 text-gray-400 hover:text-gray-600 relative z-20"
                            type="button"
                          >
                            <Info className="h-4 w-4" />
                          </button>
                          <MobileTooltip
                            content="A complete look at how net processing time compares to the base timeframe and any extensions"
                            isOpen={activeTooltip === 'final-statutory'}
                            onClose={() => setActiveTooltip(null)}
                          />
                        </>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger aria-label="More information">
                              <Info className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>
                                A complete look at how net processing time compares to the base timeframe and any extensions
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="space-y-3 mt-4 text-sm">
                      <p className="flex flex-col sm:flex-row justify-between gap-2">
                        <span className="text-gray-600">Total Elapsed Working Days:</span>
                        <span className="font-medium">{result.elapsedWorkingDays}</span>
                      </p>
                      <p className="flex flex-col sm:flex-row justify-between gap-2">
                        <span className="text-gray-600">Excluded Working Days (On Hold etc.):</span>
                        <span className="font-medium">-{result.holdDays}</span>
                      </p>
                      <p className="flex flex-col sm:flex-row justify-between gap-2 text-gray-900 font-medium border-t border-gray-200 pt-3">
                        <span>Net Processing Time:</span>
                        <span>{result.finalDays} working days</span>
                      </p>

                      <p className="flex flex-col sm:flex-row justify-between gap-2 pt-3 border-t border-gray-200">
                        <span className="text-gray-600">Base Timeframe:</span>
                        <span className="font-medium">
                          {CONSENT_TYPES[applicationType].baseDays} working days
                        </span>
                      </p>
                      <p className="flex flex-col sm:flex-row justify-between gap-2">
                        <span className="text-gray-600">Total Extension Days:</span>
                        <span className="font-medium">+{result.extensionDays}</span>
                      </p>
                      <p className="flex flex-col sm:flex-row justify-between gap-2 text-gray-900 font-medium border-t border-gray-200 pt-3">
                        <span>Net Statutory Timeframe:</span>
                        <span>{result.maxDays} working days</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Re-show Important Notes AFTER result is calculated */}
            {renderImportantNotesAccordion()}

            {/* NEW: Disclaimer in separate accordion */}
            {renderDisclaimerAccordion()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConsentCalculator;
