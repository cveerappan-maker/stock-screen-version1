import express from 'express'
import cors from 'cors'
import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance()
import { TICKER_MAP } from './tickers.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Suppress yahoo-finance2 community API notices
try { yahooFinance.setGlobalConfig({ notifyRemainingRecovery: false }) } catch { /* config option may not exist in all versions */ }

// In-memory cache: key -> { data, timestamp }
const cache = new Map()
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

function getCached(key) {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data
  }
  cache.delete(key)
  return null
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() })
}

// Fetch historical data for a single ticker
async function fetchTickerHistory(ticker, startDate, endDate) {
  try {
    const result = await yahooFinance.chart(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    })

    if (!result?.quotes?.length) return null

    const quotes = result.quotes
      .filter(q => q.close != null)
      .map(q => ({
        date: new Date(q.date).toISOString().split('T')[0],
        close: q.close,
      }))

    return quotes
  } catch (err) {
    console.warn(`Failed to fetch ${ticker}: ${err.message}`)
    return null
  }
}

// Compute equal-weighted theme return from individual stock histories
function computeThemePerformance(stockHistories) {
  if (stockHistories.length === 0) return { totalReturn: 0, chartData: [] }

  // Find the common date range across all stocks
  const allDatesSet = new Set()
  stockHistories.forEach(hist => {
    hist.forEach(q => allDatesSet.add(q.date))
  })
  const allDates = [...allDatesSet].sort()

  if (allDates.length < 2) return { totalReturn: 0, chartData: [] }

  // Build price map for each stock
  const priceMaps = stockHistories.map(hist => {
    const map = {}
    hist.forEach(q => { map[q.date] = q.close })
    return map
  })

  // Compute equal-weighted cumulative return for each date
  const chartData = []
  const firstDate = allDates[0]

  for (const date of allDates) {
    let sumReturn = 0
    let count = 0

    for (const priceMap of priceMaps) {
      const startPrice = priceMap[firstDate]
      const currentPrice = priceMap[date]
      if (startPrice && currentPrice) {
        sumReturn += (currentPrice / startPrice - 1) * 100
        count++
      }
    }

    if (count > 0) {
      chartData.push({
        date,
        value: Math.round((sumReturn / count) * 100) / 100,
      })
    }
  }

  const totalReturn = chartData.length > 0 ? chartData[chartData.length - 1].value : 0

  return { totalReturn, chartData }
}

// API: Get theme performance
// GET /api/themes?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
app.get('/api/themes', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD)' })
    }

    const cacheKey = `themes-${startDate}-${endDate}`
    const cached = getCached(cacheKey)
    if (cached) {
      return res.json(cached)
    }

    // Import theme definitions from the frontend data
    // We'll receive them from the request or use a shared config
    const { themes } = await import('../src/data/themeDefinitions.js')

    // Process a single theme: fetch its tickers and compute performance
    async function processTheme(theme) {
      const themeKey = `${theme.id}-${startDate}-${endDate}`
      const cachedTheme = getCached(themeKey)
      if (cachedTheme) return cachedTheme

      // Build name-to-ticker pairs for holdings we can resolve
      const holdingPairs = theme.holdings
        .map(name => ({ name, ticker: TICKER_MAP[name] }))
        .filter(p => p.ticker)
        .slice(0, 5)

      // Fetch all tickers for this theme in parallel
      const batchResults = await Promise.all(
        holdingPairs.map(p => fetchTickerHistory(p.ticker, startDate, endDate))
      )

      const histories = []
      const holdingReturns = []

      for (let i = 0; i < holdingPairs.length; i++) {
        const hist = batchResults[i]
        if (hist && hist.length >= 2) {
          histories.push(hist)
          const first = hist[0].close
          const last = hist[hist.length - 1].close
          const ret = ((last - first) / first) * 100
          holdingReturns.push({
            name: holdingPairs[i].name,
            returnPct: Math.round(ret * 100) / 100,
          })
        }
      }

      holdingReturns.sort((a, b) => b.returnPct - a.returnPct)
      const perf = computeThemePerformance(histories)

      const themeResult = {
        id: theme.id,
        name: theme.name,
        sector: theme.sector,
        subSector: theme.subSector,
        region: theme.region,
        description: theme.description,
        holdings: theme.holdings,
        holdingReturns,
        tickersCovered: holdingPairs.length,
        tickersWithData: histories.length,
        totalReturn: perf.totalReturn,
        chartData: perf.chartData,
      }

      setCache(themeKey, themeResult)
      return themeResult
    }

    // Process themes in parallel batches of 4 (~20 concurrent ticker fetches)
    const THEME_BATCH = 4
    const results = []

    for (let i = 0; i < themes.length; i += THEME_BATCH) {
      const batch = themes.slice(i, i + THEME_BATCH)
      const batchResults = await Promise.all(batch.map(processTheme))
      results.push(...batchResults)
      // Brief pause between theme batches
      if (i + THEME_BATCH < themes.length) {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    // Sort by performance
    results.sort((a, b) => b.totalReturn - a.totalReturn)

    setCache(cacheKey, results)
    res.json(results)
  } catch (err) {
    console.error('Error fetching theme data:', err)
    res.status(500).json({ error: 'Failed to fetch theme data', message: err.message })
  }
})

// API: Get stock financials for DCF model
// GET /api/stock/:name/financials
app.get('/api/stock/:name/financials', async (req, res) => {
  try {
    const companyName = decodeURIComponent(req.params.name)
    const ticker = TICKER_MAP[companyName]

    if (!ticker) {
      return res.status(404).json({ error: `No ticker mapping for "${companyName}"` })
    }

    const cacheKey = `financials-${ticker}`
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    // Fetch summary data from Yahoo Finance (non-financial-statement modules)
    const modules = [
      'financialData',
      'defaultKeyStatistics',
      'summaryDetail',
      'summaryProfile',
      'earningsTrend',
    ]

    let summary
    try {
      summary = await yahooFinance.quoteSummary(ticker, { modules })
    } catch (err) {
      console.warn(`quoteSummary failed for ${ticker}, trying subset:`, err.message)
      summary = await yahooFinance.quoteSummary(ticker, {
        modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail', 'summaryProfile']
      })
    }

    const fd = summary.financialData || {}
    const ks = summary.defaultKeyStatistics || {}
    const sd = summary.summaryDetail || {}
    const sp = summary.summaryProfile || {}

    // Helper: extract date string from various formats
    function toDateStr(d) {
      if (!d) return null
      if (typeof d === 'string') return d.split('T')[0]
      if (d instanceof Date) return d.toISOString().split('T')[0]
      if (typeof d === 'number') return new Date(d * 1000).toISOString().split('T')[0]
      return null
    }

    // Fetch financial statements via fundamentalsTimeSeries (replaces deprecated quoteSummary modules)
    const ftsStart = new Date(Date.now() - 6 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    let ftsData = []
    try {
      ftsData = await yahooFinance.fundamentalsTimeSeries(ticker, {
        period1: ftsStart,
        type: 'annual',
        module: 'all',
      })
      console.log(`[${ticker}] fundamentalsTimeSeries returned ${ftsData.length} periods`)
    } catch (err) {
      console.warn(`fundamentalsTimeSeries failed for ${ticker}:`, err.message)
    }

    // Parse income statement data from fundamentalsTimeSeries results
    const incomeHist = ftsData
      .filter(entry => entry.totalRevenue != null || entry.netIncome != null)
      .map(entry => ({
        date: toDateStr(entry.date),
        totalRevenue: entry.totalRevenue ?? null,
        grossProfit: entry.grossProfit ?? null,
        operatingIncome: entry.operatingIncome ?? null,
        ebit: entry.EBIT ?? entry.operatingIncome ?? null,
        netIncome: entry.netIncome ?? null,
        incomeTaxExpense: entry.taxProvision ?? null,
        incomeBeforeTax: entry.pretaxIncome ?? null,
      }))
      .filter(s => s.date)
      .sort((a, b) => a.date.localeCompare(b.date))
    console.log(`[${ticker}] Income statements parsed: ${incomeHist.length}`)

    // Parse cash flow data from fundamentalsTimeSeries results
    const cashflowHist = ftsData
      .filter(entry => entry.operatingCashFlow != null || entry.capitalExpenditure != null)
      .map(entry => ({
        date: toDateStr(entry.date),
        operatingCashflow: entry.operatingCashFlow ?? null,
        capex: entry.capitalExpenditure ?? null,
        depreciation: entry.depreciationAndAmortization ?? entry.depreciation ?? null,
        changeInWorkingCapital: entry.changeInWorkingCapital ?? null,
      }))
      .filter(s => s.date)
      .sort((a, b) => a.date.localeCompare(b.date))
    console.log(`[${ticker}] Cash flow statements parsed: ${cashflowHist.length}`)

    // Parse balance sheet data from fundamentalsTimeSeries results
    const balanceHist = ftsData
      .filter(entry => entry.totalAssets != null || entry.stockholdersEquity != null)
      .map(entry => ({
        date: toDateStr(entry.date),
        totalAssets: entry.totalAssets ?? null,
        totalLiab: entry.totalLiabilitiesNetMinorityInterest ?? null,
        totalStockholderEquity: entry.stockholdersEquity ?? null,
        cash: entry.cashAndCashEquivalents ?? null,
        shortLongTermDebt: entry.currentDebt ?? null,
        longTermDebt: entry.longTermDebt ?? null,
      }))
      .filter(s => s.date)
      .sort((a, b) => a.date.localeCompare(b.date))
    console.log(`[${ticker}] Balance sheet statements parsed: ${balanceHist.length}`)

    // Derive performance drivers from the data
    const drivers = []

    // Revenue growth
    if (fd.revenueGrowth != null) {
      const pct = (fd.revenueGrowth * 100).toFixed(1)
      drivers.push({
        factor: 'Revenue Growth',
        detail: `${pct}% YoY revenue growth`,
        impact: fd.revenueGrowth >= 0 ? 'positive' : 'negative',
      })
    }

    // Profit margins
    if (fd.operatingMargins != null) {
      const pct = (fd.operatingMargins * 100).toFixed(1)
      drivers.push({
        factor: 'Operating Margins',
        detail: `${pct}% operating margin`,
        impact: fd.operatingMargins >= 0.10 ? 'positive' : 'negative',
      })
    }

    // Earnings growth
    if (fd.earningsGrowth != null) {
      const pct = (fd.earningsGrowth * 100).toFixed(1)
      drivers.push({
        factor: 'Earnings Growth',
        detail: `${pct}% YoY earnings growth`,
        impact: fd.earningsGrowth >= 0 ? 'positive' : 'negative',
      })
    }

    // ROE
    if (fd.returnOnEquity != null) {
      const pct = (fd.returnOnEquity * 100).toFixed(1)
      drivers.push({
        factor: 'Return on Equity',
        detail: `${pct}% ROE`,
        impact: fd.returnOnEquity >= 0.12 ? 'positive' : 'negative',
      })
    }

    // Debt levels
    if (fd.debtToEquity != null) {
      drivers.push({
        factor: 'Leverage',
        detail: `Debt/Equity ratio of ${fd.debtToEquity.toFixed(0)}%`,
        impact: fd.debtToEquity < 100 ? 'positive' : 'negative',
      })
    }

    // Free cash flow
    if (fd.freeCashflow != null) {
      const fcfB = (fd.freeCashflow / 1e9).toFixed(2)
      drivers.push({
        factor: 'Free Cash Flow',
        detail: `${fcfB}B in free cash flow`,
        impact: fd.freeCashflow > 0 ? 'positive' : 'negative',
      })
    }

    // Analyst recommendation
    if (fd.recommendationKey) {
      const rec = fd.recommendationKey
      drivers.push({
        factor: 'Analyst Consensus',
        detail: `Consensus: ${rec} (${fd.numberOfAnalystOpinions || '?'} analysts)`,
        impact: ['buy', 'strong_buy'].includes(rec) ? 'positive' : rec === 'hold' ? 'neutral' : 'negative',
      })
    }

    // Valuation
    if (sd.trailingPE != null) {
      drivers.push({
        factor: 'Valuation',
        detail: `Trailing P/E of ${sd.trailingPE.toFixed(1)}x`,
        impact: 'neutral',
      })
    }

    // Beta / volatility
    if (ks.beta != null) {
      drivers.push({
        factor: 'Volatility',
        detail: `Beta of ${ks.beta.toFixed(2)}`,
        impact: ks.beta > 1.2 ? 'negative' : 'neutral',
      })
    }

    // Forward growth estimates
    const earningsTrend = summary.earningsTrend?.trend || []
    const nextYearEst = earningsTrend.find(t => t.period === '+1y')
    if (nextYearEst?.growth != null) {
      const pct = (nextYearEst.growth * 100).toFixed(1)
      drivers.push({
        factor: 'Forward Earnings Estimate',
        detail: `${pct}% expected earnings growth next year`,
        impact: nextYearEst.growth >= 0.05 ? 'positive' : nextYearEst.growth < 0 ? 'negative' : 'neutral',
      })
    }

    const result = {
      companyName,
      ticker,
      sector: sp.sector || null,
      industry: sp.industry || null,
      country: sp.country || null,
      website: sp.website || null,
      summary: sp.longBusinessSummary ? sp.longBusinessSummary.slice(0, 300) : null,
      marketCap: sd.marketCap ?? null,
      currency: fd.financialCurrency || sd.currency || null,
      beta: ks.beta ?? null,
      trailingPE: sd.trailingPE ?? null,
      forwardPE: sd.forwardPE ?? null,
      currentPrice: fd.currentPrice ?? null,
      incomeStatements: incomeHist,
      cashflowStatements: cashflowHist,
      balanceSheets: balanceHist,
      drivers,
    }

    setCache(cacheKey, result)
    res.json(result)
  } catch (err) {
    console.error(`Error fetching financials for ${req.params.name}:`, err)
    res.status(500).json({ error: 'Failed to fetch financial data', message: err.message })
  }
})

// ---- PEER ANALYSIS / FUND COMPARISON ----

// Peer fund definitions
const FUND_UNIVERSE = {
  DHIAX: { name: 'Diamond Hill International', manager: 'Diamond Hill', style: 'Value' },
  OAKIX: { name: 'Oakmark International', manager: 'Harris Associates', style: 'Value' },
  DODFX: { name: 'Dodge & Cox International', manager: 'Dodge & Cox', style: 'Value' },
  ARTIX: { name: 'Artisan International Value', manager: 'Artisan Partners', style: 'Value' },
  TFISX: { name: 'T. Rowe Price Intl Stock', manager: 'T. Rowe Price', style: 'Growth' },
  HAINX: { name: 'Harbor International', manager: 'Marathon Asset Mgmt', style: 'Value' },
  MINGX: { name: 'MFS International Growth', manager: 'MFS', style: 'Growth' },
  ACWX: { name: 'iShares MSCI ACWI ex US (Benchmark)', manager: 'BlackRock', style: 'Index' },
}

const SECTOR_NAME_MAP = {
  realestate: 'Real Estate',
  consumer_cyclical: 'Consumer Cyclical',
  basic_materials: 'Basic Materials',
  consumer_defensive: 'Consumer Defensive',
  technology: 'Technology',
  communication_services: 'Communication Services',
  financial_services: 'Financial Services',
  utilities: 'Utilities',
  industrials: 'Industrials',
  energy: 'Energy',
  healthcare: 'Healthcare',
}

// Fetch fund data from Yahoo Finance
async function fetchFundData(ticker) {
  const cacheKey = `fund-${ticker}`
  const cached = getCached(cacheKey)
  if (cached) return cached

  const modules = ['topHoldings', 'fundProfile', 'defaultKeyStatistics', 'fundPerformance']

  let summary
  try {
    summary = await yahooFinance.quoteSummary(ticker, { modules })
  } catch (err) {
    console.warn(`quoteSummary for ${ticker} failed, trying subset:`, err.message)
    try {
      summary = await yahooFinance.quoteSummary(ticker, { modules: ['topHoldings', 'defaultKeyStatistics'] })
    } catch (err2) {
      console.warn(`quoteSummary subset for ${ticker} also failed:`, err2.message)
      return null
    }
  }

  const th = summary.topHoldings || {}
  const fp = summary.fundProfile || {}
  const ks = summary.defaultKeyStatistics || {}
  const perf = summary.fundPerformance || {}

  // Parse sector weightings
  const sectorWeights = {}
  if (th.sectorWeightings) {
    for (const sw of th.sectorWeightings) {
      for (const [key, val] of Object.entries(sw)) {
        const name = SECTOR_NAME_MAP[key] || key
        sectorWeights[name] = Math.round((val || 0) * 10000) / 100
      }
    }
  }

  // Parse top holdings
  const holdings = (th.holdings || []).map(h => ({
    symbol: h.symbol || 'N/A',
    name: h.holdingName || h.symbol || 'Unknown',
    weight: Math.round((h.holdingPercent || 0) * 10000) / 100,
  }))

  // Equity characteristics
  const eqChar = th.equityHoldings || {}

  // Performance data
  const perfTrailing = perf.trailingReturns || {}
  const trailingReturns = {
    ytd: perfTrailing.ytd ?? null,
    oneMonth: perfTrailing.oneMonth ?? null,
    threeMonth: perfTrailing.threeMonth ?? null,
    oneYear: perfTrailing.oneYear ?? null,
    threeYear: perfTrailing.threeYear ?? null,
    fiveYear: perfTrailing.fiveYear ?? null,
  }

  const result = {
    ticker,
    ...(FUND_UNIVERSE[ticker] || { name: ticker }),
    totalNetAssets: ks.totalAssets ?? null,
    sectorWeights,
    holdings,
    equityCharacteristics: {
      priceToEarnings: eqChar.priceToEarnings ?? null,
      priceToBook: eqChar.priceToBook ?? null,
      priceToSales: eqChar.priceToSales ?? null,
      priceToCashflow: eqChar.priceToCashflow ?? null,
      medianMarketCap: eqChar.medianMarketCap ?? null,
      threeYearEarningsGrowth: eqChar.threeYearEarningsGrowth ?? null,
    },
    trailingReturns,
    category: fp.categoryName ?? null,
  }

  setCache(cacheKey, result)
  return result
}

// API: Get single fund data
app.get('/api/fund/:ticker', async (req, res) => {
  try {
    const data = await fetchFundData(req.params.ticker.toUpperCase())
    if (!data) return res.status(404).json({ error: 'Fund data not available' })
    res.json(data)
  } catch (err) {
    console.error(`Error fetching fund ${req.params.ticker}:`, err)
    res.status(500).json({ error: err.message })
  }
})

// API: Full peer comparison
app.get('/api/peer-comparison', async (req, res) => {
  try {
    const cacheKey = 'peer-comparison'
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    const tickers = Object.keys(FUND_UNIVERSE)
    const results = {}

    // Fetch all funds in parallel batches of 3
    for (let i = 0; i < tickers.length; i += 3) {
      const batch = tickers.slice(i, i + 3)
      const batchResults = await Promise.all(batch.map(fetchFundData))
      for (let j = 0; j < batch.length; j++) {
        if (batchResults[j]) results[batch[j]] = batchResults[j]
      }
      if (i + 3 < tickers.length) await new Promise(r => setTimeout(r, 500))
    }

    // Compute comparative analytics
    const benchmark = results['ACWX']
    const dhiax = results['DHIAX']

    // Active sector weights (DHIAX vs benchmark)
    const activeSectorWeights = {}
    if (dhiax && benchmark) {
      const allSectors = new Set([
        ...Object.keys(dhiax.sectorWeights || {}),
        ...Object.keys(benchmark.sectorWeights || {}),
      ])
      for (const sector of allSectors) {
        const fund = dhiax.sectorWeights[sector] || 0
        const bench = benchmark.sectorWeights[sector] || 0
        activeSectorWeights[sector] = {
          fund: Math.round(fund * 100) / 100,
          benchmark: Math.round(bench * 100) / 100,
          active: Math.round((fund - bench) * 100) / 100,
        }
      }
    }

    // Normalize company name for matching (same company can trade under different symbols)
    function normalizeCompanyName(name) {
      return (name || '')
        .toLowerCase()
        .replace(/\b(inc|corp|ltd|plc|sa|ag|se|nv|co|group|holdings|international)\b\.?/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim()
    }

    // Holdings overlap: match by normalized company name (not just symbol)
    const holdingsMap = {} // normalizedName -> { name, symbols: [], funds: [{ ticker, weight }] }
    for (const [fundTicker, fundData] of Object.entries(results)) {
      if (!fundData?.holdings) continue
      for (const h of fundData.holdings) {
        if (!h.name || h.name === 'Unknown') continue
        const key = normalizeCompanyName(h.name)
        if (!key) continue
        if (!holdingsMap[key]) {
          holdingsMap[key] = { name: h.name, symbols: [], funds: [] }
        }
        if (h.symbol && h.symbol !== 'N/A' && !holdingsMap[key].symbols.includes(h.symbol)) {
          holdingsMap[key].symbols.push(h.symbol)
        }
        holdingsMap[key].funds.push({ ticker: fundTicker, weight: h.weight })
      }
    }
    // Sort by number of funds holding it (most common first)
    const holdingsOverlap = Object.values(holdingsMap)
      .map(h => ({ ...h, symbol: h.symbols.join(' / ') }))
      .sort((a, b) => b.funds.length - a.funds.length)

    // Conviction positions: DHIAX holdings not in benchmark top holdings (match by name)
    const benchHoldingNames = new Set(
      (benchmark?.holdings || []).map(h => normalizeCompanyName(h.name))
    )
    const dhiaxOnly = (dhiax?.holdings || []).filter(
      h => !benchHoldingNames.has(normalizeCompanyName(h.name))
    )

    // Peer sector tilts relative to benchmark
    const peerSectorTilts = {}
    for (const [fundTicker, fundData] of Object.entries(results)) {
      if (fundTicker === 'ACWX' || !fundData?.sectorWeights || !benchmark?.sectorWeights) continue
      peerSectorTilts[fundTicker] = {}
      for (const sector of Object.keys(SECTOR_NAME_MAP).map(k => SECTOR_NAME_MAP[k])) {
        const f = fundData.sectorWeights[sector] || 0
        const b = benchmark.sectorWeights[sector] || 0
        peerSectorTilts[fundTicker][sector] = Math.round((f - b) * 100) / 100
      }
    }

    const response = {
      funds: results,
      activeSectorWeights,
      holdingsOverlap,
      dhiaxConvictionPositions: dhiaxOnly,
      peerSectorTilts,
      generatedAt: new Date().toISOString(),
    }

    setCache(cacheKey, response)
    res.json(response)
  } catch (err) {
    console.error('Error in peer comparison:', err)
    res.status(500).json({ error: err.message })
  }
})

// API: Fetch fund price history for trailing performance chart
app.get('/api/fund/:ticker/history', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase()
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const cacheKey = `fund-hist-${ticker}`
    const cached = getCached(cacheKey)
    if (cached) return res.json(cached)

    const history = await fetchTickerHistory(ticker, startDate, endDate)
    if (!history) return res.status(404).json({ error: 'No price data' })

    // Rebase to 100
    const base = history[0].close
    const rebased = history.map(h => ({
      date: h.date,
      value: Math.round((h.close / base) * 10000) / 100,
    }))

    setCache(cacheKey, rebased)
    res.json(rebased)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', cached: cache.size })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Endpoints:`)
  console.log(`  GET /api/themes?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`)
  console.log(`  GET /api/stock/:name/financials`)
  console.log(`  GET /api/peer-comparison`)
  console.log(`  GET /api/fund/:ticker`)
  console.log(`  GET /api/fund/:ticker/history`)
  console.log(`  GET /api/health`)
})
