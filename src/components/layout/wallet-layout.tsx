import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useViewMode } from '@/lib/contexts/ViewModeContext'
import { cn } from '@/lib/utils'
import { Menu, PanelRight, PanelRightClose } from 'lucide-react'
import { checkServiceHealth, useActiveProvider, useNetwork } from 'mochimo-wallet'
import { ReactNode, useEffect, useMemo, useState } from 'react'

interface WalletLayoutProps {
  children: ReactNode
  showMenu?: boolean
  onMenuClick?: () => void
  sidebarOpen?: boolean
}

export function WalletLayout({ 
  children, 
  showMenu = false, 
  onMenuClick,
  sidebarOpen = false
}: WalletLayoutProps) {
  const { viewMode, toggleViewMode, isExtension } = useViewMode()
  const { isConnected } = useNetwork()
  const mesh = useActiveProvider('mesh')
  const proxy = useActiveProvider('proxy')
  const active = mesh || proxy
  const providerKey = active?.id ?? ''
  const serverName = useMemo(() => {
    try {
      return active ? new URL(active.apiUrl).host : ''
    } catch {
      return active?.apiUrl ?? ''
    }
  }, [active])
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!active) { setLatencyMs(null); return }
      try {
        const res = await checkServiceHealth(active, 2500)
        if (!cancelled) setLatencyMs(res.ok ? (res.latencyMs ?? null) : null)
      } catch {
        if (!cancelled) setLatencyMs(null)
      }
    }
    void run()
    // re-check periodically
    const t = setInterval(run, 15000)
    return () => { cancelled = true; clearInterval(t) }
  }, [providerKey])
  
  return (
    <div className={cn(
      "flex flex-col bg-background",
      "h-screen",
      viewMode === 'popup' ? 'w-[360px] h-[600px]' : 'w-screen h-screen'
    )}>
      {/* Fixed Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0 bg-card/50">
        <div className="flex items-center gap-3">
          {showMenu ? (
            <Button
              id="menu-button"
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className={cn(
                "hover:bg-primary/10",
                sidebarOpen && "bg-primary/10"
              )}
            >
              <Menu className="h-5 w-5 text-foreground/80" />
            </Button>
          ) : (
            <div className="w-8" />
          )}
          <div className="flex items-center gap-2">
            <Logo 
              size="sm" 
              className="text-primary"
            />
            <h1 className="text-lg font-semibold font-montserrat text-foreground/90">
              Mochimo Wallet
            </h1>
          </div>
        </div>
        <div className="flex items-center ">
          {/* Network status indicator */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mr-2 flex items-center">
                <span
                  className={cn(
                    "inline-block h-3 w-3 rounded-full animate-pulse",
                    isConnected ? "bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.25)]" : "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.25)]"
                  )}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isConnected ? 'Online' : 'Offline'}
                {serverName ? ` • ${serverName}` : ''}
                {isConnected && latencyMs !== null ? ` • ${latencyMs}ms` : ''}
              </p>
            </TooltipContent>
          </Tooltip>
          {isExtension && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleViewMode}
                  className="hover:bg-primary/10"
                >
                  {viewMode === 'popup' ? (
                    <PanelRight className="h-4 w-4 text-foreground/80" />
                  ) : (
                    <PanelRightClose className="h-4 w-4 text-foreground/80" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{viewMode === 'popup' ? 'Expand to panel' : 'Collapse to popup'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          {children}
        </div>
      </div>
    </div>
  )
} 