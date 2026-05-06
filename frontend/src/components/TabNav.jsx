import { motion } from 'framer-motion'

const TABS = [
  {
    id: 'compress',
    label: 'Compress Images',
    icon: '🗜️',
    desc: 'Reduce file size, keep format',
  },
  {
    id: 'convert',
    label: 'Convert to WEBP',
    icon: '🔄',
    desc: 'Convert any format → WEBP',
  },
]

export default function TabNav({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b border-dark-600/60 bg-dark-900/60">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors rounded-t-xl ${
            active === tab.id
              ? 'text-white'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>

          {active === tab.id && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-brand-cyan to-brand-indigo rounded-full"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
