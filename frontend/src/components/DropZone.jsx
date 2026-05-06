import { useCallback, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Shared drop zone for both compress (JPG/PNG/WEBP) and convert (+ BMP/TIFF/GIF) modes.
 * The parent passes onFiles and the accept string based on the active tab.
 */
export default function DropZone({
  onFiles,
  compact = false,
  accept = '.jpg,.jpeg,.png,.webp',
  formats = ['JPG', 'PNG', 'WEBP'],
}) {
  const [dragging, setDragging] = useState(false)
  const folderInputRef = useRef(null)
  const fileInputRef   = useRef(null)
  const dragCounter    = useRef(0)

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      dragCounter.current = 0
      setDragging(false)
      const items = Array.from(e.dataTransfer.items || [])
      if (items.length > 0) {
        onFiles(items)
      } else {
        onFiles(Array.from(e.dataTransfer.files || []))
      }
    },
    [onFiles]
  )

  const handleDragOver  = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }
  const handleDragEnter = (e) => { e.preventDefault(); dragCounter.current++; setDragging(true) }
  const handleDragLeave = (e) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current <= 0) { dragCounter.current = 0; setDragging(false) }
  }

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length) onFiles(files)
    e.target.value = ''
  }

  // ── Compact version (add-more bar) ────────────────────────────────────────
  if (compact) {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`rounded-xl border-2 border-dashed p-3 text-center transition-all duration-200 ${
          dragging
            ? 'border-brand-cyan bg-brand-cyan/5 drop-active'
            : 'border-dark-500 hover:border-dark-500/60 hover:bg-dark-700/20'
        }`}
      >
        <input ref={fileInputRef}   type="file" multiple accept={accept} onChange={handleFileInput} className="hidden" />
        <input ref={folderInputRef} type="file" webkitdirectory="" multiple onChange={handleFileInput} className="hidden" />
        <p className="text-xs text-slate-500">
          Drop more or{' '}
          <button onClick={() => fileInputRef.current?.click()} className="text-brand-cyan hover:underline">
            files
          </button>
          {' / '}
          <button onClick={() => folderInputRef.current?.click()} className="text-brand-indigo hover:underline">
            folder
          </button>
        </p>
      </div>
    )
  }

  // ── Full drop zone ─────────────────────────────────────────────────────────
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={`w-full rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
        dragging
          ? 'border-brand-cyan bg-brand-cyan/5 glow-cyan drop-active scale-[1.01]'
          : 'border-dark-500 hover:border-brand-cyan/40 hover:bg-dark-700/10'
      }`}
      style={{ minHeight: '280px' }}
    >
      <input ref={fileInputRef}   type="file" multiple accept={accept} onChange={handleFileInput} className="hidden" />
      <input ref={folderInputRef} type="file" webkitdirectory="" multiple onChange={handleFileInput} className="hidden" />

      <div className="flex flex-col items-center justify-center h-full py-14 px-8 text-center gap-5">
        <AnimatePresence mode="wait">
          {dragging ? (
            <motion.div
              key="drop"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-20 h-20 rounded-2xl bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-4xl"
            >
              📥
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-20 h-20 rounded-2xl bg-dark-600 border border-dark-500 flex items-center justify-center text-4xl"
            >
              🗂️
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <p className="text-lg font-bold text-white mb-1">
            {dragging ? 'Drop to process' : 'Drop images or a folder here'}
          </p>
          <p className="text-slate-500 text-sm">
            Drag an entire folder to preserve its subfolder structure
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {formats.map((f) => (
            <span key={f} className="px-3 py-1 text-xs font-semibold rounded-full bg-dark-600 border border-dark-500 text-slate-300">
              {f}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 text-sm rounded-xl bg-gradient-to-r from-brand-cyan to-brand-blue text-dark-950 font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-brand-cyan/20"
          >
            Select Files
          </button>
          <span className="text-slate-600 text-sm">or</span>
          <button
            onClick={() => folderInputRef.current?.click()}
            className="px-5 py-2.5 text-sm rounded-xl border border-dark-500 text-slate-300 hover:border-brand-indigo/50 hover:text-white transition-all"
          >
            Select Folder
          </button>
        </div>
      </div>
    </div>
  )
}
