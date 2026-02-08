// Ex-US Investment Themes - sectors and sub-sectors
// Performance data is simulated based on realistic recent trends

export const themes = [
  {
    id: 'european-defense',
    name: 'European Defense',
    sector: 'Industrials',
    subSector: 'Aerospace & Defense',
    region: 'Europe',
    description: 'European defense contractors benefiting from increased NATO spending',
    holdings: ['Rheinmetall', 'BAE Systems', 'Leonardo', 'Thales', 'Saab'],
  },
  {
    id: 'japan-financials',
    name: 'Japan Financials',
    sector: 'Financials',
    subSector: 'Banks',
    region: 'Japan',
    description: 'Japanese banks benefiting from BOJ rate normalization',
    holdings: ['Mitsubishi UFJ', 'Sumitomo Mitsui', 'Mizuho', 'Nomura', 'Daiwa'],
  },
  {
    id: 'european-luxury',
    name: 'European Luxury',
    sector: 'Consumer Discretionary',
    subSector: 'Luxury Goods',
    region: 'Europe',
    description: 'Global luxury brands with pricing power and aspirational demand',
    holdings: ['LVMH', 'Hermès', 'Richemont', 'Ferrari', 'Kering'],
  },
  {
    id: 'india-infrastructure',
    name: 'India Infrastructure',
    sector: 'Industrials',
    subSector: 'Construction & Engineering',
    region: 'India',
    description: 'Indian infrastructure buildout driven by government capex',
    holdings: ['Larsen & Toubro', 'Adani Ports', 'UltraTech Cement', 'Siemens India', 'ABB India'],
  },
  {
    id: 'em-semiconductors',
    name: 'Asia Semiconductors',
    sector: 'Technology',
    subSector: 'Semiconductors',
    region: 'Asia-Pacific',
    description: 'Asian chip makers powering AI and global tech supply chains',
    holdings: ['TSMC', 'Samsung Electronics', 'SK Hynix', 'Tokyo Electron', 'ASM Pacific'],
  },
  {
    id: 'latam-commodities',
    name: 'LatAm Commodities',
    sector: 'Materials',
    subSector: 'Metals & Mining',
    region: 'Latin America',
    description: 'Latin American miners and commodity producers',
    holdings: ['Vale', 'Grupo México', 'Southern Copper', 'SQM', 'Petrobras'],
  },
  {
    id: 'european-green-energy',
    name: 'European Green Energy',
    sector: 'Utilities',
    subSector: 'Renewable Energy',
    region: 'Europe',
    description: 'European renewable energy and clean transition plays',
    holdings: ['Iberdrola', 'Ørsted', 'Vestas', 'Siemens Energy', 'EDP Renováveis'],
  },
  {
    id: 'china-consumer',
    name: 'China Consumer',
    sector: 'Consumer Discretionary',
    subSector: 'E-Commerce & Retail',
    region: 'China',
    description: 'Chinese consumer and e-commerce recovery plays',
    holdings: ['Alibaba', 'JD.com', 'PDD Holdings', 'Meituan', 'Li Auto'],
  },
  {
    id: 'india-it-services',
    name: 'India IT Services',
    sector: 'Technology',
    subSector: 'IT Services & Consulting',
    region: 'India',
    description: 'Indian IT outsourcing giants with global enterprise clients',
    holdings: ['TCS', 'Infosys', 'Wipro', 'HCL Tech', 'Tech Mahindra'],
  },
  {
    id: 'european-banks',
    name: 'European Banks',
    sector: 'Financials',
    subSector: 'Banks',
    region: 'Europe',
    description: 'European banks benefiting from higher rate environment',
    holdings: ['BNP Paribas', 'Deutsche Bank', 'UBS', 'Santander', 'UniCredit'],
  },
  {
    id: 'korea-batteries',
    name: 'Korea EV & Batteries',
    sector: 'Industrials',
    subSector: 'Electrical Equipment',
    region: 'South Korea',
    description: 'Korean battery and EV supply chain leaders',
    holdings: ['LG Energy Solution', 'Samsung SDI', 'SK Innovation', 'Hyundai Motor', 'POSCO Future M'],
  },
  {
    id: 'japan-automation',
    name: 'Japan Automation',
    sector: 'Industrials',
    subSector: 'Machinery & Robotics',
    region: 'Japan',
    description: 'Japanese robotics and factory automation leaders',
    holdings: ['Fanuc', 'Keyence', 'SMC Corp', 'Yaskawa', 'Nidec'],
  },
  {
    id: 'asean-growth',
    name: 'ASEAN Growth',
    sector: 'Financials',
    subSector: 'Diversified Financials',
    region: 'Southeast Asia',
    description: 'Southeast Asian growth driven by demographics and digitization',
    holdings: ['DBS Group', 'Bank Central Asia', 'Sea Limited', 'Grab Holdings', 'Bangkok Bank'],
  },
  {
    id: 'european-pharma',
    name: 'European Pharma',
    sector: 'Healthcare',
    subSector: 'Pharmaceuticals',
    region: 'Europe',
    description: 'European pharmaceutical leaders with GLP-1 and oncology pipelines',
    holdings: ['Novo Nordisk', 'AstraZeneca', 'Roche', 'Novartis', 'Sanofi'],
  },
  {
    id: 'australia-resources',
    name: 'Australia Resources',
    sector: 'Materials',
    subSector: 'Mining',
    region: 'Australia',
    description: 'Australian mining majors with iron ore, lithium, and gold exposure',
    holdings: ['BHP', 'Rio Tinto', 'Fortescue', 'Pilbara Minerals', 'Newmont'],
  },
  {
    id: 'gulf-diversification',
    name: 'Gulf Diversification',
    sector: 'Energy',
    subSector: 'Integrated Oil & Diversified',
    region: 'Middle East',
    description: 'Gulf state companies diversifying beyond oil',
    holdings: ['Saudi Aramco', 'ADNOC', 'Emaar Properties', 'Saudi Telecom', 'QNB Group'],
  },
  {
    id: 'india-financials',
    name: 'India Financials',
    sector: 'Financials',
    subSector: 'Banks & NBFCs',
    region: 'India',
    description: 'Indian banks and financial companies riding credit growth',
    holdings: ['HDFC Bank', 'ICICI Bank', 'Bajaj Finance', 'SBI', 'Kotak Mahindra'],
  },
  {
    id: 'china-ai-tech',
    name: 'China AI & Tech',
    sector: 'Technology',
    subSector: 'Internet & AI',
    region: 'China',
    description: 'Chinese tech giants pivoting to AI and cloud',
    holdings: ['Tencent', 'Baidu', 'ByteDance', 'SenseTime', 'Xiaomi'],
  },
  {
    id: 'canada-energy',
    name: 'Canada Energy',
    sector: 'Energy',
    subSector: 'Oil & Gas',
    region: 'Canada',
    description: 'Canadian energy producers with oil sands and LNG exposure',
    holdings: ['Canadian Natural Resources', 'Suncor', 'Enbridge', 'TC Energy', 'Cenovus'],
  },
  {
    id: 'uk-consumer-staples',
    name: 'UK Consumer Staples',
    sector: 'Consumer Staples',
    subSector: 'Food & Beverages',
    region: 'United Kingdom',
    description: 'Defensive UK consumer staples with global brands',
    holdings: ['Unilever', 'Diageo', 'Reckitt', 'Associated British Foods', 'Tesco'],
  },
]

// Generate realistic performance data for each theme across different time periods
function seededRandom(seed) {
  let x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generateDailyReturns(themeIndex, days = 365) {
  const returns = []
  const baseVol = 0.008 + seededRandom(themeIndex * 100) * 0.012
  const baseDrift = (seededRandom(themeIndex * 200) - 0.4) * 0.002

  for (let i = 0; i < days; i++) {
    const noise = (seededRandom(themeIndex * 1000 + i) - 0.5) * 2 * baseVol
    const momentum = i > 0 ? returns[i - 1] * 0.1 : 0
    const dailyReturn = baseDrift + noise + momentum
    returns.push(Math.round(dailyReturn * 10000) / 10000)
  }
  return returns
}

function generateDateRange(days) {
  const dates = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
}

const TOTAL_DAYS = 365
const allDates = generateDateRange(TOTAL_DAYS)

export const themePerformanceData = themes.map((theme, idx) => {
  const dailyReturns = generateDailyReturns(idx, TOTAL_DAYS)

  // Build cumulative price series (base 100)
  const priceSeries = [100]
  for (let i = 0; i < dailyReturns.length; i++) {
    priceSeries.push(Math.round(priceSeries[i] * (1 + dailyReturns[i]) * 100) / 100)
  }

  return {
    ...theme,
    dailyReturns,
    priceSeries,
    dates: allDates,
  }
})

export function getThemePerformance(startDate, endDate) {
  return themePerformanceData.map((theme) => {
    const startIdx = theme.dates.findIndex((d) => d >= startDate)
    const endIdx = theme.dates.findIndex((d) => d >= endDate)

    const effectiveStart = startIdx >= 0 ? startIdx : 0
    const effectiveEnd = endIdx >= 0 ? endIdx : theme.dates.length - 1

    const startPrice = theme.priceSeries[effectiveStart]
    const endPrice = theme.priceSeries[effectiveEnd + 1] || theme.priceSeries[theme.priceSeries.length - 1]
    const totalReturn = ((endPrice - startPrice) / startPrice) * 100

    // Build sub-series for charting
    const chartData = []
    for (let i = effectiveStart; i <= effectiveEnd; i++) {
      const rebased = ((theme.priceSeries[i + 1] / theme.priceSeries[effectiveStart]) - 1) * 100
      chartData.push({
        date: theme.dates[i],
        value: Math.round(rebased * 100) / 100,
      })
    }

    return {
      id: theme.id,
      name: theme.name,
      sector: theme.sector,
      subSector: theme.subSector,
      region: theme.region,
      description: theme.description,
      holdings: theme.holdings,
      totalReturn: Math.round(totalReturn * 100) / 100,
      chartData,
    }
  }).sort((a, b) => b.totalReturn - a.totalReturn)
}

export function getAvailableDateRange() {
  return {
    min: allDates[0],
    max: allDates[allDates.length - 1],
  }
}
