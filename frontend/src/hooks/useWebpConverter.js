import { useState, useCallback, useRef } from 'react'
import { isConvertFile, traverseEntry, formatBytes } from '../utils/fileUtils'
import { startConversion, subscribeProgress, downloadZip, cancelSession } from '../utils/api'

const genId = () => Math.random().toString(36).slice(2, 10)

const DEFAULT_SETTINGS = { quality: 85, lossless: false, preset: 'balanced' }

export const useWebpConverter = () => {
  const [files, setFiles]       = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [session, setSession]   = useState(null)
  const [phase, setPhase]       = useState('idle')
  const [toasts, setToasts]     = useState([])

  const sessionIdRef = useRef(null)
  const unsubRef     = useRef(null)

  // ─── Toasts ────────────────────────────────────────────────────────────────

  const addToast = useCallback((type, message) => {
    const id = genId()
    setToasts((t) => [...t, { id, type, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  // ─── File management ───────────────────────────────────────────────────────

  const addFiles = useCallback(
    async (dropItems) => {
      const collected = []

      for (const item of dropItems) {
        if (item && typeof item.webkitGetAsEntry === 'function') {
          const entry = item.webkitGetAsEntry()
          if (entry) {
            const traversed = await traverseEntry(entry)
            traversed.forEach(({ file, relativePath }) => {
              if (isConvertFile(file)) collected.push({ file, relativePath, id: genId() })
            })
            continue
          }
        }

        const file = item instanceof File ? item : item.getAsFile?.()
        if (file && isConvertFile(file)) {
          const rel = file.webkitRelativePath || file.name
          collected.push({ file, relativePath: rel, id: genId() })
        }
      }

      if (collected.length === 0) {
        addToast('warning', 'No convertible images found (JPG, PNG, BMP, TIFF, GIF, WEBP)')
        return
      }

      setFiles((prev) => {
        const existing = new Set(prev.map((f) => f.relativePath))
        const unique   = collected.filter((f) => !existing.has(f.relativePath))
        if (unique.length < collected.length)
          addToast('info', `${collected.length - unique.length} duplicate(s) skipped`)
        const next = [...prev, ...unique]
        if (next.length > 0) setPhase('ready')
        return next
      })

      addToast('success', `Added ${collected.length} image(s)`)
    },
    [addToast]
  )

  const removeFile = useCallback((id) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id)
      if (next.length === 0) setPhase('idle')
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    setFiles([])
    setSession(null)
    setPhase('idle')
    sessionIdRef.current = null
  }, [])

  // ─── Settings ──────────────────────────────────────────────────────────────

  const updateSettings = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }))
  }, [])

  const applyPreset = useCallback((preset) => {
    const map = {
      high:     { quality: 95, lossless: false },
      balanced: { quality: 85, lossless: false },
      small:    { quality: 65, lossless: false },
      lossless: { quality: 100, lossless: true },
    }
    if (map[preset]) setSettings((s) => ({ ...s, ...map[preset], preset }))
  }, [])

  // ─── Convert ───────────────────────────────────────────────────────────────

  const convert = useCallback(async () => {
    if (files.length === 0) return
    setPhase('compressing')
    setSession({
      status: 'pending', progress: 0, processed: 0,
      total: files.length, results: [], errors: [], stats: {},
    })

    try {
      const { session_id } = await startConversion(
        files.map((f) => f.file),
        files.map((f) => f.relativePath),
        settings,
      )
      sessionIdRef.current = session_id

      unsubRef.current = subscribeProgress(
        session_id,
        (data) => setSession({ ...data, id: session_id }),
        (data) => {
          setSession({ ...data, id: session_id })
          if (data.status === 'completed') {
            setPhase('done')
            const saved = data.stats?.saved || 0
            const msg = saved > 0
              ? `Converted ${data.processed} file(s)! Saved ${formatBytes(saved)}`
              : `Converted ${data.processed} file(s) to WEBP`
            addToast('success', msg)
          } else if (data.status === 'failed') {
            setPhase('error')
            addToast('error', 'Conversion failed — check logs')
          }
        },
        () => {
          addToast('error', 'Lost connection to server')
          setPhase('error')
        }
      )
    } catch (err) {
      addToast('error', err.response?.data?.detail || err.message || 'Upload failed')
      setPhase('ready')
    }
  }, [files, settings, addToast])

  const cancel = useCallback(async () => {
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null }
    if (sessionIdRef.current) {
      try { await cancelSession(sessionIdRef.current) } catch {}
      sessionIdRef.current = null
    }
    setSession(null)
    setPhase('ready')
    addToast('info', 'Conversion cancelled')
  }, [addToast])

  const download = useCallback(async () => {
    const id = session?.id || sessionIdRef.current
    if (!id) return
    try {
      await downloadZip(id, 'converted_webp')
      addToast('success', 'Download started!')
      setTimeout(clearAll, 1500)
    } catch {
      addToast('error', 'Download failed')
    }
  }, [session, clearAll, addToast])

  return {
    files, settings, session, phase, toasts,
    addFiles, removeFile, clearAll,
    convert, cancel, download,
    updateSettings, applyPreset,
    addToast, removeToast,
  }
}
