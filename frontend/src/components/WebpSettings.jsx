import { motion } from 'framer-motion'

const PRESETS = [
  { key: 'high',     label: 'High Quality', desc: 'q95, near-lossless', color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400' },
  { key: 'balanced', label: 'Balanced',     desc: 'q85, recommended',  color: 'border-brand-cyan/40 bg-brand-cyan/5 text-brand-cyan' },
  { key: 'small',    label: 'Max Compress', desc: 'q65, smallest',     color: 'border-amber-500/40 bg-amber-500/5 text-amber-400' },
  { key: 'lossless', label: 'Lossless',     desc: 'perfect quality',   color: 'border-violet-500/40 bg-violet-500/5 text-violet-400' },
]

const SUPPORTED_FMT = ['JPG', 'PNG', 'BMP', 'TIFF', 'GIF', 'WEBP']

export default function WebpSettings({ settings, onUpdate, onPreset, disabled }) {
  const { quality, lossless, preset } = settings

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-500/60">
        <h3 className="text-sm font-semibold text-slate-200">WEBP Settings</h3>
        <p className="text-xs text-slate-500 mt-0.5">Output: original filename + .webp</p>
      </div>

      <div className="p-5 space-y-6">
        {/* Supported formats */}
        <div>
          <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Supported Input</p>
          <div className="flex flex-wrap gap-1.5">
            {SUPPORTED_FMT.map((fmt) => (
              <span key={fmt} className="px-2.5 py-1 text-xs rounded-lg bg-dark-600/60 border border-dark-500 text-slate-400">
                {fmt}
              </span>
            ))}
          </div>
        </div>

        {/* Presets */}
        <div>
          <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Quality Presets</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                disabled={disabled}
                onClick={() => onPreset(p.key)}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all duration-200 ${
                  preset === p.key
                    ? p.color
                    : 'border-dark-500 text-slate-500 hover:border-dark-500/80 hover:text-slate-400'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="text-xs font-semibold leading-none mb-1">{p.label}</div>
                <div className="text-xs opacity-70">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quality slider */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">WEBP Quality</p>
            <span className={`text-sm font-bold tabular-nums ${
              quality >= 80 ? 'text-emerald-400' : quality >= 60 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {lossless ? '100 (lossless)' : quality}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={quality}
            disabled={disabled || lossless}
            onChange={(e) => onUpdate({ quality: Number(e.target.value), preset: 'custom' })}
            className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, #06b6d4 ${quality}%, #1f3255 ${quality}%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            {[1, 25, 50, 75, 100].map((v) => (
              <span key={v} className="text-xs text-slate-600">{v}</span>
            ))}
          </div>
        </div>

        {/* Lossless toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300 font-medium">Lossless WEBP</p>
            <p className="text-xs text-slate-500 mt-0.5">Pixel-perfect, larger files</p>
          </div>
          <button
            disabled={disabled}
            onClick={() => onUpdate({ lossless: !lossless, preset: 'custom' })}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              lossless ? 'bg-violet-500' : 'bg-dark-500'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <motion.span
              layout
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
              animate={{ left: lossless ? '1.375rem' : '0.25rem' }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Info table */}
        <div className="rounded-xl bg-dark-700/50 border border-dark-500/40 p-3 text-xs text-slate-500 space-y-1.5">
          <div className="flex justify-between">
            <span>Output format</span><span className="text-brand-cyan font-medium">WEBP</span>
          </div>
          <div className="flex justify-between">
            <span>Filename</span><span className="text-slate-400">kept, .webp extension</span>
          </div>
          <div className="flex justify-between">
            <span>Folder structure</span><span className="text-slate-400">preserved in ZIP</span>
          </div>
          <div className="flex justify-between">
            <span>Compression</span>
            <span className="text-slate-400">{lossless ? 'lossless' : `lossy q${quality}`}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
