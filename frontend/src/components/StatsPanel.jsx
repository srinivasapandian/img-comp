import { motion } from 'framer-motion'
import { formatBytes } from '../utils/fileUtils'

/**
 * Generic stats panel for both compress and convert modes.
 * mode='compress' → shows Compressed Size
 * mode='convert'  → shows Converted Size
 */
export default function StatsPanel({ session, onDownload, onReset, mode = 'compress' }) {
  if (!session || session.status !== 'completed') return null

  const { processed = 0, results = [], errors = [], stats = {} } = session
  const isConvert = mode === 'convert'

  const origKey   = 'total_original'
  const outputKey = isConvert ? 'total_converted' : 'total_compressed'
  const outputLabel = isConvert ? 'Converted Size' : 'Compressed Size'
  const actionLabel = isConvert ? 'Converted' : 'Compressed'

  const total_original = stats[origKey]   || 0
  const total_output   = stats[outputKey] || 0
  const saved          = stats.saved       || 0
  const ratio          = stats.ratio       || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl overflow-hidden"
    >
      {/* Success banner */}
      <div className="px-5 py-4 border-b border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm">
            ✓
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              {actionLabel} {results.length} file{results.length !== 1 ? 's' : ''}
            </p>
            {errors.length > 0 && (
              <p className="text-xs text-red-400">{errors.length} error{errors.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Big ratio */}
        <div className="text-center py-4 rounded-2xl bg-gradient-to-br from-brand-cyan/5 to-brand-indigo/5 border border-dark-500/60">
          <motion.p
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: 'spring' }}
            className="text-4xl font-black text-gradient tabular-nums"
          >
            {ratio > 0 ? `${ratio}%` : isConvert ? 'Done' : '0%'}
          </motion.p>
          <p className="text-xs text-slate-500 mt-1">
            {ratio > 0 ? 'space saved' : isConvert ? 'converted successfully' : 'no savings'}
          </p>
          {saved > 0 && (
            <p className="text-base font-semibold text-slate-300 mt-2">
              {formatBytes(saved)} reduced
            </p>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatBlock label="Original Size"   value={formatBytes(total_original)} />
          <StatBlock label={outputLabel}     value={formatBytes(total_output)} accent="text-brand-cyan" />
          <StatBlock label="Files OK"        value={String(results.length)} />
          <StatBlock label="Errors"          value={String(errors.length)} accent={errors.length > 0 ? 'text-red-400' : undefined} />
        </div>

        {/* Top savings */}
        {results.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-medium">
              {isConvert ? 'Conversions' : 'Top Savings'}
            </p>
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {[...results]
                .sort((a, b) => (b.saved || 0) - (a.saved || 0))
                .slice(0, 6)
                .map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1.5 px-3 rounded-lg bg-dark-700/40">
                    <span className="text-slate-600 tabular-nums w-4">{i + 1}.</span>
                    <span className="text-slate-400 flex-1 truncate">{r.name}</span>
                    {r.saved > 0
                      ? <span className="text-emerald-400 shrink-0">{formatBytes(r.saved)}</span>
                      : <span className="text-brand-cyan shrink-0">→ .webp</span>
                    }
                    {r.ratio !== 0 && (
                      <span className="text-slate-600 shrink-0">({r.ratio}%)</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onDownload}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-indigo text-white font-semibold text-sm shadow-lg shadow-brand-indigo/20 hover:opacity-95"
          >
            ⬇ Download ZIP
          </motion.button>
          <button
            onClick={onReset}
            className="w-full py-2.5 rounded-xl border border-dark-500 text-slate-400 text-sm hover:border-dark-500/60 hover:text-slate-300 transition-colors"
          >
            {isConvert ? 'Convert More' : 'Compress More'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function StatBlock({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-dark-700/50 border border-dark-500/40 p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${accent || 'text-slate-200'}`}>{value}</p>
    </div>
  )
}
