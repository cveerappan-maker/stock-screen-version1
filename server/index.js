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

      const tickers = theme.holdings
        .map(name => TICKER_MAP[name])
        .filter(Boolean)
        .slice(0, 5)

      // Fetch all 5 tickers for this theme in parallel
      const batchResults = await Promise.all(
        tickers.map(ticker => fetchTickerHistory(ticker, startDate, endDate))
      )
      const histories = batchResults.filter(h => h && h.length > 0)
      const perf = computeThemePerformance(histories)

      const themeResult = {
        id: theme.id,
        name: theme.name,
        sector: theme.sector,
        subSector: theme.subSector,
        region: theme.region,
        description: theme.description,
        holdings: theme.holdings,
        tickersCovered: tickers.length,
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
