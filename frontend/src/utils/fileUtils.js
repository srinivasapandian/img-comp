// ─── Compress: JPG, PNG, WEBP ─────────────────────────────────────────────────
export const COMPRESS_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
export const COMPRESS_MIME       = new Set(['image/jpeg', 'image/png', 'image/webp'])

// ─── Convert: adds BMP, TIFF, GIF ────────────────────────────────────────────
export const CONVERT_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff', '.tif', '.gif',
])
export const CONVERT_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff', 'image/gif',
])

export const isCompressFile = (file) => {
  if (COMPRESS_MIME.has(file.type)) return true
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  return COMPRESS_EXTENSIONS.has(ext)
}

export const isConvertFile = (file) => {
  if (CONVERT_MIME.has(file.type)) return true
  const ext = '.' + file.name.split('.').pop().toLowerCase()
  return CONVERT_EXTENSIONS.has(ext)
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export const getExtIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase()
  const map = {
    jpg: '🟧', jpeg: '🟧',
    png: '🟦',
    webp: '🟩',
    bmp: '🟫',
    tiff: '🟪', tif: '🟪',
    gif: '🌀',
  }
  return map[ext] || '🖼️'
}

/**
 * Recursively traverse a FileSystemEntry (file or directory).
 * Handles the browser's batched readEntries API correctly.
 */
export const traverseEntry = async (entry, basePath = '') => {
  const results = []

  if (entry.isFile) {
    await new Promise((resolve) => {
      entry.file((file) => {
        const rel = basePath ? `${basePath}/${file.name}` : file.name
        results.push({ file, relativePath: rel })
        resolve()
      }, resolve)
    })
  } else if (entry.isDirectory) {
    const dirPath = basePath ? `${basePath}/${entry.name}` : entry.name
    const reader  = entry.createReader()

    // readEntries may return in batches — keep reading until empty batch
    const allEntries = await new Promise((resolve) => {
      const collected = []
      const readBatch = () => {
        reader.readEntries((batch) => {
          if (batch.length === 0) {
            resolve(collected)
          } else {
            collected.push(...batch)
            readBatch()
          }
        }, () => resolve(collected))
      }
      readBatch()
    })

    for (const child of allEntries) {
      const sub = await traverseEntry(child, dirPath)
      results.push(...sub)
    }
  }

  return results
}

/**
 * Build a nested tree structure from flat { id, relativePath, file } items.
 */
export const buildTree = (items) => {
  const root = { name: 'root', children: {}, files: [] }

  items.forEach(({ id, relativePath, file }) => {
    const parts = relativePath.replace(/\\/g, '/').split('/')
    let node = root

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!node.children[part]) {
        node.children[part] = { name: part, children: {}, files: [] }
      }
      node = node.children[part]
    }

    node.files.push({ id, name: parts[parts.length - 1], relativePath, file })
  })

  return root
}
