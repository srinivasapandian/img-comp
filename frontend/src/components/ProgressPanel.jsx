import { motion } from 'framer-motion'
import { formatBytes } from '../utils/fileUtils'

/**
 * Shared progress panel for both compress and convert operations.
 * Pass actionLabel='Converting' or 'Compressing' to customise headings.
 */
export default function ProgressPanel({ session, onCancel, actionLabel = 'Compressing' }) {
  if (!session) return null

  const {
    status, progress = 0, processed = 0, total = 0,
    results = [], errors = [], stats = {},
  } = session

  const isPending    = status === 'pending'
  const isProcessing = status === 'processing'
  const isDone       = status === 'completed'

  const outputSaved = stats.saved || 0

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-dark-500/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(isPending || isProcessing) && (
            <div className="w-4 h-4 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin" />
          )}
          {isDone && <span className="text-emerald-400">✓</span>}
          <h3 className="text-sm font-semibold text-slate-200">
            {isPending
              ? 'Preparing…'
              : isProcessing
              ? `${actionLabel}…`
              : 'Complete'}
          </h3>
        </div>
        <span className="text-xs text-slate-500 tabular-nums">{processed} / {total}</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>{progress}% complete</span>
            {outputSaved > 0 && (
              <span className="text-emerald-400">↓ {formatBytes(outputSaved)} saved</span>
            )}
          </div>
          <div className="h-2.5 bg-dark-600 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full progress-bar"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut', duration: 0.35 }}
            />
          </div>
        </div>

        {/* Stats grid */}
        {(isProcessing || isDone) && (
          <div className="grid grid-cols-2 gap-2">
            <StatCell label="Done" value={`${processed} / ${total}`} />
            <StatCell label="Errors" value={errors.length} accent={errors.length > 0 ? 'text-red-400' : undefined} />
            {stats.total_original > 0 && (
              <>
                <StatCell label="Original" value={formatBytes(stats.total_original)} />
                <StatCell
                  label={stats.total_compressed !== undefined ? 'Compressed' : 'Converted'}
                  value={formatBytes(stats.total_compressed ?? stats.total_converted ?? 0)}
                />
                {outputSaved > 0 && (
                  <>
                    <StatCell label="Saved" value={formatBytes(outputSaved)} accent="text-emerald-400" />
                    <StatCell label="Ratio" value={`${stats.ratio}%`} accent="text-brand-cyan" />
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Live log */}
        {results.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-medium">Log</p>
            <div className="space-y-0.5 max-h-36 overflow-y-auto">
              {[...results].reverse().slice(0, 30).map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 px-2 rounded-lg bg-dark-700/30">
                  <span className="text-emerald-400 shrink-0">✓</span>
                  <span className="text-slate-400 flex-1 truncate">{r.name}</span>
                  {r.ratio !== 0
                    ? <span className="text-emerald-400/80 shrink-0">-{r.ratio}%</span>
                    : <span className="text-brand-cyan/80 shrink-0">→ .webp</span>
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error log */}
        {errors.length > 0 && (
          <div>
            <p className="text-xs text-red-400 mb-2 uppercase tracking-wider font-medium">
              Errors ({errors.length})
            </p>
            <div className="space-y-0.5 max-h-24 overflow-y-auto">
              {errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs py-1 px-2 rounded-lg bg-red-500/5 border border-red-500/20">
                  <span className="text-red-400 shrink-0">✕</span>
                  <span className="text-slate-400 flex-1 truncate">{e.name}</span>
                  <span className="text-red-400/60 shrink-0 max-w-[100px] truncate">{e.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancel */}
        {(isPending || isProcessing) && (
          <button
            onClick={onCancel}
            className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/8 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

function StatCell({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-dark-700/50 border border-dark-500/40 p-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${accent || 'text-slate-200'}`}>{value}</p>
    </div>
  )
}
