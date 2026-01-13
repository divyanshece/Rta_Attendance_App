import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { websocketService } from '@/services/websocket'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default function StudentAttendance() {
  const navigate = useNavigate()
  const { accessToken, user } = useAuthStore()
  console.log('👤 STUDENT USER:', user)
  console.log('📧 STUDENT EMAIL:', user?.email)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [otp, setOtp] = useState(['', '', '', '']) // 4 DIGITS
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [retryCount, setRetryCount] = useState(0) // RETRY COUNTER
  const [isBlocked, setIsBlocked] = useState(false) // BLOCKED AFTER 3 ATTEMPTS

  useEffect(() => {
    if (accessToken) {
      websocketService.on('*', msg => console.log('🔥 RECEIVED:', msg))

      websocketService.on('attendance_started', msg => {
        if (msg.session_id) {
          setSessionId(msg.session_id)
          toast.success('Attendance session started!')
        }
      })

      websocketService.on('otp_result', (msg: { success?: boolean; message?: string }) => {
        setIsSubmitting(false)
        if (msg.success) {
          setAttendanceMarked(true)
          toast.success(msg.message || 'Attendance marked!')
          setTimeout(() => {
            navigate('/student')
          }, 2000)
        } else {
          const newRetryCount = retryCount + 1
          setRetryCount(newRetryCount)

          if (newRetryCount >= 3) {
            setIsBlocked(true)
            toast.error('Maximum attempts reached. Returning to home...')
            setTimeout(() => {
              navigate('/student')
            }, 3000)
          } else {
            toast.error(`${msg.message} (Attempt ${newRetryCount}/3)`)
            setOtp(['', '', '', ''])
            document.getElementById('otp-0')?.focus()
          }
        }
      })

      websocketService.on('attendance_closed', () => {
        toast('Session closed by teacher', { icon: 'ℹ️' })
        navigate('/student')
      })

      websocketService.connect(accessToken).then(() => {
        setIsConnected(true)
      })
    }

    return () => {
      websocketService.disconnect()
    }
  }, [accessToken, navigate, retryCount])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return
    // Accept alphanumeric characters (letters and numbers)
    if (!/^[a-zA-Z0-9]*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value.toUpperCase() // Convert to uppercase for consistency
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

    console.log('🔵 STUDENT SENDING:', {
      type: 'submit_otp',
      session_id: sessionId,
      otp: otpValue,
      student_email: user?.email,
    })
    console.log('👤 User object:', user)

    setIsSubmitting(true)
    websocketService.send({
      type: 'submit_otp',
      session_id: sessionId,
      otp: otpValue,
      student_email: user?.email,
    })
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 text-center border-red-200 dark:border-red-800">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl text-red-600 dark:text-red-400">
              Maximum Attempts Reached
            </CardTitle>
            <CardDescription className="text-base mt-2">
              You've used all 3 attempts. Please contact your teacher.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (attendanceMarked) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-600 dark:text-green-400">
              Attendance Marked!
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Your attendance has been recorded successfully
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/student')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Mark Attendance
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Waiting for session</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
              <CardTitle className="text-2xl">Waiting for Teacher</CardTitle>
              <CardDescription className="text-base mt-2">
                The teacher hasn't started the attendance session yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}
                />
                {isConnected ? 'Connected' : 'Connecting...'}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/student')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Mark Attendance
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter the OTP from teacher
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Enter 4-Digit OTP</CardTitle>
            <CardDescription className="text-base mt-2">
              Enter the code displayed by your teacher
            </CardDescription>
            {retryCount > 0 && (
              <div className="mt-3">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Attempts remaining: {3 - retryCount}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="pb-8">
            {/* OTP Input Boxes - 4 DIGITS */}
            <div className="flex justify-center gap-4 mb-8">
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
                  className="w-16 h-16 text-center text-3xl font-bold border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:bg-gray-800 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-900 transition-all uppercase"
                  disabled={isSubmitting || isBlocked}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {/* Submit Button */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting || otp.join('').length !== 4 || isBlocked}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Attendance'
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
