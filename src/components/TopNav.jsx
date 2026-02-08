import { NavLink } from 'react-router-dom'

const tabs = [
  { name: 'Theme', path: '/theme' },
]

export default function TopNav() {
  return (
    <nav className="bg-dark-800 border-b border-dark-600 sticky top-0 z-50">
      <div className="max-w-[1440px] mx-auto px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-8">
          <h1 className="text-lg font-bold text-white tracking-tight">
            Ex-US Screener
          </h1>
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-accent/15 text-accent-light'
                      : 'text-neutral hover:text-white hover:bg-dark-600'
                  }`
                }
              >
                {tab.name}
              </NavLink>
            ))}
          </div>
        </div>
        <div className="text-xs text-neutral">
          International Markets
        </div>
      </div>
    </nav>
  )
}
