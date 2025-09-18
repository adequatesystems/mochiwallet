import { AddressInput } from "@/components/ui/address-input"
import { AmountInput } from "@/components/ui/amount-input"
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { log } from "@/lib/utils/logging"
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Copy, Info, Loader2, XCircle } from 'lucide-react'
import { isValidMemo } from "mochimo-mesh-api-client"
import { useAccounts, useTransaction, useWallet } from 'mochimo-wallet'
import { TagUtils } from 'mochimo-wots'
import { useEffect, useState } from 'react'
import { AccountAvatar } from '../ui/account-avatar'

interface SendModalProps {
  isOpen: boolean
  onClose: () => void
  onTransactionSent?: () => void // Callback when transaction is sent successfully
}
const logger = log.getLogger("wallet-send");

type Step = 'details' | 'confirm' | 'success'

interface TransactionDetails {
  amount: bigint
  fee: bigint
  total: bigint
  change: bigint
}

export function SendModal({ isOpen, onClose, onTransactionSent }: SendModalProps) {
  const [step, setStep] = useState<Step>('details')
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState<{ txid: string } | null>(null)
  const [showAddressCommand, setShowAddressCommand] = useState(false)
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [fee, setFee] = useState("500") // 500 nano MCM default
  const [amountError, setAmountError] = useState<string | null>(null)
  const [destinationError, setDestinationError] = useState<string | null>(null)
  const [memo, setMemo] = useState("")
  const [memoError, setMemoError] = useState<string | null>(null)

  const w = useWallet()
  const acc = useAccounts()
  const tx = useTransaction()

  // Add reset function
  const resetModal = () => {
    setDestination('')
    setAmount('')
    setMemo('')
    setError(null)
    setSuccess(null)
    setStep('details')
    setShowAdvanced(false)
    setFee('500')
    setAmountError(null)
    setDestinationError(null)
    setMemoError(null)
    setTransactionDetails(null)
  }

  // Reset when selected account changes
  useEffect(() => {
    resetModal()
  }, [acc.selectedAccount])

  // Add click outside handler for command
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const commandElement = document.getElementById('address-command')
      if (showAddressCommand &&
        commandElement &&
        !commandElement.contains(event.target as Node)) {
        setShowAddressCommand(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAddressCommand])

  // Calculate max amount user can send
  const getMaxAmount = () => {
    if (!currentAccount?.balance) return "0"
    const balance = BigInt(currentAccount.balance)
    const feeAmount = BigInt(fee)

    if (balance <= feeAmount) return "0"

    // Calculate the maximum amount in nano MCM first
    const maxNano = balance - feeAmount

    // Convert to MCM with proper decimal places
    const mcmWhole = maxNano / BigInt(1e9)
    const mcmDecimal = (maxNano % BigInt(1e9)).toString().padStart(9, '0')

    return `${mcmWhole}.${mcmDecimal}`
  }

  const handleMax = () => {
    setAmount(getMaxAmount())
    setAmountError(null) // Clear any existing errors
  }

  const validateAmount = (value: string) => {
    if (!value) return null

    try {
      const amountBigInt = BigInt(Math.floor(parseFloat(value) * 1e9))
      const feeAmount = BigInt(fee)
      const total = amountBigInt + feeAmount

      const balance = BigInt(currentAccount?.balance || '0')

      if (total > balance) {
        return 'Insufficient balance for amount + fee'
      }

      return null
    } catch (error) {
      return 'Invalid amount'
    }
  }

  const handleAmountBlur = (value: string) => {
    const error = validateAmount(value)
    setAmountError(error)
  }

  const validateMemo = (value: string) => {
    const trimmedValue = value.trim()

    if (!trimmedValue) return null

    if (!isValidMemo(trimmedValue)) {
      return 'Invalid memo format. Please refer to the memo format guidelines by hovering over the info icon.'
    }

    return null
  }

  const handleMemoBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim()

    if (trimmedValue !== e.target.value) {
      setMemo(trimmedValue)
    }

    const error = validateMemo(trimmedValue)
    setMemoError(error)
  }

  const validateDestination = (value: string) => {
    const trimmedValue = value.trim()
    const isValidLength = trimmedValue.length >= 22 && trimmedValue.length <= 31
    if (!trimmedValue) {
      return 'Destination is required'
    }

    if (!isValidLength) {
      return 'Tag must be between 22 and 31 characters'
    }

    if (!TagUtils.validateBase58Tag(trimmedValue)) {
      return 'Invalid tag format'
    }

    if (trimmedValue === currentAccountBase58) {
      return 'Cannot send to the same account'
    }

    return null
  }

  const handleNext = async () => {
    try {
      if (!destination || !amount) {
        throw new Error('Please fill in all fields')
      }

      if (!TagUtils.validateBase58Tag(destination)) {
        throw new Error('Invalid recipient tag')
      }

      const error = validateAmount(amount)
      if (error) {
        throw new Error(error)
      }

      if (memo && !isValidMemo(memo)) {
        throw new Error('Invalid memo format')
      }

      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e9))
      const feeAmount = BigInt(fee) // Use custom fee
      const total = amountBigInt + feeAmount

      const balance = BigInt(currentAccount?.balance || '0')
      const change = balance - total

      if (change < 0n) {
        throw new Error('Insufficient balance')
      }

      setTransactionDetails({
        amount: amountBigInt,
        fee: feeAmount,
        total,
        change
      })
      setStep('confirm')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid input')
    }
  }

  const handleBack = () => {
    setStep('details')
    setError(null)
  }

  const handleSend = async () => {
    const currAccount = acc.accounts.find(a => a.tag === acc.selectedAccount!)
    if (!currAccount) {
      throw new Error('Current account not found')
    }
    try {
      setError(null)
      setSending(true)

      const recipientTagBytes = TagUtils.base58ToAddrTag(destination)
      if (!recipientTagBytes) {
        throw new Error('Invalid recipient tag')
      }
      const recipientTagHex = Buffer.from(recipientTagBytes).toString('hex')

      const result = await tx.sendTransaction(
        recipientTagHex,
        BigInt(transactionDetails!.amount),
        memo || undefined // Only include memo if it's not empty
      )

      if (result) {
        await acc.updateAccount(acc.selectedAccount!, { wotsIndex: currAccount.wotsIndex + 1 })
        setSuccess({ txid: result })
        setStep('success')
        // Call the refresh callback to update the transaction list
        if (onTransactionSent) {
          onTransactionSent()
        }
      } else {
        throw new Error(result || 'Transaction failed')
      }
    } catch (error) {
      logger.error('Send error:', error)
      setError(error instanceof Error ? error.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    if (!sending) {
      resetModal()
      onClose()
    }
  }

  const accounts = Object.values(acc.accounts)
    .filter(a => a.tag !== acc.selectedAccount)
    .map(account => ({
      ...account,
      base58Tag: TagUtils.addrTagToBase58(Buffer.from(account.tag, 'hex'))
    }))

  const formatMCM = (amount: bigint) => {
    return `${amount / BigInt(1e9)}.${(amount % BigInt(1e9)).toString().padStart(9, '0')} MCM`
  }

  const addressOptions = accounts.map(account => ({
    value: account.base58Tag!,
    label: account.name,
    tag: account.tag,
    emoji: account.avatar,
    description: `${account.base58Tag!.slice(0, 8)}...${account.base58Tag!.slice(-8)}`
  }))

  const currentAccount = acc.accounts.find(a => a.tag === acc.selectedAccount)
  const currentAccountBase58 = currentAccount
    ? TagUtils.addrTagToBase58(Buffer.from(currentAccount.tag, 'hex'))
    : null

  const formatBalance = (balance: string | null) => {
    if (!balance) return '0.000000000'
    return `${BigInt(balance) / BigInt(1e9)}.${(BigInt(balance) % BigInt(1e9)).toString().padStart(9, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-full h-[100vh] flex flex-col p-0 gap-0 dialog-content">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3 flex-1">
            {step !== 'details' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleBack}
                disabled={sending}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-lg font-semibold flex-1 text-center">Send MCM</h2>
            <div className="w-8" /> {/* Spacer to center the title */}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="w-full">
            <AnimatePresence mode="wait">
              {step === 'details' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* From Account Card */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {currentAccount && (
                        <AccountAvatar
                          name={currentAccount.name}
                          tag={currentAccount.tag}
                          emoji={currentAccount.avatar}
                          className="h-8 w-8"
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          From: {currentAccount?.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {currentAccountBase58?.slice(0, 8)}...{currentAccountBase58?.slice(-8)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm px-1">
                      <span className="text-muted-foreground">Available Balance:</span>
                      <span className="font-mono">
                        {formatBalance(currentAccount?.balance || '0')} MCM
                      </span>
                    </div>
                  </div>

                  {/* Destination field */}
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <AddressInput
                      value={destination}
                      onChange={(value) => {
                        setDestination(value)
                        setDestinationError(null)
                      }}
                      onBlur={(value) => {
                        const error = validateDestination(value)
                        setDestinationError(error)
                      }}
                      options={addressOptions}
                      placeholder="Enter destination tag"
                      error={!!destinationError}
                      onErrorChange={(hasError) => {
                        if (!hasError) {
                          setDestinationError(null)
                        }
                      }}
                    />
                    {destinationError && (
                      <p className="text-sm text-destructive">
                        {destinationError}
                      </p>
                    )}
                  </div>

                  {/* Amount field */}
                  <div className="space-y-2">
                    <Label>Amount (MCM)</Label>
                    <AmountInput
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value)
                        setAmountError(null) // Clear error when typing
                      }}
                      onAmountBlur={handleAmountBlur}
                      onMax={handleMax}
                      placeholder="0.000000000"
                      min="0"
                      step="0.000000001"
                      error={!!amountError}
                    />
                    {amountError && (
                      <p className="text-sm text-destructive">
                        {amountError}
                      </p>
                    )}
                  </div>

                  {/* Memo field */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Memo</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent align="start" className="max-w-[280px] p-4">
                            <div className="space-y-4">
                              {/* Title */}
                              <div>
                                <h4 className="font-medium text-sm mb-2">Memo Format Rules</h4>
                                <ul className="space-y-2">
                                  <li className="flex gap-2 text-xs text-popover-foreground/80">
                                    <span className="text-primary">•</span>
                                    <span>Use A-Z, 0-9, and hyphens only</span>
                                  </li>
                                  <li className="flex gap-2 text-xs text-popover-foreground/80">
                                    <span className="text-primary">•</span>
                                    <span>Each group: all letters or all numbers</span>
                                  </li>
                                  <li className="flex gap-2 text-xs text-popover-foreground/80">
                                    <span className="text-primary">•</span>
                                    <span>Use hyphens between different types</span>
                                  </li>
                                  <li className="flex gap-2 text-xs text-popover-foreground/80">
                                    <span className="text-primary">•</span>
                                    <span>No consecutive letter or number groups</span>
                                  </li>
                                  <li className="flex gap-2 text-xs text-popover-foreground/80">
                                    <span className="text-primary">•</span>
                                    <span>Cannot start/end with hyphen</span>
                                  </li>
                                </ul>
                              </div>

                              {/* Examples */}
                              <div className="space-y-2">
                                <div className="bg-popover-foreground/5 rounded-md p-2">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                                    <span className="text-xs">
                                      <span className="font-medium">Valid:</span>
                                      {" "}
                                      <code className="text-popover-foreground/80">ABC-123, XY-12-Z</code>
                                    </span>
                                  </div>
                                </div>
                                <div className="bg-popover-foreground/5 rounded-md p-2">
                                  <div className="flex items-center gap-1.5">
                                    <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                    <span className="text-xs">
                                      <span className="font-medium">Invalid:</span>
                                      {" "}
                                      <code className="text-popover-foreground/80">AB-CD, 12-34, -ABC</code>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      value={memo}
                      onChange={(e) => {
                        setMemo(e.target.value)
                        setMemoError(null)
                      }}
                      onBlur={handleMemoBlur}
                      placeholder="Optional memo"
                      className={cn(
                        memoError && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {memoError && (
                      <p className="text-sm text-destructive">
                        {memoError}
                      </p>
                    )}
                  </div>

                  {/* Add Advanced Settings */}
                  <Collapsible
                    open={showAdvanced}
                    onOpenChange={setShowAdvanced}
                    className="space-y-2"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 p-0 h-auto font-normal"
                      >
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform",
                          showAdvanced && "transform rotate-180"
                        )} />
                        <span className="text-sm">Advanced Settings</span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>
                          Network Fee (nano MCM)
                          <span className="text-xs text-muted-foreground ml-2">
                            Default: 500
                          </span>
                        </Label>
                        <Input
                          type="number"
                          value={fee}
                          onChange={(e) => setFee(e.target.value)}
                          placeholder="500"
                          min="500"
                          step="1"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              )}

              {step === 'confirm' && transactionDetails && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {/* Sender */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Sender</p>
                    <div className="rounded-xl bg-muted/30 border border-border/40 p-4">
                      <div className="flex items-center gap-3">
                        <AccountAvatar
                          name={currentAccount?.name || 'Account'}
                          tag={currentAccount?.tag || ''}
                          emoji={currentAccount?.avatar}
                          className="h-8 w-8"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{currentAccount?.name || 'Account'}</p>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-mono text-muted-foreground truncate" title={currentAccountBase58 || ''}>{currentAccountBase58}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => currentAccountBase58 && navigator.clipboard.writeText(currentAccountBase58)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recipient */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Recipient</p>
                    <div className="rounded-xl bg-muted/30 border border-border/40 p-4">
                      <div className="flex items-center gap-3">
                        <AccountAvatar
                          name={addressOptions.find(opt => opt.value === destination)?.label || 'Recipient'}
                          tag={addressOptions.find(opt => opt.value === destination)?.tag || ''}
                          emoji={addressOptions.find(opt => opt.value === destination)?.emoji}
                          className="h-8 w-8"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {addressOptions.find(opt => opt.value === destination)?.label || 'External Address'}
                          </p>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <span className="text-xs font-mono text-muted-foreground truncate" title={destination}>{destination}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => navigator.clipboard.writeText(destination)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Transaction Details</p>
                    <div className="rounded-xl bg-muted/30 border border-border/40 p-4">
                      <div className="space-y-3">
                        <div className="flex items-center text-sm">
                          <span className="text-sm">Amount</span>
                          <span className="ml-auto font-mono tabular-nums">{formatBalance(transactionDetails?.amount.toString())} MCM</span>
                        </div>
                        <div className="h-px bg-border/40" />
                        <div className="flex items-center text-sm">
                          <span className="text-sm">Network Fee</span>
                          <span className="ml-auto font-mono tabular-nums text-muted-foreground">{formatBalance(transactionDetails?.fee.toString())} MCM</span>
                        </div>
                        <div className="h-px bg-border/40" />
                        <div className="flex items-center text-sm">
                          <span className="text-sm">Total</span>
                          <span className="ml-auto font-mono tabular-nums">{formatBalance(transactionDetails?.total.toString())} MCM</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <span className="text-sm">Remaining</span>
                          <span className="ml-auto font-mono tabular-nums text-muted-foreground">{formatBalance(transactionDetails?.change.toString())} MCM</span>
                        </div>
                        {memo && (
                          <>
                            <div className="h-px bg-border/40" />
                            <div className="flex items-center text-sm">
                              <span className="text-sm">Memo</span>
                              <span className="ml-auto font-mono tabular-nums">{memo}</span>
                              </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'success' && success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-8 px-4"
                >
                  <div className="h-12 w-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold">Transaction Sent!</h3>
                    <p className="text-sm text-muted-foreground">
                      Your transaction has been successfully broadcast to the network
                    </p>
                    <div className="flex flex-col items-center gap-2">
                      <code className="px-2 py-1 bg-muted rounded text-xs break-all max-w-full">
                        {success.txid}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => navigator.clipboard.writeText(success.txid)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Transaction ID
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-3">
          <div className="w-full flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={sending}
            >
              Cancel
            </Button>

            {step === 'details' && (
              <Button
                onClick={handleNext}
                disabled={!destination || !amount || !!destinationError || !!amountError || !!memoError}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {step === 'confirm' && (
              <Button
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Confirm & Send'
                )}
              </Button>
            )}

            {step === 'success' && (
              <Button
                onClick={handleClose}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 