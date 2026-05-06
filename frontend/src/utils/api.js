import axios from 'axios'

// API base URL.
// Set `VITE_API_URL` to your backend origin (no trailing `/api`), e.g. `https://xxx.up.railway.app`.
// If unset, defaults to relative `/api` (works with Netlify/Docker reverse-proxy setups).
const apiOrigin = import.meta.env.VITE_API_URL
const BASE = apiOrigin
  ? `${apiOrigin.replace(/\/$/, '')}/api`
  : '/api'

// ─── Compress ─────────────────────────────────────────────────────────────────

export const startCompression = async (
  files,
  relativePaths,
  settings
) => {

  const form = new FormData()

  files.forEach((f) => form.append('files', f))

  form.append('quality', String(settings.quality))
  form.append('lossless', settings.lossless ? 'true' : 'false')
  form.append('paths', JSON.stringify(relativePaths))

  const { data } = await axios.post(
    `${BASE}/compress`,
    form
  )

  return data
}

// ─── Convert to WEBP ──────────────────────────────────────────────────────────

export const startConversion = async (
  files,
  relativePaths,
  settings
) => {

  const form = new FormData()

  files.forEach((f) => form.append('files', f))

  form.append('quality', String(settings.quality))
  form.append('lossless', settings.lossless ? 'true' : 'false')
  form.append('paths', JSON.stringify(relativePaths))

  const { data } = await axios.post(
    `${BASE}/convert`,
    form
  )

  return data
}

// ─── SSE Progress ─────────────────────────────────────────────────────────────

export const subscribeProgress = (
  sessionId,
  onData,
  onDone,
  onError
) => {

  const eventUrl =
    `${BASE}/progress/${sessionId}`

  const es = new EventSource(eventUrl)

  let intentionalClose = false

  es.onmessage = ({ data }) => {

    try {

      const parsed = JSON.parse(data)

      onData(parsed)

      if (
        ['completed', 'failed', 'cancelled']
          .includes(parsed.status)
      ) {

        intentionalClose = true

        es.close()

        onDone(parsed)
      }

    } catch (e) {

      onError(e)
    }
  }

  es.onerror = async () => {

    if (intentionalClose) return

    try {

      const res = await fetch(eventUrl)

      console.error(
        'SSE endpoint error:',
        res.status,
        res.headers.get('content-type')
      )

    } catch (err) {

      console.error(
        'SSE fetch failed:',
        err
      )
    }

    intentionalClose = true

    es.close()

    onError(
      new Error('SSE connection lost')
    )
  }

  return () => {

    intentionalClose = true

    es.close()
  }
}

// ─── Download ZIP ─────────────────────────────────────────────────────────────

export const downloadZip = async (
  sessionId,
  filename = 'imagepress'
) => {

  const res = await axios.get(
    `${BASE}/download/${sessionId}`,
    {
      responseType: 'blob',
    }
  )

  const url =
    URL.createObjectURL(res.data)

  const a =
    document.createElement('a')

  a.href = url

  a.download =
    `${filename}_${sessionId.slice(0, 8)}.zip`

  document.body.appendChild(a)

  a.click()

  document.body.removeChild(a)

  setTimeout(
    () => URL.revokeObjectURL(url),
    2000
  )
}

// ─── Cancel Session ───────────────────────────────────────────────────────────

export const cancelSession = async (
  sessionId
) => {

  await axios.delete(
    `${BASE}/session/${sessionId}`
  )
}
