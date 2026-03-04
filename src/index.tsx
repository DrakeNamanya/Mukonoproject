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

// ==================== COMPLETE LABEL MAPPINGS (from form XML) ====================
const L: Record<string, Record<string, string>> = {
  yes_no: { yes:'Yes', no:'No' },
  legal_status: { sole_proprietorship:'Sole Proprietorship', partnership:'Partnership', limited_private:'Limited Company (Private)', limited_public:'Limited Company (Public)', cooperative:'Cooperative', cbo:'CBO', informal:'Informal (Unregistered)', other:'Other' },
  owner_role: { owner:'Owner', manager:'Manager', owner_manager:'Owner-Manager', other:'Other' },
  gender: { male:'Male', female:'Female' },
  nationality: { ugandan:'Ugandan', other:'Other' },
  education: { no_formal:'No Formal Education', primary:'Primary (P1-P7)', o_level:'O-Level (S1-S4)', a_level:'A-Level (S5-S6)', cert_diploma:'Certificate/Diploma', bachelors:"Bachelor's Degree", postgrad:'Postgraduate', other:'Other' },
  disability: { no_disability:'None', visual:'Visual', hearing:'Hearing', physical:'Physical/Mobility', other_disability:'Other', prefer_not_say:'Prefer Not Say', both_visual_hearing:'Visual & Hearing' },
  ownership: { single_owner:'Single Owner', multiple_owners:'Multiple Owners', family_owned:'Family Owned', community_owned:'Community Owned', other:'Other' },
  family_gen: { first:'1st Generation', second:'2nd Generation', third_plus:'3rd+ Generation' },
  sector: { wholesale:'Wholesale', retail:'Retail', import_export:'Import/Export', accommodation_food:'Accommodation & Food', manufacturing:'Manufacturing', agribusiness:'Agribusiness', financial:'Financial Services', health:'Health & Social', education:'Education', mechanical:'Mechanical & Repair', construction:'Construction & Real Estate', ict:'ICT & Telecom', transport:'Transport & Storage', recreation:'Recreation & Personal', professional:'Professional Services', other:'Other' },
  registration: { mmc_only:'MMC Only', ursb_only:'URSB Only', both:'Both URSB & MMC', informal:'Informal', other:'Other' },
  biz_size: { micro:'Micro (1-4)', small:'Small (5-19)', medium:'Medium (20-99)', large:'Large (100+)' },
  emp_growth: { sig_increased:'Significantly Increased (>20%)', mod_increased:'Moderately Increased (10-20%)', slight_increased:'Slightly Increased (1-9%)', same:'Same', decreased:'Decreased', not_applicable:'N/A (New Business)' },
  premises: { own:'Own Premises', rented:'Rented/Leased', home:'Home-based', mobile:'Mobile/No Fixed', other:'Other' },
  branch_loc: { within_mmc:'Within MMC', mukono_district:'Mukono District', another_district:'Another District', other:'Other' },
  target_market: { local_consumers:'Local Consumers', b2b:'B2B', government:'Government', ngos:'NGOs', export:'Export', other:'Other' },
  market_reach: { mmc_only:'MMC Only', mukono_district:'Mukono District', gkma:'Greater Kampala', national:'National', regional:'East Africa', international:'International' },
  customer_channels: { walk_in:'Walk-in', word_of_mouth:'Word of Mouth', social_media:'Social Media', website:'Website/E-commerce', phone:'Phone Calls', ads:'Advertisements', networks:'Business Networks', other:'Other' },
  online_platforms: { whatsapp:'WhatsApp Business', facebook_instagram:'Facebook/Instagram', own_website:'Own Website', ecommerce:'Jumia/Jiji', other:'Other' },
  input_sources: { within_mmc:'Within MMC', kampala:'Kampala', other_districts:'Other Districts', imported:'Imported', own_production:'Own Production', other:'Other' },
  sourcing_challenges: { high_cost:'High Cost Inputs', poor_quality:'Poor Quality', unreliable:'Unreliable Supply', long_distances:'Long Distances', credit_issues:'Credit Issues', other:'Other' },
  revenue: { below_500k:'Below 500K', '500k_1m':'500K-1M', '1m_2m':'1M-2M', '2m_5m':'2M-5M', '5m_10m':'5M-10M', '10m_20m':'10M-20M', '20m_50m':'20M-50M', above_50m:'Above 50M' },
  revenue_trend: { lower:'Lower', same:'Same', higher:'Higher' },
  fin_records: { formal_system:'Formal Accounting', basic_records:'Basic Written Records', no_records:'No Records (Mental)', other:'Other' },
  investment_areas: { equipment:'Equipment/Machinery', premises:'Premises/Land', inventory:'Inventory/Stock', technology:'Technology', training:'Staff Training', marketing:'Marketing', other:'Other' },
  tax_types: { income_tax:'Income Tax', vat:'VAT', property_rates:'Property Rates', other:'Other' },
  no_tax_reasons: { limited_knowledge:'Limited Knowledge', too_small:'Too Small', complicated:'Complicated', not_aware:'Not Aware' },
  capital_sources: { own_savings:'Own Savings', family:'Family/Friends', bank_loan:'Bank Loan', microfinance:'Microfinance', sacco:'SACCO', mobile_money:'Mobile Money Loan', supplier_credit:'Supplier Credit', government:'Government (Emyooga)', ngo:'NGO/Donor', moneylender:'Moneylender', other:'Other' },
  loan_status: { approved_received:'Approved & Received', approved_declined:'Approved but Declined', rejected:'Rejected', pending:'Pending' },
  loan_barriers: { no_collateral:'No Collateral', high_interest:'High Interest', complicated:'Complex Process', fear_debt:'Fear of Debt', no_history:'No Credit History', too_small:'Business Too Small', no_need:'No Need', other:'Other' },
  fin_support: { low_interest:'Low Interest Loans', grants:'Grants/Seed Capital', flexible_terms:'Flexible Terms', bds_finance:'BDS + Finance', market_access:'Market Access', other:'Other' },
  tech_used: { computer:'Computer/Laptop', smartphone:'Smartphone', internet:'Internet', mobile_money:'Mobile Money', accounting_software:'Accounting Software', social_media:'Social Media', website:'Website', pos:'POS Machine', cctv:'CCTV', none:'None' },
  payment_methods: { cash:'Cash', mobile_money:'Mobile Money', bank_transfer:'Bank Transfer', card:'Card', credit:'Credit/Post-pay', barter:'Barter', cheque:'Cheque' },
  digital_literacy: { low:'Low', moderate:'Moderate', high:'High' },
  digital_barriers: { expensive:'Too Expensive', no_knowledge:'Lack of Knowledge', poor_connectivity:'Poor Connectivity', customers_prefer_cash:'Customers Prefer Cash', no_need:'No Need', adequate:'Currently Adequate', other:'Other' },
  infra_challenges: { poor_roads:'Poor Roads', electricity:'Unreliable Electricity', water:'Lack of Water', drainage:'Poor Drainage', insecurity:'Insecurity/Theft', internet:'Poor Internet', parking:'Lack of Parking', waste:'Poor Waste Mgmt', other:'Other' },
  infra_rating: { very_poor:'Very Poor', poor:'Poor', fair:'Fair', good:'Good', very_good:'Very Good', dont_know:"Don't Know" },
  location_importance: { very_important:'Very Important', important:'Important', somewhat:'Somewhat', not_important:'Not Important', not_applicable:'N/A' },
  missing_skills: { business_mgmt:'Business Mgmt', financial_mgmt:'Financial Mgmt', marketing:'Marketing & Sales', customer_service:'Customer Service', technical:'Technical/Production', digital:'Digital/ICT', record_keeping:'Record Keeping', quality_control:'Quality Control', english:'English Language', other:'Other' },
  training_sources: { government:'Government', ngo:'NGO/Donor', private_institute:'Private Institute', business_assoc:'Business Assoc.', financial_inst:'Financial Institution', mmc:'MMC', other:'Other' },
  training_needs: { business_mgmt:'Business Mgmt', financial_mgmt:'Financial Mgmt', marketing_branding:'Marketing/Branding', digital_marketing:'Digital Marketing', product_dev:'Product Dev', quality_standards:'Quality Standards', export_procedures:'Export Procedures', customer_care:'Customer Care', other:'Other' },
  challenges: { utilities_cost:'High Utilities Cost', market_access:'Limited Market Access', no_bds:'No BDS Access', political_uncertainty:'Political Uncertainty', finance_access:'Finance Access', high_taxes:'High Taxes/Fees', competition:'Competition', low_demand:'Low Demand', high_input_costs:'High Input Costs', poor_infrastructure:'Poor Infrastructure', no_space:'No Space/Premises', skills_gap:'Skills Gap', insecurity:'Insecurity/Theft', unfair_competition:'Unfair Competition', red_tape:'Red Tape', corruption:'Corruption', no_tech:'No Technology', other:'Other' },
  support_needed: { credit:'Affordable Credit', training:'Business Training', mentorship:'Mentorship', infrastructure:'Infrastructure', tax_incentives:'Tax Incentives', market_linkages:'Market Linkages', policy_advocacy:'Policy Advocacy', technology:'Technology Access', skills_dev:'Skills Development', premises:'Business Premises', investment_promotion:'Investment Promotion', other:'Other' },
  growth_opp: { population:'Growing Population', proximity_kampala:'Near Kampala', industrial_park:'Industrial Park', tourism:'Tourism', agric_value_addition:'Agric Value Addition', export:'Export', digital_ecommerce:'Digital/E-commerce', real_estate:'Real Estate', education:'Education', other:'Other' },
  export_plans: { currently_exporting:'Currently Exporting', plan_to_export:'Plan to Export', no_plans:'No Plans', dont_know:"Don't Know" },
  support_programs: { emyooga:'Emyooga', pdm:'PDM', youth_livelihood:'Youth Livelihood', women_prog:'Women Entrepreneurship', uiri:'UIRI', enterprise_uganda:'Enterprise Uganda', other:'Other' },
  mmc_support: { lower_fees:'Lower Fees/Taxes', training:'Business Training', credit_facilities:'Credit Facilities', market_linkages:'Market Linkages', infrastructure:'Better Infrastructure', incubation:'Incubation Centers', simplified_regs:'Simplified Regulations', tender_info:'Tender Information', networking:'Networking Events', other:'Other' },
  invest_amount: { below_1m:'Below 1M', '1m_5m':'1M-5M', '5m_10m':'5M-10M', '10m_50m':'10M-50M', above_50m:'Above 50M', prefer_not_say:'Prefer Not Say' },
  regulatory: { very_favorable:'Very Favorable', favorable:'Favorable', neutral:'Neutral', unfavorable:'Unfavorable', very_unfavorable:'Very Unfavorable' },
  appearance: { well_established:'Well-established', moderately_established:'Moderately Established', temporary:'Temporary', mobile_vendor:'Mobile/Street Vendor', home_based:'Home-based' },
  activity: { very_busy:'Very Busy', moderately_busy:'Moderately Busy', quiet:'Quiet', closed:'Closed' },
  no_assoc_reasons: { not_aware:'Not Aware', expensive:'Too Expensive', no_benefits:'No Benefits', no_time:'No Time', other:'Other' }
}

// ==================== HELPERS ====================
function g(r:any, path:string) {
  const parts = path.split('/')
  let val:any = r
  for (const p of parts) { val = val?.[p]; if (val === undefined || val === null) return null }
  return val
}

function countSingle(records:any[], path:string, labelMap:Record<string,string>) {
  const counts:Record<string,number> = {}
  for (const k of Object.keys(labelMap)) counts[labelMap[k]] = 0
  for (const r of records) {
    const v = g(r, path)
    if (v && labelMap[v]) counts[labelMap[v]]++
  }
  return counts
}

function countMulti(records:any[], path:string, labelMap:Record<string,string>) {
  const counts:Record<string,number> = {}
  for (const k of Object.keys(labelMap)) counts[labelMap[k]] = 0
  for (const r of records) {
    const v = g(r, path)
    if (v) { for (const s of String(v).split(' ')) { if (labelMap[s]) counts[labelMap[s]]++ } }
  }
  return counts
}

function getTimeline(records:any[]) {
  const tl:Record<string,number> = {}
  for (const r of records) {
    const d = r.__system?.submissionDate?.split('T')[0]
    if (d) tl[d] = (tl[d]||0)+1
  }
  const sorted:Record<string,number> = {}
  for (const k of Object.keys(tl).sort()) sorted[k] = tl[k]
  return sorted
}

function getAgeGroups(records:any[]) {
  const b:Record<string,number> = {'18-25':0,'26-35':0,'36-45':0,'46-55':0,'56-65':0,'Over 65':0}
  for (const r of records) {
    const a = g(r,'section_a3/owner_age')
    if (a!=null) { if (a<=25) b['18-25']++; else if (a<=35) b['26-35']++; else if (a<=45) b['36-45']++; else if (a<=55) b['46-55']++; else if (a<=65) b['56-65']++; else b['Over 65']++ }
  }
  return b
}

function getEmployeeStats(records:any[]) {
  let mf=0,mp=0,ff=0,fp=0,pf=0,pp=0
  for (const r of records) {
    mf+=g(r,'section_b/male_fulltime')||0; mp+=g(r,'section_b/male_parttime')||0
    ff+=g(r,'section_b/female_fulltime')||0; fp+=g(r,'section_b/female_parttime')||0
    pf+=g(r,'section_b/pwd_fulltime')||0; pp+=g(r,'section_b/pwd_parttime')||0
  }
  return {'Male Full-time':mf,'Male Part-time':mp,'Female Full-time':ff,'Female Part-time':fp,'PWD Full-time':pf,'PWD Part-time':pp}
}

function getSizeCategories(records:any[]) {
  const c:Record<string,number>={'Micro (1-4)':0,'Small (5-19)':0,'Medium (20-99)':0,'Large (100+)':0}
  for (const r of records) {
    const t=parseInt(g(r,'section_b/total_employees'))||0
    if(t<=4)c['Micro (1-4)']++;else if(t<=19)c['Small (5-19)']++;else if(t<=99)c['Medium (20-99)']++;else c['Large (100+)']++
  }
  return c
}

function getInfraScores(records:any[]) {
  const fields=['road_access','electricity','water_supply','waste_management','drainage','security','internet','public_transport','parking']
  const sm:Record<string,number>={very_poor:1,poor:2,fair:3,good:4,very_good:5}
  const result:Record<string,number>={}
  for(const f of fields){
    let sum=0,cnt=0
    for(const r of records){const v=g(r,'section_g/'+f);if(v&&sm[v]){sum+=sm[v];cnt++}}
    result[f.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())]=cnt>0?Math.round(sum/cnt*10)/10:0
  }
  return result
}

function getGPSPoints(records:any[]) {
  const pts:any[]=[]
  for(const r of records){
    const gps=g(r,'section_l/gps_location')
    if(gps?.coordinates){
      pts.push({
        lat:gps.coordinates[1],lon:gps.coordinates[0],
        accuracy:gps.properties?.accuracy||0,
        business:g(r,'section_a/business_legal_name')||'Unknown',
        sector:L.sector[g(r,'section_a/business_sector')]||g(r,'section_a/business_sector')||'N/A',
        ward:g(r,'section_a/ward')?.replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase())||'',
        owner:g(r,'section_a3/owner_name')||'',
        division:g(r,'section_a/division')?.replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase())||''
      })
    }
  }
  return pts
}

function getWardDistribution(records:any[]) {
  const w:Record<string,number>={}
  for(const r of records){
    const v=g(r,'section_a/ward')
    if(v){const label=v.replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase());w[label]=(w[label]||0)+1}
  }
  return w
}

function getSectorByWard(records:any[]) {
  const result:Record<string,Record<string,number>>={}
  for(const r of records){
    const ward=g(r,'section_a/ward')?.replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase())||'Unknown'
    const sector=L.sector[g(r,'section_a/business_sector')]||'Other'
    if(!result[ward])result[ward]={}
    result[ward][sector]=(result[ward][sector]||0)+1
  }
  return result
}

function getGenderBySector(records:any[]) {
  const result:Record<string,Record<string,number>>={}
  for(const r of records){
    const sector=L.sector[g(r,'section_a/business_sector')]||'Other'
    const gen=L.gender[g(r,'section_a3/owner_gender')]||'Unknown'
    if(!result[sector])result[sector]={}
    result[sector][gen]=(result[sector][gen]||0)+1
  }
  return result
}

// ==================== DATA QUALITY ENGINE (14 checks) ====================
interface Issue { id:string; business:string; severity:'high'|'medium'|'low'; type:string; description:string; field:string; submitted:string; enumerator:string }

function detectIssues(records:any[]): {issues:Issue[], summary:Record<string,number>} {
  const issues:Issue[]=[]
  const summary:Record<string,number>={
    'Duplicate Business':0,'Rushed Submission':0,'Extremely Long Duration':0,
    'Missing Critical Field':0,'Age Outlier':0,'No Consent':0,
    'Revenue Inconsistency':0,'Employee Data Error':0,
    'Missing GPS':0,'Year Outlier':0,'No Response/Empty Section':0,
    'Phone Format':0,'Operating Hours Outlier':0,'Logical Inconsistency':0,
    'Suspicious Pattern':0,'National ID Format':0
  }

  const nameMap:Record<string,string[]>={}
  for(const r of records){
    const n=(g(r,'section_a/business_legal_name')||'').trim().toLowerCase()
    const w=(g(r,'section_a/ward')||'').trim().toLowerCase()
    const key=n+'|'+w
    if(n){if(!nameMap[key])nameMap[key]=[];nameMap[key].push(r.__id)}
  }

  for(const r of records){
    const id=r.__id||''
    const biz=g(r,'section_a/business_legal_name')||'Unknown'
    const sub=r.__system?.submissionDate?.split('T')[0]||''
    const enu=r.__system?.submitterName||'Unknown'

    // 1. DUPLICATE
    const n=(g(r,'section_a/business_legal_name')||'').trim().toLowerCase()
    const w=(g(r,'section_a/ward')||'').trim().toLowerCase()
    const key=n+'|'+w
    if(n && nameMap[key]?.length>1){
      issues.push({id,business:biz,severity:'high',type:'Duplicate Business',description:`"${biz}" appears ${nameMap[key].length} times in same ward.`,field:'Business Name + Ward',submitted:sub,enumerator:enu})
      summary['Duplicate Business']++
    }

    // 2. RUSHED (<3 min for 80+ field form)
    if(r.start_time && r.end_time){
      const dur=(new Date(r.end_time).getTime()-new Date(r.start_time).getTime())/60000
      if(dur<3){
        issues.push({id,business:biz,severity:'high',type:'Rushed Submission',description:`Completed in ${dur.toFixed(1)} min. Form has 80+ fields — impossible to fill properly.`,field:'Duration',submitted:sub,enumerator:enu})
        summary['Rushed Submission']++
      } else if(dur>180){
        issues.push({id,business:biz,severity:'low',type:'Extremely Long Duration',description:`Took ${Math.round(dur)} min. Enumerator may have left form open.`,field:'Duration',submitted:sub,enumerator:enu})
        summary['Extremely Long Duration']++
      }
    }

    // 3. MISSING CRITICAL FIELDS (16 fields)
    const critical=[
      {p:'section_a/business_legal_name',l:'Business Name'},{p:'section_a/division',l:'Division'},{p:'section_a/ward',l:'Ward'},
      {p:'section_a/business_sector',l:'Sector'},{p:'section_a/business_phone1',l:'Phone'},{p:'section_a/year_established',l:'Year Established'},
      {p:'section_a3/owner_name',l:'Owner Name'},{p:'section_a3/owner_gender',l:'Gender'},{p:'section_a3/owner_age',l:'Owner Age'},
      {p:'section_b/male_fulltime',l:'Male Full-time'},{p:'section_b/female_fulltime',l:'Female Full-time'},
      {p:'section_c/current_monthly_revenue',l:'Monthly Revenue'},{p:'section_e/capital_sources',l:'Capital Source'},
      {p:'section_l/gps_location',l:'GPS Location'},
      {p:'section_a/registration_status',l:'Registration Status'},{p:'section_a/legal_status',l:'Legal Status'}
    ]
    for(const c of critical){
      const v=g(r,c.p)
      if(v===null||v===undefined||v===''){
        if(c.l==='GPS Location'){
          issues.push({id,business:biz,severity:'medium',type:'Missing GPS',description:`GPS location not captured. Cannot map this business.`,field:c.l,submitted:sub,enumerator:enu})
          summary['Missing GPS']++
        } else {
          issues.push({id,business:biz,severity:'medium',type:'Missing Critical Field',description:`"${c.l}" is empty or missing.`,field:c.l,submitted:sub,enumerator:enu})
          summary['Missing Critical Field']++
        }
      }
    }

    // 4. EMPTY SECTIONS
    const secChecks=[
      {section:'section_c',label:'Finance (Section C)',fields:['current_monthly_revenue','financial_records']},
      {section:'section_f',label:'Technology (Section F)',fields:['tech_used','digital_literacy']},
      {section:'section_g',label:'Infrastructure (Section G)',fields:['road_access','electricity','water_supply']},
      {section:'section_h',label:'Skills (Section H)',fields:['lacks_skills','received_training']},
      {section:'section_i',label:'Challenges (Section I)',fields:['business_challenges','support_needed']},
    ]
    for(const sc of secChecks){
      let allEmpty=true
      for(const f of sc.fields){const v=g(r,sc.section+'/'+f);if(v!==null&&v!==undefined&&v!==''){allEmpty=false;break}}
      if(allEmpty){
        issues.push({id,business:biz,severity:'medium',type:'No Response/Empty Section',description:`Entire "${sc.label}" has no responses. Skipped?`,field:sc.label,submitted:sub,enumerator:enu})
        summary['No Response/Empty Section']++
      }
    }

    // 5. AGE OUTLIER
    const age=g(r,'section_a3/owner_age')
    if(age!=null&&(age<16||age>90)){
      issues.push({id,business:biz,severity:'medium',type:'Age Outlier',description:`Owner age ${age} outside expected range (16-90).`,field:'Owner Age',submitted:sub,enumerator:enu})
      summary['Age Outlier']++
    }

    // 6. YEAR ESTABLISHED OUTLIER
    const yr=g(r,'section_a/year_established')
    const curYr=new Date().getFullYear()
    if(yr!=null&&(yr<1950||yr>curYr)){
      issues.push({id,business:biz,severity:'medium',type:'Year Outlier',description:`Year established ${yr} outside valid range (1950-${curYr}).`,field:'Year Established',submitted:sub,enumerator:enu})
      summary['Year Outlier']++
    }

    // 7. NO CONSENT
    if(r.consent==='no'){
      issues.push({id,business:biz,severity:'high',type:'No Consent',description:`Respondent did NOT consent. Data should be excluded.`,field:'Consent',submitted:sub,enumerator:enu})
      summary['No Consent']++
    }

    // 8. EMPLOYEE DATA ERROR
    const empF=['male_fulltime','male_parttime','female_fulltime','female_parttime','pwd_fulltime','pwd_parttime']
    for(const ef of empF){
      const ev=g(r,'section_b/'+ef)
      if(ev!=null&&(ev<0||ev>500)){
        issues.push({id,business:biz,severity:'high',type:'Employee Data Error',description:`${ef.replace(/_/g,' ')} = ${ev}. Out of range (0-500).`,field:ef,submitted:sub,enumerator:enu})
        summary['Employee Data Error']++
      }
    }
    // Check total vs sum
    const totalEmp=parseInt(g(r,'section_b/total_employees'))||0
    const sumEmp=(g(r,'section_b/male_fulltime')||0)+(g(r,'section_b/male_parttime')||0)+(g(r,'section_b/female_fulltime')||0)+(g(r,'section_b/female_parttime')||0)
    if(totalEmp>0 && sumEmp>0 && Math.abs(totalEmp-sumEmp)>totalEmp*0.5){
      issues.push({id,business:biz,severity:'medium',type:'Employee Data Error',description:`Total employees (${totalEmp}) differs significantly from sum of male+female (${sumEmp}).`,field:'Total Employees',submitted:sub,enumerator:enu})
      summary['Employee Data Error']++
    }

    // 9. REVENUE INCONSISTENCY
    const revNow=g(r,'section_c/current_monthly_revenue')
    const prodCost=g(r,'section_c/monthly_production_cost')
    const revOrder=['below_500k','500k_1m','1m_2m','2m_5m','5m_10m','10m_20m','20m_50m','above_50m']
    if(revNow&&prodCost&&revOrder.indexOf(prodCost)>revOrder.indexOf(revNow)){
      issues.push({id,business:biz,severity:'medium',type:'Revenue Inconsistency',description:`Monthly cost (${L.revenue[prodCost]||prodCost}) exceeds revenue (${L.revenue[revNow]||revNow}).`,field:'Revenue vs Cost',submitted:sub,enumerator:enu})
      summary['Revenue Inconsistency']++
    }

    // 10. PHONE FORMAT
    const phone=g(r,'section_a/business_phone1')
    if(phone){
      const cleaned=String(phone).replace(/[\s\-\+]/g,'')
      if(cleaned.length<9||cleaned.length>13){
        issues.push({id,business:biz,severity:'low',type:'Phone Format',description:`Phone "${phone}" has unusual length (${cleaned.length} digits).`,field:'Phone',submitted:sub,enumerator:enu})
        summary['Phone Format']++
      }
    }

    // 11. OPERATING HOURS OUTLIER
    const opDays=g(r,'section_b/operating_days_week')
    const opHrs=g(r,'section_b/operating_hours_day')
    if(opDays!=null&&(opDays<1||opDays>7)){
      issues.push({id,business:biz,severity:'low',type:'Operating Hours Outlier',description:`${opDays} days/week — outside 1-7.`,field:'Operating Days',submitted:sub,enumerator:enu})
      summary['Operating Hours Outlier']++
    }
    if(opHrs!=null&&(opHrs<1||opHrs>24)){
      issues.push({id,business:biz,severity:'low',type:'Operating Hours Outlier',description:`${opHrs} hours/day — outside 1-24.`,field:'Operating Hours',submitted:sub,enumerator:enu})
      summary['Operating Hours Outlier']++
    }

    // 12. LOGICAL INCONSISTENCIES
    if(g(r,'section_e/applied_for_loan')==='no'&&g(r,'section_e/loan_status')){
      issues.push({id,business:biz,severity:'high',type:'Logical Inconsistency',description:`Said "No" to loan application but has loan status.`,field:'Loan Applied vs Status',submitted:sub,enumerator:enu})
      summary['Logical Inconsistency']++
    }
    if(g(r,'section_h/received_training')==='no'&&g(r,'section_h/training_sources')){
      issues.push({id,business:biz,severity:'high',type:'Logical Inconsistency',description:`Said "No" to training but has training sources.`,field:'Training',submitted:sub,enumerator:enu})
      summary['Logical Inconsistency']++
    }
    if(g(r,'section_j/business_association_member')==='no'&&g(r,'section_j/association_name')){
      issues.push({id,business:biz,severity:'medium',type:'Logical Inconsistency',description:`Not association member but provided association name.`,field:'Association',submitted:sub,enumerator:enu})
      summary['Logical Inconsistency']++
    }
    if(g(r,'section_d/pays_taxes')==='no'&&g(r,'section_d/tax_types')){
      issues.push({id,business:biz,severity:'medium',type:'Logical Inconsistency',description:`Pays no taxes but specified tax types.`,field:'Tax',submitted:sub,enumerator:enu})
      summary['Logical Inconsistency']++
    }
    if(g(r,'section_b/sell_online')==='no'&&g(r,'section_b/online_platforms')){
      issues.push({id,business:biz,severity:'medium',type:'Logical Inconsistency',description:`Does not sell online but specified online platforms.`,field:'Online Sales',submitted:sub,enumerator:enu})
      summary['Logical Inconsistency']++
    }
    if(g(r,'section_b/has_multiple_branches')==='no'&&g(r,'section_b/number_of_branches')&&parseInt(g(r,'section_b/number_of_branches'))>0){
      issues.push({id,business:biz,severity:'medium',type:'Logical Inconsistency',description:`No multiple branches but branch count > 0.`,field:'Branches',submitted:sub,enumerator:enu})
      summary['Logical Inconsistency']++
    }

    // 13. SUSPICIOUS PATTERN (all multi-select = only 1 option selected across multiple questions)
    const multiSelects=[
      g(r,'section_b/sourcing_challenges'),g(r,'section_i/business_challenges'),
      g(r,'section_i/support_needed'),g(r,'section_h/training_needs'),g(r,'section_h/missing_skills')
    ].filter(v=>v)
    if(multiSelects.length>=3){
      const allSingle=multiSelects.every(v=>!String(v).includes(' '))
      if(allSingle){
        issues.push({id,business:biz,severity:'low',type:'Suspicious Pattern',description:`All multi-select questions have exactly 1 option. May indicate rushed entry.`,field:'Multiple fields',submitted:sub,enumerator:enu})
        summary['Suspicious Pattern']++
      }
    }

    // 14. NATIONAL ID FORMAT
    const nid=g(r,'section_a/tin_number')
    if(nid){
      const cleaned=String(nid).replace(/\s/g,'')
      if(cleaned.length<9||cleaned.length>15||!/^\d+$/.test(cleaned)){
        issues.push({id,business:biz,severity:'low',type:'National ID Format',description:`TIN "${nid}" has unusual format.`,field:'TIN Number',submitted:sub,enumerator:enu})
        summary['National ID Format']++
      }
    }
  }

  return {issues,summary}
}

// ==================== EXPORT ====================
function buildExport(records:any[]) {
  return records.map((r:any,i:number)=>{
    const dur=(r.start_time&&r.end_time)?((new Date(r.end_time).getTime()-new Date(r.start_time).getTime())/60000).toFixed(1):''
    const gps=g(r,'section_l/gps_location')
    const gpsStr=gps?.coordinates?`${gps.coordinates[1]?.toFixed(5)}, ${gps.coordinates[0]?.toFixed(5)}`:''
    return {
      '#':i+1,
      'Submission Date':r.__system?.submissionDate||'',
      'Duration (min)':dur,
      'Enumerator':r.__system?.submitterName||'',
      'Business Name':g(r,'section_a/business_legal_name')||'',
      'Trading Name':g(r,'section_a/business_trading_name')||'',
      'Legal Status':L.legal_status[g(r,'section_a/legal_status')]||g(r,'section_a/legal_status')||'',
      'Division':(g(r,'section_a/division')||'').replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase()),
      'Ward':(g(r,'section_a/ward')||'').replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase()),
      'Village':(g(r,'section_a/village')||'').replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase()),
      'Sector':L.sector[g(r,'section_a/business_sector')]||g(r,'section_a/business_sector')||'',
      'Products/Services':g(r,'section_a/products_services')||'',
      'Registration':L.registration[g(r,'section_a/registration_status')]||'',
      'Year Established':g(r,'section_a/year_established')||'',
      'Reg Number':g(r,'section_a/business_reg_number')||'',
      'TIN':g(r,'section_a/tin_number')||'',
      'Phone':g(r,'section_a/business_phone1')||'',
      'Email':g(r,'section_a/business_email')||'',
      'Owner Name':g(r,'section_a3/owner_name')||'',
      'Owner Role':L.owner_role[g(r,'section_a3/owner_role')]||'',
      'Owner Gender':L.gender[g(r,'section_a3/owner_gender')]||'',
      'Owner Age':g(r,'section_a3/owner_age')||'',
      'Education':L.education[g(r,'section_a3/owner_education')]||'',
      'Disability':L.disability[g(r,'section_a3/owner_disability')]||'',
      'Ownership Structure':L.ownership[g(r,'section_a3/ownership_structure')]||'',
      'Total Employees':g(r,'section_b/total_employees')||'',
      'Male FT':g(r,'section_b/male_fulltime')||'',
      'Male PT':g(r,'section_b/male_parttime')||'',
      'Female FT':g(r,'section_b/female_fulltime')||'',
      'Female PT':g(r,'section_b/female_parttime')||'',
      'PWD FT':g(r,'section_b/pwd_fulltime')||'',
      'PWD PT':g(r,'section_b/pwd_parttime')||'',
      'Size Category':g(r,'section_b/business_size_category')||'',
      'Employment Growth':L.emp_growth[g(r,'section_b/employment_growth')]||'',
      'Premises':L.premises[g(r,'section_b/business_premises')]||'',
      'Op Days/Week':g(r,'section_b/operating_days_week')||'',
      'Op Hours/Day':g(r,'section_b/operating_hours_day')||'',
      'Target Market':L.target_market[g(r,'section_b/target_market')]||'',
      'Market Reach':L.market_reach[g(r,'section_b/market_reach')]||'',
      'Sells Online':g(r,'section_b/sell_online')||'',
      'Monthly Revenue':L.revenue[g(r,'section_c/current_monthly_revenue')]||'',
      'Revenue Trend':L.revenue_trend[g(r,'section_c/revenue_3years_ago')]||'',
      'Monthly Cost':L.revenue[g(r,'section_c/monthly_production_cost')]||'',
      'Financial Records':L.fin_records[g(r,'section_c/financial_records')]||'',
      'Trading Licence':g(r,'section_d/has_trading_licence')||'',
      'Pays Taxes':g(r,'section_d/pays_taxes')||'',
      'Capital Source':L.capital_sources[g(r,'section_e/capital_sources')]||'',
      'Applied Loan':g(r,'section_e/applied_for_loan')||'',
      'Loan Status':L.loan_status[g(r,'section_e/loan_status')]||'',
      'Digital Literacy':L.digital_literacy[g(r,'section_f/digital_literacy')]||'',
      'Regulatory Rating':L.regulatory[g(r,'regulatory_section/regulatory_environment')]||'',
      'Export Plans':L.export_plans[g(r,'section_j/export_plans')]||'',
      'Business Appearance':L.appearance[g(r,'section_l/business_appearance')]||'',
      'Activity Level':L.activity[g(r,'section_l/activity_level')]||'',
      'GPS':gpsStr,
      'Consent':g(r,'consent')||'',
      'Submitted By':r.__system?.submitterName||''
    }
  })
}

// ==================== ODK CENTRAL AUTH & FETCH ====================
async function getToken(server:string, email:string, password:string): Promise<string> {
  const r=await fetch(`${server}/v1/sessions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})})
  if(!r.ok) throw new Error(`ODK Auth failed: ${r.status}`)
  return ((await r.json()) as {token:string}).token
}

async function fetchData(server:string, token:string, projectId:string, formId:string) {
  const url=`${server}/v1/projects/${projectId}/forms/${formId}.svc/Submissions?$count=true&$top=50000&$expand=*`
  const r=await fetch(url,{headers:{'Authorization':`Bearer ${token}`}})
  if(!r.ok) throw new Error(`ODK API error: ${r.status}`)
  return r.json() as Promise<{value:any[],'@odata.count':number}>
}

function getEnv(c:any){
  return {
    server:c.env.ODK_SERVER||'https://odk.datacollectors.app',
    email:c.env.ODK_EMAIL||'drnamanya@gmail.com',
    password:c.env.ODK_PASSWORD||'Tw1n0mulamuz1!',
    projectId:c.env.ODK_PROJECT_ID||'1',
    formId:c.env.ODK_FORM_ID||'mukono_business_profiling_2026'
  }
}

async function getData(c:any){
  const e=getEnv(c)
  const token=await getToken(e.server,e.email,e.password)
  return fetchData(e.server,token,e.projectId,e.formId)
}

// ==================== API ROUTES ====================
app.get('/api/data',async(c)=>{
  try{const d=await getData(c);return c.json({success:true,count:d['@odata.count'],results:d.value})}
  catch(e:any){return c.json({success:false,error:e.message},500)}
})

app.get('/api/export',async(c)=>{
  try{const d=await getData(c);return c.json({success:true,count:d['@odata.count'],rows:buildExport(d.value)})}
  catch(e:any){return c.json({success:false,error:e.message},500)}
})

app.get('/api/quality',async(c)=>{
  try{
    const d=await getData(c)
    const q=detectIssues(d.value)
    return c.json({success:true,total_submissions:d['@odata.count'],total_issues:q.issues.length,issues_by_type:q.summary,issues:q.issues})
  }catch(e:any){return c.json({success:false,error:e.message},500)}
})

app.get('/api/stats',async(c)=>{
  try{
    const d=await getData(c)
    const recs=d.value
    const q=detectIssues(recs)

    const ages=recs.map(r=>g(r,'section_a3/owner_age')).filter(a=>a!=null) as number[]
    const avgAge=ages.length>0?Math.round(ages.reduce((s,a)=>s+a,0)/ages.length):0
    const totalEmp=recs.reduce((s,r)=>s+(parseInt(g(r,'section_b/total_employees'))||0),0)
    const consentY=recs.filter(r=>r.consent==='yes').length
    const femaleOwners=recs.filter(r=>g(r,'section_a3/owner_gender')==='female').length

    const stats={
      total:d['@odata.count'],
      timeline:getTimeline(recs),
      ward_distribution:getWardDistribution(recs),
      sector:countSingle(recs,'section_a/business_sector',L.sector),
      sector_by_ward:getSectorByWard(recs),
      gender_by_sector:getGenderBySector(recs),
      legal_status:countSingle(recs,'section_a/legal_status',L.legal_status),
      registration:countSingle(recs,'section_a/registration_status',L.registration),
      gender:countSingle(recs,'section_a3/owner_gender',L.gender),
      education:countSingle(recs,'section_a3/owner_education',L.education),
      disability:countSingle(recs,'section_a3/owner_disability',L.disability),
      ownership:countSingle(recs,'section_a3/ownership_structure',L.ownership),
      age_groups:getAgeGroups(recs),
      avg_age:avgAge,
      female_pct:recs.length>0?Math.round(femaleOwners/recs.length*100):0,
      total_employees:totalEmp,
      employee_breakdown:getEmployeeStats(recs),
      size_categories:getSizeCategories(recs),
      emp_growth:countSingle(recs,'section_b/employment_growth',L.emp_growth),
      premises:countSingle(recs,'section_b/business_premises',L.premises),
      target_market:countSingle(recs,'section_b/target_market',L.target_market),
      market_reach:countSingle(recs,'section_b/market_reach',L.market_reach),
      customer_channels:countMulti(recs,'section_b/customer_channels',L.customer_channels),
      sells_online:countSingle(recs,'section_b/sell_online',L.yes_no),
      online_platforms:countMulti(recs,'section_b/online_platforms',L.online_platforms),
      input_sources:countSingle(recs,'section_b/input_sources',L.input_sources),
      sourcing_challenges:countMulti(recs,'section_b/sourcing_challenges',L.sourcing_challenges),
      revenue:countSingle(recs,'section_c/current_monthly_revenue',L.revenue),
      revenue_trend:countSingle(recs,'section_c/revenue_3years_ago',L.revenue_trend),
      production_cost:countSingle(recs,'section_c/monthly_production_cost',L.revenue),
      fin_records:countSingle(recs,'section_c/financial_records',L.fin_records),
      investment_areas:countMulti(recs,'section_c/investment_areas',L.investment_areas),
      trading_licence:countSingle(recs,'section_d/has_trading_licence',L.yes_no),
      pays_taxes:countSingle(recs,'section_d/pays_taxes',L.yes_no),
      tax_types:countMulti(recs,'section_d/tax_types',L.tax_types),
      capital_sources:countSingle(recs,'section_e/capital_sources',L.capital_sources),
      loan_applied:countSingle(recs,'section_e/applied_for_loan',L.yes_no),
      loan_status:countSingle(recs,'section_e/loan_status',L.loan_status),
      loan_barriers:countMulti(recs,'section_e/loan_barriers',L.loan_barriers),
      fin_support:countSingle(recs,'section_e/financial_support_needed',L.fin_support),
      tech_used:countMulti(recs,'section_f/tech_used',L.tech_used),
      payment_methods:countMulti(recs,'section_f/payment_methods',L.payment_methods),
      digital_literacy:countSingle(recs,'section_f/digital_literacy',L.digital_literacy),
      digital_barriers:countMulti(recs,'section_f/digital_barriers',L.digital_barriers),
      infra_scores:getInfraScores(recs),
      infra_challenges:countMulti(recs,'section_g/infra_challenges',L.infra_challenges),
      location_importance:countSingle(recs,'section_g/location_importance',L.location_importance),
      missing_skills:countMulti(recs,'section_h/missing_skills',L.missing_skills),
      received_training:countSingle(recs,'section_h/received_training',L.yes_no),
      training_sources:countMulti(recs,'section_h/training_sources',L.training_sources),
      training_needs:countMulti(recs,'section_h/training_needs',L.training_needs),
      challenges:countMulti(recs,'section_i/business_challenges',L.challenges),
      support_needed:countMulti(recs,'section_i/support_needed',L.support_needed),
      growth_opp:countMulti(recs,'section_j/growth_opportunities',L.growth_opp),
      export_plans:countSingle(recs,'section_j/export_plans',L.export_plans),
      support_programs:countMulti(recs,'section_k/support_programs',L.support_programs),
      mmc_support:countMulti(recs,'section_k/mmc_support',L.mmc_support),
      regulatory:countSingle(recs,'regulatory_section/regulatory_environment',L.regulatory),
      appearance:countSingle(recs,'section_l/business_appearance',L.appearance),
      activity_level:countSingle(recs,'section_l/activity_level',L.activity),
      consent_rate:recs.length>0?Math.round(consentY/recs.length*100):0,
      gps_points:getGPSPoints(recs),
      enumerators:(()=>{const m:Record<string,number>={};for(const r of recs){const n=r.__system?.submitterName||'Unknown';m[n]=(m[n]||0)+1};return m})(),
      businesses:recs.map((r:any)=>({
        id:r.__id,
        name:g(r,'section_a/business_legal_name')||'Unknown',
        trading_name:g(r,'section_a/business_trading_name')||'',
        sector:L.sector[g(r,'section_a/business_sector')]||g(r,'section_a/business_sector')||'N/A',
        ward:(g(r,'section_a/ward')||'').replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase()),
        division:(g(r,'section_a/division')||'').replace(/_/g,' ').replace(/\b\w/g,(c:string)=>c.toUpperCase()),
        owner:g(r,'section_a3/owner_name')||'N/A',
        gender:L.gender[g(r,'section_a3/owner_gender')]||'N/A',
        age:g(r,'section_a3/owner_age'),
        employees:g(r,'section_b/total_employees')||'0',
        revenue:L.revenue[g(r,'section_c/current_monthly_revenue')]||'N/A',
        registration:L.registration[g(r,'section_a/registration_status')]||'N/A',
        submitted:r.__system?.submissionDate||'',
        submitted_by:r.__system?.submitterName||'N/A'
      })),
      data_quality:{
        total_issues:q.issues.length,
        high:q.issues.filter(i=>i.severity==='high').length,
        medium:q.issues.filter(i=>i.severity==='medium').length,
        low:q.issues.filter(i=>i.severity==='low').length,
        by_type:q.summary
      },
      last_updated:new Date().toISOString()
    }
    return c.json({success:true,stats})
  }catch(e:any){return c.json({success:false,error:e.message},500)}
})

// ==================== DASHBOARD HTML ====================
app.get('/',(c)=>c.html(dashboardHTML()))

function dashboardHTML(){
return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Mukono Business Profiling Dashboard</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
body{font-family:'Inter',sans-serif}
.card{transition:all .3s ease}.card:hover{transform:translateY(-2px);box-shadow:0 12px 24px rgba(0,0,0,.1)}
.stat-number{font-variant-numeric:tabular-nums}
.chart-container{position:relative;width:100%}
.loader{border:4px solid #f3f4f6;border-top:4px solid #0369a1;border-radius:50%;width:40px;height:40px;animation:spin .8s linear infinite}
@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.fade-in{animation:fadeIn .5s ease-out}
.pulse-dot{width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.gradient-bg{background:linear-gradient(135deg,#0c4a6e 0%,#075985 50%,#0369a1 100%)}
.nav-active{background:rgba(255,255,255,.15);border-bottom:3px solid #fbbf24}
.tab-content{display:none}.tab-content.active{display:block}
::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:#f1f5f9}::-webkit-scrollbar-thumb{background:#94a3b8;border-radius:3px}
.severity-high{background:#fef2f2;border-color:#fecaca}.severity-medium{background:#fffbeb;border-color:#fed7aa}.severity-low{background:#f0fdf4;border-color:#bbf7d0}
.badge-high{background:#dc2626;color:#fff}.badge-medium{background:#d97706;color:#fff}.badge-low{background:#16a34a;color:#fff}
#map{height:500px;border-radius:12px;z-index:1}
</style></head>
<body class="bg-gray-50 min-h-screen">
<header class="gradient-bg text-white shadow-lg">
<div class="max-w-7xl mx-auto px-4 sm:px-6 py-4">
<div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
<div class="flex items-center gap-3">
<div class="bg-white/20 p-2.5 rounded-lg"><i class="fas fa-city text-2xl text-yellow-300"></i></div>
<div><h1 class="text-xl sm:text-2xl font-bold tracking-tight">Mukono Business Profiling Survey</h1>
<p class="text-sm text-sky-200 mt-0.5">GKMA-UDP &mdash; World Bank &bull; Mukono Municipal Council &bull; Canva Consult</p></div></div>
<div class="flex items-center gap-3 flex-wrap">
<div class="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2"><div class="pulse-dot"></div><span class="text-sm font-medium">Live Data</span></div>
<button onclick="downloadExcel()" id="dlBtn" class="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2"><i class="fas fa-file-excel"></i> Excel</button>
<button onclick="refreshData()" class="bg-yellow-500 hover:bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2"><i class="fas fa-sync-alt" id="rfIcon"></i> Refresh</button>
</div></div></div>
<div class="max-w-7xl mx-auto px-4 sm:px-6">
<nav class="flex gap-1 overflow-x-auto pb-0" id="navTabs">
<button onclick="sw('overview')" class="nt nav-active px-3 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition" data-tab="overview"><i class="fas fa-tachometer-alt mr-1"></i>Overview</button>
<button onclick="sw('demographics')" class="nt px-3 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="demographics"><i class="fas fa-users mr-1"></i>Demographics</button>
<button onclick="sw('operations')" class="nt px-3 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="operations"><i class="fas fa-cogs mr-1"></i>Operations</button>
<button onclick="sw('finance')" class="nt px-3 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="finance"><i class="fas fa-coins mr-1"></i>Finance</button>
<button onclick="sw('digital')" class="nt px-3 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="digital"><i class="fas fa-laptop mr-1"></i>Digital &amp; Infra</button>
<button onclick="sw('challenges')" class="nt px-3 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="challenges"><i class="fas fa-exclamation-circle mr-1"></i>Challenges</button>
<button onclick="sw('map')" class="nt px-3 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="map"><i class="fas fa-map-marked-alt mr-1"></i>Map</button>
<button onclick="sw('quality')" class="nt px-3 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="quality"><i class="fas fa-shield-alt mr-1"></i>Data Quality <span id="qb" class="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white hidden">0</span></button>
<button onclick="sw('responses')" class="nt px-3 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition hover:bg-white/10" data-tab="responses"><i class="fas fa-table mr-1"></i>Responses</button>
</nav></div></header>

<div id="loading" class="flex flex-col items-center justify-center py-20"><div class="loader mb-4"></div><p class="text-gray-500 font-medium">Fetching live data from ODK Central...</p></div>
<div id="error" class="hidden max-w-7xl mx-auto px-4 py-10"><div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center"><i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-3"></i><h3 class="text-red-700 font-semibold text-lg">Failed to load data</h3><p class="text-red-500 mt-1" id="errMsg"></p><button onclick="refreshData()" class="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700">Retry</button></div></div>

<main id="main" class="hidden max-w-7xl mx-auto px-4 sm:px-6 py-6">

<!-- ======= OVERVIEW ======= -->
<div class="tab-content active" id="tab-overview">
<div class="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6 fade-in">
<div class="card bg-white rounded-xl p-4 shadow-sm border border-gray-100"><div class="flex items-center justify-between mb-2"><span class="text-xs font-semibold text-gray-400 uppercase">Businesses</span><div class="bg-sky-100 p-2 rounded-lg"><i class="fas fa-building text-sky-600"></i></div></div><div class="stat-number text-3xl font-bold text-gray-800" id="k-total">-</div><p class="text-xs text-gray-400 mt-1">Profiled</p></div>
<div class="card bg-white rounded-xl p-4 shadow-sm border border-gray-100"><div class="flex items-center justify-between mb-2"><span class="text-xs font-semibold text-gray-400 uppercase">Sectors</span><div class="bg-emerald-100 p-2 rounded-lg"><i class="fas fa-industry text-emerald-600"></i></div></div><div class="stat-number text-3xl font-bold text-gray-800" id="k-sectors">-</div><p class="text-xs text-gray-400 mt-1">Active</p></div>
<div class="card bg-white rounded-xl p-4 shadow-sm border border-gray-100"><div class="flex items-center justify-between mb-2"><span class="text-xs font-semibold text-gray-400 uppercase">Employees</span><div class="bg-purple-100 p-2 rounded-lg"><i class="fas fa-people-group text-purple-600"></i></div></div><div class="stat-number text-3xl font-bold text-gray-800" id="k-emp">-</div><p class="text-xs text-gray-400 mt-1">Total jobs</p></div>
<div class="card bg-white rounded-xl p-4 shadow-sm border border-gray-100"><div class="flex items-center justify-between mb-2"><span class="text-xs font-semibold text-gray-400 uppercase">Female %</span><div class="bg-pink-100 p-2 rounded-lg"><i class="fas fa-venus text-pink-600"></i></div></div><div class="stat-number text-3xl font-bold text-gray-800" id="k-female">-</div><p class="text-xs text-gray-400 mt-1">Women-owned</p></div>
<div class="card bg-white rounded-xl p-4 shadow-sm border border-gray-100"><div class="flex items-center justify-between mb-2"><span class="text-xs font-semibold text-gray-400 uppercase">GPS Mapped</span><div class="bg-teal-100 p-2 rounded-lg"><i class="fas fa-map-pin text-teal-600"></i></div></div><div class="stat-number text-3xl font-bold text-gray-800" id="k-gps">-</div><p class="text-xs text-gray-400 mt-1">Locations</p></div>
<div class="card bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer" onclick="sw('quality')"><div class="flex items-center justify-between mb-2"><span class="text-xs font-semibold text-gray-400 uppercase">Issues</span><div class="bg-red-100 p-2 rounded-lg"><i class="fas fa-exclamation-triangle text-red-600"></i></div></div><div class="stat-number text-3xl font-bold" id="k-issues">-</div><p class="text-xs mt-1" id="k-iss-d">Click for details</p></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-chart-area text-sky-500 mr-2"></i>Collection Timeline</h3><div class="chart-container" style="height:260px"><canvas id="c-tl"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-briefcase text-emerald-500 mr-2"></i>Business Sectors</h3><div class="chart-container" style="height:260px"><canvas id="c-sec"></canvas></div></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-map mr-2 text-blue-500"></i>Ward Distribution</h3><div class="chart-container" style="height:240px"><canvas id="c-ward"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-scale-balanced mr-2 text-indigo-500"></i>Legal Status</h3><div class="chart-container" style="height:240px"><canvas id="c-legal"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-user-tie mr-2 text-green-500"></i>Enumerator Performance</h3><div class="chart-container" style="height:240px"><canvas id="c-enum"></canvas></div></div>
</div></div>

<!-- ======= DEMOGRAPHICS ======= -->
<div class="tab-content" id="tab-demographics">
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-venus-mars text-pink-500 mr-2"></i>Owner Gender</h3><div class="chart-container" style="height:280px"><canvas id="c-gen"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-chart-bar text-purple-500 mr-2"></i>Age Distribution</h3><div class="chart-container" style="height:280px"><canvas id="c-age"></canvas></div></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-graduation-cap text-blue-500 mr-2"></i>Education Level</h3><div class="chart-container" style="height:280px"><canvas id="c-edu"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-handshake text-teal-500 mr-2"></i>Ownership Structure</h3><div class="chart-container" style="height:280px"><canvas id="c-own"></canvas></div></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-wheelchair text-gray-500 mr-2"></i>Disability Status</h3><div class="chart-container" style="height:260px"><canvas id="c-dis"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-id-card text-green-500 mr-2"></i>Registration Status</h3><div class="chart-container" style="height:260px"><canvas id="c-reg"></canvas></div></div>
</div></div>

<!-- ======= OPERATIONS ======= -->
<div class="tab-content" id="tab-operations">
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-layer-group text-sky-500 mr-2"></i>Business Size (Employees)</h3><div class="chart-container" style="height:280px"><canvas id="c-size"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-people-group text-indigo-500 mr-2"></i>Employee Breakdown (Gender/Type)</h3><div class="chart-container" style="height:280px"><canvas id="c-empb"></canvas></div></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-chart-line text-green-500 mr-2"></i>Employment Growth (3yr)</h3><div class="chart-container" style="height:260px"><canvas id="c-empg"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-store text-amber-500 mr-2"></i>Business Premises</h3><div class="chart-container" style="height:260px"><canvas id="c-prem"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-bullseye text-red-500 mr-2"></i>Market Reach</h3><div class="chart-container" style="height:260px"><canvas id="c-reach"></canvas></div></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-bullhorn text-orange-500 mr-2"></i>Customer Channels</h3><div class="chart-container" style="height:280px"><canvas id="c-chan"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-truck text-purple-500 mr-2"></i>Sourcing Challenges</h3><div class="chart-container" style="height:280px"><canvas id="c-sourc"></canvas></div></div>
</div></div>

<!-- ======= FINANCE ======= -->
<div class="tab-content" id="tab-finance">
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-money-bill-wave text-green-500 mr-2"></i>Monthly Revenue</h3><div class="chart-container" style="height:280px"><canvas id="c-rev"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-chart-line text-blue-500 mr-2"></i>Revenue Trend (3yr)</h3><div class="chart-container" style="height:280px"><canvas id="c-revt"></canvas></div></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-piggy-bank text-purple-500 mr-2"></i>Capital Sources</h3><div class="chart-container" style="height:260px"><canvas id="c-cap"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-file-invoice-dollar text-amber-500 mr-2"></i>Loan Status</h3><div class="chart-container" style="height:260px"><canvas id="c-loan"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-receipt text-teal-500 mr-2"></i>Financial Records</h3><div class="chart-container" style="height:260px"><canvas id="c-fin"></canvas></div></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-hand-holding-dollar text-red-500 mr-2"></i>Loan Barriers</h3><div class="chart-container" style="height:280px"><canvas id="c-lbar"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-file-contract text-sky-500 mr-2"></i>Trading Licence &amp; Tax</h3><div class="chart-container" style="height:280px"><canvas id="c-tax"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-hammer text-indigo-500 mr-2"></i>Investment Areas</h3><div class="chart-container" style="height:280px"><canvas id="c-inv"></canvas></div></div>
</div></div>

<!-- ======= DIGITAL & INFRA ======= -->
<div class="tab-content" id="tab-digital">
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-laptop-code text-blue-500 mr-2"></i>Digital Literacy</h3><div class="chart-container" style="height:260px"><canvas id="c-dlit"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-mobile-alt text-green-500 mr-2"></i>Technology Used</h3><div class="chart-container" style="height:260px"><canvas id="c-tech"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-credit-card text-purple-500 mr-2"></i>Payment Methods</h3><div class="chart-container" style="height:260px"><canvas id="c-pay"></canvas></div></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-ban text-red-500 mr-2"></i>Digital Barriers</h3><div class="chart-container" style="height:280px"><canvas id="c-dbar"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-gavel text-amber-500 mr-2"></i>Regulatory Environment</h3><div class="chart-container" style="height:280px"><canvas id="c-regenv"></canvas></div></div>
</div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
<h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-road text-orange-500 mr-2"></i>Infrastructure Scores (Avg Rating 1-5)</h3>
<div class="chart-container" style="height:340px"><canvas id="c-infra"></canvas></div>
</div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
<h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-tools text-gray-500 mr-2"></i>Infrastructure Challenges</h3>
<div class="chart-container" style="height:280px"><canvas id="c-infrac"></canvas></div>
</div></div>

<!-- ======= CHALLENGES ======= -->
<div class="tab-content" id="tab-challenges">
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-exclamation-circle text-red-500 mr-2"></i>Top Business Challenges</h3><div class="chart-container" style="height:420px"><canvas id="c-chal"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-hands-helping text-blue-500 mr-2"></i>Support Needed from MMC</h3><div class="chart-container" style="height:420px"><canvas id="c-mmcs"></canvas></div></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-rocket text-teal-500 mr-2"></i>Growth Opportunities</h3><div class="chart-container" style="height:300px"><canvas id="c-grow"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-book text-indigo-500 mr-2"></i>Training Needs</h3><div class="chart-container" style="height:300px"><canvas id="c-train"></canvas></div></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-brain text-purple-500 mr-2"></i>Missing Skills</h3><div class="chart-container" style="height:280px"><canvas id="c-skill"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-plane-departure text-sky-500 mr-2"></i>Export Plans</h3><div class="chart-container" style="height:280px"><canvas id="c-exp"></canvas></div></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-landmark text-amber-500 mr-2"></i>Support Programs Known</h3><div class="chart-container" style="height:280px"><canvas id="c-prog"></canvas></div></div>
</div></div>

<!-- ======= MAP ======= -->
<div class="tab-content" id="tab-map">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-6">
<div class="flex items-center justify-between mb-4">
<h3 class="text-sm font-semibold text-gray-700"><i class="fas fa-map-marked-alt text-sky-500 mr-2"></i>Business Locations &mdash; GPS Data Collection Points</h3>
<div class="flex items-center gap-3 text-xs text-gray-500">
<span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-sky-500 inline-block"></span> Mapped: <b id="map-ct">0</b></span>
<span class="flex items-center gap-1"><span class="w-3 h-3 rounded-full bg-red-400 inline-block"></span> Missing GPS: <b id="map-miss">0</b></span>
</div></div>
<div id="map"></div>
<div class="mt-4 flex flex-wrap gap-2" id="map-legend"></div>
<p class="text-xs text-gray-400 mt-3"><i class="fas fa-info-circle mr-1"></i>Markers are color-coded by business sector. Click a marker for details. Businesses without GPS are flagged in Data Quality tab.</p>
</div></div>

<!-- ======= DATA QUALITY ======= -->
<div class="tab-content" id="tab-quality">
<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 fade-in">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-red-200"><div class="flex items-center justify-between mb-2"><span class="text-xs font-semibold text-red-500 uppercase">High</span><i class="fas fa-fire text-red-500"></i></div><div class="stat-number text-3xl font-bold text-red-600" id="q-h">0</div><p class="text-xs text-gray-400 mt-1">Immediate action</p></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-amber-200"><div class="flex items-center justify-between mb-2"><span class="text-xs font-semibold text-amber-500 uppercase">Medium</span><i class="fas fa-exclamation text-amber-500"></i></div><div class="stat-number text-3xl font-bold text-amber-600" id="q-m">0</div><p class="text-xs text-gray-400 mt-1">Review needed</p></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-green-200"><div class="flex items-center justify-between mb-2"><span class="text-xs font-semibold text-green-500 uppercase">Low</span><i class="fas fa-info-circle text-green-500"></i></div><div class="stat-number text-3xl font-bold text-green-600" id="q-l">0</div><p class="text-xs text-gray-400 mt-1">Minor</p></div>
<div class="card bg-white rounded-xl p-5 shadow-sm border border-blue-200"><div class="flex items-center justify-between mb-2"><span class="text-xs font-semibold text-blue-500 uppercase">Health</span><i class="fas fa-heartbeat text-blue-500"></i></div><div class="stat-number text-3xl font-bold text-blue-600" id="q-score">-</div><p class="text-xs text-gray-400 mt-1">Score</p></div>
</div>
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100"><h3 class="text-sm font-semibold text-gray-700 mb-4"><i class="fas fa-chart-pie text-red-500 mr-2"></i>Issues by Type</h3><div class="chart-container" style="height:260px"><canvas id="c-qt"></canvas></div></div>
<div class="lg:col-span-2 card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
<h3 class="text-sm font-semibold text-gray-700 mb-3"><i class="fas fa-lightbulb text-yellow-500 mr-2"></i>16 Automated Quality Checks</h3>
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
<div class="flex gap-1 items-start p-2 bg-red-50 rounded-lg"><i class="fas fa-copy text-red-400 mt-0.5"></i><div><b class="text-red-700">Duplicate</b><br><span class="text-gray-500">Same business in same ward</span></div></div>
<div class="flex gap-1 items-start p-2 bg-red-50 rounded-lg"><i class="fas fa-bolt text-red-400 mt-0.5"></i><div><b class="text-red-700">Rushed</b><br><span class="text-gray-500">&lt;3 min for 80+ fields</span></div></div>
<div class="flex gap-1 items-start p-2 bg-red-50 rounded-lg"><i class="fas fa-ban text-red-400 mt-0.5"></i><div><b class="text-red-700">No Consent</b><br><span class="text-gray-500">Respondent declined</span></div></div>
<div class="flex gap-1 items-start p-2 bg-red-50 rounded-lg"><i class="fas fa-database text-red-400 mt-0.5"></i><div><b class="text-red-700">Employee Error</b><br><span class="text-gray-500">Negative or &gt;500, sum mismatch</span></div></div>
<div class="flex gap-1 items-start p-2 bg-red-50 rounded-lg"><i class="fas fa-not-equal text-red-400 mt-0.5"></i><div><b class="text-red-700">Logical</b><br><span class="text-gray-500">6 contradiction checks</span></div></div>
<div class="flex gap-1 items-start p-2 bg-amber-50 rounded-lg"><i class="fas fa-user-clock text-amber-400 mt-0.5"></i><div><b class="text-amber-700">Age Outlier</b><br><span class="text-gray-500">Outside 16-90</span></div></div>
<div class="flex gap-1 items-start p-2 bg-amber-50 rounded-lg"><i class="fas fa-calendar text-amber-400 mt-0.5"></i><div><b class="text-amber-700">Year Outlier</b><br><span class="text-gray-500">Before 1950 or future</span></div></div>
<div class="flex gap-1 items-start p-2 bg-amber-50 rounded-lg"><i class="fas fa-question-circle text-amber-400 mt-0.5"></i><div><b class="text-amber-700">Missing Field</b><br><span class="text-gray-500">16 critical fields checked</span></div></div>
<div class="flex gap-1 items-start p-2 bg-amber-50 rounded-lg"><i class="fas fa-map-pin text-amber-400 mt-0.5"></i><div><b class="text-amber-700">Missing GPS</b><br><span class="text-gray-500">No location captured</span></div></div>
<div class="flex gap-1 items-start p-2 bg-amber-50 rounded-lg"><i class="fas fa-dollar-sign text-amber-400 mt-0.5"></i><div><b class="text-amber-700">Revenue Error</b><br><span class="text-gray-500">Cost exceeds revenue</span></div></div>
<div class="flex gap-1 items-start p-2 bg-amber-50 rounded-lg"><i class="fas fa-file-excel text-amber-400 mt-0.5"></i><div><b class="text-amber-700">Empty Section</b><br><span class="text-gray-500">5 sections monitored</span></div></div>
<div class="flex gap-1 items-start p-2 bg-green-50 rounded-lg"><i class="fas fa-phone text-green-400 mt-0.5"></i><div><b class="text-green-700">Phone Format</b><br><span class="text-gray-500">Unusual digit count</span></div></div>
<div class="flex gap-1 items-start p-2 bg-green-50 rounded-lg"><i class="fas fa-clock text-green-400 mt-0.5"></i><div><b class="text-green-700">Hours Outlier</b><br><span class="text-gray-500">Invalid days/hours</span></div></div>
<div class="flex gap-1 items-start p-2 bg-green-50 rounded-lg"><i class="fas fa-hourglass text-green-400 mt-0.5"></i><div><b class="text-green-700">Long Duration</b><br><span class="text-gray-500">&gt;3 hours open</span></div></div>
<div class="flex gap-1 items-start p-2 bg-green-50 rounded-lg"><i class="fas fa-robot text-green-400 mt-0.5"></i><div><b class="text-green-700">Suspicious</b><br><span class="text-gray-500">All multi-select = 1 option</span></div></div>
<div class="flex gap-1 items-start p-2 bg-green-50 rounded-lg"><i class="fas fa-id-badge text-green-400 mt-0.5"></i><div><b class="text-green-700">TIN Format</b><br><span class="text-gray-500">Unusual TIN format</span></div></div>
</div></div></div>
<div class="card bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4">
<div class="flex flex-wrap items-center gap-3">
<span class="text-sm font-semibold text-gray-600"><i class="fas fa-filter mr-1"></i>Filter:</span>
<button onclick="fQ('all')" class="qf active px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-800 text-white" data-f="all">All</button>
<button onclick="fQ('high')" class="qf px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600" data-f="high"><i class="fas fa-circle text-red-500 mr-1" style="font-size:6px;vertical-align:middle"></i>High</button>
<button onclick="fQ('medium')" class="qf px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600" data-f="medium"><i class="fas fa-circle text-amber-500 mr-1" style="font-size:6px;vertical-align:middle"></i>Medium</button>
<button onclick="fQ('low')" class="qf px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600" data-f="low"><i class="fas fa-circle text-green-500 mr-1" style="font-size:6px;vertical-align:middle"></i>Low</button>
<span class="ml-auto text-xs text-gray-400" id="q-lbl"></span>
</div></div>
<div id="q-list" class="space-y-3"></div>
<div id="q-clean" class="hidden text-center py-16"><i class="fas fa-check-circle text-green-400 text-5xl mb-4"></i><h3 class="text-lg font-semibold text-gray-700">All Data Looks Clean!</h3><p class="text-gray-400">No issues detected across 16 automated checks.</p></div>
</div>

<!-- ======= RESPONSES ======= -->
<div class="tab-content" id="tab-responses">
<div class="card bg-white rounded-xl p-5 shadow-sm border border-gray-100">
<div class="flex items-center justify-between mb-4">
<h3 class="text-sm font-semibold text-gray-700"><i class="fas fa-table text-sky-500 mr-2"></i>All Profiled Businesses</h3>
<button onclick="downloadExcel()" class="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2 rounded-lg font-semibold text-xs transition flex items-center gap-2"><i class="fas fa-file-excel"></i> Export</button>
</div>
<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="border-b border-gray-200 bg-gray-50">
<th class="text-left py-3 px-2 font-semibold text-gray-600">#</th>
<th class="text-left py-3 px-2 font-semibold text-gray-600">Business</th>
<th class="text-left py-3 px-2 font-semibold text-gray-600">Sector</th>
<th class="text-left py-3 px-2 font-semibold text-gray-600">Ward</th>
<th class="text-left py-3 px-2 font-semibold text-gray-600">Owner</th>
<th class="text-left py-3 px-2 font-semibold text-gray-600">Gender</th>
<th class="text-left py-3 px-2 font-semibold text-gray-600">Emp</th>
<th class="text-left py-3 px-2 font-semibold text-gray-600">Revenue</th>
<th class="text-left py-3 px-2 font-semibold text-gray-600">Registration</th>
<th class="text-left py-3 px-2 font-semibold text-gray-600">Date</th>
<th class="text-left py-3 px-2 font-semibold text-gray-600">Submitted By</th>
</tr></thead><tbody id="rtb"></tbody></table></div></div></div>

<footer class="text-center py-6 mt-8 border-t border-gray-200"><p class="text-xs text-gray-400"><i class="fas fa-database mr-1"></i>ODK Central &bull; <span id="lu">-</span> &bull; Mukono Business Profiling &copy; 2026</p></footer>
</main>

<script>
Chart.register(ChartDataLabels);
let CH={},S=null,QD=null,CF='all',LM=null,MK=[];
const P=['#0369a1','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#db2777','#0d9488','#ea580c','#4f46e5','#16a34a','#b91c1c','#7e22ce','#0284c7','#65a30d','#be185d'];

function sw(t){document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active'));document.querySelectorAll('.nt').forEach(e=>{e.classList.remove('nav-active');e.classList.add('hover:bg-white/10')});document.getElementById('tab-'+t).classList.add('active');const b=document.querySelector('[data-tab="'+t+'"]');b.classList.add('nav-active');b.classList.remove('hover:bg-white/10');if(t==='map'&&LM)setTimeout(()=>LM.invalidateSize(),100)}

async function refreshData(){const ic=document.getElementById('rfIcon');ic.classList.add('fa-spin');try{const[s,q]=await Promise.all([fetch('/api/stats').then(r=>r.json()),fetch('/api/quality').then(r=>r.json())]);if(!s.success)throw new Error(s.error);if(!q.success)throw new Error(q.error);S=s.stats;QD=q;render(S);renderQ(q);document.getElementById('loading').classList.add('hidden');document.getElementById('error').classList.add('hidden');document.getElementById('main').classList.remove('hidden')}catch(e){document.getElementById('loading').classList.add('hidden');document.getElementById('error').classList.remove('hidden');document.getElementById('errMsg').textContent=e.message;document.getElementById('main').classList.add('hidden')}setTimeout(()=>ic.classList.remove('fa-spin'),500)}

async function downloadExcel(){const b=document.getElementById('dlBtn');b.innerHTML='<i class="fas fa-spinner fa-spin"></i>';b.disabled=true;try{const r=await fetch('/api/export');const d=await r.json();if(!d.success)throw new Error(d.error);const ws=XLSX.utils.json_to_sheet(d.rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Business Profiling');ws['!cols']=Object.keys(d.rows[0]||{}).map(k=>({wch:Math.min(Math.max(k.length+2,12),40)}));XLSX.writeFile(wb,'Mukono_Business_Profiling_'+new Date().toISOString().split('T')[0]+'.xlsx')}catch(e){alert('Failed: '+e.message)}b.innerHTML='<i class="fas fa-file-excel"></i> Excel';b.disabled=false}

function dc(id){if(CH[id]){CH[id].destroy();delete CH[id]}}
function fz(o){const r={};for(const[k,v]of Object.entries(o)){if(v>0)r[k]=v};return Object.keys(r).length>0?r:o}

function mkBar(id,data,h=false){dc(id);const l=Object.keys(data),v=Object.values(data);CH[id]=new Chart(document.getElementById(id),{type:'bar',data:{labels:l,datasets:[{data:v,backgroundColor:P.slice(0,l.length),borderRadius:6,maxBarThickness:50}]},options:{indexAxis:h?'y':'x',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{anchor:h?'end':'end',align:h?'right':'top',color:'#374151',font:{size:11,weight:'bold'},formatter:v=>v>0?v:''}},scales:{x:{grid:{display:!h},ticks:{font:{size:10}}},y:{grid:{display:h},beginAtZero:true,ticks:{precision:0,font:{size:10}}}}}})}

function mkDoughnut(id,data){dc(id);const l=Object.keys(data),v=Object.values(data),t=v.reduce((a,b)=>a+b,0);CH[id]=new Chart(document.getElementById(id),{type:'doughnut',data:{labels:l,datasets:[{data:v,backgroundColor:P.slice(0,l.length),borderWidth:2,borderColor:'#fff',hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'55%',plugins:{legend:{position:'right',labels:{boxWidth:12,padding:8,font:{size:10}}},datalabels:{color:'#fff',font:{size:10,weight:'bold'},formatter:(v)=>{if(!v||!t)return'';const pc=Math.round(v/t*100);return pc>=5?v+' ('+pc+'%)':''},display:ctx=>ctx.dataset.data[ctx.dataIndex]>0}}}})}

function mkLine(id,data){dc(id);const l=Object.keys(data),v=Object.values(data),cum=[];v.reduce((s,val,i)=>{cum[i]=s+val;return s+val},0);CH[id]=new Chart(document.getElementById(id),{type:'line',data:{labels:l,datasets:[{label:'Daily',data:v,borderColor:'#0369a1',backgroundColor:'rgba(3,105,161,.1)',fill:true,tension:.4,pointRadius:5,borderWidth:2},{label:'Cumulative',data:cum,borderColor:'#059669',backgroundColor:'rgba(5,150,105,.05)',fill:true,tension:.4,pointRadius:3,borderWidth:2,borderDash:[5,3]}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{boxWidth:12,font:{size:10}}},datalabels:{color:ctx=>ctx.datasetIndex===0?'#0369a1':'#059669',anchor:'end',align:'top',font:{size:10,weight:'bold'},formatter:v=>v>0?v:'',display:ctx=>ctx.datasetIndex===0}},scales:{x:{ticks:{font:{size:9}}},y:{beginAtZero:true,ticks:{precision:0}}}}})}

function mkRadar(id,data){dc(id);const l=Object.keys(data),v=Object.values(data);CH[id]=new Chart(document.getElementById(id),{type:'radar',data:{labels:l,datasets:[{label:'Avg Score',data:v,backgroundColor:'rgba(3,105,161,.15)',borderColor:'#0369a1',borderWidth:2,pointBackgroundColor:'#0369a1',pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{color:'#0369a1',font:{size:11,weight:'bold'},anchor:'end',align:'end',formatter:v=>v>0?v:''}},scales:{r:{min:0,max:5,ticks:{stepSize:1,font:{size:9}},pointLabels:{font:{size:10}}}}}})}

function mkGroupBar(id,data,vert){dc(id);const labels=Object.keys(data);const allCats=new Set();for(const ward of labels)for(const cat of Object.keys(data[ward]))allCats.add(cat);const cats=[...allCats];const datasets=cats.map((c,i)=>({label:c,data:labels.map(l=>data[l][c]||0),backgroundColor:P[i%P.length],borderRadius:4}));CH[id]=new Chart(document.getElementById(id),{type:'bar',data:{labels,datasets},options:{indexAxis:vert?'y':'x',responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{boxWidth:12,font:{size:9}}},datalabels:{display:false}},scales:{x:{stacked:true,ticks:{font:{size:9}}},y:{stacked:true,beginAtZero:true,ticks:{precision:0,font:{size:9}}}}}})}

const sectorColors={Retail:'#dc2626',Wholesale:'#d97706',Manufacturing:'#059669','ICT & Telecom':'#7c3aed','Professional Services':'#db2777','Accommodation & Food':'#0891b2',Agribusiness:'#16a34a',Construction:'#ea580c',Health:'#0d9488',Transport:'#4f46e5',Education:'#65a30d',Other:'#6b7280'};

function initMap(points,total){
if(!LM){LM=L.map('map',{scrollWheelZoom:true}).setView([0.35,32.62],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap',maxZoom:18}).addTo(LM)}
MK.forEach(m=>LM.removeLayer(m));MK=[];
document.getElementById('map-ct').textContent=points.length;
document.getElementById('map-miss').textContent=total-points.length;

if(!points.length){LM.setView([0.35,32.62],12);return}
const bounds=[];const usedSectors=new Set();
for(const p of points){
  const color=sectorColors[p.sector]||'#6b7280';
  usedSectors.add(p.sector);
  const m=L.circleMarker([p.lat,p.lon],{radius:9,fillColor:color,color:'#fff',weight:2.5,fillOpacity:.85}).addTo(LM);
  m.bindPopup('<div class="text-sm" style="min-width:180px"><b class="text-base">'+esc(p.business)+'</b><br><span class="text-gray-500">'+esc(p.sector)+'</span><hr style="margin:4px 0"><i class="fas fa-user text-gray-400 mr-1"></i>'+esc(p.owner)+'<br><i class="fas fa-map-marker text-gray-400 mr-1"></i>'+esc(p.ward)+', '+esc(p.division)+'<br><span class="text-xs text-gray-400">GPS Accuracy: &plusmn;'+Math.round(p.accuracy)+'m</span></div>');
  MK.push(m);bounds.push([p.lat,p.lon])
}
if(bounds.length>0){if(bounds.length===1)LM.setView(bounds[0],15);else LM.fitBounds(bounds,{padding:[40,40]})}

const leg=document.getElementById('map-legend');
leg.innerHTML=[...usedSectors].map(s=>'<span class="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full border"><span class="w-3 h-3 rounded-full inline-block" style="background:'+(sectorColors[s]||'#6b7280')+'"></span>'+esc(s)+'</span>').join('')
}

function render(s){
document.getElementById('k-total').textContent=s.total;
document.getElementById('k-sectors').textContent=Object.values(s.sector).filter(v=>v>0).length;
document.getElementById('k-emp').textContent=s.total_employees;
document.getElementById('k-female').textContent=s.female_pct+'%';
document.getElementById('k-gps').textContent=s.gps_points.length;
document.getElementById('lu').textContent='Updated: '+new Date(s.last_updated).toLocaleString();

const dq=s.data_quality,ie=document.getElementById('k-issues');
ie.textContent=dq.total_issues;
if(dq.high>0){ie.className='stat-number text-3xl font-bold text-red-600';document.getElementById('k-iss-d').textContent=dq.high+' high severity';document.getElementById('k-iss-d').className='text-xs mt-1 text-red-400'}
else if(dq.total_issues>0){ie.className='stat-number text-3xl font-bold text-amber-600';document.getElementById('k-iss-d').textContent='No critical issues';document.getElementById('k-iss-d').className='text-xs mt-1 text-amber-400'}
else{ie.className='stat-number text-3xl font-bold text-green-600';document.getElementById('k-iss-d').textContent='All clean!';document.getElementById('k-iss-d').className='text-xs mt-1 text-green-400'}
const bd=document.getElementById('qb');if(dq.total_issues>0){bd.textContent=dq.total_issues;bd.classList.remove('hidden')}else bd.classList.add('hidden')

// Overview charts
mkLine('c-tl',s.timeline);mkBar('c-sec',fz(s.sector),true);mkBar('c-ward',fz(s.ward_distribution),true);mkDoughnut('c-legal',fz(s.legal_status));mkBar('c-enum',s.enumerators,true);

// Demographics
mkDoughnut('c-gen',fz(s.gender));mkBar('c-age',s.age_groups);mkBar('c-edu',fz(s.education),true);mkDoughnut('c-own',fz(s.ownership));mkDoughnut('c-dis',fz(s.disability));mkDoughnut('c-reg',fz(s.registration));

// Operations
mkDoughnut('c-size',s.size_categories);mkBar('c-empb',s.employee_breakdown);mkBar('c-empg',fz(s.emp_growth),true);mkDoughnut('c-prem',fz(s.premises));mkDoughnut('c-reach',fz(s.market_reach));mkBar('c-chan',fz(s.customer_channels),true);mkBar('c-sourc',fz(s.sourcing_challenges),true);

// Finance
mkBar('c-rev',fz(s.revenue),true);mkDoughnut('c-revt',fz(s.revenue_trend));mkDoughnut('c-cap',fz(s.capital_sources));mkDoughnut('c-loan',fz(s.loan_status));mkDoughnut('c-fin',fz(s.fin_records));mkBar('c-lbar',fz(s.loan_barriers),true);
// Tax composite
dc('c-tax');CH['c-tax']=new Chart(document.getElementById('c-tax'),{type:'bar',data:{labels:['Trading Licence','Pays Taxes'],datasets:[{label:'Yes',data:[s.trading_licence['Yes']||0,s.pays_taxes['Yes']||0],backgroundColor:'#059669',borderRadius:4},{label:'No',data:[s.trading_licence['No']||0,s.pays_taxes['No']||0],backgroundColor:'#dc2626',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{boxWidth:12,font:{size:10}}},datalabels:{color:'#fff',font:{size:11,weight:'bold'},formatter:v=>v>0?v:''}},scales:{x:{ticks:{font:{size:10}}},y:{beginAtZero:true,ticks:{precision:0}}}}});
mkBar('c-inv',fz(s.investment_areas),true);

// Digital & Infra
mkDoughnut('c-dlit',fz(s.digital_literacy));mkBar('c-tech',fz(s.tech_used),true);mkBar('c-pay',fz(s.payment_methods),true);mkBar('c-dbar',fz(s.digital_barriers),true);mkBar('c-regenv',fz(s.regulatory));mkRadar('c-infra',s.infra_scores);mkBar('c-infrac',fz(s.infra_challenges),true);

// Challenges
mkBar('c-chal',fz(s.challenges),true);mkBar('c-mmcs',fz(s.mmc_support),true);mkBar('c-grow',fz(s.growth_opp),true);mkBar('c-train',fz(s.training_needs),true);mkBar('c-skill',fz(s.missing_skills),true);mkDoughnut('c-exp',fz(s.export_plans));mkBar('c-prog',fz(s.support_programs),true);

// Map
initMap(s.gps_points,s.total);

// Responses table
const tb=document.getElementById('rtb');
tb.innerHTML=s.businesses.map((b,i)=>'<tr class="border-b border-gray-100 hover:bg-gray-50"><td class="py-2 px-2 text-gray-400">'+(i+1)+'</td><td class="py-2 px-2 font-medium text-gray-800">'+esc(b.name)+'</td><td class="py-2 px-2"><span class="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-xs font-medium">'+esc(b.sector)+'</span></td><td class="py-2 px-2 text-gray-600 text-xs">'+esc(b.ward)+'</td><td class="py-2 px-2 text-gray-600">'+esc(b.owner)+'</td><td class="py-2 px-2 text-gray-600">'+esc(b.gender)+'</td><td class="py-2 px-2 text-gray-600">'+b.employees+'</td><td class="py-2 px-2"><span class="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">'+esc(b.revenue)+'</span></td><td class="py-2 px-2"><span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs">'+esc(b.registration)+'</span></td><td class="py-2 px-2 text-gray-400 text-xs">'+(b.submitted?new Date(b.submitted).toLocaleDateString():'-')+'</td><td class="py-2 px-2"><span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">'+esc(b.submitted_by)+'</span></td></tr>').join('')
}

function renderQ(q){
document.getElementById('q-h').textContent=q.issues.filter(i=>i.severity==='high').length;
document.getElementById('q-m').textContent=q.issues.filter(i=>i.severity==='medium').length;
document.getElementById('q-l').textContent=q.issues.filter(i=>i.severity==='low').length;
const h=q.issues.filter(i=>i.severity==='high').length,m=q.issues.filter(i=>i.severity==='medium').length,lo=q.issues.filter(i=>i.severity==='low').length;
const sc=Math.max(0,Math.min(100,100-(h*10+m*3+lo*1)));const se=document.getElementById('q-score');se.textContent=sc+'%';se.className='stat-number text-3xl font-bold '+(sc>=80?'text-green-600':sc>=50?'text-amber-600':'text-red-600');
const nz={};for(const[k,v]of Object.entries(q.issues_by_type||{})){if(v>0)nz[k]=v};if(Object.keys(nz).length>0)mkDoughnut('c-qt',nz);
renderIssues(q.issues);
document.getElementById('q-clean').classList.toggle('hidden',q.total_issues>0)}

function fQ(sev){CF=sev;document.querySelectorAll('.qf').forEach(e=>{e.className='qf px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600'});document.querySelector('[data-f="'+sev+'"]').className='qf active px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-800 text-white';if(QD)renderIssues(QD.issues)}

function renderIssues(issues){const f=CF==='all'?issues:issues.filter(i=>i.severity===CF);document.getElementById('q-lbl').textContent='Showing '+f.length+' of '+issues.length;const c=document.getElementById('q-list');if(!f.length){c.innerHTML='<div class="text-center py-8 text-gray-400"><i class="fas fa-check-circle text-2xl mb-2"></i><p>No issues match this filter.</p></div>';return}
c.innerHTML=f.map(i=>{const sc='severity-'+i.severity,bc='badge-'+i.severity,ic=i.severity==='high'?'fa-fire':i.severity==='medium'?'fa-exclamation-triangle':'fa-info-circle';return'<div class="card rounded-xl p-4 border-2 '+sc+'"><div class="flex flex-col sm:flex-row sm:items-center gap-2 mb-2"><div class="flex items-center gap-2"><span class="px-2 py-0.5 rounded-full text-xs font-bold '+bc+'"><i class="fas '+ic+' mr-1"></i>'+i.severity.toUpperCase()+'</span><span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">'+esc(i.type)+'</span></div><span class="text-xs text-gray-400 sm:ml-auto"><i class="fas fa-building mr-1"></i>'+esc(i.business)+' &bull; '+i.submitted+' &bull; <i class="fas fa-user mr-1"></i>'+esc(i.enumerator)+'</span></div><p class="text-sm text-gray-700">'+esc(i.description)+'</p><p class="text-xs text-gray-400 mt-1"><i class="fas fa-tag mr-1"></i>Field: '+esc(i.field)+'</p></div>'}).join('')}

function esc(s){if(!s)return'';return s.toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

refreshData();setInterval(refreshData,120000);
</script></body></html>`
}

export default app
