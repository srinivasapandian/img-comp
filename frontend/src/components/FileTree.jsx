import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { buildTree, formatBytes, getExtIcon } from '../utils/fileUtils'

export default function FileTree({ files, onRemove, phase }) {
  const tree = buildTree(files)
  const isLocked = phase === 'compressing' || phase === 'done'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-500/60">
        <span className="text-sm font-semibold text-slate-300">
          File Queue{' '}
          <span className="ml-1 text-xs text-slate-500 font-normal">{files.length} image{files.length !== 1 ? 's' : ''}</span>
        </span>
        <span className="text-xs text-slate-500">
          {formatBytes(files.reduce((a, f) => a + (f.file?.size || 0), 0))}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        <TreeNode node={tree} depth={0} onRemove={onRemove} isLocked={isLocked} isRoot />
      </div>
    </div>
  )
}

function TreeNode({ node, depth, onRemove, isLocked, isRoot = false }) {
  const [open, setOpen] = useState(true)
  const hasChildren = Object.keys(node.children).length > 0
  const hasFiles    = node.files.length > 0

  if (isRoot) {
    return (
      <>
        {Object.values(node.children).map((child) => (
          <TreeNode key={child.name} node={child} depth={depth} onRemove={onRemove} isLocked={isLocked} />
        ))}
        {node.files.map((f) => (
          <FileRow key={f.id} file={f} depth={depth} onRemove={onRemove} isLocked={isLocked} />
        ))}
      </>
    )
  }

  return (
    <div>
      {/* Folder row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-600/40 transition-colors text-left group"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="text-xs text-slate-500 transition-transform duration-200" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
          ▶
        </span>
        <span className="text-base">📁</span>
        <span className="text-sm text-slate-300 font-medium flex-1 truncate">{node.name}</span>
        <span className="text-xs text-slate-600 group-hover:text-slate-500">
          {countFiles(node)}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {Object.values(node.children).map((child) => (
              <TreeNode key={child.name} node={child} depth={depth + 1} onRemove={onRemove} isLocked={isLocked} />
            ))}
            {node.files.map((f) => (
              <FileRow key={f.id} file={f} depth={depth + 1} onRemove={onRemove} isLocked={isLocked} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FileRow({ file, depth, onRemove, isLocked }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-600/30 group transition-colors"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      <span className="text-sm">{getExtIcon(file.name)}</span>
      <span className="text-sm text-slate-400 flex-1 truncate group-hover:text-slate-300">{file.name}</span>
      <span className="text-xs text-slate-600">{formatBytes(file.file?.size || 0)}</span>
      {!isLocked && (
        <button
          onClick={() => onRemove(file.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-600 hover:text-red-400 ml-1"
          title="Remove"
        >
          ✕
        </button>
      )}
    </motion.div>
  )
}

function countFiles(node) {
  let count = node.files.length
  for (const child of Object.values(node.children)) count += countFiles(child)
  return count
}
