# Mukono Business Profiling Dashboard

## Project Overview
- **Name**: MSME Uganda Dashboard (Mukono Business Profiling Survey)
- **Goal**: Real-time monitoring dashboard for the Mukono Municipal Council MSME business profiling survey under the GKMA-UDP (World Bank) project
- **Form**: ODK Central Form v4 — `mukono_business_profiling_2026` (Project 1)
- **Partners**: World Bank, Mukono Municipal Council, Canva Consult

## URLs
- **Production**: https://msme-uganda-dashboard.pages.dev
- **GitHub**: https://github.com/DrakeNamanya/Mukonoproject

## Dashboard Tabs (9)

### 1. Overview
- 6 KPI cards: Total businesses, active sectors, total employees, female %, GPS mapped, data quality issues
- Collection timeline (daily + cumulative line chart)
- Business sectors horizontal bar
- Ward distribution, legal status (doughnut), enumerator performance

### 2. Demographics
- Owner gender (doughnut), age distribution (bar), education level, ownership structure
- Disability status, registration status, nationality

### 3. Operations
- Business size categories, employee breakdown (male/female/PWD, FT/PT)
- Employment growth, business premises, market reach
- Customer channels, sourcing challenges
- **NEW v4**: Production capacity (at full capacity vs below)

### 4. Finance
- Monthly revenue distribution, revenue trend (3yr), capital sources
- Loan status, financial records, loan barriers
- Trading licence & tax compliance (incl. tax incentives — v4)
- Investment areas

### 5. Digital & Infrastructure
- Digital literacy, technology used, payment methods
- Digital barriers, regulatory environment
- Infrastructure radar chart (8 dimensions: road, electricity, waste, drainage, security, internet, transport, parking)
- Infrastructure challenges

### 6. Challenges
- Top business challenges (ranked), MMC support needed (ranked)
- Growth opportunities, training needs, missing skills
- Export plans, support programs known

### 7. Field Map (GPS Tracker)
- **Zoomed-in street-level** Leaflet map (maxZoom 19, auto-fit zoom 17)
- Color-coded markers by business sector
- **Enumerator trail lines**: dashed polylines showing GPS movement path between surveys
- **Transit detection**: flags long gaps (>2km distance OR >2hr time) with red dashed lines and car icons
- Per-enumerator filtering with color-coded badges
- Recent submission pulse indicator (within 1 hour)
- Map stats: avg GPS accuracy, recent count, transit alerts, trail count
- Toggle controls for trails and transit detection
- Haversine distance calculation for accurate GPS measurement

### 8. Data Quality (18 Automated Checks)
- **HIGH severity**: Duplicate business, rushed submission (<3 min), no consent, employee data error, logical inconsistencies (10 checks)
- **MEDIUM severity**: Age outlier, year outlier, missing critical field (18 fields), missing GPS, revenue inconsistency, empty section (7 sections), production inconsistency
- **LOW severity**: Phone format, operating hours outlier, long duration (>3hr), suspicious pattern, TIN format, GPS accuracy poor (>100m)
- Health score calculation, severity filtering, issues by type chart

### 9. Responses
- Full table with all businesses: name, sector, ward, owner, gender, employees, revenue, GPS status, date, submitted by
- 70+ column Excel export

## v4 Form Fields Covered (13 sections)
- **Section A**: Business identification (legal name, trading name, legal status, division/ward/village, contact, phone, email, website, year established, sector, products, registration)
- **Section A3**: Owner details (name, role, age, gender, nationality, education, disability, ownership structure, family generation)
- **Section B**: Employment & operations (employee counts by gender/type/PWD, size category, growth, premises, operating hours, branches, market, channels, online, sourcing)
- **Section B4 Production** (NEW): Current/max production capacity, full capacity status, reasons
- **Section C**: Finance (revenue, trend, production cost, financial records, investments)
- **Section D**: Tax & licensing (trading licence, taxes, tax types, tax incentives)
- **Section E**: Capital & loans (sources, loan application, status, barriers, financial support)
- **Section F**: Technology (tech interest, tech used, payment methods, digital literacy, digital adoption, barriers)
- **Section G**: Infrastructure (8 rating fields, challenges ranked, location importance)
- **Section H**: Skills & training (lacks skills, missing skills, received training, sources, training needs ranked)
- **Section I**: Challenges (business challenges ranked, support needed, collaboration interest)
- **Section J**: Growth & associations (opportunities, fairs, association membership, export plans)
- **Section K**: Support & investment (awareness, programs, MMC support ranked, investment plans, business plan)
- **Investment Section** (NEW): Feasibility study, seeking investment, investment amount, unique value proposition
- **Regulatory Section**: Rating, policy recommendations
- **Section L**: Observation (business appearance, customers observed, activity level, enumerator notes, GPS)

## API Endpoints
| Path | Method | Description |
|------|--------|-------------|
| `/` | GET | Dashboard HTML |
| `/api/stats` | GET | All aggregated statistics, charts data, GPS points, enumerator trails |
| `/api/data` | GET | Raw OData submissions |
| `/api/quality` | GET | Data quality report with 18 checks |
| `/api/export` | GET | 70+ column export data for Excel |

## Tech Stack
- **Backend**: Hono (TypeScript) on Cloudflare Workers
- **Frontend**: Tailwind CSS, Chart.js v4.4.1 + datalabels plugin, Leaflet 1.9.4, SheetJS (xlsx)
- **Data Source**: ODK Central OData API with session authentication
- **Deployment**: Cloudflare Pages
- **Auto-refresh**: Every 2 minutes

## Deployment
- **Platform**: Cloudflare Pages
- **Project**: msme-uganda-dashboard
- **Status**: Active
- **Last Updated**: 2026-04-09 (Form v4 redesign)
