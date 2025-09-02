import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from "@/components/theme-provider"
import { MochimoWalletProvider } from "mochimo-wallet"
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { ViewModeProvider } from '@/lib/contexts/ViewModeContext'
import { ApiEndpointProvider } from '@/lib/contexts/ApiEndpointContext'
import { log } from "@/lib/utils/logging"


// Enable dev logging if localStorage.debug is set to true
if (import.meta.env.MODE === 'development') {
    // Add keyboard shortcut to toggle debug logging
    window.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Alt + ArrowDown to toggle debug mode
        if ((e.ctrlKey || e.metaKey) && e.altKey  && e.key === 'ArrowDown') {

            const debugEnabled = localStorage.getItem('debug') === 'true'
            if (debugEnabled) {
                log.disableDebug()
                console.log('Debug logging disabled')
            } else {
                log.enableDebug()
                console.log('Debug logging enabled')
            }
        }
    })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ViewModeProvider>
      <ThemeProvider defaultTheme="dark">
        <ErrorBoundary>
          <ApiEndpointProvider>
            <MochimoWalletProvider>
              <TooltipProvider>
                <App />
              </TooltipProvider>
            </MochimoWalletProvider>
          </ApiEndpointProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </ViewModeProvider>
  </React.StrictMode>,
)
