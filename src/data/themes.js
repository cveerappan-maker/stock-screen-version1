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
    holdings: ['Rheinmetall', 'BAE Systems', 'Leonardo', 'Thales', 'Saab', 'Dassault Aviation', 'Hensoldt', 'Kongsberg Gruppen', 'Rolls-Royce', 'Airbus Defence', 'KNDS', 'Chemring', 'QinetiQ', 'Indra Sistemas', 'Babcock International', 'Elbit Systems', 'Rafael', 'Patria', 'MBDA', 'Krauss-Maffei Wegmann'],
  },
  {
    id: 'japan-financials',
    name: 'Japan Financials',
    sector: 'Financials',
    subSector: 'Banks',
    region: 'Japan',
    description: 'Japanese banks benefiting from BOJ rate normalization',
    holdings: ['Mitsubishi UFJ', 'Sumitomo Mitsui', 'Mizuho', 'Nomura', 'Daiwa', 'Tokio Marine', 'Japan Post Bank', 'Resona Holdings', 'SBI Holdings', 'Concordia Financial', 'Dai-ichi Life', 'T&D Holdings', 'MS&AD Insurance', 'Sompo Holdings', 'Shinsei Bank', 'Aozora Bank', 'Chiba Bank', 'Shizuoka Financial', 'Fukuoka Financial', 'Seven Bank'],
  },
  {
    id: 'european-luxury',
    name: 'European Luxury',
    sector: 'Consumer Discretionary',
    subSector: 'Luxury Goods',
    region: 'Europe',
    description: 'Global luxury brands with pricing power and aspirational demand',
    holdings: ['LVMH', 'Hermès', 'Richemont', 'Ferrari', 'Kering', 'Moncler', 'Brunello Cucinelli', 'Prada', 'Burberry', 'Swatch Group', 'Pandora', 'Hugo Boss', 'Salvatore Ferragamo', 'Tod\'s', 'Ermenegildo Zegna', 'Watches of Switzerland', 'Chow Tai Fook', 'EssilorLuxottica', 'Christian Dior', 'Compagnie Financière Rupert'],
  },
  {
    id: 'india-infrastructure',
    name: 'India Infrastructure',
    sector: 'Industrials',
    subSector: 'Construction & Engineering',
    region: 'India',
    description: 'Indian infrastructure buildout driven by government capex',
    holdings: ['Larsen & Toubro', 'Adani Ports', 'UltraTech Cement', 'Siemens India', 'ABB India', 'Adani Enterprises', 'Shree Cement', 'Ambuja Cements', 'Thermax', 'KNR Constructions', 'NCC Ltd', 'IRB Infrastructure', 'Dilip Buildcon', 'NBCC India', 'Cummins India', 'Bharat Electronics', 'Engineers India', 'Kalpataru Projects', 'GMR Airports', 'PNC Infratech'],
  },
  {
    id: 'em-semiconductors',
    name: 'Asia Semiconductors',
    sector: 'Technology',
    subSector: 'Semiconductors',
    region: 'Asia-Pacific',
    description: 'Asian chip makers powering AI and global tech supply chains',
    holdings: ['TSMC', 'Samsung Electronics', 'SK Hynix', 'Tokyo Electron', 'ASM Pacific', 'MediaTek', 'Renesas Electronics', 'Advantest', 'Screen Holdings', 'Disco Corp', 'Lasertec', 'United Microelectronics', 'Nanya Technology', 'Rohm Co', 'Murata Manufacturing', 'TDK Corp', 'Sumco Corp', 'Win Semiconductors', 'Silergy Corp', 'Realtek Semiconductor'],
  },
  {
    id: 'latam-commodities',
    name: 'LatAm Commodities',
    sector: 'Materials',
    subSector: 'Metals & Mining',
    region: 'Latin America',
    description: 'Latin American miners and commodity producers',
    holdings: ['Vale', 'Grupo México', 'Southern Copper', 'SQM', 'Petrobras', 'Gerdau', 'Ternium', 'Cemex', 'Suzano', 'Klabin', 'Braskem', 'Companhia Siderúrgica Nacional', 'Usiminas', 'Alpek', 'Minerva Foods', 'Ecopetrol', 'YPF', 'Buenaventura', 'Volcan Compañía Minera', 'Sociedad Química y Minera'],
  },
  {
    id: 'european-green-energy',
    name: 'European Green Energy',
    sector: 'Utilities',
    subSector: 'Renewable Energy',
    region: 'Europe',
    description: 'European renewable energy and clean transition plays',
    holdings: ['Iberdrola', 'Ørsted', 'Vestas', 'Siemens Energy', 'EDP Renováveis', 'Enel', 'RWE', 'SSE', 'Nordex', 'Solaria Energía', 'Acciona Energía', 'Verbund', 'Encavis', 'Energiekontor', 'SMA Solar', 'Meyer Burger', 'Scatec', 'Grenergy Renovables', 'Voltalia', 'Neoen'],
  },
  {
    id: 'china-consumer',
    name: 'China Consumer',
    sector: 'Consumer Discretionary',
    subSector: 'E-Commerce & Retail',
    region: 'China',
    description: 'Chinese consumer and e-commerce recovery plays',
    holdings: ['Alibaba', 'JD.com', 'PDD Holdings', 'Meituan', 'Li Auto', 'BYD', 'Nio', 'XPeng', 'Trip.com', 'Vipshop', 'Miniso', 'Luckin Coffee', 'Anta Sports', 'Li Ning', 'Haidilao', 'China Tourism Group Duty Free', 'Yum China', 'Pop Mart', 'Zhongsheng Group', 'Geely Auto'],
  },
  {
    id: 'india-it-services',
    name: 'India IT Services',
    sector: 'Technology',
    subSector: 'IT Services & Consulting',
    region: 'India',
    description: 'Indian IT outsourcing giants with global enterprise clients',
    holdings: ['TCS', 'Infosys', 'Wipro', 'HCL Tech', 'Tech Mahindra', 'LTIMindtree', 'Mphasis', 'Persistent Systems', 'Coforge', 'L&T Technology Services', 'Cyient', 'Zensar Technologies', 'Birlasoft', 'KPIT Technologies', 'Tata Elxsi', 'Firstsource Solutions', 'eClerx Services', 'Mastek', 'Happiest Minds', 'NIIT Technologies'],
  },
  {
    id: 'european-banks',
    name: 'European Banks',
    sector: 'Financials',
    subSector: 'Banks',
    region: 'Europe',
    description: 'European banks benefiting from higher rate environment',
    holdings: ['BNP Paribas', 'Deutsche Bank', 'UBS', 'Santander', 'UniCredit', 'ING Group', 'Intesa Sanpaolo', 'Société Générale', 'Credit Agricole', 'BBVA', 'Commerzbank', 'ABN AMRO', 'Nordea', 'Danske Bank', 'CaixaBank', 'KBC Group', 'Bankinter', 'Erste Group', 'DNB Bank', 'Swedbank'],
  },
  {
    id: 'korea-batteries',
    name: 'Korea EV & Batteries',
    sector: 'Industrials',
    subSector: 'Electrical Equipment',
    region: 'South Korea',
    description: 'Korean battery and EV supply chain leaders',
    holdings: ['LG Energy Solution', 'Samsung SDI', 'SK Innovation', 'Hyundai Motor', 'POSCO Future M', 'Kia Corp', 'LG Chem', 'SK On', 'EcoPro BM', 'EcoPro', 'L&F Co', 'POSCO Holdings', 'Samsung Electro-Mechanics', 'Hanon Systems', 'HL Mando', 'Hyundai Mobis', 'SK IE Technology', 'Kumho Petrochemical', 'Doosan Fuel Cell', 'S-Oil'],
  },
  {
    id: 'japan-automation',
    name: 'Japan Automation',
    sector: 'Industrials',
    subSector: 'Machinery & Robotics',
    region: 'Japan',
    description: 'Japanese robotics and factory automation leaders',
    holdings: ['Fanuc', 'Keyence', 'SMC Corp', 'Yaskawa', 'Nidec', 'Omron', 'Mitsubishi Electric', 'Komatsu', 'Kubota', 'Daikin Industries', 'Harmonic Drive Systems', 'THK', 'Nabtesco', 'CKD Corp', 'Hiwin Technologies', 'Daifuku', 'Hamamatsu Photonics', 'Shimadzu', 'Amada Holdings', 'DMG Mori'],
  },
  {
    id: 'asean-growth',
    name: 'ASEAN Growth',
    sector: 'Financials',
    subSector: 'Diversified Financials',
    region: 'Southeast Asia',
    description: 'Southeast Asian growth driven by demographics and digitization',
    holdings: ['DBS Group', 'Bank Central Asia', 'Sea Limited', 'Grab Holdings', 'Bangkok Bank', 'OCBC', 'UOB', 'Bank Rakyat Indonesia', 'Bank Mandiri', 'Telkom Indonesia', 'Kasikornbank', 'Public Bank Malaysia', 'CIMB Group', 'Maybank', 'Singapore Telecom', 'Wilmar International', 'Charoen Pokphand Foods', 'SM Investments', 'Ayala Corp', 'BDO Unibank'],
  },
  {
    id: 'european-pharma',
    name: 'European Pharma',
    sector: 'Healthcare',
    subSector: 'Pharmaceuticals',
    region: 'Europe',
    description: 'European pharmaceutical leaders with GLP-1 and oncology pipelines',
    holdings: ['Novo Nordisk', 'AstraZeneca', 'Roche', 'Novartis', 'Sanofi', 'GSK', 'Bayer', 'UCB', 'Genmab', 'Lonza', 'Straumann', 'Sartorius', 'BioMérieux', 'Ipsen', 'Hikma Pharmaceuticals', 'Recordati', 'Orion Corp', 'Zealand Pharma', 'Argenx', 'Galderma'],
  },
  {
    id: 'australia-resources',
    name: 'Australia Resources',
    sector: 'Materials',
    subSector: 'Mining',
    region: 'Australia',
    description: 'Australian mining majors with iron ore, lithium, and gold exposure',
    holdings: ['BHP', 'Rio Tinto', 'Fortescue', 'Pilbara Minerals', 'Newmont', 'South32', 'Northern Star Resources', 'Evolution Mining', 'Mineral Resources', 'Lynas Rare Earths', 'IGO Limited', 'Sandfire Resources', 'Iluka Resources', 'Whitehaven Coal', 'Woodside Energy', 'Santos', 'Alumina Limited', 'OZ Minerals', 'Champion Iron', 'Regis Resources'],
  },
  {
    id: 'gulf-diversification',
    name: 'Gulf Diversification',
    sector: 'Energy',
    subSector: 'Integrated Oil & Diversified',
    region: 'Middle East',
    description: 'Gulf state companies diversifying beyond oil',
    holdings: ['Saudi Aramco', 'ADNOC', 'Emaar Properties', 'Saudi Telecom', 'QNB Group', 'First Abu Dhabi Bank', 'Al Rajhi Bank', 'Emirates NBD', 'Saudi National Bank', 'Aldar Properties', 'DAMAC Properties', 'Industries Qatar', 'Savola Group', 'Jarir Marketing', 'Etisalat', 'Ooredoo', 'SABIC', 'Dana Gas', 'Fertiglobe', 'Borouge'],
  },
  {
    id: 'india-financials',
    name: 'India Financials',
    sector: 'Financials',
    subSector: 'Banks & NBFCs',
    region: 'India',
    description: 'Indian banks and financial companies riding credit growth',
    holdings: ['HDFC Bank', 'ICICI Bank', 'Bajaj Finance', 'SBI', 'Kotak Mahindra', 'Axis Bank', 'IndusInd Bank', 'Bajaj Finserv', 'Bandhan Bank', 'IDFC First Bank', 'Shriram Finance', 'Muthoot Finance', 'Manappuram Finance', 'Cholamandalam Investment', 'AU Small Finance Bank', 'Federal Bank', 'RBL Bank', 'Punjab National Bank', 'Bank of Baroda', 'HDFC Life Insurance'],
  },
  {
    id: 'china-ai-tech',
    name: 'China AI & Tech',
    sector: 'Technology',
    subSector: 'Internet & AI',
    region: 'China',
    description: 'Chinese tech giants pivoting to AI and cloud',
    holdings: ['Tencent', 'Baidu', 'ByteDance', 'SenseTime', 'Xiaomi', 'NetEase', 'Kuaishou', 'Bilibili', 'ZTE Corp', 'iFlytek', 'Kingsoft', 'Weibo', 'Zhipu AI', 'Cambricon Technologies', 'Hikvision', 'Lenovo', 'Inspur', 'Huawei (unlisted)', 'SMIC', 'Amec Inc'],
  },
  {
    id: 'canada-energy',
    name: 'Canada Energy',
    sector: 'Energy',
    subSector: 'Oil & Gas',
    region: 'Canada',
    description: 'Canadian energy producers with oil sands and LNG exposure',
    holdings: ['Canadian Natural Resources', 'Suncor', 'Enbridge', 'TC Energy', 'Cenovus', 'Imperial Oil', 'Pembina Pipeline', 'Keyera Corp', 'ARC Resources', 'Tourmaline Oil', 'MEG Energy', 'Vermilion Energy', 'Whitecap Resources', 'Crescent Point Energy', 'Inter Pipeline', 'Gibson Energy', 'Parex Resources', 'Baytex Energy', 'Freehold Royalties', 'Birchcliff Energy'],
  },
  {
    id: 'uk-consumer-staples',
    name: 'UK Consumer Staples',
    sector: 'Consumer Staples',
    subSector: 'Food & Beverages',
    region: 'United Kingdom',
    description: 'Defensive UK consumer staples with global brands',
    holdings: ['Unilever', 'Diageo', 'Reckitt', 'Associated British Foods', 'Tesco', 'British American Tobacco', 'Imperial Brands', 'Haleon', 'Sainsbury\'s', 'Marks & Spencer', 'Kerry Group', 'Ocado', 'Greggs', 'Premier Foods', 'Britvic', 'Cranswick', 'Hilton Food', 'Fever-Tree', 'AG Barr', 'Pets at Home'],
  },
]

// Realistic 1Y annual return targets and volatility for each theme
// Based on actual ex-US market performance trends
const THEME_PARAMS = {
  'european-defense':    { annualReturn:  0.85, vol: 0.020 }, // Rheinmetall, BAE surging on NATO spending
  'european-banks':      { annualReturn:  0.48, vol: 0.015 }, // UniCredit, Deutsche Bank strong NII
  'china-ai-tech':       { annualReturn:  0.38, vol: 0.022 }, // Tencent, Xiaomi AI pivot
  'em-semiconductors':   { annualReturn:  0.32, vol: 0.018 }, // TSMC, SK Hynix AI chip demand
  'japan-financials':    { annualReturn:  0.28, vol: 0.014 }, // BOJ rate normalization
  'european-pharma':     { annualReturn:  0.22, vol: 0.012 }, // GLP-1, oncology pipelines
  'india-financials':    { annualReturn:  0.18, vol: 0.016 }, // Credit growth cycle
  'china-consumer':      { annualReturn:  0.15, vol: 0.020 }, // Stimulus-driven recovery
  'asean-growth':        { annualReturn:  0.14, vol: 0.013 }, // DBS, Sea Limited growth
  'japan-automation':    { annualReturn:  0.12, vol: 0.015 }, // Keyence, Fanuc steady
  'india-infrastructure':{ annualReturn:  0.10, vol: 0.017 }, // Govt capex slowing slightly
  'gulf-diversification':{ annualReturn:  0.08, vol: 0.011 }, // Diversification steady
  'australia-resources': { annualReturn:  0.07, vol: 0.016 }, // Iron ore mixed, gold up
  'uk-consumer-staples': { annualReturn:  0.06, vol: 0.008 }, // Defensive, low growth
  'india-it-services':   { annualReturn:  0.05, vol: 0.012 }, // Muted discretionary spend
  'canada-energy':       { annualReturn:  0.02, vol: 0.014 }, // Oil range-bound
  'european-luxury':     { annualReturn: -0.04, vol: 0.016 }, // China demand slowdown
  'latam-commodities':   { annualReturn: -0.06, vol: 0.018 }, // Commodity softness
  'european-green-energy':{ annualReturn:-0.12, vol: 0.020 }, // Ørsted, Vestas struggling
  'korea-batteries':     { annualReturn: -0.18, vol: 0.022 }, // EV demand slowdown
}

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generateDailyReturns(themeId, themeIndex, days = 365) {
  const params = THEME_PARAMS[themeId] || { annualReturn: 0.05, vol: 0.015 }
  const dailyDrift = params.annualReturn / days
  const dailyVol = params.vol

  const returns = []
  for (let i = 0; i < days; i++) {
    const noise = (seededRandom(themeIndex * 1000 + i) - 0.5) * 2 * dailyVol
    const dailyReturn = dailyDrift + noise
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
  const dailyReturns = generateDailyReturns(theme.id, idx, TOTAL_DAYS)

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
