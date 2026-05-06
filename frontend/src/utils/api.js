import axios from 'axios'

// API base URL
// Example:
// VITE_API_URL=https://img-comp-production.up.railway.app

const apiOrigin = import.meta.env.VITE_API_URL

const BASE = apiOrigin
  ? apiOrigin.replace(/\/$/, '') + '/api'
  : '/api'

console.log('API BASE:', BASE)

// ─── Compress ────────────────────────────────────────────────────────────────

export const startCompression = async (
  files,
  relativePaths,
  settings
) => {

  const form = new FormData()

  files.forEach((file) => {
    form.append('files', file)
  })

  form.append(
    'quality',
    String(settings.quality)
  )

  form.append(
    'lossless',
    settings.lossless ? 'true' : 'false'
  )

  form.append(
    'paths',
    JSON.stringify(relativePaths)
  )

  const response = await axios.post(
    `${BASE}/compress`,
    form
  )

  return response.data
}

// ─── Convert to WEBP ─────────────────────────────────────────────────────────

export const startConversion = async (
  files,
  relativePaths,
  settings
) => {

  const form = new FormData()

  files.forEach((file) => {
    form.append('files', file)
  })

  form.append(
    'quality',
    String(settings.quality)
  )

  form.append(
    'lossless',
    settings.lossless ? 'true' : 'false'
  )

  form.append(
    'paths',
    JSON.stringify(relativePaths)
  )

  const response = await axios.post(
    `${BASE}/convert`,
    form
  )

  return response.data
}

// ─── SSE Progress ────────────────────────────────────────────────────────────

export const subscribeProgress = (
  sessionId,
  onData,
  onDone,
  onError
) => {

  const sseUrl =
    `${BASE}/progress/${sessionId}`

  console.log('SSE URL:', sseUrl)

  const es = new EventSource(sseUrl)

  let closedManually = false

  es.onmessage = (event) => {

    try {

      const parsed =
        JSON.parse(event.data)

      onData(parsed)

      if (
        [
          'completed',
          'failed',
          'cancelled'
        ].includes(parsed.status)
      ) {

        closedManually = true

        es.close()

        onDone(parsed)
      }

    } catch (err) {

      console.error(
        'SSE parse error:',
        err
      )

      onError(err)
    }
  }

  es.onerror = (err) => {

    if (closedManually) return

    console.error(
      'SSE connection error:',
      err
    )

    closedManually = true

    es.close()

    onError(
      new Error('SSE connection lost')
    )
  }

  return () => {

    closedManually = true

    es.close()
  }
}

// ─── Download ZIP ────────────────────────────────────────────────────────────

export const downloadZip = async (
  sessionId,
  filename = 'imagepress'
) => {

  const response = await axios.get(
    `${BASE}/download/${sessionId}`,
    {
      responseType: 'blob',
    }
  )

  const url =
    URL.createObjectURL(response.data)

  const link =
    document.createElement('a')

  link.href = url

  link.download =
    `${filename}_${sessionId.slice(0, 8)}.zip`

  document.body.appendChild(link)

  link.click()

  document.body.removeChild(link)

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 2000)
}

// ─── Cancel Session ──────────────────────────────────────────────────────────

export const cancelSession = async (
  sessionId
) => {

  await axios.delete(
    `${BASE}/session/${sessionId}`
  )
}