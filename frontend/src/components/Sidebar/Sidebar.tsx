import { NavLink } from 'react-router-dom'
import { HiMenu, HiX } from 'react-icons/hi'
import { MdDashboard, MdSettings, MdApps, MdHelp, MdLeaderboard, MdStorage, MdEvent, MdSportsEsports } from 'react-icons/md'
import { useSidebar } from '../../contexts/SidebarContext'
import { useEffect, useState } from 'react'
import './Sidebar.css'

interface SidebarItem {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string; size?: number }>
}

const sidebarItems: SidebarItem[] = [
  { path: '/', label: 'Dashboard', icon: MdDashboard },
  { path: '/general', label: 'General', icon: MdApps },
  { path: '/server-setup', label: 'Server Setup', icon: MdStorage },
  { path: '/scoreboard', label: 'Scoreboard', icon: MdLeaderboard },
  { path: '/events', label: 'Events', icon: MdEvent },
  { path: '/steam', label: 'Steam', icon: MdSportsEsports },
  { path: '/settings', label: 'Settings', icon: MdSettings },
  { path: '/help', label: 'Help', icon: MdHelp },
]

export default function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar()
  const [isMobile, setIsMobile] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640)
      if (window.innerWidth > 640) {
        setIsOpen(false)
      }
    }

    const handleOpenSidebar = () => {
      if (isMobile) {
        setIsOpen(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    window.addEventListener('openSidebar', handleOpenSidebar)
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('openSidebar', handleOpenSidebar)
    }
  }, [isMobile])

  const handleToggle = () => {
    if (isMobile) {
      setIsOpen(!isOpen)
    } else {
      toggleSidebar()
    }
  }

  const handleOverlayClick = () => {
    setIsOpen(false)
  }

  return (
    <>
      {isMobile && (
        <div
          className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
          onClick={handleOverlayClick}
        />
      )}
      <aside
        className={`sidebar ${isCollapsed && !isMobile ? 'collapsed' : ''} ${
          isMobile && isOpen ? 'open' : ''
        }`}
      >
        <div className="sidebar-header">
          <button className="sidebar-toggle" onClick={handleToggle} aria-label="Toggle sidebar">
            {isMobile ? (
              <HiMenu size={24} />
            ) : isCollapsed ? (
              <HiMenu size={24} />
            ) : (
              <HiX size={24} />
            )}
          </button>
          {(!isCollapsed || isMobile) && <h2>KaasBot</h2>}
        </div>
        <nav className="sidebar-nav">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? 'active' : ''}`
                }
                title={isCollapsed && !isMobile ? item.label : undefined}
                onClick={() => {
                  if (isMobile) {
                    setIsOpen(false)
                  }
                }}
              >
                <Icon className="sidebar-icon" size={20} />
                {(!isCollapsed || isMobile) && <span className="sidebar-label">{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

