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
  const projYears = []
  const baseYear = latestIncome.date ? parseInt(latestIncome.date.split('-')[0]) : new Date().getFullYear()
  for (let i = 1; i <= 5; i++) projYears.push(baseYear + i)

  const projRevenue = []
  const projEBIT = []
  const projTax = []
  const projDA = []
  const projCapex = []
  const projWC = []
  const projFCF = []

  let rev = baseRevenue
  for (let i = 0; i < 5; i++) {
    rev = rev * (1 + revenueGrowthRates[i])
    const ebit = rev * ebitMargin
    const tax = ebit * effectiveTaxRate
    const nopat = ebit - tax
    const da = rev * daToRevenue
    const capex = rev * capexToRevenue
    const wc = rev * wcToRevenue * (i === 0 ? 1 : revenueGrowthRates[i] > 0 ? 1 : -1)
    const fcf = nopat + da - capex - wc

    projRevenue.push(Math.round(rev))
    projEBIT.push(Math.round(ebit))
    projTax.push(Math.round(tax))
    projDA.push(Math.round(da))
    projCapex.push(Math.round(capex))
    projWC.push(Math.round(wc))
    projFCF.push(Math.round(fcf))
  }

  // Terminal value
  const terminalFCF = projFCF[4] * (1 + terminalGrowth)
  const terminalValue = terminalFCF / (wacc - terminalGrowth)

  // PV of FCFs
  let pvFCF = 0
  for (let i = 0; i < 5; i++) {
    pvFCF += projFCF[i] / Math.pow(1 + wacc, i + 1)
  }
  const pvTerminal = terminalValue / Math.pow(1 + wacc, 5)
  const enterpriseValue = pvFCF + pvTerminal

  const netDebt = (latestBS.longTermDebt || 0) + (latestBS.shortLongTermDebt || 0) - (latestBS.cash || 0)
  const equityValue = enterpriseValue - netDebt

  const fmt = (v) => v != null ? Math.round(v) : 'N/A'
  const fmtM = (v) => v != null ? (v / 1e6).toFixed(1) + 'M' : 'N/A'
  const fmtPct = (v) => (v * 100).toFixed(1) + '%'

  // ---- SHEET 1: DCF Model ----
  const dcfRows = [
    [`${companyName} (${ticker}) — 5-Year DCF Model`],
    [`Currency: ${currency}`, '', `Generated: ${new Date().toISOString().split('T')[0]}`],
    [],
    ['', 'Historical', '', '', ...projYears.map(y => `FY${y}E`)],
  ]

  // Historical columns
  const histYears = incomeStatements.map(s => s.date?.split('-')[0] || '').slice(-3)
  const histRevenue = incomeStatements.map(s => s.totalRevenue).slice(-3)
  const histEBIT = incomeStatements.map(s => s.ebit || s.operatingIncome).slice(-3)
  const histTax = incomeStatements.map(s => s.incomeTaxExpense).slice(-3)
  const histDA = cashflowStatements.map(s => Math.abs(s.depreciation || 0)).slice(-3)
  const histCapex = cashflowStatements.map(s => Math.abs(s.capex || 0)).slice(-3)
  const histWC = cashflowStatements.map(s => s.changeInWorkingCapital).slice(-3)

  // Pad historical to 3 columns
  const pad3 = (arr) => {
    while (arr.length < 3) arr.unshift(null)
    return arr
  }

  dcfRows.push(['', ...pad3(histYears), '', ...projYears.map(String)])
  dcfRows.push([])
  dcfRows.push(['Revenue', ...pad3(histRevenue).map(fmt), '', ...projRevenue.map(fmt)])
  dcfRows.push(['  Growth %', ...pad3(histRevenue).map((v, i, arr) => {
    if (i === 0 || !arr[i - 1] || !v) return ''
    return fmtPct((v - arr[i - 1]) / arr[i - 1])
  }), '', ...revenueGrowthRates.map(fmtPct)])
  dcfRows.push([])
  dcfRows.push(['EBIT', ...pad3(histEBIT).map(fmt), '', ...projEBIT.map(fmt)])
  dcfRows.push(['  EBIT Margin', ...pad3(histEBIT).map((v, i) => {
    const rev = pad3(histRevenue)[i]
    return v && rev ? fmtPct(v / rev) : ''
  }), '', ...projEBIT.map((v, i) => fmtPct(v / projRevenue[i]))])
  dcfRows.push([])
  dcfRows.push(['Tax', ...pad3(histTax).map(fmt), '', ...projTax.map(fmt)])
  dcfRows.push(['  Effective Tax Rate', '', '', '', '', ...Array(5).fill(fmtPct(effectiveTaxRate))])
  dcfRows.push([])
  dcfRows.push(['D&A', ...pad3(histDA).map(fmt), '', ...projDA.map(fmt)])
  dcfRows.push(['CapEx', ...pad3(histCapex).map(fmt), '', ...projCapex.map(fmt)])
  dcfRows.push(['Change in Working Capital', ...pad3(histWC).map(fmt), '', ...projWC.map(fmt)])
  dcfRows.push([])
  dcfRows.push(['NOPAT (EBIT - Tax)', '', '', '', '', ...projEBIT.map((v, i) => fmt(v - projTax[i]))])
  dcfRows.push(['+ D&A', '', '', '', '', ...projDA.map(fmt)])
  dcfRows.push(['- CapEx', '', '', '', '', ...projCapex.map(fmt)])
  dcfRows.push(['- Change in WC', '', '', '', '', ...projWC.map(fmt)])
  dcfRows.push(['= Free Cash Flow', '', '', '', '', ...projFCF.map(fmt)])
  dcfRows.push([])
  dcfRows.push(['--- Valuation ---'])
  dcfRows.push(['WACC', fmtPct(wacc)])
  dcfRows.push(['Terminal Growth Rate', fmtPct(terminalGrowth)])
  dcfRows.push(['Terminal FCF', fmt(terminalFCF)])
  dcfRows.push(['Terminal Value', fmt(terminalValue)])
  dcfRows.push([])
  dcfRows.push(['PV of Projected FCFs', fmt(pvFCF)])
  dcfRows.push(['PV of Terminal Value', fmt(pvTerminal)])
  dcfRows.push(['Enterprise Value', fmt(enterpriseValue)])
  dcfRows.push(['(-) Net Debt', fmt(netDebt)])
  dcfRows.push(['Equity Value', fmt(equityValue)])

  if (financials.marketCap) {
    dcfRows.push([])
    dcfRows.push(['Market Cap (current)', fmt(financials.marketCap)])
    const upside = ((equityValue - financials.marketCap) / financials.marketCap * 100)
    dcfRows.push(['Implied Upside/Downside', fmtPct(upside / 100)])
  }

  const ws1 = XLSX.utils.aoa_to_sheet(dcfRows)
  ws1['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 3 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, ws1, 'DCF Model')

  // ---- SHEET 2: Assumptions & Justifications ----
  const justRows = [
    [`${companyName} — DCF Assumptions & Justifications`],
    [],
    ['Assumption', 'Value', 'Justification'],
    [],
    ['Revenue Growth (Year 1)', fmtPct(revenueGrowthRates[0]),
      `Based on actual historical revenue growth of ${fmtPct(historicalRevenueGrowth)} from ${currency} ${fmtM(prevRevenue)} to ${fmtM(baseRevenue)}. Tapered toward terminal growth over 5 years.`],
    ['Revenue Growth (Year 5)', fmtPct(revenueGrowthRates[4]),
      'Converges toward long-term GDP growth rate as the company matures.'],
    [],
    ['EBIT Margin', fmtPct(ebitMargin),
      `Held constant at the latest reported operating margin. Historical EBIT was ${currency} ${fmtM(baseEBIT)} on revenue of ${currency} ${fmtM(baseRevenue)}.`],
    [],
    ['Effective Tax Rate', fmtPct(effectiveTaxRate),
      `Derived from reported tax expense of ${currency} ${fmtM(taxExpense)} on pre-tax income of ${currency} ${fmtM(preTaxIncome)}.`],
    [],
    ['D&A (% of Revenue)', fmtPct(daToRevenue),
      `Based on reported depreciation & amortization of ${currency} ${fmtM(baseDA)}, representing ${fmtPct(daToRevenue)} of revenue.`],
    [],
    ['CapEx (% of Revenue)', fmtPct(capexToRevenue),
      `Based on reported capital expenditures of ${currency} ${fmtM(baseCapex)}, representing ${fmtPct(capexToRevenue)} of revenue.`],
    [],
    ['Change in Working Capital (% of Revenue)', fmtPct(wcToRevenue),
      `Based on reported working capital change of ${currency} ${fmtM(baseWC)}.`],
    [],
    ['WACC', fmtPct(wacc), `Calculated as: E/(D+E) × Ke + D/(D+E) × Kd × (1-t)`],
    ['  Cost of Equity (Ke)', fmtPct(costOfEquity),
      `CAPM: Rf (${fmtPct(riskFreeRate)}) + β (${beta.toFixed(2)}) × ERP (${fmtPct(marketPremium)}). Beta sourced from Yahoo Finance.`],
    ['  Cost of Debt (Kd)', fmtPct(costOfDebt), 'Estimated from typical investment-grade corporate bond yields.'],
    ['  Equity Weight', fmtPct(equityRatio),
      `Derived from balance sheet: Equity ${currency} ${fmtM(latestBS.totalStockholderEquity)}, Debt ${currency} ${fmtM(latestBS.longTermDebt)}.`],
    ['  Debt Weight', fmtPct(debtRatio), 'Complement of equity weight.'],
    [],
    ['Terminal Growth Rate', fmtPct(terminalGrowth),
      'Standard assumption of 2.5%, approximating long-term nominal GDP growth.'],
    [],
    ['--- Data Sources ---'],
    ['Financial Statements', 'Yahoo Finance quoteSummary API'],
    ['Beta', `${beta.toFixed(2)} from Yahoo Finance defaultKeyStatistics`],
    ['Risk-Free Rate', `${fmtPct(riskFreeRate)} (approx. 10Y government bond yield)`],
    ['All historical figures', 'Sourced directly from company filings via Yahoo Finance'],
  ]

  const ws2 = XLSX.utils.aoa_to_sheet(justRows)
  ws2['!cols'] = [{ wch: 36 }, { wch: 16 }, { wch: 80 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'Assumptions')

  // ---- SHEET 3: Raw Financial Data ----
  const rawRows = [
    [`${companyName} — Raw Financial Data from Yahoo Finance`],
    [],
    ['--- Income Statements ---'],
    ['Year', 'Revenue', 'Gross Profit', 'Operating Income', 'EBIT', 'Net Income', 'Tax Expense', 'Pre-Tax Income'],
  ]
  for (const s of incomeStatements) {
    rawRows.push([s.date, fmt(s.totalRevenue), fmt(s.grossProfit), fmt(s.operatingIncome), fmt(s.ebit), fmt(s.netIncome), fmt(s.incomeTaxExpense), fmt(s.incomeBeforeTax)])
  }
  rawRows.push([])
  rawRows.push(['--- Cash Flow Statements ---'])
  rawRows.push(['Year', 'Operating CF', 'CapEx', 'D&A', 'Change in WC'])
  for (const s of cashflowStatements) {
    rawRows.push([s.date, fmt(s.operatingCashflow), fmt(s.capex), fmt(s.depreciation), fmt(s.changeInWorkingCapital)])
  }
  rawRows.push([])
  rawRows.push(['--- Balance Sheets ---'])
  rawRows.push(['Year', 'Total Assets', 'Total Liabilities', 'Equity', 'Cash', 'ST+LT Debt', 'Long-Term Debt'])
  for (const s of balanceSheets) {
    rawRows.push([s.date, fmt(s.totalAssets), fmt(s.totalLiab), fmt(s.totalStockholderEquity), fmt(s.cash), fmt(s.shortLongTermDebt), fmt(s.longTermDebt)])
  }

  const ws3 = XLSX.utils.aoa_to_sheet(rawRows)
  ws3['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, ws3, 'Raw Data')

  // Generate and download
  const filename = `${ticker}_DCF_Model.xlsx`
  XLSX.writeFile(wb, filename)
}
