import * as XLSX from 'xlsx'

// Build a 5-year DCF model with linked Excel formulas
// Sheet 1: Assumptions (editable inputs)
// Sheet 2: DCF Model (all projections via formulas referencing Assumptions)
// Sheet 3: Raw Data
export function generateDCF(financials) {
  const wb = XLSX.utils.book_new()

  const { incomeStatements, cashflowStatements, balanceSheets } = financials
  const currency = financials.currency || 'USD'
  const companyName = financials.companyName
  const ticker = financials.ticker

  // ---- Extract base data ----
  const latestIncome = incomeStatements[incomeStatements.length - 1] || {}
  const prevIncome = incomeStatements[incomeStatements.length - 2] || {}
  const latestCF = cashflowStatements[cashflowStatements.length - 1] || {}
  const latestBS = balanceSheets[balanceSheets.length - 1] || {}

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
  const costOfDebt = 0.05
  const debtRatio = latestBS.longTermDebt && latestBS.totalStockholderEquity
    ? latestBS.longTermDebt / (latestBS.longTermDebt + latestBS.totalStockholderEquity) : 0.30
  const terminalGrowth = 0.025

  const startGrowth = Math.min(Math.max(historicalRevenueGrowth, -0.05), 0.30)
  const growthRates = []
  for (let i = 0; i < 5; i++) {
    growthRates.push(Math.round((startGrowth + (terminalGrowth - startGrowth) * (i / 5)) * 1000) / 1000)
  }

  const baseYear = latestIncome.date ? parseInt(latestIncome.date.split('-')[0]) : new Date().getFullYear()
  const projYears = [1, 2, 3, 4, 5].map(i => baseYear + i)

  // Convert to $M
  const toM = (v) => v != null ? Math.round(v / 1e6 * 10) / 10 : null
  const fmtPct = (v) => (v * 100).toFixed(1) + '%'
  const fmtM = (v) => v != null ? '$' + (v / 1e6).toFixed(1) + 'M' : 'N/A'

  // Historical data (last 3 years)
  const histCount = Math.min(incomeStatements.length, 3)
  const histIncome = incomeStatements.slice(-histCount)
  const histCF = cashflowStatements.slice(-histCount)
  const histYears = histIncome.map(s => s.date?.split('-')[0] || '')

  // ---- Cell helper: sets a cell on a worksheet ----
  const NUM = '#,##0.0'
  const PCT = '0.0%'
  function sc(ws, ref, value, opts = {}) {
    const c = {}
    if (opts.f) {
      c.f = opts.f
      c.t = 'n'
    } else if (typeof value === 'number') {
      c.v = value
      c.t = 'n'
    } else if (typeof value === 'string') {
      c.v = value
      c.t = 's'
    } else {
      return
    }
    if (opts.z) c.z = opts.z
    ws[ref] = c
  }

  // ================================================================
  // SHEET 1: ASSUMPTIONS (Editable Inputs)
  // ================================================================
  const wsA = {}
  const a = (ref, val, opts) => sc(wsA, ref, val, opts)

  a('A1', `${companyName} (${ticker}) — DCF Assumptions`)
  a('A2', 'Edit the yellow cells below to change the model. All projected values on the DCF Model sheet update automatically.')

  a('A4', 'INPUT')
  a('B4', 'VALUE')
  a('C4', 'SOURCE / JUSTIFICATION')

  // -- Base Year Data --
  a('A6', 'BASE YEAR DATA')
  a('A7', 'Base Revenue ($M)')
  a('B7', toM(baseRevenue), { z: NUM })
  a('C7', `Income statement ending ${latestIncome.date || 'N/A'}`)
  a('A8', 'Base Year')
  a('B8', baseYear)

  // -- Revenue Growth Rates --
  a('A10', 'REVENUE GROWTH')
  a('A11', 'Year 1 Revenue Growth')
  a('B11', growthRates[0], { z: PCT })
  a('C11', `Historical YoY: ${fmtPct(historicalRevenueGrowth)}. Tapered to terminal rate.`)
  a('A12', 'Year 2 Revenue Growth')
  a('B12', growthRates[1], { z: PCT })
  a('C12', 'Linear interpolation toward terminal growth')
  a('A13', 'Year 3 Revenue Growth')
  a('B13', growthRates[2], { z: PCT })
  a('A14', 'Year 4 Revenue Growth')
  a('B14', growthRates[3], { z: PCT })
  a('A15', 'Year 5 Revenue Growth')
  a('B15', growthRates[4], { z: PCT })
  a('C15', 'Approaching long-term nominal GDP growth rate')

  // -- Operating Assumptions --
  a('A17', 'OPERATING ASSUMPTIONS')
  a('A18', 'EBIT Margin')
  a('B18', ebitMargin, { z: PCT })
  a('C18', `EBIT ${fmtM(baseEBIT)} on revenue ${fmtM(baseRevenue)}`)
  a('A19', 'Effective Tax Rate')
  a('B19', effectiveTaxRate, { z: PCT })
  a('C19', `Tax ${fmtM(taxExpense)} / pre-tax income ${fmtM(preTaxIncome)}`)
  a('A20', 'D&A (% of Revenue)')
  a('B20', daToRevenue, { z: PCT })
  a('C20', `D&A of ${fmtM(baseDA)}`)
  a('A21', 'CapEx (% of Revenue)')
  a('B21', capexToRevenue, { z: PCT })
  a('C21', `CapEx of ${fmtM(baseCapex)}`)
  a('A22', 'Working Capital (% of Rev)')
  a('B22', wcToRevenue, { z: PCT })
  a('C22', `WC change of ${fmtM(baseWC)}`)

  // -- WACC Components --
  a('A24', 'WACC COMPONENTS')
  a('A25', 'Risk-Free Rate')
  a('B25', riskFreeRate, { z: PCT })
  a('C25', '10-year government bond yield')
  a('A26', 'Beta')
  a('B26', beta, { z: '0.00' })
  a('C26', 'Yahoo Finance')
  a('A27', 'Equity Risk Premium')
  a('B27', marketPremium, { z: PCT })
  a('C27', 'Long-term ERP estimate')
  a('A28', 'Cost of Debt (pre-tax)')
  a('B28', costOfDebt, { z: PCT })
  a('C28', 'IG corporate bond yield estimate')
  a('A29', 'Debt Weight D/(D+E)')
  a('B29', debtRatio, { z: PCT })
  a('C29', `LT Debt ${fmtM(latestBS.longTermDebt)}, Equity ${fmtM(latestBS.totalStockholderEquity)}`)
  a('A30', 'Equity Weight E/(D+E)')
  sc(wsA, 'B30', null, { f: '1-B29', z: PCT })
  a('A31', 'Terminal Growth Rate')
  a('B31', terminalGrowth, { z: PCT })
  a('C31', '2.5% long-term nominal GDP growth')

  // -- Computed WACC --
  a('A33', 'COMPUTED WACC')
  // WACC = E/(D+E)*Ke + D/(D+E)*Kd*(1-t), where Ke = Rf + Beta*ERP
  sc(wsA, 'B33', null, { f: 'B30*(B25+B26*B27)+B29*B28*(1-B19)', z: PCT })
  a('C33', 'E/(D+E) x (Rf + Beta x ERP) + D/(D+E) x Kd x (1-t)')

  // -- Balance Sheet --
  a('A35', 'BALANCE SHEET ($M)')
  a('A36', 'Long-Term Debt')
  a('B36', toM(latestBS.longTermDebt || 0), { z: NUM })
  a('A37', 'Short-Term Debt')
  a('B37', toM(latestBS.shortLongTermDebt || 0), { z: NUM })
  a('A38', 'Cash & Equivalents')
  a('B38', toM(latestBS.cash || 0), { z: NUM })
  a('A39', 'Net Debt')
  sc(wsA, 'B39', null, { f: 'B36+B37-B38', z: NUM })

  // -- Market Data --
  a('A41', 'MARKET DATA ($M)')
  a('A42', 'Market Cap')
  a('B42', toM(financials.marketCap || 0), { z: NUM })

  wsA['!ref'] = 'A1:C42'
  wsA['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsA, 'Assumptions')

  // ================================================================
  // SHEET 2: DCF MODEL (All projections are formulas)
  // ================================================================
  const wsD = {}
  const d = (ref, val, opts) => sc(wsD, ref, val, opts)

  const HIST_COLS = ['B', 'C', 'D']
  const PROJ = ['F', 'G', 'H', 'I', 'J']
  // Assumptions sheet cell references for each projection year's growth rate
  const GROWTH = ['Assumptions!B11', 'Assumptions!B12', 'Assumptions!B13', 'Assumptions!B14', 'Assumptions!B15']

  // Place historical values in the right columns (right-aligned to D)
  const hPad = 3 - histCount
  function setHist(row, values, fmt) {
    for (let i = 0; i < values.length; i++) {
      const col = HIST_COLS[hPad + i]
      if (col && values[i] != null) d(`${col}${row}`, values[i], fmt ? { z: fmt } : {})
    }
  }

  // ---- Header ----
  d('A1', `${companyName} (${ticker}) — 5-Year DCF Model`)
  d('A2', `All figures in $M (${currency})`)
  d('F2', `Generated: ${new Date().toISOString().split('T')[0]}`)

  // Year headers (row 4)
  for (let i = 0; i < histCount; i++) d(`${HIST_COLS[hPad + i]}4`, histYears[i])
  for (let i = 0; i < 5; i++) d(`${PROJ[i]}4`, `FY${projYears[i]}E`)

  // ---- Row 6: Revenue ----
  d('A6', 'Revenue')
  setHist(6, histIncome.map(s => toM(s.totalRevenue)), NUM)
  // Year 1: base revenue * (1 + growth1)
  sc(wsD, 'F6', null, { f: `Assumptions!B7*(1+${GROWTH[0]})`, z: NUM })
  // Years 2-5: prior year * (1 + growthN)
  for (let i = 1; i < 5; i++) {
    sc(wsD, `${PROJ[i]}6`, null, { f: `${PROJ[i - 1]}6*(1+${GROWTH[i]})`, z: NUM })
  }

  // ---- Row 7: Revenue Growth % ----
  d('A7', '  Revenue Growth %')
  for (let i = 1; i < histCount; i++) {
    const cur = histIncome[i].totalRevenue
    const prev = histIncome[i - 1].totalRevenue
    if (cur && prev) d(`${HIST_COLS[hPad + i]}7`, (cur - prev) / prev, { z: PCT })
  }
  for (let i = 0; i < 5; i++) sc(wsD, `${PROJ[i]}7`, null, { f: GROWTH[i], z: PCT })

  // ---- Row 9: EBIT ----
  d('A9', 'EBIT (Operating Income)')
  setHist(9, histIncome.map(s => toM(s.ebit || s.operatingIncome)), NUM)
  for (let i = 0; i < 5; i++) sc(wsD, `${PROJ[i]}9`, null, { f: `${PROJ[i]}6*Assumptions!B18`, z: NUM })

  // ---- Row 10: EBIT Margin ----
  d('A10', '  EBIT Margin %')
  for (let i = 0; i < histCount; i++) {
    const ebit = histIncome[i].ebit || histIncome[i].operatingIncome
    const rev = histIncome[i].totalRevenue
    if (ebit && rev) d(`${HIST_COLS[hPad + i]}10`, ebit / rev, { z: PCT })
  }
  for (let i = 0; i < 5; i++) sc(wsD, `${PROJ[i]}10`, null, { f: 'Assumptions!B18', z: PCT })

  // ---- Row 12: Income Tax ----
  d('A12', 'Income Tax')
  setHist(12, histIncome.map(s => toM(s.incomeTaxExpense)), NUM)
  for (let i = 0; i < 5; i++) sc(wsD, `${PROJ[i]}12`, null, { f: `${PROJ[i]}9*Assumptions!B19`, z: NUM })

  // ---- Row 13: Eff. Tax Rate ----
  d('A13', '  Eff. Tax Rate')
  for (let i = 0; i < 5; i++) sc(wsD, `${PROJ[i]}13`, null, { f: 'Assumptions!B19', z: PCT })

  // ---- Row 15: D&A ----
  d('A15', 'Depreciation & Amort.')
  setHist(15, histCF.map(s => toM(Math.abs(s.depreciation || 0))), NUM)
  for (let i = 0; i < 5; i++) sc(wsD, `${PROJ[i]}15`, null, { f: `${PROJ[i]}6*Assumptions!B20`, z: NUM })

  // ---- Row 16: CapEx ----
  d('A16', 'Capital Expenditures')
  setHist(16, histCF.map(s => toM(Math.abs(s.capex || 0))), NUM)
  for (let i = 0; i < 5; i++) sc(wsD, `${PROJ[i]}16`, null, { f: `${PROJ[i]}6*Assumptions!B21`, z: NUM })

  // ---- Row 17: WC ----
  d('A17', 'Change in Working Cap.')
  setHist(17, histCF.map(s => toM(s.changeInWorkingCapital)), NUM)
  for (let i = 0; i < 5; i++) sc(wsD, `${PROJ[i]}17`, null, { f: `${PROJ[i]}6*Assumptions!B22`, z: NUM })

  // ---- Row 19-23: FCF Build (formulas only) ----
  d('A19', 'NOPAT (EBIT - Tax)')
  for (let i = 0; i < 5; i++) {
    const c = PROJ[i]
    sc(wsD, `${c}19`, null, { f: `${c}9-${c}12`, z: NUM })
  }

  d('A20', '  + D&A')
  for (let i = 0; i < 5; i++) sc(wsD, `${PROJ[i]}20`, null, { f: `${PROJ[i]}15`, z: NUM })

  d('A21', '  - CapEx')
  for (let i = 0; i < 5; i++) sc(wsD, `${PROJ[i]}21`, null, { f: `${PROJ[i]}16`, z: NUM })

  d('A22', '  - Change in WC')
  for (let i = 0; i < 5; i++) sc(wsD, `${PROJ[i]}22`, null, { f: `${PROJ[i]}17`, z: NUM })

  d('A23', '= Unlevered Free Cash Flow')
  for (let i = 0; i < 5; i++) {
    const c = PROJ[i]
    sc(wsD, `${c}23`, null, { f: `${c}19+${c}20-${c}21-${c}22`, z: NUM })
  }

  // ---- Rows 25-26: Historical reference ----
  let r = 25
  if (histCF.some(s => s.operatingCashflow != null)) {
    d(`A${r}`, 'Operating Cash Flow (actual)')
    setHist(r, histCF.map(s => toM(s.operatingCashflow)), NUM)
    r++
  }
  if (histIncome.some(s => s.netIncome != null)) {
    d(`A${r}`, 'Net Income (actual)')
    setHist(r, histIncome.map(s => toM(s.netIncome)), NUM)
    r++
  }

  // ---- DCF VALUATION (all formulas) ----
  r += 2
  d(`A${r}`, '--- DCF VALUATION ---')
  r++

  const wR = r // WACC row
  d(`A${wR}`, 'WACC')
  sc(wsD, `B${wR}`, null, { f: 'Assumptions!B33', z: PCT })
  r++

  const gR = r // Terminal growth row
  d(`A${gR}`, 'Terminal Growth Rate')
  sc(wsD, `B${gR}`, null, { f: 'Assumptions!B31', z: PCT })
  r += 2

  // Discount factors (row dfR)
  const dfR = r
  d(`A${dfR}`, 'Discount Factor')
  for (let i = 0; i < 5; i++) {
    sc(wsD, `${PROJ[i]}${dfR}`, null, { f: `1/(1+$B$${wR})^${i + 1}`, z: '0.0000' })
  }
  r++

  // PV of each year's FCF (row pvR)
  const pvR = r
  d(`A${pvR}`, 'PV of FCF')
  for (let i = 0; i < 5; i++) {
    sc(wsD, `${PROJ[i]}${pvR}`, null, { f: `${PROJ[i]}23*${PROJ[i]}${dfR}`, z: NUM })
  }
  r += 2

  // Sum of PV FCFs
  const spR = r
  d(`A${spR}`, 'Sum of PV of FCFs')
  sc(wsD, `B${spR}`, null, { f: `SUM(F${pvR}:J${pvR})`, z: NUM })
  r++

  // Terminal FCF = Year5 FCF * (1 + g)
  const tfR = r
  d(`A${tfR}`, 'Terminal FCF')
  sc(wsD, `B${tfR}`, null, { f: `J23*(1+B${gR})`, z: NUM })
  r++

  // Terminal Value = Terminal FCF / (WACC - g)
  const tvR = r
  d(`A${tvR}`, 'Terminal Value')
  sc(wsD, `B${tvR}`, null, { f: `B${tfR}/(B${wR}-B${gR})`, z: NUM })
  r++

  // PV of Terminal Value = TV * discount factor year 5
  const ptR = r
  d(`A${ptR}`, 'PV of Terminal Value')
  sc(wsD, `B${ptR}`, null, { f: `B${tvR}*J${dfR}`, z: NUM })
  r += 2

  // Enterprise Value = Sum PV FCFs + PV Terminal Value
  const evR = r
  d(`A${evR}`, 'Enterprise Value')
  sc(wsD, `B${evR}`, null, { f: `B${spR}+B${ptR}`, z: NUM })
  r++

  // Net Debt (from Assumptions)
  const ndR = r
  d(`A${ndR}`, '  (-) Net Debt')
  sc(wsD, `B${ndR}`, null, { f: 'Assumptions!B39', z: NUM })
  r++

  // Implied Equity Value = EV - Net Debt
  const eqR = r
  d(`A${eqR}`, 'Implied Equity Value')
  sc(wsD, `B${eqR}`, null, { f: `B${evR}-B${ndR}`, z: NUM })
  r += 2

  // Market Cap & upside (formulas)
  if (financials.marketCap) {
    const mcR = r
    d(`A${mcR}`, 'Current Market Cap')
    sc(wsD, `B${mcR}`, null, { f: 'Assumptions!B42', z: NUM })
    r++
    d(`A${r}`, 'Implied Upside / Downside')
    sc(wsD, `B${r}`, null, { f: `IF(B${mcR}<>0,(B${eqR}-B${mcR})/B${mcR},"")`, z: PCT })
    r++
  }

  wsD['!ref'] = `A1:J${r}`
  wsD['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 3 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, wsD, 'DCF Model')

  // ================================================================
  // SHEET 3: RAW FINANCIAL DATA (static, in $M)
  // ================================================================
  const rawRows = [
    [`${companyName} (${ticker}) — Raw Financial Data (Yahoo Finance)`],
    ['All figures in $M'],
    [`${incomeStatements.length} income stmts, ${cashflowStatements.length} cash flow stmts, ${balanceSheets.length} balance sheets`],
    [],
    ['=== INCOME STATEMENTS ==='],
    ['Period End', 'Revenue', 'Gross Profit', 'Operating Inc.', 'EBIT', 'Pre-Tax Inc.', 'Tax Expense', 'Net Income'],
  ]
  if (incomeStatements.length === 0) {
    rawRows.push(['No income statement data available'])
  }
  for (const s of incomeStatements) {
    rawRows.push([s.date, toM(s.totalRevenue), toM(s.grossProfit), toM(s.operatingIncome), toM(s.ebit), toM(s.incomeBeforeTax), toM(s.incomeTaxExpense), toM(s.netIncome)])
  }

  rawRows.push([])
  rawRows.push(['=== CASH FLOW STATEMENTS ==='])
  rawRows.push(['Period End', 'Operating CF', 'CapEx', 'D&A', 'Chg in WC'])
  if (cashflowStatements.length === 0) {
    rawRows.push(['No cash flow data available'])
  }
  for (const s of cashflowStatements) {
    rawRows.push([s.date, toM(s.operatingCashflow), toM(s.capex), toM(s.depreciation), toM(s.changeInWorkingCapital)])
  }

  rawRows.push([])
  rawRows.push(['=== BALANCE SHEETS ==='])
  rawRows.push(['Period End', 'Total Assets', 'Total Liab.', 'Equity', 'Cash', 'ST Debt', 'LT Debt'])
  if (balanceSheets.length === 0) {
    rawRows.push(['No balance sheet data available'])
  }
  for (const s of balanceSheets) {
    rawRows.push([s.date, toM(s.totalAssets), toM(s.totalLiab), toM(s.totalStockholderEquity), toM(s.cash), toM(s.shortLongTermDebt), toM(s.longTermDebt)])
  }

  const ws3 = XLSX.utils.aoa_to_sheet(rawRows)
  ws3['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, ws3, 'Raw Data')

  // Generate and download
  XLSX.writeFile(wb, `${ticker}_DCF_Model.xlsx`)
}
