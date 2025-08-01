import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, Coins, RefreshCcw, Send, Tag as TagIcon } from 'lucide-react'
import { Account, useNetwork, useRecentActivity } from 'mochimo-wallet' 
import { motion } from 'framer-motion' 
import { cn } from '@/lib/utils'
import { env } from '@/config/env'
import { log } from '@/lib/utils/logging'

const logger = log.getLogger("wallet");

interface RecentActivityProps {
  account: Account
  onRefresh?: () => void
}

export function RecentActivity({ account, onRefresh }: RecentActivityProps) {
  const network = useNetwork()
  
  // Use the new hook from mochimo-wallet library
  const { transactions, loading: loadingTransactions, refresh } = useRecentActivity(account)

  // Format balance to MCM with better readability
  const formatBalance = (balanceStr: string | null): string => {
    if (!balanceStr) return '0'
    try {
      const balance = BigInt(balanceStr)
      const whole = balance / BigInt(1e9)
      const fraction = (balance % BigInt(1e9)).toString().padStart(9, '0')
      const fractionFormatted = fraction.replace(/0+$/, '') // Remove trailing zeros
      return fractionFormatted ? `${whole}.${fractionFormatted}` : `${whole}`
    } catch (error) {
      logger.error('Error formatting balance:', error, balanceStr)
      return balanceStr
    }
  }

  // Handle refresh button
  const handleRefresh = () => {
    refresh()
    if (onRefresh) onRefresh()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card rounded-xl border-2 border-border/50"
    >
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs hover:text-primary hover:bg-primary/10"
          onClick={handleRefresh}
          disabled={loadingTransactions}
        >
          {loadingTransactions ? (
            <>
              <RefreshCcw className="h-3 w-3 mr-1 animate-spin" />
              Refreshing...
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>
      
      {/* Transactions list */}
      <div className="divide-y divide-border/50">
        {loadingTransactions && transactions.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <RefreshCcw className="h-5 w-5 animate-spin mx-auto mb-2" />
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <p>No transactions found</p>
            <p className="text-xs mt-1">Transactions will appear here once you send or receive MCM</p>
          </div>
        ) : (
          transactions.slice(0, 5).map((tx, index) => (
            <div key={tx.txid || index} className="p-4 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full shrink-0",
            tx.type === 'send' ? "bg-red-500/10" : 
            tx.type === 'receive' ? "bg-green-500/10" : "bg-blue-500/10",
            tx.pending ? "border-2 border-yellow-400" : ""
          )}>
            {tx.type === 'send' ? (
              <Send className={cn("h-3.5 w-3.5", tx.pending ? "text-yellow-500" : "text-red-500")} />
            ) : tx.type === 'receive' ? (
              <Coins className={cn("h-3.5 w-3.5", tx.pending ? "text-yellow-500" : "text-green-500")} />
            ) : (
              <TagIcon className="h-3.5 w-3.5 text-blue-500" />
            )}
          </div>
                  <div>
                    <p className="text-sm font-medium">
                      {tx.type === 'send' ? 'Sent to ' : 
                       tx.type === 'receive' ? 'Received from ' : 'Mining Reward'}
                      {tx.type !== 'mining' && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {tx.address.substring(0, 6)}...{tx.address.substring(tx.address.length - 4)}
                        </span>
                      )}
                      {tx.pending && (
                        <span className="ml-2 text-xs text-yellow-500 font-semibold">(pending)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.timestamp).toLocaleString()}
                    </p>
                    {tx.memo && (
                      <p className="text-xs text-muted-foreground italic mt-1">
                        Memo: {tx.memo.replace(/\u0000+$/, '').replace(/\u0000/g, '')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-mono font-medium",
                    tx.type === 'send' ? (tx.pending ? "text-yellow-500" : "text-red-500") : (tx.pending ? "text-yellow-500" : "text-green-500")
                  )}>
                    {tx.type === 'send' ? '-' : '+'}{formatBalance(tx.amount)} MCM
                    {tx.type === 'send' && tx.fee && (
                      <span className="ml-1 text-xs text-muted-foreground">(fee: {formatBalance(tx.fee)})</span>
                    )}
                  </p>
                  {tx.blockNumber && (
                    <p className="text-xs text-muted-foreground">
                      Block #{tx.blockNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}
