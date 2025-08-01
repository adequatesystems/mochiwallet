import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle,
  Clock,
  Coins,
  Copy,
  QrCode,
  RefreshCcw,
  Send,
  Tag as TagIcon,
  Wallet,
  AlertTriangle
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { Account, MasterSeed, NetworkProvider, useAccounts, useNetwork, useWallet } from 'mochimo-wallet'
import { env } from '@/config/env'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { SendModal } from './SendModal'
import {TagUtils} from "mochimo-wots"
import { ReceiveDialog } from './ReceiveDialog'
import { ManageAccountsDialog } from './ManageAccountsDialog'
import { RecentActivity } from './RecentActivity'
import { log } from "@/lib/utils/logging"
const logger = log.getLogger("wallet");

interface AccountViewProps {
  account: Account
  onUpdate: (updated: Account) => void
}

// Interface for account props



export function AccountView({ account, onUpdate }: AccountViewProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isActivated, setIsActivated] = useState<boolean | null>(null)
  const [checkingActivation, setCheckingActivation] = useState(false)
  const [activating, setActivating] = useState(false)

  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const w = useWallet()
  const ac = useAccounts()
  const net = useNetwork()


  // Check activation status on mount and refresh
  useEffect(() => {
    checkActivation()
    //check whether the current address matches with the wots index we are using
  }, [account.tag])

  // Format balance to MCM with 9 decimal places
  const formatBalance = (balanceStr: string | null): string => {
    if (!balanceStr) return '0.000000000 MCM'
    const balance = BigInt(balanceStr)
    const whole = balance / BigInt(1e9)
    const fraction = balance % BigInt(1e9)
    return `${whole}.${fraction.toString().padStart(9, '0')}`
  }

  // Check activation status and balance
  const checkActivation = async () => {
    try {
      logger.info('checking activation')
      setCheckingActivation(true)
      const response = await NetworkProvider.getNetwork().resolveTag(account.tag)
      // Account is activated if addressConsensus is not empty
      const isActivated = Boolean(response.success &&
        response.addressConsensus &&
        response.addressConsensus.length > 0)
      const currentAddress = response.addressConsensus.slice(2);
      //deduce current wotsindex from this
      let t1 = performance.now()
      const currentWotsAddressBeingUsed = ac.currentWOTSKeyPair?.wotsWallet.getAddress()!
      let t2 = performance.now()
      logger.info('time taken to get wots address', t2 - t1)
      logger.info('current wots address being used', Buffer.from(currentWotsAddressBeingUsed).toString('hex'))

      if (currentAddress && currentAddress !== Buffer.from(currentWotsAddressBeingUsed).toString('hex')) {
        logger.error('current address does not match with the wots address being used')
        logger.info('CURRENT NETWORK ADDRESS', currentAddress)
        logger.info('CURRENTLY USED WOTS INDEX', account.wotsIndex)
        const t1 = performance.now()
        const currentWotsIndex = MasterSeed.deriveWotsIndexFromWotsAddrHash(Buffer.from(account.seed, 'hex'), Buffer.from(currentAddress, 'hex').subarray(20, 40), Buffer.from(account.faddress, 'hex'))
        const t2 = performance.now()
        logger.info('current wots index', currentWotsIndex)
        logger.info('time taken', t2 - t1)
        if (currentWotsIndex !== undefined && currentWotsIndex !== null) ac.updateAccount(account.tag, { wotsIndex: currentWotsIndex })
        logger.info('updated wots index', currentWotsIndex)
      } else {
        logger.info('current address matches with the wots address being used')
      }

      if (isActivated) {
        logger.info('Account activation details:', {
          address: response.addressConsensus,
          balance: response.balanceConsensus,
          nodes: response.quorum.map(q => q.node.host)
        })
      }
      setIsActivated(isActivated)
      onUpdate(account)
    } catch (error) {
      logger.error('Error checking activation:', error)
      setIsActivated(false)
    } finally {
      setCheckingActivation(false)
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    if(refreshing) return;
    setRefreshing(true)
    try {
      await checkActivation();
    } finally {
      setRefreshing(false);
    }
  }
  
  const network = useNetwork()
  logger.info("BLOCK HEIGHT", network.blockHeight)

  useEffect(() => {
    //when block height changes, check if the account needs to update its wots index.
    setRefreshing(true)
    checkActivation().finally(() => {
      setRefreshing(false)
    })
  }, [network.blockHeight, account.tag])

  const tag = useMemo(() => {
    return TagUtils.addrTagToBase58(Buffer.from(account.tag, 'hex'))
  }, [account.tag])


  const handleCopy = async () => {
    if (!tag) return
    await navigator.clipboard.writeText(tag)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-8 overflow-auto">
      {/* Floating Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10  border-b border-border/50"
      >
        <div className="max-w-full mx-auto px-6 py-4">
          {/* Main header content */}
          <div className="flex items-center justify-between">
            {/* Left side - Account name and icon */}
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="p-2 rounded-full bg-primary/10 shrink-0 cursor-pointer"
                    onClick={() => setShowDetails(true)}
                  >
                    <Wallet className="h-5 w-5 text-primary" />
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Account Details</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <h1 className="text-lg font-bold cursor-default">
                    {account.name}
                  </h1>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Account Name</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefresh}
                    className="h-9 w-9"
                    disabled={refreshing}
                  >
                    <RefreshCcw className={cn(
                      "h-4 w-4",
                      refreshing && "animate-spin"
                    )} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {refreshing ? 'Refreshing...' : 'Refresh Account'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Sub-header with tag */}
          <div className="mt-2 flex items-center gap-2 px-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <TagIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Account Tag</p>
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded-md flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <code className="font-mono text-xs text-muted-foreground flex-1 truncate cursor-pointer" onClick={handleCopy}>
                    {tag}
                  </code>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click to copy tag</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-background/50"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <CheckCircle className="h-3 w-3 text-primary" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {copied ? 'Copied!' : 'Copy tag to clipboard'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Warning Banner for Imported Accounts */}
      {account.type==='imported' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-500/10 border-l-4 border-yellow-500 px-4 py-3 mx-6 mt-4 rounded-r-md"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-sm text-yellow-500">
                Imported Account Warning
              </p>
              <p className="text-sm text-muted-foreground">
                This is an imported account and cannot be restored using your wallet's recovery phrase. 
                Please transfer funds to a regular account before sending to external wallets.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Content - Add overflow-y-auto here */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-full mx-auto px-6 py-4 space-y-6">
          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <Coins className="h-5 w-5 text-primary" />
                  <span className="font-medium">Available Balance</span>
                </div>

                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col"
                >
                  <div className="flex items-baseline gap-2">
                    <div className="font-mono">
                      <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {formatBalance(account.balance||'0')}
                      </span>
                      <span className="ml-2 text-xl text-muted-foreground font-medium">
                        MCM
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    size="lg"
                    onClick={() => setSendModalOpen(true)}
                    // disabled={!isActivated}
                    className={cn(
                      "w-full h-24 relative overflow-hidden group",
                      isActivated
                        ? "bg-primary/10 hover:bg-primary/20 text-primary border-2 border-primary/20"
                        : "bg-muted border-2 border-muted"
                    )}
                  >
                    <motion.div
                      className="flex flex-col items-center gap-2 relative z-10"
                      whileHover={{ y: -5 }}
                    >
                      <Send className={cn(
                        "h-6 w-6",
                        isActivated ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className="font-semibold">Send</span>
                    </motion.div>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={false}
                      whileHover={{ scale: 1.5, rotate: 45 }}
                    />
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                {isActivated
                  ? 'Send MCM to another address'
                  : 'Account does not have any balance'
                }
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full h-24 relative overflow-hidden group"
                    onClick={() => setReceiveModalOpen(true)}
                  >
                    <motion.div
                      className="flex flex-col items-center gap-2 relative z-10"
                      whileHover={{ y: -5 }}
                    >
                      <QrCode className="h-6 w-6" />
                      <span className="font-semibold">Receive</span>
                    </motion.div>
                    <motion.div
                      className="absolute inset-0 bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={false}
                      whileHover={{ scale: 1.5, rotate: 45 }}
                    />
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                Receive MCM - Show QR code and tag
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Recent Activity */}
          <RecentActivity account={account} onRefresh={handleRefresh} />
        </div>
      </div>

      <SendModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
      />

      <ReceiveDialog
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        account={account}
      />

      <ManageAccountsDialog
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        initialView="detail"
        initialAccount={account}
        showBack={false}
      />
    </div>
  )
}