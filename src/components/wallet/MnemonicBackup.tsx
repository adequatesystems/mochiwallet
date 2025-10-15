import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Copy, Eye, EyeOff, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from '@/components/ui/tooltip'

interface MnemonicBackupProps {
    mnemonic: string
    onComplete: () => void
    onBack: () => void
    onRefreshMnemonic: () => void
}

export function MnemonicBackup({ mnemonic, onComplete, onBack, onRefreshMnemonic }: MnemonicBackupProps) {
    const [step, setStep] = useState<'show' | 'verify'>('show')
    const [revealed, setRevealed] = useState(false)
    const [copied, setCopied] = useState(false)
    const [verificationWords, setVerificationWords] = useState<{ index: number, word: string }[]>([])
    const [inputs, setInputs] = useState<string[]>(['', '', ''])
    const [error, setError] = useState<string | null>(null)

    // Select 3 random words for verification
    useEffect(() => {
        const words = mnemonic.split(' ')
        const indices: number[] = []
        while (indices.length < 3) {
            const index = Math.floor(Math.random() * words.length)
            if (!indices.includes(index)) {
                indices.push(index)
            }
        }
        setVerificationWords(indices.map(index => ({
            index,
            word: '',
        })))
        setInputs(indices.map(() =>''))
    }, [mnemonic])

    const handleCopy = async () => {
        await navigator.clipboard.writeText(mnemonic)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleVerify = () => {
        const isCorrect = verificationWords.every((vw, i) =>
            inputs[i].toLowerCase().trim() === vw.word.toLowerCase()
        )

        if (isCorrect) {
            onComplete()
        } else {
            setError('One or more words are incorrect. Please try again.')
        }
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-center p-4">
                <h2 className="text-lg font-semibold">Backup Recovery Phrase</h2>
            </div>

            <div className="flex-1 overflow-auto p-4">
                <AnimatePresence mode="wait">
                    {step === 'show' ? (
                        <motion.div
                            key="show"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-500 rounded-lg">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <p className="text-xs">
                                    Write these words down carefully. They're the only way to recover your wallet.
                                </p>
                            </div>

                            <div className="relative">

                                <div className={`relative p-3 bg-muted rounded-lg ${!revealed && 'blur-sm'}`}>
                                    <div className="grid grid-cols-3 gap-2">
                                        {mnemonic.split(' ').map((word, i) => (
                                            <div key={i} className="flex items-center bg-background/40 px-2 py-1.5 rounded text-xs">
                                                <span className="text-muted-foreground min-w-[1.25rem]">
                                                    {(i + 1).toString()}
                                                </span>
                                                <span className="font-medium">
                                                    {word}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {!revealed && (
                                    <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm rounded-lg bg-background/50">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setRevealed(true)}
                                            className="gap-1.5"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            Show Phrase
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="verify"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <p className="text-sm text-muted-foreground">
                                Verify your backup by entering the following words:
                            </p>

                            <div className="space-y-3">
                                {verificationWords.map((vw, i) => (
                                    <div key={i} className="space-y-1">
                                        <label className="text-sm font-medium">
                                            Word #{vw.index + 1}
                                        </label>
                                        <Input
                                            value={inputs[i]}
                                            onChange={(e) => {
                                                const newInputs = [...inputs]
                                                newInputs[i] = e.target.value
                                                setInputs(newInputs)
                                                setError(null)
                                            }}
                                            placeholder={`Enter word #${vw.index + 1}`}
                                        />
                                    </div>
                                ))}

                                {error && (
                                    <p className="text-sm text-red-500">
                                        {error}
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="p-4 border-t mt-auto">
                {step === 'show' ? (
                    <div className="flex gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={onRefreshMnemonic}
                                    disabled={!revealed}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Generate new recovery phrase</p>
                            </TooltipContent>
                        </Tooltip>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            className="flex-1"
                            disabled={!revealed}
                        >
                            {copied ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy
                                </>
                            )}
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setStep('verify')}
                            className="flex-1"
                            disabled={!revealed}
                        >
                            Continue
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={handleVerify}
                        disabled={inputs.some(input => !input.trim())}
                        className="w-full"
                    >
                        Complete Backup
                    </Button>
                )}
            </div>
        </div>
    )
} 