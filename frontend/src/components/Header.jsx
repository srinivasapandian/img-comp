import { motion } from 'framer-motion'

export default function Header({ fileCount, phase }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-dark-500/40">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-cyan to-brand-indigo flex items-center justify-center text-sm font-bold shadow-lg shadow-brand-cyan/20">
            IP
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="text-gradient">ImagePress</span>
          </span>
        </motion.div>

        {/* Status badge */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {fileCount > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-dark-600 border border-dark-500 text-slate-400">
              {fileCount} image{fileCount !== 1 ? 's' : ''} queued
            </span>
          )}
          <StatusDot phase={phase} />
        </motion.div>
      </div>
    </header>
  )
}

function StatusDot({ phase }) {
  const config = {
    idle:        { color: 'bg-slate-500',       label: 'Idle' },
    ready:       { color: 'bg-amber-400',        label: 'Ready' },
    compressing: { color: 'bg-brand-cyan animate-pulse', label: 'Processing' },
    done:        { color: 'bg-emerald-400',      label: 'Complete' },
    error:       { color: 'bg-red-500',          label: 'Error' },
  }
  const { color, label } = config[phase] || config.idle
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {label}
    </div>
  )
}
