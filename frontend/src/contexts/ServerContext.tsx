import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { botService } from '../services/botService'

interface ServerContextType {
  selectedServerId: string | null
  setSelectedServerId: (serverId: string | null) => void
  isLoading: boolean
}

const ServerContext = createContext<ServerContextType | undefined>(undefined)

export function ServerProvider({ children }: { children: ReactNode }) {
  const [selectedServerId, setSelectedServerIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDefaultServer = async () => {
      try {
        const defaultServerId = await botService.getDefaultServer()
        setSelectedServerIdState(defaultServerId)
      } catch (error) {
        console.error('Failed to load default server:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDefaultServer()
  }, [])

  const setSelectedServerId = (serverId: string | null) => {
    setSelectedServerIdState(serverId)
  }

  return (
    <ServerContext.Provider value={{ selectedServerId, setSelectedServerId, isLoading }}>
      {children}
    </ServerContext.Provider>
  )
}

export function useServer() {
  const context = useContext(ServerContext)
  if (context === undefined) {
    throw new Error('useServer must be used within a ServerProvider')
  }
  return context
}

