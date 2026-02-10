import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onFinish: () => void
  minDuration?: number
}

export default function SplashScreen({ onFinish, minDuration = 2000 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true)
      // Wait for fade animation to complete before calling onFinish
      setTimeout(onFinish, 400)
    }, minDuration)

    return () => clearTimeout(timer)
  }, [minDuration, onFinish])

  return (
    <div
      className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-white dark:bg-slate-900 transition-opacity duration-400 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-orange-50/50 via-transparent to-orange-50/30 dark:from-orange-950/20 dark:via-transparent dark:to-orange-950/10" />

      {/* Content container */}
      <div className="relative flex flex-col items-center">
        {/* Logo with entrance animation */}
        <div className="animate-splash-logo">
          <img
            src="/logo.png"
            alt="Rta"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-lg"
          />
        </div>

        {/* App name */}
        <h1 className="mt-6 text-2xl sm:text-3xl font-bold tracking-wide text-slate-800 dark:text-white animate-splash-text">
          Rta
        </h1>

        {/* Tagline */}
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 animate-splash-text animation-delay-100">
          Smart Attendance
        </p>
      </div>

      {/* Loading dots at bottom */}
      <div className="absolute bottom-16 sm:bottom-20 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce-dot" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce-dot" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce-dot" style={{ animationDelay: '300ms' }} />
      </div>

      {/* Version at very bottom */}
      <p className="absolute bottom-6 text-xs text-slate-400 dark:text-slate-500">
        v1.0.0
      </p>
    </div>
  )
}
