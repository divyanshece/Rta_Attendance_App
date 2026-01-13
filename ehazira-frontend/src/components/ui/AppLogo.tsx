import { cn } from '@/lib/utils'

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
  className?: string
}

export function AppLogo({ size = 'md', showTagline = false, className }: AppLogoProps) {
  const sizes = {
    sm: {
      container: 'gap-2',
      image: 'w-7 h-7',
      text: 'text-lg',
      tagline: 'text-[10px]',
    },
    md: {
      container: 'gap-3',
      image: 'w-10 h-10',
      text: 'text-2xl',
      tagline: 'text-xs',
    },
    lg: {
      container: 'gap-4',
      image: 'w-20 h-20',
      text: 'text-5xl',
      tagline: 'text-sm',
    },
  }

  const s = sizes[size]

  return (
    <div className={cn('flex items-center', s.container, className)}>
      {/* Logo Image */}
      <img
        src="/logo.jpg"
        alt="Ṛta"
        className={cn(s.image, 'rounded-xl shadow-lg object-cover')}
      />

      {/* Text Logo */}
      <div className="flex flex-col">
        <div className="relative">
          {/* Main text with saffron gradient */}
          <span
            className={cn(
              'font-heading font-bold tracking-tight',
              'bg-gradient-to-br from-amber-600 via-orange-500 to-amber-700 bg-clip-text text-transparent',
              'dark:from-amber-400 dark:via-orange-400 dark:to-amber-500',
              s.text
            )}
            style={{
              WebkitBackgroundClip: 'text',
            }}
          >
            Ṛta
          </span>
        </div>

        {/* Tagline */}
        {showTagline && (
          <span
            className={cn(
              'text-muted-foreground font-medium tracking-widest uppercase mt-1',
              s.tagline
            )}
          >
            Real-time Attendance
          </span>
        )}
      </div>
    </div>
  )
}

// Compact version for very small spaces (like footer version info)
export function AppLogoCompact({ className }: { className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <img
        src="/logo.jpg"
        alt="Ṛta"
        className="w-6 h-6 rounded-lg object-cover"
      />
      <span className="font-heading font-semibold text-sm bg-gradient-to-br from-amber-600 to-orange-500 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400">
        Ṛta
      </span>
    </div>
  )
}

// Icon only version - just the logo image
export function AppLogoIcon({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg', className?: string }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }

  return (
    <img
      src="/logo.jpg"
      alt="Ṛta"
      className={cn(sizes[size], 'rounded-xl shadow-lg object-cover', className)}
    />
  )
}

export default AppLogo
