# MSME Uganda Survey Dashboard

## Project Overview
- **Name**: MSME Uganda Survey Dashboard
- **Goal**: Real-time dashboard for monitoring field survey data on "Policy, Finance, and Ecosystem Support for MSMEs in Uganda"
- **Data Source**: KoboToolbox (live data from KoboCollect field submissions)
- **Form UID**: `akEu56NMB8L48xkFkkiBFb`

## Features
- **Real-time data**: Fetches live data from KoboToolbox API on every page load
- **Auto-refresh**: Dashboard auto-refreshes every 2 minutes
- **7 Section Tabs**: Overview, Finance, Policy, Market, Skills, Support, Responses
- **14+ Interactive Charts**: Bar, Doughnut, Line, Polar Area, Radar charts
- **KPI Cards**: Total submissions, business types, loan applications, training participation
- **Submission Timeline**: Line chart showing daily and cumulative submissions
- **Business Listing Table**: Full list of all surveyed businesses
- **Comments Section**: All respondent comments and suggestions
- **Responsive Design**: Works on desktop, tablet, and mobile

## Dashboard Sections & Indicators

| Tab | Indicators Shown |
|-----|-----------------|
| **Overview** | Total submissions, business types, employee counts, years in operation, failed businesses, failure causes |
| **Finance** | Finance sources, loan applications, loan outcomes, finance challenges |
| **Policy** | Ease of business registration, regulatory challenges |
| **Market** | Marketing channels, market access barriers |
| **Skills** | Important skills, training participation |
| **Support** | Support types needed, government role perception, comments |
| **Responses** | Full table of all surveyed businesses |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Main dashboard page |
| `GET /api/data` | Raw survey data from KoboToolbox |
| `GET /api/stats` | Computed statistics for all indicators |

## Tech Stack
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Frontend**: Tailwind CSS (CDN) + Chart.js + Font Awesome
- **Hosting**: Cloudflare Pages
- **Data**: KoboToolbox API (real-time)

## Environment Variables
- `KOBO_API_TOKEN` - KoboToolbox API authentication token
- `KOBO_FORM_UID` - Form asset UID for the survey

## Local Development
```bash
npm install
npm run build
npm run dev:sandbox
```

## Deployment
- **Platform**: Cloudflare Pages
- **Tech Stack**: Hono + TypeScript + Tailwind CSS + Chart.js
- **Last Updated**: 2026-02-18
