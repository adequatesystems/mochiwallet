import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import { motion } from 'framer-motion'
import { Lock, Unlock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { log } from "@/lib/utils/logging"
const logger = log.getLogger("wallet-unlock");
import { useWallet } from 'mochimo-wallet'

interface UnlockWalletProps {
  onUnlock: (wallet: any, jwk: JsonWebKey) => void
}

export function UnlockWallet({ onUnlock }: UnlockWalletProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const w = useWallet()
  const handleUnlock = async () => {
    setError(null)
    setLoading(true)
    try {
      const { jwk } = await w.unlockWallet(password)
      if (!jwk) {
        throw new Error('Failed to unlock wallet')
      }
      onUnlock(w, jwk)
    } catch (error) {
      logger.error('Error unlocking wallet:', error)
      setError(error instanceof Error ? error.message : 'Invalid password')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password) {
      handleUnlock()
    }
  }
  useEffect(() => {

  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[400px] p-6"
    >
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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
          <p className="text-sm text-gray-500">
            Enter your password to unlock your wallet
          </p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setError(null)
                setPassword(e.target.value)
              }}
              onKeyPress={handleKeyPress}
              disabled={loading}
              autoFocus
              className={cn(
                'pr-10',
                error && 'border-red-500 focus-visible:ring-red-500'
              )}
            />
            <div className="absolute right-3 top-2.5 text-gray-400">
              {loading ? <Unlock className="w-5 h-5 animate-pulse" /> :
                <Lock className="w-5 h-5" />}
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center text-sm text-red-500"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </motion.div>
          )}

          <Button
            onClick={handleUnlock}
            className="w-full"
            disabled={!password || loading}
            size="lg"
          >
            {loading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center"
              >
                <div className="mr-2">Unlocking</div>
                <div className="flex space-x-1">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
                    className="w-1 h-1 bg-white rounded-full"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
                    className="w-1 h-1 bg-white rounded-full"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
                    className="w-1 h-1 bg-white rounded-full"
                  />
                </div>
              </motion.div>
            ) : (
              <span className="flex items-center">
                <Unlock className="w-5 h-5 mr-2" />
                Unlock Wallet
              </span>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
} 