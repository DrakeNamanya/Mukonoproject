# Farmer Registration Dashboard

## Project Overview
- **Name**: Farmer Registration Dashboard
- **Goal**: Real-time dashboard for monitoring farmer registration data collected via ODK Central
- **Data Source**: ODK Central (odk.datacollectors.app) - Form: `farmer_demo_001`
- **Live URL**: https://msme-uganda-dashboard.pages.dev
- **GitHub**: https://github.com/DrakeNamanya/Mukonoproject

## Features

### Dashboard Tabs
1. **Overview** - KPI cards (total farmers, districts covered, avg age, avg household, consent rate, data issues) + timeline, district, gender, crop charts
2. **Demographics** - Age distribution, household size, gender by district (stacked bar), consent status
3. **Agriculture** - Crop overview (polar), crops by district (stacked bar)
4. **Enumerators** - Submissions per enumerator (bar chart + performance table)
5. **Data Quality** - 6 automated outlier checks with severity filtering
6. **Responses** - Full table with all registered farmers + Submitted By column

### Data Quality Checks
| Check | Severity | Description |
|-------|----------|-------------|
| Duplicate Farmer | HIGH | Same farmer name in same district |
| Rushed Submission | HIGH | Completed in under 60 seconds |
| No Consent | HIGH | Farmer declined consent |
| Age Outlier | MEDIUM | Age outside 15-100 range |
| Missing Critical Field | MEDIUM | Required fields left empty |
| Household Outlier | LOW | Household size exceeds 30 |

### Other Features
- **Excel Download** - Export all data as `.xlsx` with 16 columns
- **Chart Data Labels** - All charts show counts/percentages
- **Auto-refresh** - Data updates every 2 minutes
- **Submitted By** - Shows enumerator name from ODK Central

## Form Fields (farmer_demo_001)
| Field | Type | Choices |
|-------|------|---------|
| enumerator_name | Text | - |
| district | Select One | Wakiso, Mukono, Jinja, Kampala |
| farmer_name | Text | - |
| gender | Select One | Male, Female, Other |
| age | Integer | - |
| phone | Text | - |
| national_id | Text | - |
| gps_location | GeoPoint | - |
| farmer_photo | Image | - |
| household_size | Integer | - |
| main_crop | Select One | Maize, Beans, Coffee, Cassava |
| consent | Select One | Yes, No |

## API Endpoints
| Endpoint | Description |
|----------|-------------|
| `GET /` | Main dashboard page |
| `GET /api/stats` | Aggregated statistics |
| `GET /api/data` | Raw submission data |
| `GET /api/export` | Formatted data for Excel export |
| `GET /api/quality` | Data quality/outlier analysis |

## Tech Stack
- **Backend**: Hono framework (Cloudflare Workers)
- **Frontend**: Tailwind CSS + Chart.js + chartjs-plugin-datalabels
- **Data Source**: ODK Central OData API
- **Hosting**: Cloudflare Pages
- **Auth**: ODK Central session tokens (email/password stored as Cloudflare secrets)

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: Active
- **Last Updated**: 2026-02-24

## Environment Variables (Cloudflare Secrets)
- `ODK_EMAIL` - ODK Central email
- `ODK_PASSWORD` - ODK Central password
- `ODK_SERVER` - ODK Central server URL
- `ODK_PROJECT_ID` - ODK project ID
- `ODK_FORM_ID` - ODK form ID
