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

    // Fetch comprehensive financial data from Yahoo Finance
    const modules = [
      'financialData',
      'defaultKeyStatistics',
      'incomeStatementHistory',
      'cashflowStatementHistory',
      'balanceSheetHistory',
      'summaryDetail',
      'summaryProfile',
      'earningsTrend',
    ]

    let summary
    try {
      summary = await yahooFinance.quoteSummary(ticker, { modules })
    } catch (err) {
      console.warn(`quoteSummary failed for ${ticker}, trying subset:`, err.message)
      // Some modules may not be available for all stocks; try a subset
      summary = await yahooFinance.quoteSummary(ticker, {
        modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail', 'summaryProfile']
      })
    }

    const fd = summary.financialData || {}
    const ks = summary.defaultKeyStatistics || {}
    const sd = summary.summaryDetail || {}
    const sp = summary.summaryProfile || {}

    // Extract historical income statements (up to 4 years)
    const incomeHist = (summary.incomeStatementHistory?.incomeStatementHistory || [])
      .map(stmt => ({
        date: stmt.endDate ? new Date(stmt.endDate).toISOString().split('T')[0] : null,
        totalRevenue: stmt.totalRevenue ?? null,
        grossProfit: stmt.grossProfit ?? null,
        operatingIncome: stmt.operatingIncome ?? null,
        ebit: stmt.ebit ?? null,
        netIncome: stmt.netIncome ?? null,
        incomeTaxExpense: stmt.incomeTaxExpense ?? null,
        incomeBeforeTax: stmt.incomeBeforeTax ?? null,
      }))
      .filter(s => s.date)
      .sort((a, b) => a.date.localeCompare(b.date))

    // Extract historical cash flow statements
    const cashflowHist = (summary.cashflowStatementHistory?.cashflowStatements || [])
      .map(stmt => ({
        date: stmt.endDate ? new Date(stmt.endDate).toISOString().split('T')[0] : null,
        operatingCashflow: stmt.totalCashFromOperatingActivities ?? null,
        capex: stmt.capitalExpenditures ?? null,
        depreciation: stmt.depreciation ?? null,
        changeInWorkingCapital: stmt.changeToOperatingActivities ?? null,
      }))
      .filter(s => s.date)
      .sort((a, b) => a.date.localeCompare(b.date))

    // Extract historical balance sheet data
    const balanceHist = (summary.balanceSheetHistory?.balanceSheetStatements || [])
      .map(stmt => ({
        date: stmt.endDate ? new Date(stmt.endDate).toISOString().split('T')[0] : null,
        totalAssets: stmt.totalAssets ?? null,
        totalLiab: stmt.totalLiab ?? null,
        totalStockholderEquity: stmt.totalStockholderEquity ?? null,
        cash: stmt.cash ?? null,
        shortLongTermDebt: stmt.shortLongTermDebt ?? null,
        longTermDebt: stmt.longTermDebt ?? null,
      }))
      .filter(s => s.date)
      .sort((a, b) => a.date.localeCompare(b.date))

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

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', cached: cache.size })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Endpoints:`)
  console.log(`  GET /api/themes?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`)
  console.log(`  GET /api/health`)
})
