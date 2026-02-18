# MSME Uganda Survey Dashboard

## Project Overview
- **Name**: MSME Uganda Survey Dashboard
- **Goal**: Real-time dashboard for monitoring field survey data on "Policy, Finance, and Ecosystem Support for MSMEs in Uganda"
- **Data Source**: KoboToolbox (live data from KoboCollect field submissions)
- **Form UID**: `akEu56NMB8L48xkFkkiBFb`

## Features

### Dashboard Tabs (8 tabs)
| Tab | Description |
|-----|-------------|
| **Overview** | KPI cards (total responses, business types, loans, training, data issues) + timeline, business types, employees, years, failure analysis |
| **Finance** | Finance sources, loan applications, outcomes, challenges |
| **Policy** | Ease of business registration, regulatory challenges |
| **Market** | Marketing channels, market access barriers |
| **Skills** | Important skills radar chart, training participation |
| **Support** | Support types needed, government perception, comments |
| **Data Quality** | Outlier/mistake detection with severity filters and health score |
| **Responses** | Full table of all surveyed businesses with Excel export |

### Data Quality / Outlier Detection
The dashboard automatically detects 6 types of data issues:
- **Duplicate Business** (High) - Same business name submitted multiple times
- **Rushed Submission** (High) - Completed in under 2 minutes
- **Logical Inconsistency** (High) - Contradictory answers (e.g., "No failed business" but lists failure causes)
- **Missing Critical Field** (Medium) - Required fields left empty
- **Extremely Long Duration** (Low) - Over 60 minutes to complete
- **Suspicious Pattern** (Low) - Only 1 option in every multi-select question

### Excel Download
- One-click download of all survey data in `.xlsx` format
- 24 human-readable columns with proper labels
- Available from header button and Responses tab
- File named: `MSME_Uganda_Survey_YYYY-MM-DD.xlsx`

### Real-time Data
- Fetches live data from KoboToolbox API on every page load
- Auto-refreshes every 2 minutes
- Manual refresh button available

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Main dashboard page |
| `GET /api/data` | Raw survey data from KoboToolbox |
| `GET /api/stats` | Computed statistics + data quality summary |
| `GET /api/quality` | Full outlier detection results |
| `GET /api/export` | Clean data formatted for Excel download |

## URLs
- **Production**: `https://msme-uganda-dashboard.pages.dev` (after Cloudflare deployment)
- **Sandbox**: Available via sandbox URL

## Tech Stack
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Frontend**: Tailwind CSS (CDN) + Chart.js + Font Awesome + SheetJS (XLSX)
- **Hosting**: Cloudflare Pages
- **Data**: KoboToolbox API (real-time)

## Environment Variables
- `KOBO_API_TOKEN` - KoboToolbox API authentication token (secret)
- `KOBO_FORM_UID` - Form asset UID for the survey

## Local Development
```bash
npm install
npm run build
npm run dev:sandbox
```

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: Pending Cloudflare API key setup
- **Last Updated**: 2026-02-18
