# RMA Working Days Calculator

A web-based calculator for processing timeframes under the Resource Management Act 1991 (RMA) in New Zealand. This tool helps planners and consent processors accurately track statutory working days, accounting for excluded time periods, extensions, and non-working days.

## Improvements and verification

Use **Working day as at a date** to check progress without a decision date, or switch to completed-application mode. Current-day mode supports ongoing holds and defaults to today's New Zealand date.

Draft-condition review under **s107G** is an optional excluded period, applicable from 20 October 2025. The authority sets a reasonable response period; no fixed review days are added. Only one s107G suspension is permitted. Enter actual first/last excluded dates, inclusive.

Read the [calculation rules and sources](docs/CALCULATION-RULES.md), [testing report](docs/TEST-REPORT.md), and [hosting/release notes](docs/HOSTING.md).

With Node 24 LTS (minimum 22.18), run `npm ci`, `npm run test:timezones`, `npm run lint`, and `npm run build`. GitHub Actions runs these checks for future changes.

## Features

The calculator provides several key functionalities:

- **Multiple Application Types**: Supports different consent types with varying statutory timeframes:
  - Standard (Non-Notified) — 20 working days
  - Fast-Track — 10 working days
  - Notified without a hearing — 60 working days
  - Limited Notified with hearing — 100 working days
  - Publicly Notified with hearing — 130 working days

- **Smart Date Handling**: Automatically excludes non-working days from 2022-2030 including:
  - Weekends
  - Public holidays
  - The statutory holiday period (20 December – 10 January)

- **Excluded Time Periods**: Tracks various statutory clock stoppages under s88B of the RMA:
  - Written Approvals (s88E)
  - Deposit Payment (s88H)
  - Additional Consents (s91)
  - Notified Application Suspension (s91A)
  - Non-Notified Application Suspension (s91D)
  - Information Requests (s92)

- **Extension Management**: Supports multiple extensions of time under s37

## Technical Details

Built using:
- React with TypeScript
- Tailwind CSS for styling
- shadcn/ui component library
- date-fns for date calculations
- Bundled national holiday data and deterministic calendar-day calculations

## Local Development

To run this project locally:

1. **Clone the repository**:

```
git clone https://github.com/CoLab-Planning/RMA-working-day-calculator.git
```

2. **Install dependencies**:

```
cd RMA-working-day-calculator
npm install
```

3. **Start the development server**:

```
npm run dev
```

## License

This project is licensed under the Mozilla Public License 2.0. See the LICENSE file for details.

## Contributing

We welcome contributions to improve the calculator. Please read our contribution guidelines before submitting pull requests.

## About

Developed by CoLab Planning Limited to assist with resource consent processing. The calculator aims to provide accurate timeframe calculations while considering all relevant sections of the RMA and associated regulations.

## Acknowledgments

This tool was developed in response to the need for accurate statutory timeframe tracking in resource consent processing. It incorporates feedback from planning professionals and follows best practices established by the [Ministry for the Environment](https://environment.govt.nz/)
