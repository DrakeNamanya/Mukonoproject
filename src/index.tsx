import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  KOBO_API_TOKEN: string
  KOBO_FORM_UID: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// ==================== LABEL MAPPINGS ====================
const LABELS: Record<string, Record<string, string>> = {
  employees: {
    '1_5': '1-5',
    '6_10': '6-10',
    '11_50': '11-50',
    'gt50': '50+'
  },
  years_operation: {
    'lt1': 'Less than 1 year',
    '1_3': '1-3 years',
    '4_10': '4-10 years',
    'gt10': 'More than 10 years'
  },
  failure_causes: {
    'finance': 'Finance',
    'regulatory': 'Regulatory',
    'market': 'Market',
    'compliance': 'Compliance',
    'other': 'Other'
  },
  finance_sources: {
    'personal_savings': 'Personal savings',
    'bank_loans': 'Bank loans',
    'microfinance': 'Microfinance',
    'family_friends': 'Family & friends',
    'grants': 'Grants',
    'other': 'Other'
  },
  loan_outcome: {
    'approved': 'Approved',
    'denied': 'Denied',
    'pending': 'Pending'
  },
  finance_challenges: {
    'high_interest': 'High-interest rates',
    'lack_collateral': 'Lack of collateral',
    'complex_process': 'Complex processes',
    'limited_literacy': 'Limited literacy',
    'other': 'Other'
  },
  ease_register: {
    'very_easy': 'Very Easy',
    'easy': 'Easy',
    'neutral': 'Neutral',
    'difficult': 'Difficult',
    'very_difficult': 'Very Difficult'
  },
  reg_challenges: {
    'complex_registration': 'Complex registration',
    'frequent_changes': 'Frequent changes',
    'high_compliance_costs': 'High compliance costs',
    'high_taxes': 'High taxes',
    'lack_gov_support': 'Lack of govt support',
    'other': 'Other'
  },
  marketing_channels: {
    'social_media': 'Social media',
    'traditional_advertising': 'Traditional advertising',
    'word_of_mouth': 'Word of mouth',
    'online_marketplaces': 'Online marketplaces',
    'trade_fairs': 'Trade fairs',
    'other': 'Other'
  },
  market_barriers: {
    'lack_marketing_knowledge': 'Lack of marketing knowledge',
    'limited_online_presence': 'Limited online presence',
    'competition_large_firms': 'Competition from large firms',
    'insufficient_networking': 'Insufficient networking',
    'other': 'Other'
  },
  important_skills: {
    'financial_mgmt': 'Financial management',
    'marketing_sales': 'Marketing & sales',
    'customer_service': 'Customer service',
    'tech_digital': 'Technology & digital',
    'other': 'Other'
  },
  support_types: {
    'access_finance': 'Access to finance',
    'bds': 'Business development',
    'networking': 'Networking',
    'training_skills': 'Training & skills',
    'market_access': 'Market access',
    'other': 'Other'
  },
  gov_role: {
    'very_supportive': 'Very Supportive',
    'supportive': 'Supportive',
    'neutral': 'Neutral',
    'unsupportive': 'Unsupportive',
    'very_unsupportive': 'Very Unsupportive'
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

function countMultiSelect(records: any[], field: string, labelMap: Record<string, string>) {
  const counts: Record<string, number> = {}
  for (const key of Object.keys(labelMap)) {
    counts[labelMap[key]] = 0
  }
  for (const r of records) {
    const val = r[field]
    if (val) {
      const selected = val.split(' ')
      for (const s of selected) {
        if (labelMap[s]) {
          counts[labelMap[s]] = (counts[labelMap[s]] || 0) + 1
        }
      }
    }
  }
  return counts
}

function getSubmissionTimeline(records: any[]) {
  const timeline: Record<string, number> = {}
  for (const r of records) {
    const time = r['_submission_time']
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

// ==================== OUTLIER / DATA QUALITY DETECTION ====================
interface DataIssue {
  id: number
  business: string
  severity: 'high' | 'medium' | 'low'
  type: string
  description: string
  field: string
  submitted: string
}

function detectDataIssues(records: any[]): { issues: DataIssue[], summary: Record<string, number> } {
  const issues: DataIssue[] = []
  const summary: Record<string, number> = {
    'Duplicate Business': 0,
    'Rushed Submission': 0,
    'Extremely Long Duration': 0,
    'Missing Critical Field': 0,
    'Logical Inconsistency': 0,
    'Suspicious Pattern': 0
  }

  // Track duplicate business names
  const nameCount: Record<string, number[]> = {}
  for (const r of records) {
    const name = (r['gen_info/business_name'] || '').trim().toLowerCase()
    if (name) {
      if (!nameCount[name]) nameCount[name] = []
      nameCount[name].push(r['_id'])
    }
  }

  for (const r of records) {
    const id = r['_id']
    const biz = r['gen_info/business_name'] || 'Unknown'
    const submitted = r['_submission_time']?.split('T')[0] || ''

    // 1. Duplicate business names
    const nameLower = (r['gen_info/business_name'] || '').trim().toLowerCase()
    if (nameLower && nameCount[nameLower] && nameCount[nameLower].length > 1) {
      issues.push({
        id, business: biz, severity: 'high', type: 'Duplicate Business',
        description: `Business name "${biz}" appears ${nameCount[nameLower].length} times. Possible duplicate submission.`,
        field: 'Business Name', submitted
      })
      summary['Duplicate Business']++
    }

    // 2. Completion time analysis
    if (r['start'] && r['end']) {
      const start = new Date(r['start']).getTime()
      const end = new Date(r['end']).getTime()
      const durationMin = (end - start) / 60000

      if (durationMin < 2) {
        issues.push({
          id, business: biz, severity: 'high', type: 'Rushed Submission',
          description: `Completed in ${durationMin.toFixed(1)} minutes. Survey has 20+ questions — likely a test or rushed entry.`,
          field: 'Completion Time', submitted
        })
        summary['Rushed Submission']++
      } else if (durationMin > 60) {
        issues.push({
          id, business: biz, severity: 'low', type: 'Extremely Long Duration',
          description: `Took ${durationMin.toFixed(0)} minutes to complete. Enumerator may have left the form open.`,
          field: 'Completion Time', submitted
        })
        summary['Extremely Long Duration']++
      }
    }

    // 3. Missing critical fields
    const criticalFields = [
      { key: 'gen_info/business_name', label: 'Business Name' },
      { key: 'gen_info/business_type', label: 'Business Type' },
      { key: 'gen_info/employees', label: 'Number of Employees' },
      { key: 'gen_info/years_operation', label: 'Years in Operation' },
      { key: 'financial_access/finance_sources', label: 'Finance Sources' },
      { key: 'policy_regulatory/ease_register', label: 'Ease of Registration' },
      { key: 'support_resources/gov_role', label: 'Government Role Perception' }
    ]
    for (const f of criticalFields) {
      const val = r[f.key]
      if (!val || val.toString().trim() === '') {
        issues.push({
          id, business: biz, severity: 'medium', type: 'Missing Critical Field',
          description: `"${f.label}" is empty. This is a required field.`,
          field: f.label, submitted
        })
        summary['Missing Critical Field']++
      }
    }

    // 4. Logical inconsistency: said "No" to failed business but provided failure causes
    if (r['gen_info/tried_failed'] === 'no' && r['gen_info/failure_causes']) {
      issues.push({
        id, business: biz, severity: 'high', type: 'Logical Inconsistency',
        description: 'Answered "No" to having a failed business, but selected failure causes. Contradictory answers.',
        field: 'Failed Business / Failure Causes', submitted
      })
      summary['Logical Inconsistency']++
    }

    // 5. Logical inconsistency: said "No" to loan applied but provided outcome
    if (r['financial_access/loan_applied'] === 'no' && r['financial_access/loan_outcome']) {
      issues.push({
        id, business: biz, severity: 'high', type: 'Logical Inconsistency',
        description: 'Answered "No" to loan application, but provided a loan outcome. Contradictory answers.',
        field: 'Loan Applied / Loan Outcome', submitted
      })
      summary['Logical Inconsistency']++
    }

    // 6. Logical inconsistency: said "No" to training but provided training type
    if (r['skills_capacity/training_participated'] === 'no' && r['skills_capacity/training_type']) {
      issues.push({
        id, business: biz, severity: 'high', type: 'Logical Inconsistency',
        description: 'Answered "No" to training participation, but specified a training type. Contradictory answers.',
        field: 'Training Participation / Training Type', submitted
      })
      summary['Logical Inconsistency']++
    }

    // 7. Suspicious pattern: all single-option answers (minimal effort)
    const multiFields = [
      'financial_access/finance_challenges',
      'policy_regulatory/reg_challenges',
      'market_access/marketing_channels',
      'market_access/market_barriers',
      'skills_capacity/important_skills',
      'support_resources/support_types'
    ]
    let singleCount = 0
    let answeredCount = 0
    for (const mf of multiFields) {
      const val = r[mf]
      if (val) {
        answeredCount++
        if (!val.includes(' ')) singleCount++ // no spaces = only 1 option selected
      }
    }
    if (answeredCount >= 4 && singleCount === answeredCount) {
      issues.push({
        id, business: biz, severity: 'low', type: 'Suspicious Pattern',
        description: 'Selected only 1 option in every multi-select question. Possible minimal-effort response.',
        field: 'All Multi-select Fields', submitted
      })
      summary['Suspicious Pattern']++
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

    return {
      '#': i + 1,
      'Submission ID': r['_id'] || '',
      'Submission Date': r['_submission_time'] || '',
      'Duration (minutes)': durationMin,
      'Business Name': r['gen_info/business_name'] || '',
      'Business Type': r['gen_info/business_type'] || '',
      'Employees': LABELS.employees[r['gen_info/employees']] || r['gen_info/employees'] || '',
      'Years in Operation': LABELS.years_operation[r['gen_info/years_operation']] || r['gen_info/years_operation'] || '',
      'Had Failed Business': r['gen_info/tried_failed'] === 'yes' ? 'Yes' : r['gen_info/tried_failed'] === 'no' ? 'No' : '',
      'Failure Causes': (r['gen_info/failure_causes'] || '').split(' ').map((v: string) => LABELS.failure_causes[v] || v).filter((v: string) => v).join(', '),
      'Finance Sources': (r['financial_access/finance_sources'] || '').split(' ').map((v: string) => LABELS.finance_sources[v] || v).filter((v: string) => v).join(', '),
      'Applied for Loan': r['financial_access/loan_applied'] === 'yes' ? 'Yes' : r['financial_access/loan_applied'] === 'no' ? 'No' : '',
      'Loan Outcome': LABELS.loan_outcome[r['financial_access/loan_outcome']] || r['financial_access/loan_outcome'] || '',
      'Finance Challenges': (r['financial_access/finance_challenges'] || '').split(' ').map((v: string) => LABELS.finance_challenges[v] || v).filter((v: string) => v).join(', '),
      'Ease of Registration': LABELS.ease_register[r['policy_regulatory/ease_register']] || r['policy_regulatory/ease_register'] || '',
      'Regulatory Challenges': (r['policy_regulatory/reg_challenges'] || '').split(' ').map((v: string) => LABELS.reg_challenges[v] || v).filter((v: string) => v).join(', '),
      'Marketing Channels': (r['market_access/marketing_channels'] || '').split(' ').map((v: string) => LABELS.marketing_channels[v] || v).filter((v: string) => v).join(', '),
      'Market Barriers': (r['market_access/market_barriers'] || '').split(' ').map((v: string) => LABELS.market_barriers[v] || v).filter((v: string) => v).join(', '),
      'Important Skills': (r['skills_capacity/important_skills'] || '').split(' ').map((v: string) => LABELS.important_skills[v] || v).filter((v: string) => v).join(', '),
      'Training Participated': r['skills_capacity/training_participated'] === 'yes' ? 'Yes' : r['skills_capacity/training_participated'] === 'no' ? 'No' : '',
      'Training Type': r['skills_capacity/training_type'] || '',
      'Support Types Needed': (r['support_resources/support_types'] || '').split(' ').map((v: string) => LABELS.support_types[v] || v).filter((v: string) => v).join(', '),
      'Government Role Perception': LABELS.gov_role[r['support_resources/gov_role']] || r['support_resources/gov_role'] || '',
      'Additional Comments': r['additional_comments/comments'] || ''
    }
  })
}

// ==================== API: Fetch from KoboToolbox ====================
async function fetchKoboData(token: string, formUid: string) {
  const url = `https://kf.kobotoolbox.org/api/v2/assets/${formUid}/data/?format=json&limit=10000`
  const response = await fetch(url, {
    headers: {
      'Authorization': `Token ${token}`
    }
  })
  if (!response.ok) {
    throw new Error(`KoboToolbox API error: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<{ count: number; results: any[] }>
}

// ==================== API ROUTES ====================

app.get('/api/data', async (c) => {
  try {
    const token = c.env.KOBO_API_TOKEN || '0661f3c510798296252db6bf1d804298f579e509'
    const formUid = c.env.KOBO_FORM_UID || 'akEu56NMB8L48xkFkkiBFb'
    const data = await fetchKoboData(token, formUid)
    return c.json({ success: true, count: data.count, results: data.results })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Export data for Excel download
app.get('/api/export', async (c) => {
  try {
    const token = c.env.KOBO_API_TOKEN || '0661f3c510798296252db6bf1d804298f579e509'
    const formUid = c.env.KOBO_FORM_UID || 'akEu56NMB8L48xkFkkiBFb'
    const data = await fetchKoboData(token, formUid)
    const exportRows = buildExportData(data.results)
    return c.json({ success: true, count: data.count, rows: exportRows })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Data quality / outlier detection
app.get('/api/quality', async (c) => {
  try {
    const token = c.env.KOBO_API_TOKEN || '0661f3c510798296252db6bf1d804298f579e509'
    const formUid = c.env.KOBO_FORM_UID || 'akEu56NMB8L48xkFkkiBFb'
    const data = await fetchKoboData(token, formUid)
    const quality = detectDataIssues(data.results)
    return c.json({
      success: true,
      total_submissions: data.count,
      total_issues: quality.issues.length,
      issues_by_type: quality.summary,
      issues: quality.issues
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// Statistics
app.get('/api/stats', async (c) => {
  try {
    const token = c.env.KOBO_API_TOKEN || '0661f3c510798296252db6bf1d804298f579e509'
    const formUid = c.env.KOBO_FORM_UID || 'akEu56NMB8L48xkFkkiBFb'
    const data = await fetchKoboData(token, formUid)
    const records = data.results

    const businessTypes: Record<string, number> = {}
    for (const r of records) {
      const bt = r['gen_info/business_type']
      if (bt) {
        const normalized = bt.trim()
        businessTypes[normalized] = (businessTypes[normalized] || 0) + 1
      }
    }

    // Data quality summary
    const quality = detectDataIssues(records)

    const stats = {
      total_submissions: data.count,
      submission_timeline: getSubmissionTimeline(records),
      business_types: businessTypes,
      employees: countValues(records, 'gen_info/employees', LABELS.employees),
      years_operation: countValues(records, 'gen_info/years_operation', LABELS.years_operation),
      tried_failed: countValues(records, 'gen_info/tried_failed', { yes: 'Yes', no: 'No' }),
      failure_causes: countMultiSelect(records, 'gen_info/failure_causes', LABELS.failure_causes),
      finance_sources: countMultiSelect(records, 'financial_access/finance_sources', LABELS.finance_sources),
      loan_applied: countValues(records, 'financial_access/loan_applied', { yes: 'Yes', no: 'No' }),
      loan_outcome: countValues(records, 'financial_access/loan_outcome', LABELS.loan_outcome),
      finance_challenges: countMultiSelect(records, 'financial_access/finance_challenges', LABELS.finance_challenges),
      ease_register: countValues(records, 'policy_regulatory/ease_register', LABELS.ease_register),
      reg_challenges: countMultiSelect(records, 'policy_regulatory/reg_challenges', LABELS.reg_challenges),
      marketing_channels: countMultiSelect(records, 'market_access/marketing_channels', LABELS.marketing_channels),
      market_barriers: countMultiSelect(records, 'market_access/market_barriers', LABELS.market_barriers),
      important_skills: countMultiSelect(records, 'skills_capacity/important_skills', LABELS.important_skills),
      training_participated: countValues(records, 'skills_capacity/training_participated', { yes: 'Yes', no: 'No' }),
      support_types: countMultiSelect(records, 'support_resources/support_types', LABELS.support_types),
      gov_role: countValues(records, 'support_resources/gov_role', LABELS.gov_role),
      comments: records
        .filter((r: any) => r['additional_comments/comments'])
        .map((r: any) => ({
          business: r['gen_info/business_name'] || 'Anonymous',
          comment: r['additional_comments/comments'],
          date: r['_submission_time']?.split('T')[0] || ''
        })),
      businesses: records.map((r: any) => ({
        name: r['gen_info/business_name'] || 'Unknown',
        type: r['gen_info/business_type'] || 'N/A',
        employees: LABELS.employees[r['gen_info/employees']] || r['gen_info/employees'] || 'N/A',
        years: LABELS.years_operation[r['gen_info/years_operation']] || r['gen_info/years_operation'] || 'N/A',
        submitted: r['_submission_time'] || ''
      })),
      // Data quality summary for KPI
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
  <title>MSME Uganda Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    body { font-family: 'Inter', sans-serif; }
    .card { transition: all 0.3s ease; }
    .card:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }
    .stat-number { font-variant-numeric: tabular-nums; }
    .chart-container { position: relative; width: 100%; }
    .loader { border: 4px solid #f3f4f6; border-top: 4px solid #2563eb; border-radius: 50%; width: 40px; height: 40px; animation: spin 0.8s linear infinite; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.5s ease-out; }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .gradient-bg { background: linear-gradient(135deg, #1e3a5f 0%, #0f766e 50%, #15803d 100%); }
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
              <i class="fas fa-chart-line text-2xl text-yellow-300"></i>
            </div>
            <div>
              <h1 class="text-xl sm:text-2xl font-bold">MSME Uganda Survey Dashboard</h1>
              <p class="text-sm text-green-200 mt-0.5">Policy, Finance &amp; Ecosystem Support for MSMEs</p>
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
        <button onclick="switchTab('financial')" class="nav-tab px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="financial">
          <i class="fas fa-coins mr-1.5"></i>Finance
        </button>
        <button onclick="switchTab('policy')" class="nav-tab px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="policy">
          <i class="fas fa-landmark mr-1.5"></i>Policy
        </button>
        <button onclick="switchTab('market')" class="nav-tab px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="market">
          <i class="fas fa-store mr-1.5"></i>Market
        </button>
        <button onclick="switchTab('skills')" class="nav-tab px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="skills">
          <i class="fas fa-graduation-cap mr-1.5"></i>Skills
        </button>
        <button onclick="switchTab('support')" class="nav-tab px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="support">
          <i class="fas fa-hands-helping mr-1.5"></i>Support
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
    <p class="text-gray-500 font-medium">Fetching live data from KoboToolbox...</p>
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
      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 fade-in">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Responses</span>
            <div class="bg-blue-100 p-2 rounded-lg"><i class="fas fa-users text-blue-600"></i></div>
          </div>
          <div class="stat-number text-3xl font-bold text-gray-800" id="kpi-total">-</div>
          <p class="text-xs text-gray-400 mt-1">Submissions collected</p>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Business Types</span>
            <div class="bg-emerald-100 p-2 rounded-lg"><i class="fas fa-building text-emerald-600"></i></div>
          </div>
          <div class="stat-number text-3xl font-bold text-gray-800" id="kpi-types">-</div>
          <p class="text-xs text-gray-400 mt-1">Unique categories</p>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Loan Applied</span>
            <div class="bg-amber-100 p-2 rounded-lg"><i class="fas fa-hand-holding-usd text-amber-600"></i></div>
          </div>
          <div class="stat-number text-3xl font-bold text-gray-800" id="kpi-loans">-</div>
          <p class="text-xs text-gray-400 mt-1">Applied for financing</p>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Training Done</span>
            <div class="bg-purple-100 p-2 rounded-lg"><i class="fas fa-certificate text-purple-600"></i></div>
          </div>
          <div class="stat-number text-3xl font-bold text-gray-800" id="kpi-training">-</div>
          <p class="text-xs text-gray-400 mt-1">Participated in training</p>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100 cursor-pointer" onclick="switchTab('quality')">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Data Issues</span>
            <div class="bg-red-100 p-2 rounded-lg"><i class="fas fa-exclamation-triangle text-red-600"></i></div>
          </div>
          <div class="stat-number text-3xl font-bold" id="kpi-issues">-</div>
          <p class="text-xs mt-1" id="kpi-issues-detail">Click to view details</p>
        </div>
      </div>

      <!-- Row: Timeline + Business Types -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-chart-area text-blue-500 mr-2"></i>Submission Timeline</h3>
          <div class="chart-container" style="height:260px"><canvas id="chart-timeline"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-briefcase text-emerald-500 mr-2"></i>Business Types</h3>
          <div class="chart-container" style="height:260px"><canvas id="chart-business-types"></canvas></div>
        </div>
      </div>

      <!-- Row: Employees + Years -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-people-arrows text-indigo-500 mr-2"></i>Number of Employees</h3>
          <div class="chart-container" style="height:260px"><canvas id="chart-employees"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-clock text-teal-500 mr-2"></i>Years in Operation</h3>
          <div class="chart-container" style="height:260px"><canvas id="chart-years"></canvas></div>
        </div>
      </div>

      <!-- Row: Failed Business + Failure Causes -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-exclamation-circle text-red-500 mr-2"></i>Had a Previous Failed Business?</h3>
          <div class="chart-container" style="height:260px"><canvas id="chart-tried-failed"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-times-circle text-orange-500 mr-2"></i>Causes of Business Failure</h3>
          <div class="chart-container" style="height:260px"><canvas id="chart-failure-causes"></canvas></div>
        </div>
      </div>
    </div>

    <!-- ==================== FINANCIAL TAB ==================== -->
    <div class="tab-content" id="tab-financial">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-wallet text-blue-500 mr-2"></i>Finance Sources</h3>
          <div class="chart-container" style="height:300px"><canvas id="chart-finance-sources"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-file-invoice-dollar text-green-500 mr-2"></i>Loan Application Status</h3>
          <div class="chart-container" style="height:300px"><canvas id="chart-loan-applied"></canvas></div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-check-circle text-emerald-500 mr-2"></i>Loan Outcomes</h3>
          <div class="chart-container" style="height:300px"><canvas id="chart-loan-outcome"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-ban text-red-500 mr-2"></i>Finance Challenges</h3>
          <div class="chart-container" style="height:300px"><canvas id="chart-finance-challenges"></canvas></div>
        </div>
      </div>
    </div>

    <!-- ==================== POLICY TAB ==================== -->
    <div class="tab-content" id="tab-policy">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-star text-yellow-500 mr-2"></i>Ease of Business Registration</h3>
          <div class="chart-container" style="height:320px"><canvas id="chart-ease-register"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-gavel text-red-500 mr-2"></i>Regulatory Challenges</h3>
          <div class="chart-container" style="height:320px"><canvas id="chart-reg-challenges"></canvas></div>
        </div>
      </div>
    </div>

    <!-- ==================== MARKET TAB ==================== -->
    <div class="tab-content" id="tab-market">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-bullhorn text-blue-500 mr-2"></i>Marketing Channels Used</h3>
          <div class="chart-container" style="height:320px"><canvas id="chart-marketing-channels"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-road-barrier text-orange-500 mr-2"></i>Market Access Barriers</h3>
          <div class="chart-container" style="height:320px"><canvas id="chart-market-barriers"></canvas></div>
        </div>
      </div>
    </div>

    <!-- ==================== SKILLS TAB ==================== -->
    <div class="tab-content" id="tab-skills">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-tools text-purple-500 mr-2"></i>Most Important Skills</h3>
          <div class="chart-container" style="height:320px"><canvas id="chart-important-skills"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-user-graduate text-green-500 mr-2"></i>Training Participation</h3>
          <div class="chart-container" style="height:320px"><canvas id="chart-training"></canvas></div>
        </div>
      </div>
    </div>

    <!-- ==================== SUPPORT TAB ==================== -->
    <div class="tab-content" id="tab-support">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-hands-helping text-blue-500 mr-2"></i>Types of Support Needed</h3>
          <div class="chart-container" style="height:320px"><canvas id="chart-support-types"></canvas></div>
        </div>
        <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-university text-gray-600 mr-2"></i>Government Role Perception</h3>
          <div class="chart-container" style="height:320px"><canvas id="chart-gov-role"></canvas></div>
        </div>
      </div>
      <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-comment-dots text-teal-500 mr-2"></i>Additional Comments &amp; Suggestions</h3>
        <div id="comments-list" class="space-y-3 max-h-96 overflow-y-auto"></div>
      </div>
    </div>

    <!-- ==================== DATA QUALITY TAB ==================== -->
    <div class="tab-content" id="tab-quality">
      <!-- Quality Summary Cards -->
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

      <!-- Issues by Type Chart + Filter -->
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
              <div><span class="font-semibold text-red-700">Duplicate Business</span><br><span class="text-gray-500">Same business name submitted multiple times</span></div>
            </div>
            <div class="flex gap-2 items-start p-3 bg-red-50 rounded-lg">
              <i class="fas fa-bolt text-red-400 mt-0.5"></i>
              <div><span class="font-semibold text-red-700">Rushed Submission</span><br><span class="text-gray-500">Completed in under 2 minutes (test or careless)</span></div>
            </div>
            <div class="flex gap-2 items-start p-3 bg-red-50 rounded-lg">
              <i class="fas fa-not-equal text-red-400 mt-0.5"></i>
              <div><span class="font-semibold text-red-700">Logical Inconsistency</span><br><span class="text-gray-500">Contradictory answers (e.g., "No loan" but gives outcome)</span></div>
            </div>
            <div class="flex gap-2 items-start p-3 bg-amber-50 rounded-lg">
              <i class="fas fa-question-circle text-amber-400 mt-0.5"></i>
              <div><span class="font-semibold text-amber-700">Missing Critical Field</span><br><span class="text-gray-500">Required fields left empty</span></div>
            </div>
            <div class="flex gap-2 items-start p-3 bg-green-50 rounded-lg">
              <i class="fas fa-hourglass-end text-green-400 mt-0.5"></i>
              <div><span class="font-semibold text-green-700">Extremely Long Duration</span><br><span class="text-gray-500">Over 60 minutes to complete (left form open)</span></div>
            </div>
            <div class="flex gap-2 items-start p-3 bg-green-50 rounded-lg">
              <i class="fas fa-robot text-green-400 mt-0.5"></i>
              <div><span class="font-semibold text-green-700">Suspicious Pattern</span><br><span class="text-gray-500">Only 1 option selected in every multi-select question</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filter controls -->
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

      <!-- Issues List -->
      <div id="quality-issues-list" class="space-y-3"></div>

      <!-- No issues state -->
      <div id="quality-clean" class="hidden text-center py-16">
        <i class="fas fa-check-circle text-green-400 text-5xl mb-4"></i>
        <h3 class="text-lg font-semibold text-gray-700">All Data Looks Clean!</h3>
        <p class="text-gray-400 mt-1">No outliers or data quality issues detected in the current submissions.</p>
      </div>
    </div>

    <!-- ==================== RESPONSES TAB ==================== -->
    <div class="tab-content" id="tab-responses">
      <div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-gray-700"><i class="fas fa-table text-blue-500 mr-2"></i>All Survey Responses</h3>
          <button onclick="downloadExcel()" class="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg font-semibold text-xs transition flex items-center gap-2">
            <i class="fas fa-file-excel"></i> Export to Excel
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50">
                <th class="text-left py-3 px-4 font-semibold text-gray-600">#</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-600">Business Name</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-600">Type</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-600">Employees</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-600">Years</th>
                <th class="text-left py-3 px-4 font-semibold text-gray-600">Submitted</th>
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
        <i class="fas fa-database mr-1"></i> Data sourced from KoboToolbox &bull;
        <span id="last-updated">-</span> &bull;
        MSME Uganda Survey &copy; 2026
      </p>
    </footer>
  </main>

  <script>
    // ==================== GLOBAL STATE ====================
    let charts = {};
    let currentStats = null;
    let qualityData = null;
    let currentFilter = 'all';

    // ==================== COLOR PALETTES ====================
    const COLORS = {
      primary: ['#2563eb','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0d9488','#ea580c','#4f46e5'],
      soft: ['#93c5fd','#67e8f9','#6ee7b7','#fcd34d','#fca5a5','#c4b5fd','#f9a8d4','#5eead4','#fdba74','#a5b4fc'],
      bg: ['rgba(37,99,235,0.15)','rgba(8,145,178,0.15)','rgba(5,150,105,0.15)','rgba(217,119,6,0.15)','rgba(220,38,38,0.15)','rgba(124,58,237,0.15)','rgba(219,39,119,0.15)','rgba(13,148,136,0.15)','rgba(234,88,12,0.15)','rgba(79,70,229,0.15)']
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
        XLSX.utils.book_append_sheet(wb, ws, 'MSME Survey Data');

        // Auto-width columns
        const colWidths = Object.keys(data.rows[0] || {}).map(key => ({
          wch: Math.max(key.length, ...data.rows.map(r => (r[key] || '').toString().length)).toString().length > 40 ? 40 : Math.max(key.length + 2, 12)
        }));
        ws['!cols'] = colWidths;

        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, 'MSME_Uganda_Survey_' + today + '.xlsx');
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
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: COLORS.primary.slice(0, labels.length),
            borderColor: COLORS.primary.slice(0, labels.length),
            borderWidth: 1,
            borderRadius: 6,
            maxBarThickness: 50
          }]
        },
        options: {
          indexAxis: horizontal ? 'y' : 'x',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { padding: 10, cornerRadius: 8 } },
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
      charts[id] = new Chart(document.getElementById(id), {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: COLORS.primary.slice(0, labels.length),
            borderWidth: 2,
            borderColor: '#fff',
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '55%',
          plugins: {
            legend: { position: 'right', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
            tooltip: { padding: 10, cornerRadius: 8 }
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
          labels: labels,
          datasets: [
            {
              label: 'Daily', data: values, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)',
              fill: true, tension: 0.4, pointRadius: 5, pointHoverRadius: 8, borderWidth: 2
            },
            {
              label: 'Cumulative', data: cumulative, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.05)',
              fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2, borderDash: [5, 3]
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { boxWidth: 12, padding: 12, font: { size: 11 } } }, tooltip: { padding: 10, cornerRadius: 8 } },
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
          plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } }, tooltip: { padding: 10, cornerRadius: 8 } },
          scales: { r: { ticks: { precision: 0, stepSize: 1 } } }
        }
      });
    }

    function createRadarChart(id, data) {
      destroyChart(id);
      const labels = Object.keys(data);
      const values = Object.values(data);
      charts[id] = new Chart(document.getElementById(id), {
        type: 'radar',
        data: { labels, datasets: [{ label: 'Responses', data: values, backgroundColor: 'rgba(37,99,235,0.15)', borderColor: '#2563eb', borderWidth: 2, pointBackgroundColor: '#2563eb', pointRadius: 4 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { padding: 10, cornerRadius: 8 } },
          scales: { r: { beginAtZero: true, ticks: { precision: 0, stepSize: 1 }, pointLabels: { font: { size: 11 } } } }
        }
      });
    }

    // ==================== RENDER DASHBOARD ====================
    function renderDashboard(s) {
      document.getElementById('kpi-total').textContent = s.total_submissions;
      document.getElementById('kpi-types').textContent = Object.keys(s.business_types).length;
      document.getElementById('kpi-loans').textContent = s.loan_applied['Yes'] || 0;
      document.getElementById('kpi-training').textContent = s.training_participated['Yes'] || 0;
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

      // Quality badge in nav
      const badge = document.getElementById('quality-badge');
      if (dq.total_issues > 0) {
        badge.textContent = dq.total_issues;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }

      // Charts
      createLineChart('chart-timeline', s.submission_timeline);
      createDoughnutChart('chart-business-types', s.business_types);
      createBarChart('chart-employees', s.employees);
      createDoughnutChart('chart-years', s.years_operation);
      createDoughnutChart('chart-tried-failed', s.tried_failed);
      createBarChart('chart-failure-causes', s.failure_causes);
      createBarChart('chart-finance-sources', s.finance_sources);
      createDoughnutChart('chart-loan-applied', s.loan_applied);
      createDoughnutChart('chart-loan-outcome', s.loan_outcome);
      createBarChart('chart-finance-challenges', s.finance_challenges, true);
      createBarChart('chart-ease-register', s.ease_register);
      createBarChart('chart-reg-challenges', s.reg_challenges, true);
      createPolarChart('chart-marketing-channels', s.marketing_channels);
      createBarChart('chart-market-barriers', s.market_barriers, true);
      createRadarChart('chart-important-skills', s.important_skills);
      createDoughnutChart('chart-training', s.training_participated);
      createBarChart('chart-support-types', s.support_types, true);
      createBarChart('chart-gov-role', s.gov_role);

      // Comments
      const commentsDiv = document.getElementById('comments-list');
      if (s.comments && s.comments.length > 0) {
        commentsDiv.innerHTML = s.comments.map(c =>
          '<div class="bg-gray-50 rounded-lg p-4 border border-gray-100">' +
            '<div class="flex items-center justify-between mb-2">' +
              '<span class="font-semibold text-sm text-gray-700"><i class="fas fa-building mr-1 text-gray-400"></i>' + escapeHtml(c.business) + '</span>' +
              '<span class="text-xs text-gray-400">' + c.date + '</span>' +
            '</div>' +
            '<p class="text-sm text-gray-600 leading-relaxed">' + escapeHtml(c.comment) + '</p>' +
          '</div>'
        ).join('');
      } else {
        commentsDiv.innerHTML = '<p class="text-gray-400 text-sm italic">No comments yet.</p>';
      }

      // Responses Table
      const tbody = document.getElementById('responses-table');
      if (s.businesses && s.businesses.length > 0) {
        tbody.innerHTML = s.businesses.map((b, i) =>
          '<tr class="border-b border-gray-100 hover:bg-gray-50">' +
            '<td class="py-3 px-4 text-gray-400 font-medium">' + (i + 1) + '</td>' +
            '<td class="py-3 px-4 font-medium text-gray-800">' + escapeHtml(b.name) + '</td>' +
            '<td class="py-3 px-4"><span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">' + escapeHtml(b.type) + '</span></td>' +
            '<td class="py-3 px-4 text-gray-600">' + escapeHtml(b.employees) + '</td>' +
            '<td class="py-3 px-4 text-gray-600">' + escapeHtml(b.years) + '</td>' +
            '<td class="py-3 px-4 text-gray-400 text-xs">' + (b.submitted ? new Date(b.submitted).toLocaleDateString() : '-') + '</td>' +
          '</tr>'
        ).join('');
      }
    }

    // ==================== RENDER QUALITY TAB ====================
    function renderQuality(q) {
      document.getElementById('q-high').textContent = q.issues.filter(i => i.severity === 'high').length;
      document.getElementById('q-medium').textContent = q.issues.filter(i => i.severity === 'medium').length;
      document.getElementById('q-low').textContent = q.issues.filter(i => i.severity === 'low').length;

      // Health score: 100 - (high*10 + medium*3 + low*1) clamped to 0-100
      const highC = q.issues.filter(i => i.severity === 'high').length;
      const medC = q.issues.filter(i => i.severity === 'medium').length;
      const lowC = q.issues.filter(i => i.severity === 'low').length;
      const score = Math.max(0, Math.min(100, 100 - (highC * 10 + medC * 3 + lowC * 1)));
      const healthEl = document.getElementById('q-health');
      healthEl.textContent = score + '%';
      healthEl.className = 'stat-number text-3xl font-bold ' + (score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600');

      // Issues by type chart
      const typeCounts = q.issues_by_type || {};
      const nonZero = {};
      for (const [k, v] of Object.entries(typeCounts)) { if (v > 0) nonZero[k] = v; }
      if (Object.keys(nonZero).length > 0) {
        createDoughnutChart('chart-quality-types', nonZero);
      }

      // Render issues list
      renderIssuesList(q.issues);

      // Show/hide clean state
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
            '<span class="text-xs text-gray-400 sm:ml-auto"><i class="fas fa-building mr-1"></i>' + escapeHtml(issue.business) + ' &bull; ' + issue.submitted + '</span>' +
          '</div>' +
          '<p class="text-sm text-gray-700">' + escapeHtml(issue.description) + '</p>' +
          '<p class="text-xs text-gray-400 mt-1"><i class="fas fa-tag mr-1"></i>Field: ' + escapeHtml(issue.field) + ' &bull; ID: ' + issue.id + '</p>' +
        '</div>';
      }).join('');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ==================== INIT ====================
    refreshData();
    setInterval(refreshData, 120000);
  </script>
</body>
</html>`
}

export default app
