import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { websocketService } from '@/services/websocket'
import { studentAPI } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, CheckCircle2, XCircle, MapPin, ShieldAlert } from 'lucide-react'
import { getCurrentPosition } from '@/utils/native'

export default function StudentAttendance() {
  const navigate = useNavigate()
  const { accessToken, user } = useAuthStore()
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [otp, setOtp] = useState(['', '', '', ''])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isBlocked, setIsBlocked] = useState(false)
  const [studentLocation, setStudentLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'pending' | 'acquired' | 'denied' | 'error'>('pending')
  const [isProxy, setIsProxy] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Start GPS acquisition immediately
  useEffect(() => {
    setLocationStatus('pending')
    getCurrentPosition()
      .then((loc) => {
        setStudentLocation(loc)
        setLocationStatus('acquired')
      })
      .catch(() => {
        setLocationStatus('denied')
      })
  }, [])

  // Poll for active sessions (primary discovery method - works even when Redis/WebSocket is down)
  useEffect(() => {
    if (sessionId) return // Already have a session, stop polling

    let active = true

    const checkSession = async () => {
      if (!active) return
      try {
        const data = await studentAPI.checkActiveSession()
        if (active && data.active_session) {
          setSessionId(data.active_session.session_id)
          toast.success('Session found!')
        }
      } catch (err) {
        console.log('[poll] active-session check failed:', err)
      }
    }

    // Check immediately
    checkSession()
    // Then poll every 2 seconds for faster detection
    pollRef.current = setInterval(checkSession, 2000)

    return () => {
      active = false
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [sessionId])

  // WebSocket connection (works when Redis is available)
  useEffect(() => {
    if (!accessToken) return

    websocketService.on('attendance_started', msg => {
      if (msg.session_id) {
        setSessionId(msg.session_id)
        toast.success('Attendance session started!')
      }
    })

    websocketService.on('otp_result', (msg: { success?: boolean; message?: string; status?: string }) => {
      setIsSubmitting(false)
      if (msg.success) {
        if (msg.status === 'X') {
          setIsProxy(true)
          toast.error(msg.message || 'Attendance flagged as Proxy')
          setTimeout(() => navigate('/student'), 3000)
        } else {
          setAttendanceMarked(true)
          toast.success(msg.message || 'Attendance marked!')
          setTimeout(() => navigate('/student'), 2000)
        }
      } else {
        const newRetryCount = retryCount + 1
        setRetryCount(newRetryCount)
        if (newRetryCount >= 3) {
          setIsBlocked(true)
          toast.error('Maximum attempts reached.')
          setTimeout(() => navigate('/student'), 3000)
        } else {
          toast.error(`${msg.message} (${newRetryCount}/3)`)
          setOtp(['', '', '', ''])
          document.getElementById('otp-0')?.focus()
        }
      }
    })

    websocketService.on('attendance_closed', () => {
      toast('Session closed by teacher', { icon: 'ℹ️' })
      navigate('/student')
    })

    websocketService.connect(accessToken).then(() => setIsConnected(true))

    return () => {
      websocketService.disconnect()
    }
  }, [accessToken, navigate, retryCount])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return
    if (!/^[a-zA-Z0-9]*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.toUpperCase()
    setOtp(newOtp)
    if (value && index < 3) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }

  const handleSubmit = () => {
    const otpValue = otp.join('')
    if (otpValue.length !== 4) {
      toast.error('Please enter complete OTP')
      return
    }
    setIsSubmitting(true)
    websocketService.send({
      type: 'submit_otp',
      session_id: sessionId,
      otp: otpValue,
      student_email: user?.email,
      latitude: studentLocation?.lat ?? null,
      longitude: studentLocation?.lng ?? null,
    })
  }

  // Result screens
  if (isProxy) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-xl font-heading font-bold text-purple-600 dark:text-purple-400 mb-2">Attendance Flagged</h2>
          <p className="text-sm text-muted-foreground">Your location couldn't be verified. Your teacher will review this.</p>
        </div>
      </div>
    )
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-4">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-heading font-bold text-red-600 dark:text-red-400 mb-2">Max Attempts Reached</h2>
          <p className="text-sm text-muted-foreground">Please contact your teacher.</p>
        </div>
      </div>
    )
  }

  if (attendanceMarked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-heading font-bold text-emerald-600 dark:text-emerald-400 mb-2">Attendance Marked!</h2>
          <p className="text-sm text-muted-foreground">Your attendance has been recorded.</p>
        </div>
      </div>
    )
  }

  // Waiting for session
  if (!sessionId) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 glass border-b safe-top">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/student')} className="rounded-xl h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-base font-heading font-bold text-foreground">Mark Attendance</h1>
            </div>
          </div>
        </header>

        <main className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-heading font-semibold text-foreground mb-1">Waiting for Teacher</h2>
            <p className="text-sm text-muted-foreground mb-3">Session hasn't started yet</p>
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {isConnected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // OTP entry screen
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b safe-top">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/student')} className="rounded-xl h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base font-heading font-bold text-foreground">Enter OTP</h1>
          </div>
        </div>
      </header>

      <main className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="text-xl font-heading font-bold text-foreground mb-1">Enter 4-Digit Code</h2>
            <p className="text-sm text-muted-foreground">From your teacher's screen</p>
            {retryCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Attempts remaining: {3 - retryCount}
              </p>
            )}
          </div>

          {/* OTP Inputs */}
          <div className="flex justify-center gap-3 mb-6">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="text"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                className="w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:bg-slate-800 dark:border-slate-600 dark:focus:border-amber-400 dark:focus:ring-amber-900 transition-all uppercase bg-background text-foreground"
                disabled={isSubmitting || isBlocked}
                autoFocus={index === 0}
              />
            ))}
          </div>

          {/* Location status */}
          <div className="flex items-center justify-center gap-1.5 text-xs mb-6">
            <MapPin className={`h-3.5 w-3.5 ${
              locationStatus === 'acquired' ? 'text-emerald-500' :
              locationStatus === 'denied' || locationStatus === 'error' ? 'text-amber-500' :
              'text-muted-foreground animate-pulse'
            }`} />
            <span className={
              locationStatus === 'acquired' ? 'text-emerald-600 dark:text-emerald-400' :
              locationStatus === 'denied' || locationStatus === 'error' ? 'text-amber-600 dark:text-amber-400' :
              'text-muted-foreground'
            }>
              {locationStatus === 'acquired' ? 'Location acquired' :
               locationStatus === 'denied' ? 'Location denied' :
               locationStatus === 'error' ? 'Location unavailable' :
               'Getting location...'}
            </span>
          </div>

          <Button
            className="w-full rounded-xl h-11 bg-amber-500 hover:bg-amber-600 font-semibold"
            onClick={handleSubmit}
            disabled={isSubmitting || otp.join('').length !== 4 || isBlocked}
          >
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
            ) : (
              'Submit'
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}
