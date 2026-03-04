# Mukono Business Profiling Survey Dashboard

## Project Overview
- **Name**: Mukono Business Profiling Dashboard
- **Goal**: Real-time dashboard for monitoring the Mukono Municipal Council business profiling survey conducted under the GKMA-UDP World Bank project
- **Data Source**: ODK Central (form: `mukono_business_profiling_2026`, project 1)
- **Partners**: World Bank, Mukono Municipal Council (MMC), Canva Consult

## Live URLs
- **Production Dashboard**: https://msme-uganda-dashboard.pages.dev
- **API - Stats**: https://msme-uganda-dashboard.pages.dev/api/stats
- **API - Quality**: https://msme-uganda-dashboard.pages.dev/api/quality
- **API - Export**: https://msme-uganda-dashboard.pages.dev/api/export
- **API - Raw Data**: https://msme-uganda-dashboard.pages.dev/api/data
- **GitHub**: https://github.com/DrakeNamanya/Mukonoproject

## Dashboard Tabs (9 tabs, 30+ charts)

### 1. Overview
- 6 KPI cards: Total businesses, active sectors, total employees, female ownership %, GPS mapped count, data quality issues
- Collection timeline (daily + cumulative line chart)
- Business sectors (horizontal bar)
- Ward distribution (horizontal bar)
- Legal status (doughnut)
- Enumerator performance (horizontal bar)

### 2. Demographics
- Owner gender (doughnut)
- Age distribution by bracket (bar: 18-25, 26-35, 36-45, 46-55, 56-65, 65+)
- Education level (horizontal bar)
- Ownership structure (doughnut)
- Disability status (doughnut)
- Registration status (doughnut)

### 3. Operations
- Business size by employee count (doughnut: Micro, Small, Medium, Large)
- Employee breakdown by gender & type (bar: Male FT/PT, Female FT/PT, PWD FT/PT)
- Employment growth 3-year trend (horizontal bar)
- Business premises type (doughnut)
- Market reach (doughnut)
- Customer channels (horizontal bar)
- Sourcing challenges (horizontal bar)

### 4. Finance
- Monthly revenue distribution (horizontal bar: Below 500K to Above 50M UGX)
- Revenue trend 3yr (doughnut: Lower/Same/Higher)
- Capital sources (doughnut)
- Loan status (doughnut: Approved/Rejected/Pending)
- Financial records type (doughnut)
- Loan barriers (horizontal bar)
- Trading licence & tax compliance (grouped bar)
- Investment areas (horizontal bar)

### 5. Digital & Infrastructure
- Digital literacy levels (doughnut: Low/Moderate/High)
- Technology used (horizontal bar: 10 options)
- Payment methods (horizontal bar)
- Digital barriers (horizontal bar)
- Regulatory environment rating (bar)
- Infrastructure scores radar chart (9 indicators, avg 1-5)
- Infrastructure challenges (horizontal bar)

### 6. Challenges & Support
- Top business challenges (horizontal bar: 18 categories)
- MMC support needed (horizontal bar: 10 categories)
- Growth opportunities (horizontal bar)
- Training needs (horizontal bar)
- Missing skills (horizontal bar)
- Export plans (doughnut)
- Support programs awareness (horizontal bar)

### 7. Map
- Leaflet interactive map with GPS collection points
- Color-coded markers by business sector
- Click popups showing business name, sector, owner, ward, GPS accuracy
- Legend showing sector colors
- Mapped vs missing GPS counter
- Auto-fits bounds to markers

### 8. Data Quality (16 automated checks)
- 4 severity KPI cards (High/Medium/Low/Health Score)
- Issues by type doughnut chart
- Visual grid of all 16 quality checks with descriptions
- Filterable issue list (All/High/Medium/Low)

**Quality checks:**
| # | Check | Severity | Description |
|---|-------|----------|-------------|
| 1 | Duplicate Business | High | Same name in same ward |
| 2 | Rushed Submission | High | <3 min for 80+ field form |
| 3 | No Consent | High | Respondent declined |
| 4 | Employee Data Error | High | Negative, >500, or sum mismatch |
| 5 | Logical Inconsistency | High/Med | 6 contradiction checks (loan, training, association, tax, online, branches) |
| 6 | Age Outlier | Medium | Outside 16-90 |
| 7 | Year Outlier | Medium | Before 1950 or future |
| 8 | Missing Critical Field | Medium | 16 critical fields checked |
| 9 | Missing GPS | Medium | No GPS coordinates |
| 10 | Revenue Inconsistency | Medium | Cost exceeds revenue |
| 11 | Empty Section | Medium | 5 form sections monitored |
| 12 | Phone Format | Low | Unusual digit count |
| 13 | Operating Hours Outlier | Low | Invalid days/hours |
| 14 | Extremely Long Duration | Low | >3 hours form open |
| 15 | Suspicious Pattern | Low | All multi-select = single option |
| 16 | TIN Format | Low | Unusual TIN number format |

### 9. Responses
- Full table: Business name, sector, ward, owner, gender, employees, revenue, registration, date, submitted by
- Excel export (57 columns covering all form sections)

## Form Fields Covered (12 sections)
- **Section A**: Business identification (name, legal status, sector, division/ward/village, contact, registration)
- **Section A3**: Owner profile (name, role, age, gender, nationality, education, disability, ownership structure)
- **Section B**: Employment & operations (employees by gender/type, size category, growth, premises, market, channels, sourcing)
- **Section C**: Financial performance (revenue, trend, costs, records, investments)
- **Section D**: Compliance (trading licence, taxes)
- **Section E**: Access to finance (capital sources, loans, barriers, support needed)
- **Section F**: Technology & digital (tech used, payments, digital literacy, barriers)
- **Section G**: Infrastructure (9 infrastructure ratings, challenges, location importance)
- **Section H**: Skills & training (missing skills, training sources, needs)
- **Section I**: Challenges & support (18 challenge types, 12 support types)
- **Section J**: Growth & associations (growth opportunities, export plans, associations)
- **Section K**: Government programs (Emyooga, PDM, MMC support needs, investment plans)
- **Regulatory**: Environment rating, policy recommendations
- **Section L**: Enumerator observations (appearance, activity, GPS, notes)

## Tech Stack
- **Backend**: Hono framework (TypeScript) on Cloudflare Workers
- **Frontend**: Tailwind CSS + Chart.js (with datalabels plugin) + Leaflet.js + SheetJS
- **Data**: ODK Central OData API with session authentication
- **Deployment**: Cloudflare Pages
- **Map**: Leaflet.js with OpenStreetMap tiles

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: Active
- **Auto-refresh**: Every 2 minutes
- **Environment**: ODK credentials stored as Cloudflare secrets
- **Last Updated**: 2026-03-04
