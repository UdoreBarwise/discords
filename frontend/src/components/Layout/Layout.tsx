import { ReactNode, useState, useEffect } from 'react'
import { useSidebar } from '../../contexts/SidebarContext'
import { HiMenu } from 'react-icons/hi'
import Sidebar from '../Sidebar/Sidebar'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { isCollapsed } = useSidebar()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 640)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleMobileMenuClick = () => {
    const event = new CustomEvent('openSidebar')
    window.dispatchEvent(event)
  }

  return (
    <div className={`layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {isMobile && (
        <button
          className="mobile-menu-button"
          onClick={handleMobileMenuClick}
          aria-label="Open menu"
        >
          <HiMenu size={24} />
        </button>
      )}
      <Sidebar />
      <main className="layout-content">{children}</main>
    </div>
  )
}

