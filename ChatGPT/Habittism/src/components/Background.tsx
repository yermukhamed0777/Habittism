import { cn } from '../lib/utils'

interface BackgroundProps {
  className?: string
}

/**
 * Ambient aurora field that sits behind every glass surface.
 * Three slow-drifting radial blooms + a fine grain overlay give the
 * frosted panels something rich to refract.
 */
export function Background({ className }: BackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950', className)}
    >
      {/* Base gradient wash */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,#141833_0%,#0a0c16_45%,#05060a_100%)]" />

      {/* Aurora blooms — clipped to the viewport so they never create overflow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[18%] left-[8%] h-[52vw] w-[52vw] animate-drift-a rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.34)_0%,rgba(139,92,246,0.10)_38%,transparent_70%)] blur-[70px]" />
        <div className="absolute -right-[10%] top-[6%] h-[46vw] w-[46vw] animate-drift-b rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.26)_0%,rgba(34,211,238,0.08)_40%,transparent_70%)] blur-[80px]" />
        <div className="absolute bottom-[-14%] left-[32%] h-[48vw] w-[48vw] animate-drift-c rounded-full bg-[radial-gradient(circle,rgba(52,211,153,0.18)_0%,rgba(52,211,153,0.05)_42%,transparent_72%)] blur-[90px]" />
      </div>

      {/* Faint grid for depth */}
      <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.022)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(80%_60%_at_50%_30%,#000_0%,transparent_100%)]" />

      {/* Grain */}
      <div className="absolute inset-0 opacity-[0.28] mix-blend-overlay [background-image:url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27160%27 height=%27160%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.8%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27160%27 height=%27160%27 filter=%27url(%23n)%27/%3E%3C/svg%3E')]" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_50%,transparent_45%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  )
}
