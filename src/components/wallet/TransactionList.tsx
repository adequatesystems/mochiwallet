import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { Logo } from '@/components/ui/logo'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { useAccountActivity, useAccounts } from 'mochimo-wallet'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

interface TransactionListProps {
  account: any // Account type from mochimo-wallet
  className?: string
  showAll?: boolean // Whether to show all transactions or just recent ones
}

export interface TransactionListRef {
  refresh: () => void
  loadMore: () => void
}

export const TransactionList = forwardRef<TransactionListRef, TransactionListProps>(
  ({ account, className, showAll = false }, ref) => {
    const [expandedTx, setExpandedTx] = useState<string | null>(null)
    const [copiedTxId, setCopiedTxId] = useState<string | null>(null)
    const [drawerTxId, setDrawerTxId] = useState<string | null>(null)
    const [isAccountSwitching, setIsAccountSwitching] = useState(false)

    const {
      transactions,
      isLoading,
      error,
      hasMore,
      loadMoreAccountActivity,
      fetchAccountActivity,
      sendTransactions,
      receiveTransactions,
      pendingTransactions,
      confirmedTransactions,
      stats
    } = useAccountActivity(account)

    // For infinite scroll, we'll use the account-specific data with a higher limit
    const infiniteTransactions = transactions
    const infiniteLoading = isLoading
    const infiniteHasMore = hasMore
    const infiniteLoadMore = loadMoreAccountActivity

    const { accounts } = useAccounts()

  // Build recent view: all pending + top 3 confirmed (sorted desc)
  const recentCombined = (() => {
    const sortDesc = (a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0)
    const top3Confirmed = confirmedTransactions.slice(0, 3)
    return [...pendingTransactions, ...top3Confirmed].sort(sortDesc)
  })()

  // Determine which data source to use based on showAll prop
  const displayTransactions = showAll ? infiniteTransactions : recentCombined
  const displayIsLoading = showAll ? infiniteLoading : isLoading
  const displayHasMore = showAll ? infiniteHasMore : false
  const displayError = error // Use the same error for both views

  // Expose refresh and loadMore methods to parent
  useImperativeHandle(ref, () => ({
    refresh: () => {
      if (!account) return Promise.resolve()
      const base = { includeMempool: true, includeConfirmed: true, offset: 0 }
      return fetchAccountActivity({ ...base, limit: showAll ? 20 : 3 })
    },
    loadMore: () => {
      if (!account) return Promise.resolve()
      return loadMoreAccountActivity({ limit: 20, includeMempool: false })
    }
  }), [account, fetchAccountActivity, loadMoreAccountActivity, showAll])

  // Track account changes for loading state
  useEffect(() => {
    if (account) {
      setIsAccountSwitching(true)
      // Clear the loading state after a short delay to allow for data loading
      const timer = setTimeout(() => {
        setIsAccountSwitching(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [account?.tag])

  // Load initial data
  // - Account view: always fetch pending + top 3 confirmed
  // - Drawer (showAll): only fetch if we have no data yet; do not reset appended pages
  useEffect(() => {
    if (!account) return
    if (showAll) {
      if (infiniteTransactions.length === 0) {
        fetchAccountActivity({ limit: 20, includeMempool: true, includeConfirmed: true, offset: 0 })
      }
    } else {
      fetchAccountActivity({ limit: 3, includeMempool: true, includeConfirmed: true, offset: 0 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.tag, showAll])

    const handleCopyTxId = async (txId: string) => {
      try {
        await navigator.clipboard.writeText(txId)
        setCopiedTxId(txId)
        setTimeout(() => setCopiedTxId(null), 2000)
      } catch (err) {
        console.error('Failed to copy transaction ID:', err)
      }
    }

    const handleViewInMochiScan = (txId: string) => {
      const mochiscanUrl = `https://mochiscan.org/tx/${txId}`
      window.open(mochiscanUrl, '_blank', 'noopener,noreferrer')
    }

    const copyAddress = async (address: string) => {
      try {
        await navigator.clipboard.writeText(address)
        // You could add a separate state for address copying if needed
      } catch (err) {
        console.error('Failed to copy address:', err)
      }
    }


    // Returns full 9-decimal MCM string (e.g., 2500.000000000)
    const formatAmountFull = (amount: string) => {
      const value = BigInt(amount)
      const billion = BigInt(1e9)
      const whole = value / billion
      const fraction = value % billion
      const formattedWhole = new Intl.NumberFormat('en-US').format(Number(whole))
      return `${formattedWhole}.${fraction.toString().padStart(9, '0')}`
    }

    // Returns human-friendly MCM string with trimmed fraction and thousand separators
    const formatAmountShort = (amount: string, maxFractionDigits: number = 6) => {
      const value = BigInt(amount)
      const billion = BigInt(1e9)
      const whole = value / billion
      const fraction = (value % billion).toString().padStart(9, '0')
      const trimmedFraction = fraction
        .slice(0, Math.min(maxFractionDigits, 9))
        .replace(/0+$/, '')
      const formattedWhole = new Intl.NumberFormat('en-US').format(Number(whole))
      return trimmedFraction.length > 0
        ? `${formattedWhole}.${trimmedFraction}`
        : formattedWhole
    }

    const getTransactionAvatar = (type: string, pending: boolean) => {
      let bg = 'bg-gray-500/10'
      let color = 'text-gray-500'
      let Icon: any = AlertCircle

      if (pending) {
        bg = 'bg-yellow-500/10'; color = 'text-yellow-600'; Icon = Clock
      } else {
        switch (type) {
          case 'send':
            bg = 'bg-red-500/10'; color = 'text-red-600'; Icon = ArrowUpRight; break
          case 'receive':
            bg = 'bg-green-500/10'; color = 'text-green-600'; Icon = ArrowDownLeft; break
          case 'mining':
            bg = 'bg-blue-500/10'; color = 'text-blue-600'; Icon = CheckCircle; break
        }
      }

      return (
        <div className="relative">
      
          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${bg}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        {/* Status Badge Overlay */}
        <div className="absolute -top-1 -right-1 z-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={pending ? 'Pending' : 'Confirmed'}
                className={cn(
                  "h-4 w-4 p-0 rounded-full flex items-center justify-center cursor-default",
                  pending ? "bg-yellow-500 text-yellow-900" : "bg-green-500 text-white"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {pending ? (
                  <Clock className="h-2.5 w-2.5" />
                ) : (
                  <CheckCircle className="h-2.5 w-2.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{pending ? "Pending" : "Confirmed"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        </div>
      )
    }

    const getTransactionColor = (type: string, pending: boolean) => {
      if (pending) return 'text-yellow-600'

      switch (type) {
        case 'send':
          return 'text-red-600'
        case 'receive':
          return 'text-green-600'
        case 'mining':
          return 'text-blue-600'
        default:
          return 'text-gray-600'
      }
    }

    const getStatusBadge = (pending: boolean, blockNumber?: number) => {
      if (pending) {
        return (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-medium">
            <Clock className="h-2.5 w-2.5" />
            <span>Pending</span>
          </div>
        )
      }

      return (
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
          <CheckCircle className="h-2.5 w-2.5" />
          <span>Confirmed</span>
        </div>
      )
    }

    const getTitle = (type: string) => {
      switch (type) {
        case 'send':
          return 'Sent'
        case 'receive':
          return 'Received'
        case 'mining':
          return 'Mining Reward'
        default:
          return 'Activity'
      }
    }

    const getSubtitle = (type: string, address?: string) => {
      if (!address) return ''
      const short = `${address.slice(0, 6)}...${address.slice(-4)}`
      if (type === 'send') return `To ${short}`
      if (type === 'receive') return `From ${short}`
      return short
    }

    const getAccountByAddress = (address: string) => {
      return Object.values(accounts).find(acc =>
        acc.faddress === address || acc.tag === address || `0x${acc.tag}` === address
      )
    }

    const getInternalTransferInfo = (type: string, address?: string) => {
      if (!address) return null
      const account = getAccountByAddress(address)
      if (!account) return null

      return {
        name: account.name || `Account ${account.index}`,
        address: account.faddress,
        isInternal: true
      }
    }

  // Show skeleton when switching accounts
  if (isAccountSwitching) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-card border border-border/50 rounded-lg overflow-hidden">
            <div className="px-3 py-2">
              <div className="flex gap-3">
                {/* Avatar skeleton */}
                <div className="flex-shrink-0 mt-1">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                </div>
                
                {/* Content skeleton */}
                <div className="flex-1 min-w-0">
                  {/* Line 1: Title + Button */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-6 bg-muted rounded animate-pulse" />
                  </div>
                  
                  {/* Line 2: Amount */}
                  <div className="mb-1">
                    <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                  </div>
                  
                  {/* Line 3: Address + Date */}
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (displayIsLoading && displayTransactions.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    )
  }

    if (displayError) {
      return (
        <div className={cn("flex items-center justify-center py-8", className)}>
          <div className="flex flex-col items-center gap-2 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-destructive">Failed to load transactions</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAccountActivity({ limit: 3, includeMempool: true, includeConfirmed: true, offset: 0 })}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    if (displayTransactions.length === 0) {
      return (
        <div className={cn("flex items-center justify-center py-8", className)}>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ArrowUpRight className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground">Your transaction history will appear here</p>
          </div>
        </div>
      )
    }

    return (
      <div className={cn("space-y-2", className)}>

        {/* Transaction List */}
        <div className="space-y-2">
          <AnimatePresence>
            {displayTransactions.map((tx, index) => (
              <motion.div
                key={tx.txid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <div className="bg-card border border-border/50 rounded-lg overflow-hidden hover:shadow-md transition-all duration-200">
                  {/* Main Transaction Row */}
                  <div
                    className="px-3 py-2 cursor-pointer"
                    onClick={() => setDrawerTxId(tx.txid)}
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0 mt-1">{getTransactionAvatar(tx.type, tx.pending)}</div>

                      {/* Content - Three lines layout */}
                      <div className="flex-1 min-w-0">
                      {/* Line 1: Title + MochiScan Button */}
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">{getTitle(tx.type)}</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewInMochiScan(tx.txid)
                              }}
                              className="h-6 w-6 p-0 flex-shrink-0"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Open in MochiScan</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>

                        {/* Line 2: Amount */}
                        <div className="mb-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className={cn(
                                "font-mono tabular-nums font-semibold text-base leading-tight",
                                getTransactionColor(tx.type, tx.pending)
                              )}>
                                {tx.type === 'send' ? '-' : '+'}{formatAmountShort(tx.amount)} MCM
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              {tx.type === 'send' ? '-' : '+'}{formatAmountFull(tx.amount)} MCM
                            </TooltipContent>
                          </Tooltip>
                        </div>

                      {/* Line 3: From/To + Date (non-copyable in list) */}
                      <div className="flex items-center justify-between">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="text-xs text-muted-foreground truncate flex-1 min-w-0 text-left cursor-default"
                            >
                              {getSubtitle(tx.type, tx.address)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-mono text-xs">{tx.address}</p>
                          </TooltipContent>
                        </Tooltip>
                        <p className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      </div>
                    </div>
                  </div>

                  {/* Details are shown in Drawer, not inline */}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Load More button removed from account view. Use drawer view's Load More below. */}
        {/* Drawer */}
        <Drawer open={!!drawerTxId} onOpenChange={(o) => !o && setDrawerTxId(null)}>
          <DrawerContent className="p-0 h-[80vh] flex flex-col overflow-hidden">
            {(() => {
              const tx = transactions.find(t => t.txid === drawerTxId)
              if (!tx) return null
              return (
                <div className="flex flex-col h-full min-h-0">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">{getTitle(tx.type)}</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDrawerTxId(null)}
                      className="h-8 w-8 p-0"
                    >
                      ×
                    </Button>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 p-6 overflow-y-auto">
                    {/* Transaction Icon and Amount */}
                    <div className="text-center mb-6">
                      <div className="relative inline-block mb-4">
                        {/* Mochimo logo avatar */}
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <Logo size="md" className="text-primary" />
                        </div>
                        {/* Direction badge (IN/OUT icons) */}
                        {tx.type !== 'mining' && (
                          <div
                            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-sm"
                            style={{
                              backgroundColor: tx.type === 'send' ? 'rgb(239 68 68)' : 'rgb(34 197 94)'
                            }}
                          >
                            {tx.type === 'send' ? (
                              <ArrowUpRight className="h-4 w-4 text-white" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4 text-white" />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className={cn(
                          "text-2xl font-bold",
                          getTransactionColor(tx.type, tx.pending)
                        )}>
                          {tx.type === 'send' ? '-' : '+'}{formatAmountFull(tx.amount)} MCM
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          {tx.pending ? (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <Clock className="h-4 w-4" />
                              <span className="text-sm font-medium">Pending</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">Confirmed</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Transaction Details Card */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Date</span>
                        <span className="text-sm font-medium ml-4">
                          {new Date(tx.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>

                      {tx.address && (() => {
                        const internalInfo = getInternalTransferInfo(tx.type, tx.address)
                        return (
                          <div className="flex justify-between items-start">
                            <span className="text-sm text-muted-foreground">
                              {tx.type === 'send' ? 'To' : 'From'}
                            </span>
                            <div className="flex items-start gap-2 min-w-0 flex-1 ml-4 justify-end">
                              <div className="text-right min-w-0 flex-1">
                                {internalInfo ? (
                                  <div>
                                    <p className="text-sm font-medium text-blue-600 truncate">{internalInfo.name}</p>
                                    <p className="text-sm font-medium font-mono truncate">{internalInfo.address}</p>
                                  </div>
                                ) : (
                                  <p className="text-sm font-medium font-mono truncate">{tx.address}</p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyAddress(tx.address!)}
                                className="h-8 w-8 p-0 flex-shrink-0"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })()}

                      {tx.fee && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Fee</span>
                          <span className="text-sm font-medium font-mono ml-4">{formatAmountFull(tx.fee)} MCM</span>
                        </div>
                      )}

                      {tx.blockNumber && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Block</span>
                          <span className="text-sm font-medium font-mono ml-4">{tx.blockNumber.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">TX ID</span>
                        <div className="flex items-center gap-2 ml-4 min-w-0 flex-1 justify-end">
                          <code className="text-sm font-medium font-mono truncate">
                            {tx.txid}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyTxId(tx.txid)}
                            className="h-8 w-8 p-0 flex-shrink-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {tx.memo && (
                        <div className="pt-2 border-t">
                          <span className="text-sm text-muted-foreground block mb-1">Memo</span>
                          <p className="text-sm bg-background px-2 py-1 rounded break-words">{tx.memo}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-4 border-t space-y-2 flex-shrink-0">
                    <Button
                      onClick={() => handleViewInMochiScan(tx.txid)}
                      variant="outline"
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View on MochiScan
                    </Button>
                    <Button
                      onClick={() => setDrawerTxId(null)}
                      className="w-full"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              )
            })()}
          </DrawerContent>
        </Drawer>

        {/* Load More Button - Only show in full view when there are more transactions */}
        {showAll && displayHasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={() => {
                if (ref && 'current' in ref && ref.current) {
                  ref.current.loadMore()
                }
              }}
              disabled={displayIsLoading}
              className="px-6"
            >
              {displayIsLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
      </div>
    )
  })

TransactionList.displayName = 'TransactionList'
