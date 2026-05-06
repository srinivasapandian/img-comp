import { motion } from 'framer-motion'

const PRESETS = [
  { key: 'high',     label: 'High Quality', desc: 'q95 · PNG 256 colors',  color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400' },
  { key: 'balanced', label: 'Balanced',     desc: 'q85 · PNG 217 colors',  color: 'border-brand-cyan/40 bg-brand-cyan/5 text-brand-cyan' },
  { key: 'small',    label: 'Max Compress', desc: 'q65 · PNG 166 colors',  color: 'border-amber-500/40 bg-amber-500/5 text-amber-400' },
  { key: 'lossless', label: 'Lossless',     desc: 'PNG deflate only',       color: 'border-brand-indigo/40 bg-brand-indigo/5 text-brand-indigo' },
]

export default function CompressionSettings({ settings, onUpdate, onPreset, disabled }) {
  const { quality, lossless, preset } = settings
  const pngColors = Math.max(8, Math.min(256, Math.round(quality / 100 * 256)))

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-dark-500/60">
        <h3 className="text-sm font-semibold text-slate-200">Compression Settings</h3>
      </div>

      <div className="p-5 space-y-6">
        {/* Presets */}
        <div>
          <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Presets</p>
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
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Quality</p>
            <span className={`text-sm font-bold tabular-nums ${
              quality >= 80 ? 'text-emerald-400' : quality >= 60 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {quality}
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
            <p className="text-sm text-slate-300 font-medium">Lossless Mode</p>
            <p className="text-xs text-slate-500 mt-0.5">PNG: skip quantisation · WEBP: pixel-perfect</p>
          </div>
          <button
            disabled={disabled}
            onClick={() => onUpdate({ lossless: !lossless, preset: 'custom' })}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              lossless ? 'bg-brand-indigo' : 'bg-dark-500'
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

        {/* Format-specific info */}
        <div className="space-y-2">
          {/* JPEG info */}
          <div className="rounded-xl bg-dark-700/50 border border-dark-500/40 p-3 text-xs text-slate-500 space-y-1.5">
            <p className="text-slate-400 font-medium mb-2">Per-format behaviour</p>
            <div className="flex justify-between">
              <span>JPG / JPEG</span>
              <span className="text-slate-400">
                {lossless ? 'n/a (use PNG)' : `q${quality} + 4:${quality >= 90 ? '4:4' : '2:0'} subsampling`}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span>PNG</span>
              <span className="text-slate-400 text-right">
                {lossless
                  ? 'deflate only (lossless)'
                  : `quantise → ${pngColors} colours + dither`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>WEBP</span>
              <span className="text-slate-400">
                {lossless ? 'lossless' : `q${quality} lossy`}
              </span>
            </div>
          </div>

          {/* PNG tip */}
          {!lossless && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300/80">
              <span className="font-semibold">PNG tip: </span>
              {quality >= 85
                ? `${pngColors}-colour palette preserves near-original quality with significant size savings.`
                : quality >= 65
                ? `${pngColors} colours — good balance. Slight banding possible on photos.`
                : `${pngColors} colours — aggressive. Best for graphics/icons. Photos may show banding.`}
              <span className="block mt-1 text-amber-400/60">
                For photos, "Convert to WEBP" tab gives better results.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
