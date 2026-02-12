import * as XLSX from 'xlsx'

// Build a 5-year DCF model from real Yahoo Finance financial data
export function generateDCF(financials) {
  const wb = XLSX.utils.book_new()

  const { incomeStatements, cashflowStatements, balanceSheets } = financials
  const currency = financials.currency || 'USD'
  const companyName = financials.companyName
  const ticker = financials.ticker

  // Use the most recent historical data as the base
  const latestIncome = incomeStatements[incomeStatements.length - 1] || {}
  const prevIncome = incomeStatements[incomeStatements.length - 2] || {}
  const latestCF = cashflowStatements[cashflowStatements.length - 1] || {}
  const latestBS = balanceSheets[balanceSheets.length - 1] || {}

  // ---- Derive assumptions from actual data ----
  const baseRevenue = latestIncome.totalRevenue || 0
  const prevRevenue = prevIncome.totalRevenue || 0
  const historicalRevenueGrowth = prevRevenue ? (baseRevenue - prevRevenue) / prevRevenue : 0.05

  const baseEBIT = latestIncome.ebit || latestIncome.operatingIncome || 0
  const ebitMargin = baseRevenue ? baseEBIT / baseRevenue : 0.10

  const taxExpense = latestIncome.incomeTaxExpense || 0
  const preTaxIncome = latestIncome.incomeBeforeTax || 1
  const effectiveTaxRate = preTaxIncome > 0 ? Math.min(Math.max(taxExpense / preTaxIncome, 0), 0.40) : 0.25

  const baseDA = Math.abs(latestCF.depreciation || 0)
  const daToRevenue = baseRevenue ? baseDA / baseRevenue : 0.03

  const baseCapex = Math.abs(latestCF.capex || 0)
  const capexToRevenue = baseRevenue ? baseCapex / baseRevenue : 0.04

  const baseWC = latestCF.changeInWorkingCapital || 0
  const wcToRevenue = baseRevenue ? Math.abs(baseWC) / baseRevenue : 0.01

  const beta = financials.beta || 1.0
  const riskFreeRate = 0.04
  const marketPremium = 0.055
  const costOfEquity = riskFreeRate + beta * marketPremium
  const costOfDebt = 0.05
  const debtRatio = latestBS.longTermDebt && latestBS.totalStockholderEquity
    ? latestBS.longTermDebt / (latestBS.longTermDebt + latestBS.totalStockholderEquity)
    : 0.30
  const equityRatio = 1 - debtRatio
  const wacc = equityRatio * costOfEquity + debtRatio * costOfDebt * (1 - effectiveTaxRate)
  const terminalGrowth = 0.025

  // Revenue growth tapering: start from historical, taper to terminal
  const revenueGrowthRates = []
  const startGrowth = Math.min(Math.max(historicalRevenueGrowth, -0.05), 0.30)
  for (let i = 0; i < 5; i++) {
    const rate = startGrowth + (terminalGrowth - startGrowth) * (i / 5)
    revenueGrowthRates.push(Math.round(rate * 1000) / 1000)
  }

  // ---- Build projected financials ----
  const baseYear = latestIncome.date ? parseInt(latestIncome.date.split('-')[0]) : new Date().getFullYear()
  const projYears = [1, 2, 3, 4, 5].map(i => baseYear + i)

  const proj = { revenue: [], ebit: [], tax: [], da: [], capex: [], wc: [], fcf: [] }
  let rev = baseRevenue
  for (let i = 0; i < 5; i++) {
    rev = rev * (1 + revenueGrowthRates[i])
    const ebit = rev * ebitMargin
    const tax = ebit * effectiveTaxRate
    const nopat = ebit - tax
    const da = rev * daToRevenue
    const capex = rev * capexToRevenue
    const wc = rev * wcToRevenue
    const fcf = nopat + da - capex - wc
    proj.revenue.push(Math.round(rev))
    proj.ebit.push(Math.round(ebit))
    proj.tax.push(Math.round(tax))
    proj.da.push(Math.round(da))
    proj.capex.push(Math.round(capex))
    proj.wc.push(Math.round(wc))
    proj.fcf.push(Math.round(fcf))
  }

  // Terminal value & DCF
  const terminalFCF = proj.fcf[4] * (1 + terminalGrowth)
  const terminalValue = terminalFCF / (wacc - terminalGrowth)
  let pvFCF = 0
  for (let i = 0; i < 5; i++) pvFCF += proj.fcf[i] / Math.pow(1 + wacc, i + 1)
  const pvTerminal = terminalValue / Math.pow(1 + wacc, 5)
  const enterpriseValue = pvFCF + pvTerminal
  const netDebt = (latestBS.longTermDebt || 0) + (latestBS.shortLongTermDebt || 0) - (latestBS.cash || 0)
  const equityValue = enterpriseValue - netDebt

  // ---- Helpers ----
  const n = (v) => v != null ? Math.round(v) : null // null if missing
  const fmtPct = (v) => (v * 100).toFixed(1) + '%'
  const fmtM = (v) => v != null ? (v / 1e6).toFixed(1) + 'M' : 'N/A'

  // ---- Historical arrays (last 3 years or however many we have) ----
  const histCount = Math.min(incomeStatements.length, 3)

  const histYears = incomeStatements.slice(-histCount).map(s => s.date?.split('-')[0] || '')
  const histRevenue = incomeStatements.slice(-histCount).map(s => n(s.totalRevenue))
  const histEBIT = incomeStatements.slice(-histCount).map(s => n(s.ebit || s.operatingIncome))
  const histTax = incomeStatements.slice(-histCount).map(s => n(s.incomeTaxExpense))
  const histNetIncome = incomeStatements.slice(-histCount).map(s => n(s.netIncome))

  const cfSlice = cashflowStatements.slice(-histCount)
  const histDA = cfSlice.map(s => n(Math.abs(s.depreciation || 0)))
  const histCapex = cfSlice.map(s => n(Math.abs(s.capex || 0)))
  const histWC = cfSlice.map(s => n(s.changeInWorkingCapital))
  const histOpCF = cfSlice.map(s => n(s.operatingCashflow))

  // Column structure: [Label] [Hist1] [Hist2] [Hist3] [spacer] [Proj1] [Proj2] [Proj3] [Proj4] [Proj5]
  // Pad all historical arrays to exactly 3 columns from the left
  const padH = (arr) => {
    if (arr.length >= 3) return arr.slice(-3)
    return [...Array(3 - arr.length).fill(null), ...arr]
  }
  const hYears = padH(histYears)
  const pYears = projYears.map(String)

  // Row builder: label, historical values (padded to 3), spacer, projected values (5)
  const row = (label, hist, projected) => [label, ...padH(hist), '', ...projected]
  const emptyRow = () => Array(10).fill('')

  // ---- SHEET 1: DCF Model ----
  const rows = []
  rows.push([`${companyName} (${ticker}) — 5-Year DCF Model`])
  rows.push([`Currency: ${currency}`, '', '', '', `Generated: ${new Date().toISOString().split('T')[0]}`])
  rows.push(emptyRow())

  // Column headers
  rows.push(row('', hYears, pYears.map(y => `FY${y}E`)))
  rows.push(emptyRow())

  // Revenue
  rows.push(row('Revenue', histRevenue, proj.revenue))
  const revGrowthHist = histRevenue.map((v, i, arr) => {
    if (i === 0 || !arr[i - 1] || !v) return ''
    return fmtPct((v - arr[i - 1]) / arr[i - 1])
  })
  rows.push(row('  Revenue Growth %', revGrowthHist, revenueGrowthRates.map(fmtPct)))
  rows.push(emptyRow())

  // EBIT
  rows.push(row('EBIT (Operating Income)', histEBIT, proj.ebit))
  const ebitMarginHist = histEBIT.map((v, i) => {
    const r = histRevenue[i]
    return (v != null && r) ? fmtPct(v / r) : ''
  })
  rows.push(row('  EBIT Margin %', ebitMarginHist, proj.ebit.map((v, i) => fmtPct(v / proj.revenue[i]))))
  rows.push(emptyRow())

  // Tax
  rows.push(row('Income Tax', histTax, proj.tax))
  rows.push(row('  Eff. Tax Rate', Array(histCount).fill(''), Array(5).fill(fmtPct(effectiveTaxRate))))
  rows.push(emptyRow())

  // D&A, CapEx, WC
  rows.push(row('Depreciation & Amort.', histDA, proj.da))
  rows.push(row('Capital Expenditures', histCapex, proj.capex))
  rows.push(row('Change in Working Cap.', histWC, proj.wc))
  rows.push(emptyRow())

  // FCF build (projected only)
  const nopat = proj.ebit.map((v, i) => Math.round(v - proj.tax[i]))
  rows.push(row('NOPAT (EBIT - Tax)', Array(histCount).fill(null), nopat))
  rows.push(row('  + D&A', Array(histCount).fill(null), proj.da))
  rows.push(row('  - CapEx', Array(histCount).fill(null), proj.capex))
  rows.push(row('  - Change in WC', Array(histCount).fill(null), proj.wc))
  rows.push(row('= Unlevered Free Cash Flow', Array(histCount).fill(null), proj.fcf))
  rows.push(emptyRow())

  // Historical operating CF and net income for reference
  if (histOpCF.some(v => v != null)) {
    rows.push(row('Operating Cash Flow (actual)', histOpCF, Array(5).fill(null)))
  }
  if (histNetIncome.some(v => v != null)) {
    rows.push(row('Net Income (actual)', histNetIncome, Array(5).fill(null)))
  }
  rows.push(emptyRow())

  // Valuation
  rows.push(['--- DCF Valuation ---'])
  rows.push(['WACC', fmtPct(wacc)])
  rows.push(['Terminal Growth Rate', fmtPct(terminalGrowth)])
  rows.push(emptyRow())

  rows.push(['PV of Projected FCFs (Yr 1-5)', Math.round(pvFCF)])
  rows.push(['Terminal Value (Yr 5)', Math.round(terminalValue)])
  rows.push(['PV of Terminal Value', Math.round(pvTerminal)])
  rows.push(emptyRow())

  rows.push(['Enterprise Value', Math.round(enterpriseValue)])
  rows.push(['  (-) Net Debt', Math.round(netDebt)])
  rows.push(['Implied Equity Value', Math.round(equityValue)])

  if (financials.marketCap) {
    rows.push(emptyRow())
    rows.push(['Current Market Cap', Math.round(financials.marketCap)])
    const upside = (equityValue - financials.marketCap) / financials.marketCap
    rows.push(['Implied Upside / Downside', fmtPct(upside)])
  }

  const ws1 = XLSX.utils.aoa_to_sheet(rows)
  ws1['!cols'] = [
    { wch: 30 }, // A: labels
    { wch: 16 }, // B: hist 1
    { wch: 16 }, // C: hist 2
    { wch: 16 }, // D: hist 3
    { wch: 3 },  // E: spacer
    { wch: 16 }, // F: proj 1
    { wch: 16 }, // G: proj 2
    { wch: 16 }, // H: proj 3
    { wch: 16 }, // I: proj 4
    { wch: 16 }, // J: proj 5
  ]
  XLSX.utils.book_append_sheet(wb, ws1, 'DCF Model')

  // ---- SHEET 2: Assumptions & Justifications ----
  const justRows = [
    [`${companyName} (${ticker}) — DCF Assumptions & Justifications`],
    [],
    ['Assumption', 'Value', 'Source / Justification'],
    [],
    ['BASE YEAR DATA', '', `FY${baseYear} (most recent annual filing)`],
    ['Base Revenue', `${currency} ${fmtM(baseRevenue)}`, `From income statement ending ${latestIncome.date || 'N/A'}`],
    ['Base EBIT', `${currency} ${fmtM(baseEBIT)}`, `Operating income from income statement`],
    [],
    ['GROWTH ASSUMPTIONS'],
    ['Revenue Growth (Year 1)', fmtPct(revenueGrowthRates[0]),
      `Based on actual YoY growth of ${fmtPct(historicalRevenueGrowth)} (${currency} ${fmtM(prevRevenue)} → ${fmtM(baseRevenue)}). Tapered to terminal rate over 5 years.`],
    ['Revenue Growth (Year 2)', fmtPct(revenueGrowthRates[1]), 'Linear interpolation toward terminal growth'],
    ['Revenue Growth (Year 3)', fmtPct(revenueGrowthRates[2]), 'Linear interpolation toward terminal growth'],
    ['Revenue Growth (Year 4)', fmtPct(revenueGrowthRates[3]), 'Linear interpolation toward terminal growth'],
    ['Revenue Growth (Year 5)', fmtPct(revenueGrowthRates[4]), 'Approaching long-term nominal GDP growth rate'],
    [],
    ['MARGIN & COST ASSUMPTIONS'],
    ['EBIT Margin (constant)', fmtPct(ebitMargin),
      `Held at latest reported margin. EBIT of ${currency} ${fmtM(baseEBIT)} on revenue of ${currency} ${fmtM(baseRevenue)}.`],
    ['Effective Tax Rate', fmtPct(effectiveTaxRate),
      `Derived from tax expense ${currency} ${fmtM(taxExpense)} / pre-tax income ${currency} ${fmtM(preTaxIncome)}.`],
    ['D&A (% of Revenue)', fmtPct(daToRevenue),
      `Based on reported D&A of ${currency} ${fmtM(baseDA)} (${fmtPct(daToRevenue)} of revenue).`],
    ['CapEx (% of Revenue)', fmtPct(capexToRevenue),
      `Based on reported capex of ${currency} ${fmtM(baseCapex)} (${fmtPct(capexToRevenue)} of revenue).`],
    ['Working Capital (% of Rev)', fmtPct(wcToRevenue),
      `Based on reported WC change of ${currency} ${fmtM(baseWC)}.`],
    [],
    ['WACC COMPONENTS'],
    ['WACC', fmtPct(wacc), 'Weighted average: E/(D+E) × Ke + D/(D+E) × Kd × (1-t)'],
    ['Cost of Equity (Ke)', fmtPct(costOfEquity),
      `CAPM: Rf(${fmtPct(riskFreeRate)}) + β(${beta.toFixed(2)}) × ERP(${fmtPct(marketPremium)}). Beta from Yahoo Finance.`],
    ['Cost of Debt (Kd)', fmtPct(costOfDebt), 'Estimated from investment-grade corporate bond yields'],
    ['Equity Weight', fmtPct(equityRatio),
      `Balance sheet: Equity ${currency} ${fmtM(latestBS.totalStockholderEquity)}, LT Debt ${currency} ${fmtM(latestBS.longTermDebt)}`],
    ['Debt Weight', fmtPct(debtRatio), 'Complement of equity weight'],
    ['Terminal Growth', fmtPct(terminalGrowth), 'Standard 2.5% long-term nominal GDP growth assumption'],
    [],
    ['DATA SOURCES'],
    ['Financial Statements', '', 'Yahoo Finance fundamentalsTimeSeries API (annual financials, cash-flow, balance-sheet)'],
    ['Beta', beta.toFixed(2), 'Yahoo Finance defaultKeyStatistics'],
    ['Risk-Free Rate', fmtPct(riskFreeRate), 'Approximate 10-year government bond yield'],
    ['Market Risk Premium', fmtPct(marketPremium), 'Long-term equity risk premium estimate'],
  ]

  const ws2 = XLSX.utils.aoa_to_sheet(justRows)
  ws2['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 90 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Assumptions')

  // ---- SHEET 3: Raw Financial Data ----
  const rawRows = [
    [`${companyName} (${ticker}) — Raw Financial Data from Yahoo Finance`],
    [`${incomeStatements.length} income statements, ${cashflowStatements.length} cash flow statements, ${balanceSheets.length} balance sheets`],
    [],
    ['=== INCOME STATEMENTS ==='],
    ['Period End', 'Revenue', 'Gross Profit', 'Operating Income', 'EBIT', 'Pre-Tax Income', 'Tax Expense', 'Net Income'],
  ]
  if (incomeStatements.length === 0) {
    rawRows.push(['No income statement data available from Yahoo Finance for this ticker'])
  }
  for (const s of incomeStatements) {
    rawRows.push([s.date, n(s.totalRevenue), n(s.grossProfit), n(s.operatingIncome), n(s.ebit), n(s.incomeBeforeTax), n(s.incomeTaxExpense), n(s.netIncome)])
  }

  rawRows.push([])
  rawRows.push(['=== CASH FLOW STATEMENTS ==='])
  rawRows.push(['Period End', 'Operating CF', 'CapEx', 'Depreciation & Amort.', 'Change in Working Capital'])
  if (cashflowStatements.length === 0) {
    rawRows.push(['No cash flow data available from Yahoo Finance for this ticker'])
  }
  for (const s of cashflowStatements) {
    rawRows.push([s.date, n(s.operatingCashflow), n(s.capex), n(s.depreciation), n(s.changeInWorkingCapital)])
  }

  rawRows.push([])
  rawRows.push(['=== BALANCE SHEETS ==='])
  rawRows.push(['Period End', 'Total Assets', 'Total Liabilities', 'Stockholder Equity', 'Cash', 'Short-Term Debt', 'Long-Term Debt'])
  if (balanceSheets.length === 0) {
    rawRows.push(['No balance sheet data available from Yahoo Finance for this ticker'])
  }
  for (const s of balanceSheets) {
    rawRows.push([s.date, n(s.totalAssets), n(s.totalLiab), n(s.totalStockholderEquity), n(s.cash), n(s.shortLongTermDebt), n(s.longTermDebt)])
  }

  const ws3 = XLSX.utils.aoa_to_sheet(rawRows)
  ws3['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, ws3, 'Raw Data')

  // Generate and download
  XLSX.writeFile(wb, `${ticker}_DCF_Model.xlsx`)
}
