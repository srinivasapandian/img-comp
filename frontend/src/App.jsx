import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCompression }   from './hooks/useCompression'
import { useWebpConverter } from './hooks/useWebpConverter'
import Header    from './components/Header'
import TabNav    from './components/TabNav'
import Toast     from './components/Toast'
import CompressPage from './pages/CompressPage'
import WebpPage     from './pages/WebpPage'

export default function App() {
  const [activeTab, setActiveTab] = useState('compress')

  const compressHook = useCompression()
  const webpHook     = useWebpConverter()

  // Active hook determines what Header shows
  const activeHook = activeTab === 'compress' ? compressHook : webpHook

  const handleTabChange = (tab) => {
    setActiveTab(tab)
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 20% -10%, rgba(6,182,212,0.05) 0%, transparent 60%),' +
            'radial-gradient(ellipse 60% 40% at 80% 110%, rgba(139,92,246,0.05) 0%, transparent 60%)',
        }}
      />

      <Header fileCount={activeHook.files.length} phase={activeHook.phase} />

      {/* Tab navigation (below fixed header) */}
      <div className="pt-14">
        <TabNav active={activeTab} onChange={handleTabChange} />
      </div>

      {/* Toast layers — each tab has its own toasts */}
      <Toast toasts={compressHook.toasts} onRemove={compressHook.removeToast} />
      <Toast toasts={webpHook.toasts}     onRemove={webpHook.removeToast} />

      {/* Page content */}
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{ height: 'calc(100vh - 56px - 48px)' }}
      >
        <AnimatePresence mode="wait">
          {activeTab === 'compress' ? (
            <motion.div
              key="compress"
              className="flex-1 flex flex-col overflow-hidden"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              <CompressPage hook={compressHook} />
            </motion.div>
          ) : (
            <motion.div
              key="convert"
              className="flex-1 flex flex-col overflow-hidden"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
            >
              <WebpPage hook={webpHook} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
