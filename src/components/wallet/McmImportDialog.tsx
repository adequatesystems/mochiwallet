import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Lock, CheckCircle2, AlertCircle, AlertTriangle, Loader2, Tag, User, Coins, Copy, Wallet } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DecodeResult, MCMDecoder, NetworkProvider, WOTSEntry } from 'mochimo-wallet'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useAccounts } from 'mochimo-wallet'
import { WotsAddress } from 'mochimo-wots'
import { log } from "@/lib/utils/logging"
const logger = log.getLogger("wallet-modal");

interface AccountValidation {
  isValid: boolean
  networkAddress?: string
  networkBalance?: string
  error?: string
  status: 'unavailable' | 'duplicate' | 'mismatch' | 'valid' | 'loading'
}

interface ValidatedAccount extends WOTSEntry {
  validation?: AccountValidation
  isLoading?: boolean
  tag: string
  originalIndex: number
}

const UNAVAILABLE_PREFIX = '420000000e00000001000000'

interface McmImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImportAccounts: (accounts: ValidatedAccount[], mcmData: DecodeResult) => Promise<void>
}

type ImportView = 'upload' | 'password' | 'select'

// Helper function to format MCM balance
const formatBalance = (balance: string) => {
  try {
    const num = BigInt(balance)
    const whole = num / BigInt(1e9)
    const fraction = num % BigInt(1e9)
    const fractionStr = fraction.toString().padStart(9, '0')
    return `${whole}.${fractionStr}`
  } catch (error) {
    return '0.000000000'
  }
}

export function McmImportDialog({
  isOpen,
  onClose,
  onImportAccounts
}: McmImportDialogProps) {
  const [view, setView] = useState<ImportView>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [accounts, setAccounts] = useState<ValidatedAccount[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const acc = useAccounts()
  const [validating, setValidating] = useState(false)
  const [mcmData, setMcmData] = useState<DecodeResult | null>(null)

  // Validate all accounts at once
  const validateAccounts = async (accountsToValidate: ValidatedAccount[]) => {
    setValidating(true)

    try {
      const validationResults = await Promise.all(
        accountsToValidate.map(async (account): Promise<ValidatedAccount> => {
  
          const v3addr = WotsAddress.wotsAddressFromBytes(Buffer.from(account.address, 'hex').subarray(0, 2144))
          const v3Tag = Buffer.from(v3addr.getTag()).toString('hex')
          const v3AddrHash = Buffer.from(v3addr.getAddress()).toString('hex').slice(-40)

          // Check if tag already exists in wallet
          const existingAccount = acc.accounts.find(a => a.tag === v3Tag)
          if (existingAccount) {
            return {
              ...account,
              validation: {
                isValid: false,
                status: 'duplicate',
                error: 'Account already exists in wallet'
              }
            }
          }
          //check if account has valid seed
          if(!account.secret || account.secret.length !== 32*2) {
            return {
              ...account,
              validation: {
                isValid: false,
                status: 'unavailable',
                error: 'Account has no valid secret'
              }
            }
          }

          try {
            // Validate against network
            const response = await NetworkProvider.getNetwork().resolveTag(Buffer.from(v3addr.getTag()).toString('hex'))
            // Extract first 20 bytes (tag) and last 20 bytes (addr hash) from consensus address
            const consensusTag = response.addressConsensus.slice(2, 42) // First 20 bytes (40 hex chars)
            const consensusAddrHash = response.addressConsensus.slice(42, 82) // Last 20 bytes (40 hex chars)
            logger.info("parts", { v2tag: account.tag, wots: account.address, consensusTag, consensusAddrHash, v3Tag, v3AddrHash })
            // Extract same parts from v3 address

            // Check if either part doesn't match
            if (consensusTag !== v3Tag || consensusAddrHash !== v3AddrHash) {

              return {
                ...account,
                validation: {
                  isValid: false,
                  status: 'mismatch',
                  networkAddress: response.addressConsensus,
                  networkBalance: response.balanceConsensus,
                  error: 'Address or tag mismatch with network'
                }
              }
            }

            return {
              ...account,
              validation: {
                isValid: true,
                status: 'valid',
                networkAddress: response.addressConsensus,
                networkBalance: response.balanceConsensus
              }
            }
          } catch (error) {
            logger.error("error", error, account.tag)
            return {
              ...account,
              validation: {
                isValid: false,
                status: 'mismatch',
                error: 'Failed to validate with network'
              }
            }
          }
        })
      )

      // Sort accounts - valid ones first, then invalid ones
      const sortedResults = validationResults.sort((a, b) => {
        if (a.validation?.isValid && !b.validation?.isValid) return -1
        if (!a.validation?.isValid && b.validation?.isValid) return 1
        return 0
      })

      setAccounts(sortedResults)
    } catch (error) {
      logger.error('Error during validation:', error)
      setError('Failed to validate accounts')
    } finally {
      setValidating(false)
    }
  }

  // Update the useEffect to use the new validation method
  useEffect(() => {
    if (view === 'select' && accounts.length > 0) {
      validateAccounts(accounts)
    }
  }, [view, accounts.length])

  const handleClose = () => {
    setView('upload')
    setSelectedFile(null)
    setPassword('')
    setAccounts([])
    setSelectedAccounts(new Set())
    setError(null)
    onClose()
  }

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    setView('password')
  }

  const handleDecodeFile = async () => {
    if (!selectedFile || !password) return

    try {
      setLoading(true)
      setError(null)

      const fileBuffer = await selectedFile.arrayBuffer()
      const decodedAccounts = await MCMDecoder.decode(Buffer.from(fileBuffer), password)
      console.log("decodedAccounts", decodedAccounts)
      setMcmData(decodedAccounts)
      // Map entries and add tag and original index
      const accountsWithTags = decodedAccounts.entries.map((entry, index) => ({
        ...entry,
        tag: entry.address.slice(-24),
        originalIndex: index
      }))

      setAccounts(accountsWithTags)
      setView('select')
    } catch (error) {
      logger.error('Error decoding MCM file:', error)
      setError('Invalid password or corrupted MCM file')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (selectedAccounts.size === 0) {
      setError('Please select at least one account')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const accountsToImport = accounts.filter(acc => selectedAccounts.has(acc.originalIndex))
      if (!mcmData) {
        throw new Error('No MCM data available')
      }
      await onImportAccounts(accountsToImport, mcmData)
      handleClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import accounts')
    } finally {
      setLoading(false)
    }
  }

  const toggleAccount = (originalIndex: number) => {
    const account = accounts.find(a => a.originalIndex === originalIndex)

    // Don't allow selection of invalid accounts
    if (!account?.validation?.isValid) {
      return
    }

    setSelectedAccounts(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(originalIndex)) {
        newSelected.delete(originalIndex)
      } else {
        newSelected.add(originalIndex)
      }
      return newSelected
    })
  }

  const getStatusBadge = (validation?: AccountValidation) => {
    if (!validation) return null

    const badges = {
      unavailable: {
        label: 'Unavailable',
        className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
        icon: AlertTriangle
      },
      duplicate: {
        label: 'Duplicate',
        className: 'bg-red-500/20 text-red-500 border-red-500/50',
        icon: AlertCircle
      },
      mismatch: {
        label: 'Invalid',
        className: 'bg-red-500/20 text-red-500 border-red-500/50',
        icon: AlertCircle
      },
      valid: {
        label: 'Valid',
        className: 'bg-green-500/20 text-green-500 border-green-500/50',
        icon: CheckCircle2
      },
      loading: {
        label: 'Validating...',
        className: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
        icon: Loader2
      }
    }

    const badge = badges[validation.status]
    const Icon = badge.icon

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Badge
              variant="outline"
              className={cn("flex items-center gap-1", badge.className)}
            >
              <Icon className="h-3 w-3" />
              {badge.label}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {validation.error || 'Account is valid'}
        </TooltipContent>
      </Tooltip>
    )
  }

  const renderAccountsList = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Available Accounts</Label>
        <p className="text-sm text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{selectedAccounts.size}</span> of {accounts.length}
        </p>
      </div>

      {validating ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-3 border rounded-lg bg-card">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Validating {accounts.length} accounts...
          </p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y max-h-[320px] overflow-y-auto bg-card">
          {accounts.map((account, index) => (
            <div
              key={`${account.address}-${account.originalIndex}`}
              className={cn(
                "flex items-start gap-3 p-4",
                account.validation?.isValid && "cursor-pointer hover:bg-secondary/50",
                selectedAccounts.has(account.originalIndex) && "bg-primary/10",
                !account.validation?.isValid && "opacity-75"
              )}
              onClick={(e) => {
                e.stopPropagation()
                if (account.validation?.isValid) {
                  toggleAccount(account.originalIndex)
                }
              }}
            >
              <div className="pt-1">
                {account.validation?.isValid && (
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    selectedAccounts.has(account.originalIndex)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground"
                  )}>
                    {selectedAccounts.has(account.originalIndex) && (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {account.name || 'NO NAME'}
                    </p>
                  </div>
                  {getStatusBadge(account.validation)}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" />
                      <span className="font-mono">{account.tag}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(account.tag)
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>

                  {account.validation?.networkBalance && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Coins className="h-3.5 w-3.5" />
                      <span className="font-mono">
                        {formatBalance(account.validation.networkBalance)} MCM
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!loading && password.trim()) {
      handleDecodeFile()
    }
  }

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-[340px] p-4">
          <DialogHeader>
            <DialogTitle>Import MCM Wallet</DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {view === 'upload' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 py-2"
              >
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".mcm"
                    className="hidden"
                    id="mcm-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileSelect(file)
                    }}
                  />
                  <label
                    htmlFor="mcm-file"
                    className={cn(
                      "cursor-pointer flex flex-col items-center gap-3",
                      "text-sm text-muted-foreground hover:text-foreground transition-colors"
                    )}
                  >
                    <Upload className="h-8 w-8" />
                    <div>
                      <p className="font-medium text-foreground">Click to select MCM file</p>
                      <p className="text-xs mt-1">or drag and drop</p>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}

            {view === 'password' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 py-2"
              >
                <form onSubmit={handleFormSubmit}>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Enter MCM Password
                    </Label>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => {
                        setError(null)
                        setPassword(e.target.value)
                      }}
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-red-500">
                      <AlertTriangle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  <div className="flex justify-between mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setView('select')
                        setPassword('')
                        setError(null)
                      }}
                      disabled={loading}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || !password.trim()}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Decoding...
                        </>
                      ) : (
                        'Decode'
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {view === 'select' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 py-2"
              >
                {renderAccountsList()}

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setView('password')}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={loading || selectedAccounts.size === 0}
                  >
                    {loading ? 'Importing...' : 'Import Selected'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
} 