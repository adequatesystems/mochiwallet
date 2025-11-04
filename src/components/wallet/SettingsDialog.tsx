import { useTheme } from '@/components/theme-provider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { sessionManager } from '@/lib/services/SessionManager'
import { log } from "@/lib/utils/logging"
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  CircleCheckBig,
  CircleX,
  Download,
  Key,
  Loader2,
  Lock,
  LogOut,
  Monitor,
  Moon,
  RotateCw,
  Sun,
  Trash2
} from 'lucide-react'
import { addCustomProvider, applyActiveNetworkInstance, checkServiceHealth, removeProvider, setActiveProvider, StorageProvider, useActiveProvider, useProviderBucket, useWallet } from 'mochimo-wallet'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { version } from '../../../package.json'
const logger = log.getLogger("wallet-settings");

type Theme = 'dark' | 'light' | 'system'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

const FEATURE_FLAG_RECOVERY_PHRASE = false
export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [exportPassword, setExportPassword] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)
  const { theme, setTheme } = useTheme() as {
    theme: Theme,
    setTheme: (theme: Theme) => void
  }
  const wallet = useWallet()
  const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false)
  const [recoveryPassword, setRecoveryPassword] = useState('')
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false)
  const [recoveryPhrase, setRecoveryPhrase] = useState('')

  // Network providers (Mesh)
  const dispatch = useDispatch()
  const meshBucket = useProviderBucket('mesh')
  const activeMesh = useActiveProvider('mesh')
  const [customApiUrl, setCustomApiUrl] = useState('')
  const [customName, setCustomName] = useState('Custom Mesh API')
  const [health, setHealth] = useState<Record<string, { status: 'loading' | 'ok' | 'error', latencyMs?: number }>>({})

  const runHealthCheck = async (id: string, apiUrl: string, name: string, isCustom?: boolean) => {
    setHealth(prev => ({ ...prev, [id]: { status: 'loading' } }))
    try {
      const res = await checkServiceHealth({ id, name, kind: 'mesh', apiUrl, isCustom: !!isCustom }, 4000)
      setHealth(prev => ({ ...prev, [id]: { status: res.ok ? 'ok' : 'error', latencyMs: res.latencyMs } }))
    } catch {
      setHealth(prev => ({ ...prev, [id]: { status: 'error' } }))
    }
  }

  // Auto-check health when list changes or dialog opens
  useEffect(() => {
    if (!isOpen) return
    meshBucket.items.forEach(item => {
      void runHealthCheck(item.id, item.apiUrl, item.name, item.isCustom)
    })
  }, [isOpen, meshBucket.items])

  const handleSelectMesh = async (id: string) => {
    dispatch(setActiveProvider({ kind: 'mesh', id }) as any)
    await (dispatch(applyActiveNetworkInstance() as any) as any)
  }

  const handleAddCustomMesh = async () => {
    const url = customApiUrl.trim()
    if (!url) return
    dispatch(addCustomProvider({ kind: 'mesh', name: customName || 'Custom Mesh API', apiUrl: url }) as any)
    setCustomApiUrl('')
  }

  const handleRemoveMesh = (id: string) => {
    dispatch(removeProvider({ kind: 'mesh', id }) as any)
  }

  const handleLogout = async () => {
    try {
      await wallet.lockWallet()
      await StorageProvider.getStorage().clear()
      await sessionManager.endSession()
      window.location.reload()
    } catch (error) {
      logger.error('Error logging out:', error)
    }
  }

  const handleExportWallet = async () => {
    try {
      // Verify password before export
      const isVerified = await wallet.verifyWalletOwnership(exportPassword)
      if (!isVerified) {
        setExportError('Invalid password')
        return
      }

      // Get wallet data
      const walletData = await wallet.exportWalletJSON(exportPassword)

      // Create and download file
      const blob = new Blob([JSON.stringify(walletData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mochimo-wallet-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Reset state
      setShowExportConfirm(false)
      setExportPassword('')
      setExportError(null)
    } catch (error) {
      setExportError('Failed to export wallet')
      logger.error('Export error:', error)
    }
  }

  const handleShowRecovery = async () => {
    try {
      const isVerified = await wallet.verifyWalletOwnership(recoveryPassword)
      if (!isVerified) {
        setRecoveryError('Invalid password')
        return
      }

      const mnemonic = await wallet.getMnemonic(recoveryPassword)
      if (mnemonic) {
        setRecoveryPhrase(mnemonic)
        setShowRecoveryPhrase(true)
      } else {
        setRecoveryError('Failed to get recovery phrase')
      }
    } catch (error) {
      logger.error('Error showing recovery phrase:', error)
      setRecoveryError('Failed to verify password')
    }
  }

  if (!isOpen) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="absolute inset-0 bg-background z-50 h-full w-full overflow-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-[51] border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4 gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
        </div>

        {/* Content */}
        <div className="container max-w-2xl mx-auto p-6 space-y-8">
          {/* Network Settings */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Network</h2>
            <p className="text-sm text-muted-foreground">Select your Mesh API endpoint or add a custom one</p>

            {/* Active info */}
            <div className="rounded-lg border border-border/50 bg-card/50 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Active Mesh</span>
                <span className="font-medium truncate max-w-[60%]" title={activeMesh?.apiUrl}>{activeMesh?.name || '—'}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate" title={activeMesh?.apiUrl}>{activeMesh?.apiUrl || '—'}</div>
            </div>

            {/* List providers (contained scroll) */}
            <div className="rounded-md border border-border/50 overflow-hidden">
              <div className="max-h-60 overflow-y-auto divide-y divide-border/50">
                {meshBucket.items.map(item => (
                  <div key={item.id} className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        className="flex items-start text-left gap-3 flex-1"
                        onClick={() => handleSelectMesh(item.id)}
                      >
                        <div className={`mt-0.5 h-3 w-3 rounded-full border ${meshBucket.activeId === item.id ? 'bg-primary border-primary' : 'border-border'}`} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{item.name}</div>
                          <div className="mt-1 flex items-center gap-2 min-w-0">
                            {/* Inline health badge below title, before URL */}
                            {health[item.id]?.status === 'loading' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="h-4 px-1.5 py-0 text-[10px] leading-none bg-muted text-muted-foreground">
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Checking
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Checking health…</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {health[item.id]?.status === 'ok' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="h-4 px-1.5 py-0 text-[10px] leading-none bg-green-500/10 text-green-600 border-green-500/20">
                                    <CircleCheckBig className="h-3 w-3 mr-1" />
                                    {(health[item.id]?.latencyMs ?? 0)}ms
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Healthy • {(health[item.id]?.latencyMs ?? 0)}ms</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {health[item.id]?.status === 'error' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="h-4 px-1.5 py-0 text-[10px] leading-none bg-red-500/10 text-red-600 border-red-500/20">
                                    <CircleX className="h-3 w-3 mr-1" />
                                    Down
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Unavailable</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {!health[item.id] && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className="h-4 px-1.5 py-0 text-[10px] leading-none bg-muted text-muted-foreground">—</Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Unknown</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate" title={item.apiUrl}>{item.apiUrl}</div>
                        </div>
                      </button>
                      <Button title="Check health" variant="ghost" size="icon" className="shrink-0"
                        onClick={() => runHealthCheck(item.id, item.apiUrl, item.name, item.isCustom)}>
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1.5">
                      {item.isCustom && (
                        <Button title="Remove" variant="ghost" size="icon" onClick={() => handleRemoveMesh(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add custom */}
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-1 gap-2">
                <Input
                  placeholder="Custom name (optional)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <Input
                  placeholder="https://your-mesh-api"
                  value={customApiUrl}
                  onChange={(e) => setCustomApiUrl(e.target.value)}
                />
                <Button onClick={handleAddCustomMesh} disabled={!customApiUrl.trim()}>
                  Add Endpoint
                </Button>
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Appearance</h2>
            <p className="text-sm text-muted-foreground">
              Customize how Mochimo Wallet looks on your device
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => setTheme('light')}
              >
                <Sun className="h-5 w-5" />
                <span className="text-sm">Light</span>
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-5 w-5" />
                <span className="text-sm">Dark</span>
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => setTheme('system')}
              >
                <Monitor className="h-5 w-5" />
                <span className="text-sm">System</span>
              </Button>
            </div>
          </div>

          {/* Export Wallet */}
          <div className="space-y-3 pt-4">
            <h2 className="text-lg font-semibold">Backup</h2>
            <p className="text-sm text-muted-foreground">
              Export your wallet data
            </p>
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowExportConfirm(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Wallet
              </Button>
            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-3 pt-4">
            <h2 className="text-lg font-semibold">Security</h2>
            <p className="text-sm text-muted-foreground">
              Manage your wallet security settings
            </p>
            <div className="space-y-4">
              {FEATURE_FLAG_RECOVERY_PHRASE && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowRecoveryConfirm(true)}
              >
                <Key className="h-4 w-4 mr-2" />
                  Show Recovery Phrase
                </Button>
              )}
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Reset Wallet
              </Button>
            </div>
          </div>


          {/* Version Info */}
          <div className="pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Version {version}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all wallet data. You will need your recovery phrase to restore access.
              Make sure you have backed up your recovery phrase before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLogoutConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleLogout}
            >
              Reset Wallet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Confirmation Dialog */}
      <AlertDialog open={showExportConfirm} onOpenChange={setShowExportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your password to export your wallet data. Keep this file safe and secure.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter your password"
                value={exportPassword}
                onChange={(e) => {
                  setExportPassword(e.target.value)
                  setExportError(null)
                }}
              />
            </div>

            {exportError && (
              <p className="text-sm text-destructive">{exportError}</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setExportPassword('')
              setExportError(null)
              setShowExportConfirm(false)
            }}>
              Cancel
            </AlertDialogCancel>
            <Button onClick={handleExportWallet}>
              Export
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recovery Phrase Confirmation Dialog */}
      <AlertDialog open={showRecoveryConfirm} onOpenChange={(open) => {
        setShowRecoveryConfirm(open)
        if (!open) {
          setRecoveryPassword('')
          setRecoveryError(null)
          setShowRecoveryPhrase(false)
          setRecoveryPhrase('')
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Show Recovery Phrase</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your password to view your recovery phrase. Keep this phrase safe and never share it with anyone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {!showRecoveryPhrase ? (
            <div className="space-y-4 py-4">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  className="pl-9 pr-3"
                  placeholder="Enter your password"
                  value={recoveryPassword}
                  onChange={(e) => {
                    setRecoveryPassword(e.target.value)
                    setRecoveryError(null)
                  }}
                />
              </div>

              {recoveryError && (
                <p className="text-sm text-destructive">{recoveryError}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <code className="text-xs break-all">{recoveryPhrase}</code>
              </div>
              <p className="text-sm text-muted-foreground">
                Write this phrase down and store it in a safe place. You'll need it to restore your wallet if you reset it.
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRecoveryPassword('')
              setRecoveryError(null)
              setShowRecoveryPhrase(false)
              setRecoveryPhrase('')
              setShowRecoveryConfirm(false)
            }}>
              Close
            </AlertDialogCancel>
            {!showRecoveryPhrase && (
              <Button onClick={handleShowRecovery}>
                Show Phrase
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 