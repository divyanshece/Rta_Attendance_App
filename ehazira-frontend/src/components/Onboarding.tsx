import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronRight, MapPin, Smartphone, BarChart3 } from 'lucide-react'

const ONBOARDING_KEY = 'rta_onboarding_complete'

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true'
}

export function completeOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, 'true')
}

const slides = [
  {
    icon: Smartphone,
    title: 'Smart Attendance',
    subtitle: 'Effortless & Real-time',
    description:
      'Take attendance in seconds with a unique OTP system. Students mark their presence instantly — no paper, no delays.',
    gradient: 'from-amber-500 to-orange-500',
    bgAccent: 'bg-amber-500/10',
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
  },
  {
    icon: MapPin,
    title: 'GPS Verified',
    subtitle: 'Location-based Security',
    description:
      'Every attendance is verified with GPS location. Only students physically present in the classroom can mark attendance.',
    gradient: 'from-emerald-500 to-teal-500',
    bgAccent: 'bg-emerald-500/10',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
  },
  {
    icon: BarChart3,
    title: 'Insights & Reports',
    subtitle: 'Track Everything',
    description:
      'Teachers get detailed analytics and exportable reports. Students can track their attendance across all subjects at a glance.',
    gradient: 'from-violet-500 to-purple-500',
    bgAccent: 'bg-violet-500/10',
    iconBg: 'bg-gradient-to-br from-violet-400 to-purple-500',
  },
]

interface OnboardingProps {
  onComplete: () => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchDelta, setTouchDelta] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimating || index === currentSlide) return
      setIsAnimating(true)
      setCurrentSlide(index)
      setTimeout(() => setIsAnimating(false), 400)
    },
    [isAnimating, currentSlide]
  )

  const handleNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      goToSlide(currentSlide + 1)
    } else {
      completeOnboarding()
      onComplete()
    }
  }, [currentSlide, goToSlide, onComplete])

  const handleSkip = useCallback(() => {
    completeOnboarding()
    onComplete()
  }, [onComplete])

  // Touch handling for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
    setTouchDelta(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const delta = e.touches[0].clientX - touchStart
    setTouchDelta(delta)
  }

  const handleTouchEnd = () => {
    if (touchStart === null) return
    const threshold = 60
    if (touchDelta < -threshold && currentSlide < slides.length - 1) {
      goToSlide(currentSlide + 1)
    } else if (touchDelta > threshold && currentSlide > 0) {
      goToSlide(currentSlide - 1)
    }
    setTouchStart(null)
    setTouchDelta(0)
  }

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext()
      if (e.key === 'ArrowLeft' && currentSlide > 0) goToSlide(currentSlide - 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentSlide, handleNext, goToSlide])

  const slide = slides[currentSlide]
  const isLastSlide = currentSlide === slides.length - 1

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[10000] bg-white dark:bg-slate-950 flex flex-col overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl opacity-20 transition-colors duration-700 bg-gradient-to-br ${slide.gradient}`}
        />
        <div
          className={`absolute -bottom-32 -left-32 w-72 h-72 rounded-full blur-3xl opacity-15 transition-colors duration-700 bg-gradient-to-br ${slide.gradient}`}
        />
      </div>

      {/* Skip button */}
      <div className="relative z-10 flex justify-end px-6 pt-14 pb-2">
        {!isLastSlide && (
          <button
            onClick={handleSkip}
            className="text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors px-3 py-1.5"
          >
            Skip
          </button>
        )}
      </div>

      {/* Slide content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
        {/* Illustration area */}
        <div className="mb-12 relative">
          {/* Outer ring */}
          <div
            className={`w-44 h-44 rounded-full ${slide.bgAccent} dark:opacity-30 flex items-center justify-center transition-all duration-500`}
          >
            {/* Inner ring */}
            <div
              className={`w-32 h-32 rounded-full ${slide.bgAccent} dark:opacity-50 flex items-center justify-center transition-all duration-500`}
            >
              {/* Icon circle */}
              <div
                className={`w-20 h-20 rounded-2xl ${slide.iconBg} shadow-xl flex items-center justify-center transition-all duration-500`}
              >
                <slide.icon className="w-10 h-10 text-white" strokeWidth={1.8} />
              </div>
            </div>
          </div>

          {/* Floating particles */}
          <div
            className={`absolute top-4 right-2 w-3 h-3 rounded-full bg-gradient-to-br ${slide.gradient} opacity-60 animate-bounce`}
            style={{ animationDelay: '0.2s', animationDuration: '2s' }}
          />
          <div
            className={`absolute bottom-8 left-0 w-2 h-2 rounded-full bg-gradient-to-br ${slide.gradient} opacity-40 animate-bounce`}
            style={{ animationDelay: '0.8s', animationDuration: '2.5s' }}
          />
          <div
            className={`absolute top-12 -left-4 w-2.5 h-2.5 rounded-full bg-gradient-to-br ${slide.gradient} opacity-50 animate-bounce`}
            style={{ animationDelay: '0.5s', animationDuration: '3s' }}
          />
        </div>

        {/* Text content */}
        <div className="text-center max-w-sm">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.2em] mb-3 bg-gradient-to-r ${slide.gradient} bg-clip-text text-transparent transition-all duration-500`}
          >
            {slide.subtitle}
          </p>
          <h1 className="text-3xl font-heading font-bold text-slate-800 dark:text-white mb-4 transition-all duration-500">
            {slide.title}
          </h1>
          <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 transition-all duration-500">
            {slide.description}
          </p>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 px-8 pb-12 pt-6">
        {/* Dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? `w-8 h-2 bg-gradient-to-r ${slide.gradient}`
                  : 'w-2 h-2 bg-slate-300 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Action button */}
        <button
          onClick={handleNext}
          className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-base bg-gradient-to-r ${slide.gradient} shadow-lg transition-all duration-300 active:scale-[0.98]`}
        >
          {isLastSlide ? 'Get Started' : 'Next'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
