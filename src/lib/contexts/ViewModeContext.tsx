import { createContext, useContext, useEffect, useState } from 'react'
import { log } from "@/lib/utils/logging"
const logger = log.getLogger("wallet");

type ViewMode = 'popup' | 'panel'

interface ViewModeContextType {
    viewMode: ViewMode
    toggleViewMode: () => void
    isExtension: boolean
}

const ViewModeContext = createContext<ViewModeContextType>({
    viewMode: 'popup',
    toggleViewMode: () => { },
    isExtension: false
})

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
    const [viewMode, setViewMode] = useState<ViewMode>('popup')
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime !== undefined

    useEffect(() => {
        // Retrieve the stored view mode from chrome.storage.local or localStorage fallback
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.get('viewMode', (result) => {
                if (result.viewMode) {
                    setViewMode(result.viewMode)
                }
                if (result.viewMode === 'panel' && chrome.runtime) {
                    chrome.runtime.connect({ name: 'mochimo_side_panel' });
                }
            })
        } else {
            // Fallback: use localStorage
            const stored = localStorage.getItem('viewMode') as ViewMode | null;
            if (stored === 'popup' || stored === 'panel') {
                setViewMode(stored);
            }
        }
    }, [])

    const openPanelMode = async () => {
        try {
            logger.info('current view mode', viewMode)
            if (viewMode === 'popup') {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
                logger.info('Active tabs:', tabs)
                if (tabs[0]?.id) {
                    logger.info('Attempting to open side panel for tab:', tabs[0].id)
                    // Close popup immediately after sending message
                    chrome.runtime.sendMessage({
                        type: 'OPEN_SIDE_PANEL',
                        tabId: tabs[0].id
                    }).then(res => {
                        logger.info('response', res)
                        window.close()
                    })
                }
            } else {
                window.close();
            }
        } catch (error) {
            logger.error('Failed to toggle view mode:', error)
            return false
        }
    }

    return (
        <ViewModeContext.Provider value={{ viewMode, toggleViewMode: openPanelMode, isExtension }}>
            {children}
        </ViewModeContext.Provider>
    )
}

export const useViewMode = () => useContext(ViewModeContext) 