import { motion, AnimatePresence } from 'framer-motion'
import DropZone from '../components/DropZone'
import FileTree from '../components/FileTree'
import WebpSettings from '../components/WebpSettings'
import ProgressPanel from '../components/ProgressPanel'
import StatsPanel from '../components/StatsPanel'

export default function WebpPage({ hook }) {
  const {
    files, settings, session, phase,
    addFiles, removeFile, clearAll,
    convert, cancel, download,
    updateSettings, applyPreset,
  } = hook

  const isIdle        = phase === 'idle'
  const isReady       = phase === 'ready'
  const isConverting  = phase === 'compressing'  // reuse same phase key
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
          <WebpDropZoneHero onFiles={addFiles} />
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
                <DropZone
                  onFiles={addFiles}
                  compact
                  accept=".jpg,.jpeg,.png,.bmp,.tiff,.tif,.gif,.webp"
                />
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
              <WebpSettings
                settings={settings}
                onUpdate={updateSettings}
                onPreset={applyPreset}
                disabled={isConverting}
              />
            )}

            <ActionButton
              phase={phase}
              fileCount={files.length}
              onConvert={convert}
              onCancel={cancel}
              onDownload={download}
            />

            {(isConverting || isDone) && (
              <ProgressPanel session={session} onCancel={cancel} actionLabel="Converting" />
            )}

            {isDone && (
              <StatsPanel
                session={session}
                onDownload={download}
                onReset={clearAll}
                mode="convert"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Full-page drop zone with WEBP branding ───────────────────────────────────

function WebpDropZoneHero({ onFiles }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex items-center justify-center p-8"
    >
      <div className="w-full max-w-2xl">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-semibold mb-4">
            <span>🔄</span> WEBP Converter
          </div>
          <h2 className="text-3xl font-black text-white mb-3">
            Convert Any Image to{' '}
            <span className="bg-gradient-to-r from-violet-400 to-brand-cyan bg-clip-text text-transparent">
              WEBP
            </span>
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Drop images or an entire folder. Supports JPG, PNG, BMP, TIFF, GIF and existing WEBP.
            Folder structure is preserved in the downloaded ZIP.
          </p>
        </div>

        {/* Format pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {['JPG', 'PNG', 'BMP', 'TIFF', 'GIF', 'WEBP'].map((fmt) => (
            <div key={fmt} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-700 border border-dark-500 text-xs">
              <span className="text-slate-400">{fmt}</span>
              <span className="text-slate-600">→</span>
              <span className="text-brand-cyan font-semibold">WEBP</span>
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <DropZone
          onFiles={onFiles}
          accept=".jpg,.jpeg,.png,.bmp,.tiff,.tif,.gif,.webp"
          formats={['JPG', 'PNG', 'BMP', 'TIFF', 'GIF', 'WEBP']}
        />
      </div>
    </motion.div>
  )
}

function ActionButton({ phase, fileCount, onConvert, onCancel, onDownload }) {
  if (phase === 'ready') {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={onConvert}
        disabled={fileCount === 0}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-brand-cyan text-white font-bold text-sm shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95 transition-opacity"
      >
        🔄 Convert {fileCount} File{fileCount !== 1 ? 's' : ''} to WEBP
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
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-brand-cyan text-white font-bold text-sm shadow-lg shadow-violet-500/20 hover:opacity-95"
      >
        ⬇ Download WEBP ZIP
      </motion.button>
    )
  }
  return null
}
