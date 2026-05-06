import { motion, AnimatePresence } from 'framer-motion'
import DropZone from '../components/DropZone'
import FileTree from '../components/FileTree'
import CompressionSettings from '../components/CompressionSettings'
import ProgressPanel from '../components/ProgressPanel'
import StatsPanel from '../components/StatsPanel'

export default function CompressPage({ hook }) {
  const {
    files, settings, session, phase,
    addFiles, removeFile, clearAll,
    compress, cancel, download,
    updateSettings, applyPreset,
  } = hook

  const isIdle        = phase === 'idle'
  const isReady       = phase === 'ready'
  const isCompressing = phase === 'compressing'
  const isDone        = phase === 'done'

  return (
    <AnimatePresence mode="wait">
      {isIdle ? (
        <motion.div
          key="idle"
          className="flex-1 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <DropZone onFiles={addFiles} />
        </motion.div>
      ) : (
        <motion.div
          key="workspace"
          className="flex-1 flex overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Left: file tree */}
          <div className="flex flex-col flex-1 border-r border-dark-600/60 overflow-hidden min-w-0">
            <div className="flex-1 overflow-hidden">
              <FileTree files={files} onRemove={removeFile} phase={phase} />
            </div>
            {isReady && (
              <div className="p-3 border-t border-dark-600/60 space-y-2">
                <DropZone onFiles={addFiles} compact />
                <button
                  onClick={clearAll}
                  className="w-full py-1.5 text-xs text-slate-600 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Right: settings + controls */}
          <div className="w-80 xl:w-96 shrink-0 flex flex-col overflow-y-auto p-4 gap-4">
            {!isDone && (
              <CompressionSettings
                settings={settings}
                onUpdate={updateSettings}
                onPreset={applyPreset}
                disabled={isCompressing}
              />
            )}

            <ActionButton
              phase={phase}
              fileCount={files.length}
              onCompress={compress}
              onCancel={cancel}
              onDownload={download}
            />

            {(isCompressing || isDone) && (
              <ProgressPanel session={session} onCancel={cancel} actionLabel="Compressing" />
            )}

            {isDone && (
              <StatsPanel
                session={session}
                onDownload={download}
                onReset={clearAll}
                mode="compress"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ActionButton({ phase, fileCount, onCompress, onCancel, onDownload }) {
  if (phase === 'ready') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onCompress}
        disabled={fileCount === 0}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-cyan to-brand-indigo text-white font-bold text-sm shadow-lg shadow-brand-indigo/20 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 transition-opacity"
      >
        🗜️ Compress {fileCount} Image{fileCount !== 1 ? 's' : ''}
      </motion.button>
    )
  }
  if (phase === 'compressing') {
    return (
      <button
        onClick={onCancel}
        className="w-full py-3 rounded-2xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/5 transition-colors"
      >
        ✕ Cancel
      </button>
    )
  }
  if (phase === 'done') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onDownload}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-brand-cyan text-dark-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:opacity-95"
      >
        ⬇ Download Compressed ZIP
      </motion.button>
    )
  }
  return null
}
