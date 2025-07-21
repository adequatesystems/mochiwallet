import { ReactNode } from 'react'
import { Menu, Maximize2, Minimize2, PanelRight, PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { useViewMode } from '@/lib/contexts/ViewModeContext'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
  
  return (
    <div className={cn(
      "flex flex-col bg-background",
      // Responsive layout: usa dimensioni fisse solo in modalità popup per estensione
      viewMode === 'popup' && isExtension ? 'w-[360px] h-[600px]' : 'w-full h-full min-h-screen',
      // Quando è in modalità web o panel, centra il contenuto su schermi larghi
      viewMode !== 'popup' && 'sm:px-4 md:px-6 lg:px-0'
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
        <div className="flex items-center">
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
          <ThemeToggle />
        </div>
      </div>

      {/* Main Content - Contenitore con larghezza massima per schermi larghi */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className={cn(
            "h-full",
            // In modalità web o panel su schermi larghi, limita la larghezza massima e centra
            viewMode !== 'popup' && 'mx-auto lg:max-w-4xl xl:max-w-5xl'
          )}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}