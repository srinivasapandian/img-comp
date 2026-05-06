import axios from 'axios'

const BASE = '/api'

// ─── Compress ─────────────────────────────────────────────────────────────────

export const startCompression = async (files, relativePaths, settings) => {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  form.append('quality', String(settings.quality))
  form.append('lossless', settings.lossless ? 'true' : 'false')
  form.append('paths', JSON.stringify(relativePaths))
  const { data } = await axios.post(`${BASE}/compress`, form)
  return data
}

// ─── Convert to WEBP ──────────────────────────────────────────────────────────

export const startConversion = async (files, relativePaths, settings) => {
  const form = new FormData()
  files.forEach((f) => form.append('files', f))
  form.append('quality', String(settings.quality))
  form.append('lossless', settings.lossless ? 'true' : 'false')
  form.append('paths', JSON.stringify(relativePaths))
  const { data } = await axios.post(`${BASE}/convert`, form)
  return data
}

// ─── SSE progress (shared) ────────────────────────────────────────────────────
/**
 * Subscribe to the SSE progress stream for a session.
 *
 * Bug fixed: closing EventSource programmatically on completion can fire
 * onerror in some browsers. We guard with an intentionalClose flag so a
 * successful completion never triggers the error handler.
 */
export const subscribeProgress = (sessionId, onData, onDone, onError) => {
  const es = new EventSource(`${BASE}/progress/${sessionId}`)
  let intentionalClose = false

  es.onmessage = ({ data }) => {
    try {
      const parsed = JSON.parse(data)
      onData(parsed)
      if (['completed', 'failed', 'cancelled'].includes(parsed.status)) {
        intentionalClose = true
        es.close()
        onDone(parsed)
      }
    } catch (e) {
      onError(e)
    }
  }

  es.onerror = () => {
    if (intentionalClose) return
    intentionalClose = true
    es.close()
    onError(new Error('SSE connection lost'))
  }

  return () => {
    intentionalClose = true
    es.close()
  }
}

// ─── Download ZIP (shared) ────────────────────────────────────────────────────

export const downloadZip = async (sessionId, filename = 'imagepress') => {
  const res = await axios.get(`${BASE}/download/${sessionId}`, {
    responseType: 'blob',
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${sessionId.slice(0, 8)}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

// ─── Cancel (shared) ──────────────────────────────────────────────────────────

export const cancelSession = async (sessionId) => {
  await axios.delete(`${BASE}/session/${sessionId}`)
}
