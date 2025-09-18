import { WalletLayout } from "@/components/layout/wallet-layout"
import { Button } from "@/components/ui/button"
import { FileJson, Import, PlusCircle } from "lucide-react"
import { useEffect, useState } from "react"

import { CreateWallet } from "@/components/wallet/CreateWallet"
import { ImportWallet } from "@/components/wallet/ImportWallet"
import { UnlockWallet } from "@/components/wallet/UnlockWallet"
import { WalletDashboard } from "@/components/wallet/WalletDashboard"
import { useWallet } from "mochimo-wallet"

import { ImportJsonWallet } from '@/components/wallet/ImportJsonWallet'
import { log } from "@/lib/utils/logging"
import { motion } from "framer-motion"
import { Logo } from "./components/ui/logo"
import Loading from "./components/wallet/Loading"
// import { env } from "./config/env"
import { sessionManager } from "./lib/services/SessionManager"
const logger = log.getLogger("wallet");

type WalletView = 'welcome' | 'create' | 'unlock' | 'dashboard' | 'import' | 'import-json' | 'loading'

// Network instance is now configured by MochimoWalletProvider via provider registry hydration




export function App() {
  const [view, setView] = useState<WalletView>('loading')
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const w = useWallet()
  useEffect(() => {
    const checkSession = async () => {
      const session = await sessionManager.checkSession()
      const hasWallet = await w.checkWallet()
      try {

        if (session.active && session.jwk) {
          // Use the encrypted password to unlock the wallet
          await w.unlockWallet(session.jwk, 'jwk')
          setView('dashboard')
        } else if (hasWallet) {
          setView('unlock')
        } else {
          setView('welcome')
        }
      } catch (error) {
        logger.error('Session check failed:', error)
        setView('welcome')
      }

      setLoading(false)
    }

    checkSession()
  }, [])


  // Handle successful wallet creation
  const handleWalletCreated = async (newWallet: any, jwk: JsonWebKey) => {
    try {
      setWallet(newWallet)
      setView('dashboard')
      //start session with the wallet password
      sessionManager.startSession(JSON.stringify(jwk), 100)
    } catch (error) {
      logger.error('App: Error handling wallet creation:', error)
    }
  }

  // Handle successful wallet unlock
  const handleWalletUnlocked = async (_, jwk: JsonWebKey) => {
    setView('dashboard')
    //encrypt the password with the mochimo_secret
    sessionManager.startSession(JSON.stringify(jwk), 100)
  }

  // Add handler for successful import
  const handleWalletImported = async (wallet: any, jwk: JsonWebKey) => {
    try {
      setWallet(wallet)
      setView('dashboard')
      //start session with the wallet password
      sessionManager.startSession(JSON.stringify(jwk), 100)
    } catch (error) {
      logger.error('Error handling wallet import:', error)
    }
  }


  switch (view) {
    case 'welcome':
      return (
        <WalletLayout>
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
              className="mb-8"
            >
              <Logo size="xl" animated className="text-primary" />
            </motion.div>
            <h2 className="text-2xl font-bold text-center mb-8">Welcome to Mochimo</h2>
            <div className="flex flex-col w-full max-w-xs gap-4">
              <Button
                className="w-full"
                size="lg"
                onClick={() => setView('create')}
              >
                <PlusCircle className="mr-2" />
                Create New Wallet
              </Button>
              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={() => setView('import')}
              >
                <Import className="mr-2" />
                Import From Mnemonic Phrase
              </Button>
              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={() => setView('import-json')}
              >
                <FileJson className="mr-2" />
                Import From Backup
              </Button>
            </div>
          </div>
        </WalletLayout>
      )

    case 'create':
      return (
        <WalletLayout>
          <CreateWallet onWalletCreated={handleWalletCreated} />
        </WalletLayout>
      )

    case 'unlock':
      return (
        <WalletLayout>
          <UnlockWallet onUnlock={handleWalletUnlocked} />
        </WalletLayout>
      )

    case 'dashboard':
      return (
        <WalletLayout
          showMenu
          sidebarOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <WalletDashboard
            wallet={wallet}
            sidebarOpen={sidebarOpen}
            onSidebarOpenChange={setSidebarOpen}
          />
        </WalletLayout>
      )

    case 'import':
      return (
        <WalletLayout>
          <ImportWallet
            onWalletImported={handleWalletImported}
            onBack={() => setView('welcome')}
          />
        </WalletLayout>
      )

    case 'import-json':
      return (
        <WalletLayout>
          <ImportJsonWallet 
            onWalletImported={handleWalletImported} 
            onBack={() => setView('welcome')} 
          />
        </WalletLayout>
      )

    default:
      return (
        <WalletLayout>
          <Loading />
        </WalletLayout>
      )
  }
}
