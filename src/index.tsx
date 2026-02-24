import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  ODK_EMAIL: string
  ODK_PASSWORD: string
  ODK_SERVER: string
  ODK_PROJECT_ID: string
  ODK_FORM_ID: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// ==================== LABEL MAPPINGS ====================
const LABELS: Record<string, Record<string, string>> = {
  district: {
    'wakiso': 'Wakiso',
    'mukono': 'Mukono',
    'jinja': 'Jinja',
    'kampala': 'Kampala'
  },
  gender: {
    'male': 'Male',
    'female': 'Female',
    'other': 'Other'
  },
  main_crop: {
    'maize': 'Maize',
    'beans': 'Beans',
    'coffee': 'Coffee',
    'cassava': 'Cassava'
  },
  consent: {
    'yes': 'Yes',
    'no': 'No'
  }
}

// ==================== HELPER FUNCTIONS ====================
function countValues(records: any[], field: string, labelMap: Record<string, string>) {
  const counts: Record<string, number> = {}
  for (const key of Object.keys(labelMap)) {
    counts[labelMap[key]] = 0
  }
  for (const r of records) {
    const val = r[field]
    if (val && labelMap[val]) {
      counts[labelMap[val]] = (counts[labelMap[val]] || 0) + 1
    }
  }
  return counts
}

function getSubmissionTimeline(records: any[]) {
  const timeline: Record<string, number> = {}
  for (const r of records) {
    const time = r['__system']?.submissionDate
    if (time) {
      const date = time.split('T')[0]
      timeline[date] = (timeline[date] || 0) + 1
    }
  }
  const sorted: Record<string, number> = {}
  for (const key of Object.keys(timeline).sort()) {
    sorted[key] = timeline[key]
  }
  return sorted
}

function getAgeDistribution(records: any[]) {
  const buckets: Record<string, number> = {
    'Under 18': 0,
    '18-25': 0,
    '26-35': 0,
    '36-45': 0,
    '46-60': 0,
    'Over 60': 0
  }
  for (const r of records) {
    const age = r['age']
    if (age != null) {
      if (age < 18) buckets['Under 18']++
      else if (age <= 25) buckets['18-25']++
      else if (age <= 35) buckets['26-35']++
      else if (age <= 45) buckets['36-45']++
      else if (age <= 60) buckets['46-60']++
      else buckets['Over 60']++
    }
  }
  return buckets
}

function getHouseholdDistribution(records: any[]) {
  const buckets: Record<string, number> = {
    '1-3': 0,
    '4-6': 0,
    '7-10': 0,
    '11-15': 0,
    'Over 15': 0
  }
  for (const r of records) {
    const hs = r['household_size']
    if (hs != null) {
      if (hs <= 3) buckets['1-3']++
      else if (hs <= 6) buckets['4-6']++
      else if (hs <= 10) buckets['7-10']++
      else if (hs <= 15) buckets['11-15']++
      else buckets['Over 15']++
    }
  }
  return buckets
}

function getEnumeratorStats(records: any[]) {
  const counts: Record<string, number> = {}
  for (const r of records) {
    const name = (r['__system']?.submitterName || r['enumerator_name'] || 'Unknown').trim()
    counts[name] = (counts[name] || 0) + 1
  }
  return counts
}

function getCropByDistrict(records: any[]) {
  const matrix: Record<string, Record<string, number>> = {}
  for (const distVal of Object.keys(LABELS.district)) {
    const distLabel = LABELS.district[distVal]
    matrix[distLabel] = {}
    for (const cropVal of Object.keys(LABELS.main_crop)) {
      matrix[distLabel][LABELS.main_crop[cropVal]] = 0
    }
  }
  for (const r of records) {
    const dist = LABELS.district[r['district']] || r['district']
    const crop = LABELS.main_crop[r['main_crop']] || r['main_crop']
    if (dist && crop && matrix[dist]) {
      matrix[dist][crop] = (matrix[dist][crop] || 0) + 1
    }
  }
  return matrix
}

function getGenderByDistrict(records: any[]) {
  const matrix: Record<string, Record<string, number>> = {}
  for (const distVal of Object.keys(LABELS.district)) {
    const distLabel = LABELS.district[distVal]
    matrix[distLabel] = {}
    for (const gVal of Object.keys(LABELS.gender)) {
      matrix[distLabel][LABELS.gender[gVal]] = 0
    }
  }
  for (const r of records) {
    const dist = LABELS.district[r['district']] || r['district']
    const gen = LABELS.gender[r['gender']] || r['gender']
    if (dist && gen && matrix[dist]) {
      matrix[dist][gen] = (matrix[dist][gen] || 0) + 1
    }
  }
  return matrix
}

// ==================== OUTLIER / DATA QUALITY DETECTION ====================
interface DataIssue {
  id: string
  farmer: string
  severity: 'high' | 'medium' | 'low'
  type: string
  description: string
  field: string
  submitted: string
}

function detectDataIssues(records: any[]): { issues: DataIssue[], summary: Record<string, number> } {
  const issues: DataIssue[] = []
  const summary: Record<string, number> = {
    'Duplicate Farmer': 0,
    'Rushed Submission': 0,
    'Age Outlier': 0,
    'Missing Critical Field': 0,
    'Household Outlier': 0,
    'No Consent': 0
  }

  // Track duplicate farmer names per district
  const nameDistrict: Record<string, string[]> = {}
  for (const r of records) {
    const key = ((r['farmer_name'] || '') + '|' + (r['district'] || '')).toLowerCase().trim()
    if (key !== '|') {
      if (!nameDistrict[key]) nameDistrict[key] = []
      nameDistrict[key].push(r['__id'])
    }
  }

  for (const r of records) {
    const id = r['__id'] || ''
    const farmer = r['farmer_name'] || 'Unknown'
    const submitted = r['__system']?.submissionDate?.split('T')[0] || ''

    // 1. Duplicate farmer name in same district
    const key = ((r['farmer_name'] || '') + '|' + (r['district'] || '')).toLowerCase().trim()
    if (key !== '|' && nameDistrict[key] && nameDistrict[key].length > 1) {
      issues.push({
        id, farmer, severity: 'high', type: 'Duplicate Farmer',
        description: `"${farmer}" registered ${nameDistrict[key].length} times in ${LABELS.district[r['district']] || r['district']}. Possible duplicate.`,
        field: 'Farmer Name + District', submitted
      })
      summary['Duplicate Farmer']++
    }

    // 2. Rushed submission (< 1 minute)
    if (r['start'] && r['end']) {
      const start = new Date(r['start']).getTime()
      const end = new Date(r['end']).getTime()
      const durationSec = (end - start) / 1000
      if (durationSec < 60) {
        issues.push({
          id, farmer, severity: 'high', type: 'Rushed Submission',
          description: `Completed in ${Math.round(durationSec)} seconds. Form has 12 fields — likely a test entry.`,
          field: 'Completion Time', submitted
        })
        summary['Rushed Submission']++
      }
    }

    // 3. Age outlier
    const age = r['age']
    if (age != null) {
      if (age < 15 || age > 100) {
        issues.push({
          id, farmer, severity: 'medium', type: 'Age Outlier',
          description: `Age ${age} is outside expected range (15-100). Verify with enumerator.`,
          field: 'Age', submitted
        })
        summary['Age Outlier']++
      }
    }

    // 4. Missing critical fields
    const criticalFields = [
      { key: 'farmer_name', label: 'Farmer Name' },
      { key: 'district', label: 'District' },
      { key: 'gender', label: 'Gender' },
      { key: 'age', label: 'Age' },
      { key: 'main_crop', label: 'Main Crop' },
      { key: 'gps_location', label: 'GPS Location' }
    ]
    for (const f of criticalFields) {
      const val = r[f.key]
      if (val === null || val === undefined || val === '') {
        issues.push({
          id, farmer, severity: 'medium', type: 'Missing Critical Field',
          description: `"${f.label}" is empty. This is a required field.`,
          field: f.label, submitted
        })
        summary['Missing Critical Field']++
      }
    }

    // 5. Household size outlier
    const hs = r['household_size']
    if (hs != null && hs > 30) {
      issues.push({
        id, farmer, severity: 'low', type: 'Household Outlier',
        description: `Household size of ${hs} is unusually large. Please verify.`,
        field: 'Household Size', submitted
      })
      summary['Household Outlier']++
    }

    // 6. No consent
    if (r['consent'] === 'no') {
      issues.push({
        id, farmer, severity: 'high', type: 'No Consent',
        description: `Farmer did NOT consent to provide information. This record may need to be excluded.`,
        field: 'Consent', submitted
      })
      summary['No Consent']++
    }
  }

  return { issues, summary }
}

// ==================== EXPORT DATA BUILDER ====================
function buildExportData(records: any[]) {
  return records.map((r: any, i: number) => {
    const durationMin = (r['start'] && r['end'])
      ? ((new Date(r['end']).getTime() - new Date(r['start']).getTime()) / 60000).toFixed(1)
      : ''

    const gps = r['gps_location']
    let gpsStr = ''
    if (gps && gps.coordinates) {
      gpsStr = `${gps.coordinates[1]}, ${gps.coordinates[0]}`
    }

    return {
      '#': i + 1,
      'Submission ID': r['__id'] || '',
      'Submission Date': r['__system']?.submissionDate || '',
      'Duration (min)': durationMin,
      'Enumerator': r['enumerator_name'] || '',
      'Submitted By': r['__system']?.submitterName || '',
      'District': LABELS.district[r['district']] || r['district'] || '',
      'Farmer Name': r['farmer_name'] || '',
      'Gender': LABELS.gender[r['gender']] || r['gender'] || '',
      'Age': r['age'] ?? '',
      'Phone': r['phone'] || '',
      'National ID': r['national_id'] || '',
      'GPS (Lat, Lon)': gpsStr,
      'Household Size': r['household_size'] ?? '',
      'Main Crop': LABELS.main_crop[r['main_crop']] || r['main_crop'] || '',
      'Consent': LABELS.consent[r['consent']] || r['consent'] || ''
    }
  })
}

// ==================== ODK CENTRAL AUTH & FETCH ====================
async function getSessionToken(server: string, email: string, password: string): Promise<string> {
  const resp = await fetch(`${server}/v1/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!resp.ok) {
    throw new Error(`ODK Auth failed: ${resp.status} ${resp.statusText}`)
  }
  const data = await resp.json() as { token: string }
  return data.token
}

async function fetchODKData(server: string, token: string, projectId: string, formId: string) {
  const url = `${server}/v1/projects/${projectId}/forms/${formId}.svc/Submissions?$count=true&$top=50000`
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!resp.ok) {
    throw new Error(`ODK API error: ${resp.status} ${resp.statusText}`)
  }
  return resp.json() as Promise<{ value: any[], '@odata.count': number }>
}

// ==================== API ROUTES ====================

app.get('/api/data', async (c) => {
  try {
    const server = c.env.ODK_SERVER || 'https://odk.datacollectors.app'
    const email = c.env.ODK_EMAIL || 'drnamanya@gmail.com'
    const password = c.env.ODK_PASSWORD || 'Tw1n0mulamuz1!'
    const projectId = c.env.ODK_PROJECT_ID || '2'
    const formId = c.env.ODK_FORM_ID || 'farmer_demo_001'

    const token = await getSessionToken(server, email, password)
    const data = await fetchODKData(server, token, projectId, formId)
    return c.json({ success: true, count: data['@odata.count'], results: data.value })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

app.get('/api/export', async (c) => {
  try {
    const server = c.env.ODK_SERVER || 'https://odk.datacollectors.app'
    const email = c.env.ODK_EMAIL || 'drnamanya@gmail.com'
    const password = c.env.ODK_PASSWORD || 'Tw1n0mulamuz1!'
    const projectId = c.env.ODK_PROJECT_ID || '2'
    const formId = c.env.ODK_FORM_ID || 'farmer_demo_001'

    const token = await getSessionToken(server, email, password)
    const data = await fetchODKData(server, token, projectId, formId)
    const exportRows = buildExportData(data.value)
    return c.json({ success: true, count: data['@odata.count'], rows: exportRows })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

app.get('/api/quality', async (c) => {
  try {
    const server = c.env.ODK_SERVER || 'https://odk.datacollectors.app'
    const email = c.env.ODK_EMAIL || 'drnamanya@gmail.com'
    const password = c.env.ODK_PASSWORD || 'Tw1n0mulamuz1!'
    const projectId = c.env.ODK_PROJECT_ID || '2'
    const formId = c.env.ODK_FORM_ID || 'farmer_demo_001'

    const token = await getSessionToken(server, email, password)
    const data = await fetchODKData(server, token, projectId, formId)
    const quality = detectDataIssues(data.value)
    return c.json({
      success: true,
      total_submissions: data['@odata.count'],
      total_issues: quality.issues.length,
      issues_by_type: quality.summary,
      issues: quality.issues
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

app.get('/api/stats', async (c) => {
  try {
    const server = c.env.ODK_SERVER || 'https://odk.datacollectors.app'
    const email = c.env.ODK_EMAIL || 'drnamanya@gmail.com'
    const password = c.env.ODK_PASSWORD || 'Tw1n0mulamuz1!'
    const projectId = c.env.ODK_PROJECT_ID || '2'
    const formId = c.env.ODK_FORM_ID || 'farmer_demo_001'

    const token = await getSessionToken(server, email, password)
    const data = await fetchODKData(server, token, projectId, formId)
    const records = data.value

    // Compute all statistics
    const quality = detectDataIssues(records)

    // Average age
    const ages = records.map((r: any) => r['age']).filter((a: any) => a != null)
    const avgAge = ages.length > 0 ? Math.round(ages.reduce((s: number, a: number) => s + a, 0) / ages.length) : 0

    // Average household
    const hhSizes = records.map((r: any) => r['household_size']).filter((h: any) => h != null)
    const avgHH = hhSizes.length > 0 ? Math.round(hhSizes.reduce((s: number, h: number) => s + h, 0) / hhSizes.length * 10) / 10 : 0

    // Consent rate
    const consentYes = records.filter((r: any) => r['consent'] === 'yes').length
    const consentRate = records.length > 0 ? Math.round(consentYes / records.length * 100) : 0

    const stats = {
      total_submissions: data['@odata.count'],
      submission_timeline: getSubmissionTimeline(records),
      districts: countValues(records, 'district', LABELS.district),
      gender: countValues(records, 'gender', LABELS.gender),
      age_distribution: getAgeDistribution(records),
      avg_age: avgAge,
      main_crop: countValues(records, 'main_crop', LABELS.main_crop),
      consent: countValues(records, 'consent', LABELS.consent),
      consent_rate: consentRate,
      household_distribution: getHouseholdDistribution(records),
      avg_household: avgHH,
      enumerator_stats: getEnumeratorStats(records),
      crop_by_district: getCropByDistrict(records),
      gender_by_district: getGenderByDistrict(records),

      // Farmers list for responses table
      farmers: records.map((r: any) => {
        const gps = r['gps_location']
        let lat = '', lon = ''
        if (gps && gps.coordinates) {
          lat = gps.coordinates[1]?.toFixed(5) || ''
          lon = gps.coordinates[0]?.toFixed(5) || ''
        }
        return {
          id: r['__id'] || '',
          farmer_name: r['farmer_name'] || 'Unknown',
          district: LABELS.district[r['district']] || r['district'] || 'N/A',
          gender: LABELS.gender[r['gender']] || r['gender'] || 'N/A',
          age: r['age'] ?? 'N/A',
          phone: r['phone'] || '-',
          main_crop: LABELS.main_crop[r['main_crop']] || r['main_crop'] || 'N/A',
          household_size: r['household_size'] ?? '-',
          consent: r['consent'] === 'yes' ? 'Yes' : r['consent'] === 'no' ? 'No' : '-',
          lat, lon,
          submitted: r['__system']?.submissionDate || '',
          submitted_by: r['__system']?.submitterName || r['enumerator_name'] || 'N/A',
          enumerator: r['enumerator_name'] || 'N/A'
        }
      }),

      data_quality: {
        total_issues: quality.issues.length,
        high_severity: quality.issues.filter(i => i.severity === 'high').length,
        medium_severity: quality.issues.filter(i => i.severity === 'medium').length,
        low_severity: quality.issues.filter(i => i.severity === 'low').length,
        issues_by_type: quality.summary
      },
      last_updated: new Date().toISOString()
    }

    return c.json({ success: true, stats })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// ==================== MAIN DASHBOARD PAGE ====================
app.get('/', (c) => {
  return c.html(dashboardHTML())
})

function dashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Farmer Registration Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    body { font-family: 'Inter', sans-serif; }
    .card { transition: all 0.3s ease; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
    .stat-number { font-variant-numeric: tabular-nums; }
    .chart-container { position: relative; width: 100%; }
    .loader { border: 4px solid #f3f4f6; border-top: 4px solid #16a34a; border-radius: 50%; width: 40px; height: 40px; animation: spin 0.8s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.5s ease-out; }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .gradient-bg { background: linear-gradient(135deg, #14532d 0%, #166534 40%, #15803d 100%); }
    .nav-active { background: rgba(255,255,255,0.15); border-bottom: 3px solid #fbbf24; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; }
    ::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 3px; }
    .severity-high { background: #fef2f2; border-color: #fecaca; }
    .severity-medium { background: #fffbeb; border-color: #fed7aa; }
    .severity-low { background: #f0fdf4; border-color: #bbf7d0; }
    .badge-high { background: #dc2626; color: white; }
    .badge-medium { background: #d97706; color: white; }
    .badge-low { background: #16a34a; color: white; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <!-- Header -->
  <header class="gradient-bg text-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-3">
            <div class="bg-white/20 p-2 rounded-lg">
              <i class="fas fa-seedling text-2xl text-yellow-300"></i>
            </div>
            <div>
              <h1 class="text-xl sm:text-2xl font-bold">Farmer Registration Dashboard</h1>
              <p class="text-sm text-green-200 mt-0.5">Mukono District &mdash; ODK Central Real-Time Data</p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
            <div class="pulse-dot"></div>
            <span class="text-sm font-medium">Live Data</span>
          </div>
          <button onclick="downloadExcel()" id="downloadBtn" class="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2">
            <i class="fas fa-file-excel"></i> Download Excel
          </button>
          <button onclick="refreshData()" class="bg-yellow-500 hover:bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2">
            <i class="fas fa-sync-alt" id="refreshIcon"></i> Refresh
          </button>
        </div>
      </div>
    </div>
    <!-- Navigation Tabs -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6">
      <nav class="flex gap-1 overflow-x-auto pb-0" id="navTabs">
        <button onclick="switchTab('overview')" class="nav-tab nav-active px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition" data-tab="overview">
          <i class="fas fa-tachometer-alt mr-1.5"></i>Overview
        </button>
        <button onclick="switchTab('demographics')" class="nav-tab px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="demographics">
          <i class="fas fa-users mr-1.5"></i>Demographics
        </button>
        <button onclick="switchTab('agriculture')" class="nav-tab px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="agriculture">
          <i class="fas fa-leaf mr-1.5"></i>Agriculture
        </button>
        <button onclick="switchTab('enumerators')" class="nav-tab px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="enumerators">
          <i class="fas fa-user-tie mr-1.5"></i>Enumerators
        </button>
        <button onclick="switchTab('quality')" class="nav-tab px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="quality">
          <i class="fas fa-shield-alt mr-1.5"></i>Data Quality
          <span id="quality-badge" class="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white hidden">0</span>
        </button>
        <button onclick="switchTab('responses')" class="nav-tab px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="responses">
          <i class="fas fa-list mr-1.5"></i>Responses
        </button>
      </nav>
    </div>
  </header>

  <!-- Loading State -->
  <div id="loading" class="flex flex-col items-center justify-center py-20">
    <div class="loader mb-4"></div>
    <p class="text-gray-500 font-medium">Fetching live data from ODK Central...</p>
  </div>

  <!-- Error State -->
  <div id="error" class="hidden max-w-7xl mx-auto px-4 py-10">
    <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-3"></i>
      <h3 class="text-red-700 font-semibold text-lg">Failed to load data</h3>
      <p class="text-red-500 mt-1" id="errorMsg"></p>
      <button onclick="refreshData()" class="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">Retry</button>
    </div>
  </div>

  <!-- Main Content -->
  <main id="mainContent" class="hidden max-w-7xl mx-auto px-4 sm:px-6 py-6">

    <!-- ==================== OVERVIEW TAB ==================== -->
    <div class="tab-content active" id="tab-overview">
      <!-- KPI Cards Row 1 -->
      <div class="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6 fade-in">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Farmers</span>
            <div class="bg-green-100 p-2 rounded-lg"><i class="fas fa-users text-green-600"></i></div>
          </div>
          <div class="stat-number text-3xl font-bold text-gray-800" id="kpi-total">-</div>
          <p class="text-xs text-gray-400 mt-1">Total registered</p>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Districts</span>
            <div class="bg-blue-100 p-2 rounded-lg"><i class="fas fa-map-marker-alt text-blue-600"></i></div>
          </div>
          <div class="stat-number text-3xl font-bold text-gray-800" id="kpi-districts">-</div>
          <p class="text-xs text-gray-400 mt-1">Covered areas</p>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Age</span>
            <div class="bg-purple-100 p-2 rounded-lg"><i class="fas fa-birthday-cake text-purple-600"></i></div>
          </div>
          <div class="stat-number text-3xl font-bold text-gray-800" id="kpi-avgage">-</div>
          <p class="text-xs text-gray-400 mt-1">Years old</p>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Household</span>
            <div class="bg-amber-100 p-2 rounded-lg"><i class="fas fa-home text-amber-600"></i></div>
          </div>
          <div class="stat-number text-3xl font-bold text-gray-800" id="kpi-avghh">-</div>
          <p class="text-xs text-gray-400 mt-1">Members</p>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Consent Rate</span>
            <div class="bg-teal-100 p-2 rounded-lg"><i class="fas fa-check-circle text-teal-600"></i></div>
          </div>
          <div class="stat-number text-3xl font-bold text-gray-800" id="kpi-consent">-</div>
          <p class="text-xs text-gray-400 mt-1">Gave consent</p>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100 cursor-pointer" onclick="switchTab('quality')">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data Issues</span>
            <div class="bg-red-100 p-2 rounded-lg"><i class="fas fa-exclamation-triangle text-red-600"></i></div>
          </div>
          <div class="stat-number text-3xl font-bold" id="kpi-issues">-</div>
          <p class="text-xs mt-1" id="kpi-issues-detail">Click to view</p>
        </div>
      </div>

      <!-- Row: Timeline + District Distribution -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-chart-area text-green-500 mr-2"></i>Registration Timeline</h3>
          <div class="chart-container" style="height:260px"><canvas id="chart-timeline"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-map text-blue-500 mr-2"></i>Farmers by District</h3>
          <div class="chart-container" style="height:260px"><canvas id="chart-districts"></canvas></div>
        </div>
      </div>

      <!-- Row: Gender + Main Crop -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-venus-mars text-pink-500 mr-2"></i>Gender Distribution</h3>
          <div class="chart-container" style="height:260px"><canvas id="chart-gender"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-seedling text-emerald-500 mr-2"></i>Main Crop Grown</h3>
          <div class="chart-container" style="height:260px"><canvas id="chart-crops"></canvas></div>
        </div>
      </div>
    </div>

    <!-- ==================== DEMOGRAPHICS TAB ==================== -->
    <div class="tab-content" id="tab-demographics">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-chart-bar text-purple-500 mr-2"></i>Age Distribution</h3>
          <div class="chart-container" style="height:300px"><canvas id="chart-age"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-home text-amber-500 mr-2"></i>Household Size Distribution</h3>
          <div class="chart-container" style="height:300px"><canvas id="chart-household"></canvas></div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-table text-blue-500 mr-2"></i>Gender by District</h3>
          <div class="chart-container" style="height:300px"><canvas id="chart-gender-district"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-handshake text-teal-500 mr-2"></i>Consent Status</h3>
          <div class="chart-container" style="height:300px"><canvas id="chart-consent"></canvas></div>
        </div>
      </div>
    </div>

    <!-- ==================== AGRICULTURE TAB ==================== -->
    <div class="tab-content" id="tab-agriculture">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-leaf text-green-500 mr-2"></i>Main Crops Overview</h3>
          <div class="chart-container" style="height:300px"><canvas id="chart-crops-polar"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-layer-group text-orange-500 mr-2"></i>Crops by District</h3>
          <div class="chart-container" style="height:300px"><canvas id="chart-crop-district"></canvas></div>
        </div>
      </div>
    </div>

    <!-- ==================== ENUMERATORS TAB ==================== -->
    <div class="tab-content" id="tab-enumerators">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-user-tie text-indigo-500 mr-2"></i>Submissions per Enumerator</h3>
          <div class="chart-container" style="height:320px"><canvas id="chart-enumerators"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-award text-yellow-500 mr-2"></i>Enumerator Performance</h3>
          <div id="enumerator-table" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="text-left py-3 px-4 font-semibold text-gray-600">#</th>
                  <th class="text-left py-3 px-4 font-semibold text-gray-600">Enumerator</th>
                  <th class="text-left py-3 px-4 font-semibold text-gray-600">Submissions</th>
                  <th class="text-left py-3 px-4 font-semibold text-gray-600">Share</th>
                </tr>
              </thead>
              <tbody id="enum-tbody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== DATA QUALITY TAB ==================== -->
    <div class="tab-content" id="tab-quality">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 fade-in">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-red-200">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-red-500 uppercase">High Severity</span>
            <i class="fas fa-fire text-red-500"></i>
          </div>
          <div class="stat-number text-3xl font-bold text-red-600" id="q-high">0</div>
          <p class="text-xs text-gray-400 mt-1">Need immediate attention</p>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-amber-200">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-amber-500 uppercase">Medium Severity</span>
            <i class="fas fa-exclamation text-amber-500"></i>
          </div>
          <div class="stat-number text-3xl font-bold text-amber-600" id="q-medium">0</div>
          <p class="text-xs text-gray-400 mt-1">Should be reviewed</p>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-green-200">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-green-500 uppercase">Low Severity</span>
            <i class="fas fa-info-circle text-green-500"></i>
          </div>
          <div class="stat-number text-3xl font-bold text-green-600" id="q-low">0</div>
          <p class="text-xs text-gray-400 mt-1">Minor observations</p>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-blue-200">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-blue-500 uppercase">Data Health</span>
            <i class="fas fa-heartbeat text-blue-500"></i>
          </div>
          <div class="stat-number text-3xl font-bold text-blue-600" id="q-health">-</div>
          <p class="text-xs text-gray-400 mt-1">Overall score</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-chart-pie text-red-500 mr-2"></i>Issues by Type</h3>
          <div class="chart-container" style="height:260px"><canvas id="chart-quality-types"></canvas></div>
        </div>
        <div class="lg:col-span-2 card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-3"><i class="fas fa-lightbulb text-yellow-500 mr-2"></i>What These Checks Detect</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div class="flex gap-2 items-start p-3 bg-red-50 rounded-lg">
              <i class="fas fa-copy text-red-400 mt-0.5"></i>
              <div><span class="font-semibold text-red-700">Duplicate Farmer</span><br><span class="text-gray-500">Same farmer name in same district</span></div>
            </div>
            <div class="flex gap-2 items-start p-3 bg-red-50 rounded-lg">
              <i class="fas fa-bolt text-red-400 mt-0.5"></i>
              <div><span class="font-semibold text-red-700">Rushed Submission</span><br><span class="text-gray-500">Completed in under 60 seconds</span></div>
            </div>
            <div class="flex gap-2 items-start p-3 bg-red-50 rounded-lg">
              <i class="fas fa-ban text-red-400 mt-0.5"></i>
              <div><span class="font-semibold text-red-700">No Consent</span><br><span class="text-gray-500">Farmer declined to provide information</span></div>
            </div>
            <div class="flex gap-2 items-start p-3 bg-amber-50 rounded-lg">
              <i class="fas fa-user-clock text-amber-400 mt-0.5"></i>
              <div><span class="font-semibold text-amber-700">Age Outlier</span><br><span class="text-gray-500">Age outside 15-100 range</span></div>
            </div>
            <div class="flex gap-2 items-start p-3 bg-amber-50 rounded-lg">
              <i class="fas fa-question-circle text-amber-400 mt-0.5"></i>
              <div><span class="font-semibold text-amber-700">Missing Critical Field</span><br><span class="text-gray-500">Required fields left empty</span></div>
            </div>
            <div class="flex gap-2 items-start p-3 bg-green-50 rounded-lg">
              <i class="fas fa-people-roof text-green-400 mt-0.5"></i>
              <div><span class="font-semibold text-green-700">Household Outlier</span><br><span class="text-gray-500">Household size exceeds 30 members</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-sm font-semibold text-gray-600"><i class="fas fa-filter mr-1"></i>Filter:</span>
          <button onclick="filterIssues('all')" class="qfilter active px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-800 text-white" data-filter="all">All Issues</button>
          <button onclick="filterIssues('high')" class="qfilter px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-red-100" data-filter="high"><i class="fas fa-circle text-red-500 mr-1" style="font-size:6px;vertical-align:middle;"></i>High</button>
          <button onclick="filterIssues('medium')" class="qfilter px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-amber-100" data-filter="medium"><i class="fas fa-circle text-amber-500 mr-1" style="font-size:6px;vertical-align:middle;"></i>Medium</button>
          <button onclick="filterIssues('low')" class="qfilter px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-green-100" data-filter="low"><i class="fas fa-circle text-green-500 mr-1" style="font-size:6px;vertical-align:middle;"></i>Low</button>
          <span class="ml-auto text-xs text-gray-400" id="issue-count-label"></span>
        </div>
      </div>
      <div id="quality-issues-list" class="space-y-3"></div>
      <div id="quality-clean" class="hidden text-center py-16">
        <i class="fas fa-check-circle text-green-400 text-5xl mb-4"></i>
        <h3 class="text-lg font-semibold text-gray-700">All Data Looks Clean!</h3>
        <p class="text-gray-400 mt-1">No outliers or data quality issues detected.</p>
      </div>
    </div>

    <!-- ==================== RESPONSES TAB ==================== -->
    <div class="tab-content" id="tab-responses">
      <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-700"><i class="fas fa-table text-green-500 mr-2"></i>All Registered Farmers</h3>
          <button onclick="downloadExcel()" class="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg font-semibold text-xs transition flex items-center gap-2">
            <i class="fas fa-file-excel"></i> Export to Excel
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50">
                <th class="text-left py-3 px-3 font-semibold text-gray-600">#</th>
                <th class="text-left py-3 px-3 font-semibold text-gray-600">Farmer Name</th>
                <th class="text-left py-3 px-3 font-semibold text-gray-600">District</th>
                <th class="text-left py-3 px-3 font-semibold text-gray-600">Gender</th>
                <th class="text-left py-3 px-3 font-semibold text-gray-600">Age</th>
                <th class="text-left py-3 px-3 font-semibold text-gray-600">Crop</th>
                <th class="text-left py-3 px-3 font-semibold text-gray-600">HH Size</th>
                <th class="text-left py-3 px-3 font-semibold text-gray-600">Consent</th>
                <th class="text-left py-3 px-3 font-semibold text-gray-600">Submitted</th>
                <th class="text-left py-3 px-3 font-semibold text-gray-600">Submitted By</th>
              </tr>
            </thead>
            <tbody id="responses-table"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="text-center py-6 mt-8 border-t border-gray-200">
      <p class="text-xs text-gray-400">
        <i class="fas fa-database mr-1"></i> Data sourced from ODK Central &bull;
        <span id="last-updated">-</span> &bull;
        Farmer Registration &copy; 2026
      </p>
    </footer>
  </main>

  <script>
    // ==================== REGISTER DATALABELS PLUGIN ====================
    Chart.register(ChartDataLabels);

    // ==================== GLOBAL STATE ====================
    let charts = {};
    let currentStats = null;
    let qualityData = null;
    let currentFilter = 'all';

    // ==================== COLOR PALETTES ====================
    const COLORS = {
      primary: ['#16a34a','#2563eb','#d97706','#dc2626','#7c3aed','#0891b2','#db2777','#0d9488','#ea580c','#4f46e5'],
      soft: ['#86efac','#93c5fd','#fcd34d','#fca5a5','#c4b5fd','#67e8f9','#f9a8d4','#5eead4','#fdba74','#a5b4fc'],
      bg: ['rgba(22,163,74,0.15)','rgba(37,99,235,0.15)','rgba(217,119,6,0.15)','rgba(220,38,38,0.15)','rgba(124,58,237,0.15)','rgba(8,145,178,0.15)','rgba(219,39,119,0.15)','rgba(13,148,136,0.15)','rgba(234,88,12,0.15)','rgba(79,70,229,0.15)']
    };

    // ==================== TAB SWITCHING ====================
    function switchTab(tab) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(el => {
        el.classList.remove('nav-active');
        el.classList.add('hover:bg-white/10');
      });
      document.getElementById('tab-' + tab).classList.add('active');
      const btn = document.querySelector('[data-tab="' + tab + '"]');
      btn.classList.add('nav-active');
      btn.classList.remove('hover:bg-white/10');
    }

    // ==================== DATA FETCH ====================
    async function fetchStats() {
      const resp = await fetch('/api/stats');
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');
      return data.stats;
    }

    async function fetchQuality() {
      const resp = await fetch('/api/quality');
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');
      return data;
    }

    async function refreshData() {
      const icon = document.getElementById('refreshIcon');
      icon.classList.add('fa-spin');
      try {
        const [stats, quality] = await Promise.all([fetchStats(), fetchQuality()]);
        currentStats = stats;
        qualityData = quality;
        renderDashboard(stats);
        renderQuality(quality);
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');
      } catch (err) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('error').classList.remove('hidden');
        document.getElementById('errorMsg').textContent = err.message;
        document.getElementById('mainContent').classList.add('hidden');
      }
      setTimeout(() => icon.classList.remove('fa-spin'), 500);
    }

    // ==================== EXCEL DOWNLOAD ====================
    async function downloadExcel() {
      const btn = document.getElementById('downloadBtn');
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing...';
      btn.disabled = true;
      try {
        const resp = await fetch('/api/export');
        const data = await resp.json();
        if (!data.success) throw new Error(data.error);

        const ws = XLSX.utils.json_to_sheet(data.rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Farmer Registration');

        const colWidths = Object.keys(data.rows[0] || {}).map(key => ({
          wch: Math.max(key.length + 2, 12)
        }));
        ws['!cols'] = colWidths;

        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, 'Farmer_Registration_' + today + '.xlsx');
      } catch (err) {
        alert('Download failed: ' + err.message);
      }
      btn.innerHTML = '<i class="fas fa-file-excel"></i> Download Excel';
      btn.disabled = false;
    }

    // ==================== CHART HELPERS ====================
    function destroyChart(id) {
      if (charts[id]) { charts[id].destroy(); delete charts[id]; }
    }

    function createBarChart(id, data, horizontal = false) {
      destroyChart(id);
      const labels = Object.keys(data);
      const values = Object.values(data);
      charts[id] = new Chart(document.getElementById(id), {
        type: 'bar',
        data: {
          labels, datasets: [{
            data: values,
            backgroundColor: COLORS.primary.slice(0, labels.length),
            borderColor: COLORS.primary.slice(0, labels.length),
            borderWidth: 1, borderRadius: 6, maxBarThickness: 50
          }]
        },
        options: {
          indexAxis: horizontal ? 'y' : 'x',
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { padding: 10, cornerRadius: 8 },
            datalabels: {
              anchor: horizontal ? 'end' : 'end',
              align: horizontal ? 'right' : 'top',
              color: '#374151', font: { size: 11, weight: 'bold' },
              formatter: (v) => v > 0 ? v : ''
            }
          },
          scales: {
            x: { grid: { display: !horizontal }, ticks: { font: { size: 11 } } },
            y: { grid: { display: horizontal }, ticks: { font: { size: 11 }, precision: 0 }, beginAtZero: true }
          }
        }
      });
    }

    function createDoughnutChart(id, data) {
      destroyChart(id);
      const labels = Object.keys(data);
      const values = Object.values(data);
      const total = values.reduce((a, b) => a + b, 0);
      charts[id] = new Chart(document.getElementById(id), {
        type: 'doughnut',
        data: {
          labels, datasets: [{
            data: values,
            backgroundColor: COLORS.primary.slice(0, labels.length),
            borderWidth: 2, borderColor: '#fff', hoverOffset: 8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '55%',
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
            tooltip: { padding: 10, cornerRadius: 8 },
            datalabels: {
              color: '#fff', font: { size: 11, weight: 'bold' },
              formatter: (v) => { if (v === 0 || total === 0) return ''; return v + ' (' + Math.round(v/total*100) + '%)'; },
              display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0
            }
          }
        }
      });
    }

    function createLineChart(id, data) {
      destroyChart(id);
      const labels = Object.keys(data);
      const values = Object.values(data);
      const cumulative = [];
      values.reduce((sum, val, i) => { cumulative[i] = sum + val; return sum + val; }, 0);
      charts[id] = new Chart(document.getElementById(id), {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Daily', data: values, borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', fill: true, tension: 0.4, pointRadius: 5, pointHoverRadius: 8, borderWidth: 2 },
            { label: 'Cumulative', data: cumulative, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.05)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2, borderDash: [5, 3] }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
            tooltip: { padding: 10, cornerRadius: 8 },
            datalabels: {
              color: (ctx) => ctx.datasetIndex === 0 ? '#16a34a' : '#2563eb',
              anchor: 'end', align: 'top', font: { size: 10, weight: 'bold' },
              formatter: (v) => v > 0 ? v : '',
              display: (ctx) => ctx.datasetIndex === 0
            }
          },
          scales: { x: { ticks: { font: { size: 10 } } }, y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } } }
        }
      });
    }

    function createPolarChart(id, data) {
      destroyChart(id);
      const labels = Object.keys(data);
      const values = Object.values(data);
      charts[id] = new Chart(document.getElementById(id), {
        type: 'polarArea',
        data: { labels, datasets: [{ data: values, backgroundColor: COLORS.bg.slice(0, labels.length), borderColor: COLORS.primary.slice(0, labels.length), borderWidth: 2 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } },
            tooltip: { padding: 10, cornerRadius: 8 },
            datalabels: { color: '#374151', font: { size: 12, weight: 'bold' }, formatter: (v) => v > 0 ? v : '' }
          },
          scales: { r: { ticks: { precision: 0, stepSize: 1 } } }
        }
      });
    }

    function createStackedBarChart(id, matrix, stackLabels) {
      destroyChart(id);
      const groups = Object.keys(matrix);
      const datasets = stackLabels.map((label, i) => ({
        label: label,
        data: groups.map(g => matrix[g][label] || 0),
        backgroundColor: COLORS.primary[i % COLORS.primary.length],
        borderRadius: 4
      }));
      charts[id] = new Chart(document.getElementById(id), {
        type: 'bar',
        data: { labels: groups, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } },
            tooltip: { padding: 10, cornerRadius: 8 },
            datalabels: { color: '#fff', font: { size: 10, weight: 'bold' }, formatter: (v) => v > 0 ? v : '', display: (ctx) => ctx.dataset.data[ctx.dataIndex] > 0 }
          },
          scales: {
            x: { stacked: true, ticks: { font: { size: 11 } } },
            y: { stacked: true, beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } }
          }
        }
      });
    }

    // ==================== RENDER DASHBOARD ====================
    function renderDashboard(s) {
      // KPIs
      document.getElementById('kpi-total').textContent = s.total_submissions;
      const distWithData = Object.entries(s.districts).filter(([k, v]) => v > 0).length;
      document.getElementById('kpi-districts').textContent = distWithData;
      document.getElementById('kpi-avgage').textContent = s.avg_age;
      document.getElementById('kpi-avghh').textContent = s.avg_household;
      document.getElementById('kpi-consent').textContent = s.consent_rate + '%';
      document.getElementById('last-updated').textContent = 'Updated: ' + new Date(s.last_updated).toLocaleString();

      // Data quality KPI
      const dq = s.data_quality;
      const issueEl = document.getElementById('kpi-issues');
      issueEl.textContent = dq.total_issues;
      if (dq.high_severity > 0) {
        issueEl.className = 'stat-number text-3xl font-bold text-red-600';
        document.getElementById('kpi-issues-detail').textContent = dq.high_severity + ' high severity';
        document.getElementById('kpi-issues-detail').className = 'text-xs mt-1 text-red-400';
      } else if (dq.total_issues > 0) {
        issueEl.className = 'stat-number text-3xl font-bold text-amber-600';
        document.getElementById('kpi-issues-detail').textContent = 'No critical issues';
        document.getElementById('kpi-issues-detail').className = 'text-xs mt-1 text-amber-400';
      } else {
        issueEl.className = 'stat-number text-3xl font-bold text-green-600';
        document.getElementById('kpi-issues-detail').textContent = 'All data clean!';
        document.getElementById('kpi-issues-detail').className = 'text-xs mt-1 text-green-400';
      }

      const badge = document.getElementById('quality-badge');
      if (dq.total_issues > 0) { badge.textContent = dq.total_issues; badge.classList.remove('hidden'); }
      else { badge.classList.add('hidden'); }

      // Charts
      createLineChart('chart-timeline', s.submission_timeline);
      createBarChart('chart-districts', s.districts);
      createDoughnutChart('chart-gender', s.gender);
      createDoughnutChart('chart-crops', s.main_crop);

      // Demographics
      createBarChart('chart-age', s.age_distribution);
      createBarChart('chart-household', s.household_distribution);
      createStackedBarChart('chart-gender-district', s.gender_by_district, ['Male', 'Female', 'Other']);
      createDoughnutChart('chart-consent', s.consent);

      // Agriculture
      createPolarChart('chart-crops-polar', s.main_crop);
      createStackedBarChart('chart-crop-district', s.crop_by_district, ['Maize', 'Beans', 'Coffee', 'Cassava']);

      // Enumerators
      createBarChart('chart-enumerators', s.enumerator_stats, true);
      const enumTbody = document.getElementById('enum-tbody');
      const enumEntries = Object.entries(s.enumerator_stats).sort((a, b) => b[1] - a[1]);
      const totalSubs = s.total_submissions;
      enumTbody.innerHTML = enumEntries.map(([name, count], i) =>
        '<tr class="border-b border-gray-100 hover:bg-gray-50">' +
          '<td class="py-3 px-4 text-gray-400 font-medium">' + (i + 1) + '</td>' +
          '<td class="py-3 px-4 font-medium text-gray-800">' + escapeHtml(name) + '</td>' +
          '<td class="py-3 px-4"><span class="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">' + count + '</span></td>' +
          '<td class="py-3 px-4 text-gray-500">' + (totalSubs > 0 ? Math.round(count/totalSubs*100) : 0) + '%</td>' +
        '</tr>'
      ).join('');

      // Responses Table
      const tbody = document.getElementById('responses-table');
      if (s.farmers && s.farmers.length > 0) {
        tbody.innerHTML = s.farmers.map((f, i) =>
          '<tr class="border-b border-gray-100 hover:bg-gray-50">' +
            '<td class="py-3 px-3 text-gray-400 font-medium">' + (i + 1) + '</td>' +
            '<td class="py-3 px-3 font-medium text-gray-800">' + escapeHtml(f.farmer_name) + '</td>' +
            '<td class="py-3 px-3"><span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">' + escapeHtml(f.district) + '</span></td>' +
            '<td class="py-3 px-3 text-gray-600">' + escapeHtml(f.gender) + '</td>' +
            '<td class="py-3 px-3 text-gray-600">' + f.age + '</td>' +
            '<td class="py-3 px-3"><span class="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">' + escapeHtml(f.main_crop) + '</span></td>' +
            '<td class="py-3 px-3 text-gray-600">' + f.household_size + '</td>' +
            '<td class="py-3 px-3">' + (f.consent === 'Yes' ? '<span class="text-green-600 font-semibold"><i class="fas fa-check-circle"></i> Yes</span>' : '<span class="text-red-600 font-semibold"><i class="fas fa-times-circle"></i> No</span>') + '</td>' +
            '<td class="py-3 px-3 text-gray-400 text-xs">' + (f.submitted ? new Date(f.submitted).toLocaleDateString() : '-') + '</td>' +
            '<td class="py-3 px-3"><span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">' + escapeHtml(f.submitted_by) + '</span></td>' +
          '</tr>'
        ).join('');
      }
    }

    // ==================== RENDER QUALITY TAB ====================
    function renderQuality(q) {
      document.getElementById('q-high').textContent = q.issues.filter(i => i.severity === 'high').length;
      document.getElementById('q-medium').textContent = q.issues.filter(i => i.severity === 'medium').length;
      document.getElementById('q-low').textContent = q.issues.filter(i => i.severity === 'low').length;

      const highC = q.issues.filter(i => i.severity === 'high').length;
      const medC = q.issues.filter(i => i.severity === 'medium').length;
      const lowC = q.issues.filter(i => i.severity === 'low').length;
      const score = Math.max(0, Math.min(100, 100 - (highC * 10 + medC * 3 + lowC * 1)));
      const healthEl = document.getElementById('q-health');
      healthEl.textContent = score + '%';
      healthEl.className = 'stat-number text-3xl font-bold ' + (score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600');

      const typeCounts = q.issues_by_type || {};
      const nonZero = {};
      for (const [k, v] of Object.entries(typeCounts)) { if (v > 0) nonZero[k] = v; }
      if (Object.keys(nonZero).length > 0) {
        createDoughnutChart('chart-quality-types', nonZero);
      }

      renderIssuesList(q.issues);
      if (q.total_issues === 0) {
        document.getElementById('quality-clean').classList.remove('hidden');
      } else {
        document.getElementById('quality-clean').classList.add('hidden');
      }
    }

    function filterIssues(severity) {
      currentFilter = severity;
      document.querySelectorAll('.qfilter').forEach(el => {
        el.className = 'qfilter px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600';
      });
      const active = document.querySelector('[data-filter="' + severity + '"]');
      active.className = 'qfilter active px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-800 text-white';
      if (qualityData) renderIssuesList(qualityData.issues);
    }

    function renderIssuesList(issues) {
      const filtered = currentFilter === 'all' ? issues : issues.filter(i => i.severity === currentFilter);
      document.getElementById('issue-count-label').textContent = 'Showing ' + filtered.length + ' of ' + issues.length + ' issues';

      const container = document.getElementById('quality-issues-list');
      if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="fas fa-check-circle text-2xl mb-2"></i><p>No issues match this filter.</p></div>';
        return;
      }

      container.innerHTML = filtered.map(issue => {
        const sevClass = 'severity-' + issue.severity;
        const badgeClass = 'badge-' + issue.severity;
        const icon = issue.severity === 'high' ? 'fa-fire' : issue.severity === 'medium' ? 'fa-exclamation-triangle' : 'fa-info-circle';
        return '<div class="card rounded-xl p-4 border-2 ' + sevClass + '">' +
          '<div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">' +
            '<div class="flex items-center gap-2">' +
              '<span class="px-2 py-0.5 rounded-full text-xs font-bold ' + badgeClass + '"><i class="fas ' + icon + ' mr-1"></i>' + issue.severity.toUpperCase() + '</span>' +
              '<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">' + escapeHtml(issue.type) + '</span>' +
            '</div>' +
            '<span class="text-xs text-gray-400 sm:ml-auto"><i class="fas fa-user mr-1"></i>' + escapeHtml(issue.farmer) + ' &bull; ' + issue.submitted + '</span>' +
          '</div>' +
          '<p class="text-sm text-gray-700">' + escapeHtml(issue.description) + '</p>' +
          '<p class="text-xs text-gray-400 mt-1"><i class="fas fa-tag mr-1"></i>Field: ' + escapeHtml(issue.field) + '</p>' +
        '</div>';
      }).join('');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ==================== INIT ====================
    refreshData();
    setInterval(refreshData, 120000);
  </script>
</body>
</html>`
}

export default app
