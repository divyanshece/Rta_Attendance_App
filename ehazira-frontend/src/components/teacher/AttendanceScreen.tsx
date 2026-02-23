import { useState, useEffect, useCallback, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useBlocker } from 'react-router-dom'
import toast from 'react-hot-toast'
import { attendanceAPI } from '@/services/api'
import { useAttendanceStore } from '@/store/attendance'
import { websocketService } from '@/services/websocket'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Sparkles,
  Timer,
  UserCheck,
  UserX,
  Hourglass,
  ChevronDown,
  Search,
  AlertTriangle,
  MapPin,
  Wifi,
  ShieldAlert,
} from 'lucide-react'
import { getCurrentPosition } from '@/utils/native'

interface AttendanceRecord {
  student_email: string
  student_name: string
  roll_no: string
  status: 'P' | 'A' | 'X'
  status_display: string
  submitted_at: string | null
}

interface ClassForAttendance {
  subject_id: number
  subject_name: string
  class_id: number
  class_name: string
  department_name: string
  batch: number
  semester: number
  section: string
  student_count: number
}

type Step = 'select' | 'confirm' | 'active'

export default function TeacherAttendance() {
  const navigate = useNavigate()
  const { accessToken } = useAuthStore()
  const { currentSessionId, otp, reset, setSession } = useAttendanceStore()

  const [step, setStep] = useState<Step>('select')
  const [selectedClass, setSelectedClass] = useState<ClassForAttendance | null>(null)
  const [otpTimer, setOtpTimer] = useState(30)
  const [showSummary, setShowSummary] = useState(false)
  const [sessionClassName, setSessionClassName] = useState('')
  const [sessionSubjectName, setSessionSubjectName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [otpExpired, setOtpExpired] = useState(false)
  const [classMode, setClassMode] = useState<'offline' | 'online'>('offline')
  const [teacherLocation, setTeacherLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')

  // Track if session is active for navigation blocking
  const isSessionActive = !!currentSessionId && step === 'active'
  const isSessionActiveRef = useRef(false)
  isSessionActiveRef.current = isSessionActive

  // Reset session on mount
  useEffect(() => {
    reset()
    setStep('select')
  }, [reset])

  // ─── Navigation Blocking ───────────────────────────────────────────

  // 1. Block React Router navigation (Link clicks, programmatic navigate)
  useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) => {
        if (isSessionActiveRef.current && currentLocation.pathname !== nextLocation.pathname) {
          setShowExitWarning(true)
          return true
        }
        return false
      },
      []
    )
  )

  // 2. Block browser tab/window close with native dialog
  useEffect(() => {
    if (!isSessionActive) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Modern browsers show their own generic message
      e.returnValue = 'You have an active attendance session. Are you sure you want to leave?'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isSessionActive])

  // 3. Block browser back button / gestures via history manipulation
  useEffect(() => {
    if (!isSessionActive) return

    // Push a dummy state so back button triggers popstate instead of leaving
    window.history.pushState({ attendanceSession: true }, '')

    const handlePopState = () => {
      if (isSessionActiveRef.current) {
        // Re-push to stay on the page
        window.history.pushState({ attendanceSession: true }, '')
        setShowExitWarning(true)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isSessionActive])

  // 4. Block Capacitor hardware back button (Android)
  useEffect(() => {
    if (!isSessionActive) return
    let cleanup: (() => void) | undefined

    async function setupBackBlock() {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) return
        const { App: CapApp } = await import('@capacitor/app')
        const listener = await CapApp.addListener('backButton', () => {
          if (isSessionActiveRef.current) {
            setShowExitWarning(true)
          }
        })
        cleanup = () => listener.remove()
      } catch {
        // Not native
      }
    }

    setupBackBlock()
    return () => cleanup?.()
  }, [isSessionActive])

  // 5. Auto-close session on actual unmount (safety net — e.g. force-closed tab)
  useEffect(() => {
    return () => {
      if (!isSessionActiveRef.current) return
      const token = localStorage.getItem('accessToken')
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      try {
        fetch(`${apiUrl}/api/attendance/close`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ session_id: useAttendanceStore.getState().currentSessionId }),
          keepalive: true,
        }).catch(() => {})
      } catch {
        // Best effort
      }
    }
  }, [])

  // ─── Queries & Mutations ───────────────────────────────────────────

  const { data: classes = [], isLoading: isLoadingClasses, error: classesError } = useQuery({
    queryKey: ['classesForAttendance'],
    queryFn: attendanceAPI.getClassesForAttendance,
    enabled: step === 'select',
    retry: 1,
  })

  const { data: liveData, refetch } = useQuery({
    queryKey: ['liveStatus', currentSessionId],
    queryFn: () => attendanceAPI.getLiveStatus(currentSessionId!),
    enabled: !!currentSessionId && step === 'active',
    refetchInterval: 2000,
  })

  const initiateMutation = useMutation({
    mutationFn: (params: { subjectId: number; classMode: 'offline' | 'online'; teacherLatitude?: number; teacherLongitude?: number }) =>
      attendanceAPI.initiate({
        subject_id: params.subjectId,
        date: new Date().toISOString().split('T')[0],
        class_mode: params.classMode,
        teacher_latitude: params.teacherLatitude,
        teacher_longitude: params.teacherLongitude,
      }),
    onSuccess: data => {
      setSession(data.session_id, data.otp, data.expires_in, data.total_students)
      setSessionClassName(data.class_name || selectedClass?.class_name || '')
      setSessionSubjectName(data.subject_name || selectedClass?.subject_name || '')
      setStep('active')
      setOtpTimer(data.expires_in || 15)
      toast.success('Session started!')

      if (accessToken) {
        websocketService.on('attendance_update', msg => {
          toast.success(`${msg.student_email} marked ${msg.status === 'P' ? 'Present' : 'Absent'}`)
          refetch()
        })
        websocketService.connect(accessToken)
      }
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Failed to start session')
    },
  })

  const closeMutation = useMutation({
    mutationFn: () => attendanceAPI.close(currentSessionId!),
    onSuccess: () => {
      toast.success('Session closed and saved')
      websocketService.disconnect()
      setTimeout(() => {
        reset()
        navigate('/teacher')
      }, 500)
    },
  })

  const regenerateOTPMutation = useMutation({
    mutationFn: () => attendanceAPI.regenerateOTP(currentSessionId!),
    onSuccess: async data => {
      setSession(data.session_id, data.otp, data.expires_in, totalStudents)
      setOtpTimer(data.expires_in)
      setOtpExpired(false)
      refetch()
      toast.success('New OTP generated! Absent students reset to pending.')
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Failed to regenerate OTP')
    },
  })

  const manualMarkMutation = useMutation({
    mutationFn: ({ email, status }: { email: string; status: 'P' | 'A' }) =>
      attendanceAPI.manualMark(currentSessionId!, email, status),
    onSuccess: () => {
      refetch()
      toast.success('Attendance updated')
    },
  })

  // OTP countdown timer
  useEffect(() => {
    if (currentSessionId && step === 'active' && otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else if (currentSessionId && step === 'active' && otpTimer === 0 && !otpExpired) {
      setOtpExpired(true)
      toast('OTP timer expired. Regenerate or close session.', { icon: '\u2139\uFE0F' })
    }
  }, [currentSessionId, step, otpTimer, otpExpired])

  // ─── Handlers ──────────────────────────────────────────────────────

  const toggleStudentStatus = (email: string, currentStatus: string) => {
    manualMarkMutation.mutate({ email, status: currentStatus === 'P' ? 'A' : 'P' })
  }

  const handleSelectClass = (cls: ClassForAttendance) => {
    setSelectedClass(cls)
    setStep('confirm')
  }

  const handleStartSession = () => {
    if (!selectedClass) return

    if (classMode === 'offline') {
      setIsGettingLocation(true)
      setLocationError(null)
      getCurrentPosition()
        .then((loc) => {
          setTeacherLocation(loc)
          setIsGettingLocation(false)
          initiateMutation.mutate({
            subjectId: selectedClass.subject_id,
            classMode: 'offline',
            teacherLatitude: loc.lat,
            teacherLongitude: loc.lng,
          })
        })
        .catch(() => {
          setIsGettingLocation(false)
          setLocationError('Could not get your location. Please enable GPS and try again.')
          toast.error('GPS location required for offline class mode')
        })
    } else {
      initiateMutation.mutate({
        subjectId: selectedClass.subject_id,
        classMode: 'online',
      })
    }
  }

  const handleBackClick = () => {
    if (isSessionActive) {
      setShowExitWarning(true)
    } else {
      navigate('/teacher')
    }
  }

  // ─── Derived Data ──────────────────────────────────────────────────

  const students = liveData?.submissions || []
  const presentCount = liveData?.present || 0
  const absentCount = liveData?.absent || 0
  const pendingCount = liveData?.pending || 0
  const proxyCount = liveData?.proxy || 0
  const totalStudents = liveData?.total_students || 0
  const sessionClassMode = liveData?.class_mode || classMode

  const filteredClasses = classes.filter((cls: ClassForAttendance) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      cls.subject_name.toLowerCase().includes(query) ||
      cls.class_name.toLowerCase().includes(query) ||
      cls.department_name.toLowerCase().includes(query) ||
      `sem ${cls.semester}`.includes(query) ||
      `batch ${cls.batch}`.includes(query) ||
      cls.section.toLowerCase().includes(query)
    )
  })

  const filteredStudents = students.filter((s: AttendanceRecord) => {
    if (!studentSearch.trim()) return true
    const q = studentSearch.toLowerCase()
    return (
      s.student_name.toLowerCase().includes(q) ||
      s.roll_no.toLowerCase().includes(q) ||
      s.student_email.toLowerCase().includes(q)
    )
  })

  // ─── Step 1: Class Selection ───────────────────────────────────────

  if (step === 'select' || (!currentSessionId && step !== 'confirm')) {
    return (
      <div className="min-h-screen bg-background bg-gradient-mesh">
        <header className="sticky top-0 z-50 glass border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/teacher')} className="rounded-xl">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-lg font-heading font-bold text-foreground">Take Attendance</h1>
                  <p className="text-xs text-muted-foreground">Select any subject to start</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {isLoadingClasses ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
            </div>
          ) : classesError ? (
            <div className="max-w-md mx-auto text-center py-24">
              <div className="inline-flex p-6 rounded-3xl bg-red-100 dark:bg-red-900/50 mb-6">
                <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-2xl font-heading font-bold text-foreground mb-3">Error Loading Classes</h3>
              <p className="text-muted-foreground mb-6">
                {(classesError as Error & { response?: { data?: { error?: string } } })?.response?.data?.error ||
                 (classesError as Error)?.message ||
                 'Failed to load classes. Please try logging in again.'}
              </p>
              <Button onClick={() => navigate('/teacher')} className="rounded-xl">
                Go Back
              </Button>
            </div>
          ) : classes.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-24">
              <div className="inline-flex p-6 rounded-3xl bg-slate-100 dark:bg-slate-800 mb-6">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-heading font-bold text-foreground mb-3">No Subjects Found</h3>
              <p className="text-muted-foreground mb-6">
                You need to add subjects to your classes before taking attendance.
                <br />
                <span className="text-sm">Go to Classes → Click on a class → Add Subject</span>
              </p>
              <Button onClick={() => navigate('/teacher/classes')} className="rounded-xl">
                Go to Classes
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Quick Select Dropdown */}
              <div className="relative">
                <div className="bg-card rounded-2xl border p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3 font-medium">Quick Select</p>
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border hover:border-amber-500 transition-colors text-left"
                    >
                      <span className="text-foreground font-medium">
                        {selectedClass ? `${selectedClass.subject_name} - ${selectedClass.class_name}` : 'Choose a subject...'}
                      </span>
                      <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-xl shadow-2xl z-50 max-h-80 overflow-hidden">
                        <div className="p-3 border-b sticky top-0 bg-card">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Search subjects, classes..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-60">
                          {filteredClasses.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground text-sm">No subjects found</div>
                          ) : (
                            filteredClasses.map((cls: ClassForAttendance) => (
                              <button
                                key={`dropdown-${cls.class_id}-${cls.subject_id}`}
                                onClick={() => {
                                  handleSelectClass(cls)
                                  setShowDropdown(false)
                                  setSearchQuery('')
                                }}
                                className="w-full p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b last:border-b-0 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-foreground">{cls.subject_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {cls.class_name} • {cls.department_name}
                                    </p>
                                  </div>
                                  <Badge variant="secondary" className="text-xs">
                                    {cls.student_count}
                                  </Badge>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* All Subjects - Compact List */}
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">All Subjects</p>
              <div className="bg-card rounded-xl border divide-y">
                {classes.map((cls: ClassForAttendance) => (
                  <button
                    key={`${cls.class_id}-${cls.subject_id}`}
                    onClick={() => handleSelectClass(cls)}
                    className="w-full flex items-center justify-between px-3 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground truncate">{cls.subject_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {cls.class_name} &middot; {cls.department_name}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] ml-2 flex-shrink-0">
                      {cls.student_count}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ─── Step 2: Confirmation ──────────────────────────────────────────

  if (step === 'confirm' && selectedClass && !currentSessionId) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 glass border-b">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex items-center gap-3 h-14">
              <Button variant="ghost" size="icon" onClick={() => setStep('select')} className="rounded-xl h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-base font-heading font-bold text-foreground">Confirm Session</h1>
                <p className="text-[11px] text-muted-foreground">{selectedClass.subject_name}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-5">
          <div className="space-y-4">
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground">{selectedClass.subject_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedClass.class_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-heading font-bold text-foreground">{selectedClass.student_count}</p>
                  <p className="text-[10px] text-muted-foreground">students</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1 pt-3 border-t">
                <div className="flex justify-between"><span>Department</span><span className="text-foreground">{selectedClass.department_name}</span></div>
                <div className="flex justify-between"><span>Date</span><span className="text-foreground">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
              </div>
            </div>

            {/* Class Mode Toggle */}
            <div className="bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {classMode === 'offline' ? (
                    <MapPin className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Wifi className="h-4 w-4 text-blue-500" />
                  )}
                  <span className="text-sm font-medium text-foreground">Class Mode</span>
                </div>
                <button
                  onClick={() => {
                    setClassMode(classMode === 'offline' ? 'online' : 'offline')
                    setLocationError(null)
                  }}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 ${
                    classMode === 'online' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                    classMode === 'online' ? 'translate-x-8' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {classMode === 'offline'
                  ? 'GPS proximity check (30m). Students outside flagged as Proxy.'
                  : 'No GPS check. Students mark from anywhere.'}
              </p>
              {locationError && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {locationError}
                </p>
              )}
            </div>

            <Button
              className="w-full rounded-xl h-12 bg-amber-500 hover:bg-amber-600 font-semibold"
              onClick={handleStartSession}
              disabled={initiateMutation.isPending || isGettingLocation}
            >
              {isGettingLocation ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Getting GPS...</>
              ) : initiateMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Starting...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />Start Session</>
              )}
            </Button>
          </div>
        </main>
      </div>
    )
  }

  // ─── Step 3: Active Session (Mobile-Optimized) ─────────────────────

  const attendancePercent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-4xl mx-auto px-3 sm:px-6">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="icon" onClick={handleBackClick} className="rounded-xl h-8 w-8 flex-shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-heading font-bold text-foreground truncate">Live Session</h1>
                  <Badge className={`text-[9px] px-1 py-0 flex-shrink-0 ${
                    sessionClassMode === 'offline'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  }`}>
                    {sessionClassMode === 'offline' ? 'Offline' : 'Online'}
                  </Badge>
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{sessionSubjectName} • {sessionClassName}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => refetch()} className="rounded-xl h-8 w-8 flex-shrink-0">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* OTP Display - Compact on mobile */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
          <div className="relative">
            <p className="text-white/60 text-xs sm:text-sm font-medium mb-3 sm:mb-4">Share this code with students</p>
            <div className="flex justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              {otp?.split('').map((digit, i) => (
                <div key={i} className="otp-digit !w-11 !h-14 !text-2xl sm:!w-16 sm:!h-20 sm:!text-4xl md:!w-20 md:!h-24 md:!text-5xl !rounded-lg sm:!rounded-xl">{digit}</div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm ${otpTimer > 0 ? 'bg-white/10 text-white/80' : 'bg-red-500/20 text-red-300'}`}>
                <Timer className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-medium">
                  {otpTimer > 0 ? `${otpTimer}s` : 'Expired'}
                </span>
              </div>
              <Button
                onClick={() => regenerateOTPMutation.mutate()}
                disabled={regenerateOTPMutation.isPending}
                className="rounded-full bg-white/10 hover:bg-white/20 text-white border-0 h-7 sm:h-8 text-xs sm:text-sm px-3"
                size="sm"
              >
                {regenerateOTPMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    New OTP
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Row - Compact horizontal strip on mobile */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {[
            { label: 'Total', value: totalStudents, icon: Users, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
            { label: 'Present', value: presentCount, icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
            { label: 'Pending', value: pendingCount, icon: Hourglass, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' },
            { label: 'Absent', value: absentCount, icon: UserX, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/50' },
          ].map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl sm:rounded-2xl border p-2.5 sm:p-4 text-center">
              <div className={`inline-flex p-1.5 sm:p-2 rounded-lg ${stat.bg} mb-1.5 sm:mb-2`}>
                <stat.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${stat.color}`} />
              </div>
              <p className={`text-lg sm:text-2xl font-heading font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Proxy stat - separate row if offline mode */}
        {sessionClassMode === 'offline' && proxyCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
            <ShieldAlert className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">{proxyCount} Proxy detected</span>
          </div>
        )}

        {/* Attendance progress bar */}
        <div className="bg-card rounded-xl border p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-foreground">Attendance Progress</span>
            <span className="text-xs sm:text-sm font-bold text-foreground">{attendancePercent}%</span>
          </div>
          <div className="h-2 sm:h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${attendancePercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">{presentCount} of {totalStudents} present</span>
            {pendingCount > 0 && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400">{pendingCount} pending</span>
            )}
          </div>
        </div>

        {/* Student List Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-sm sm:text-base text-foreground">Students</h3>
            <Badge variant="secondary" className="text-[10px]">{students.length}</Badge>
          </div>
          <Button
            onClick={() => setShowSummary(true)}
            disabled={closeMutation.isPending}
            className="rounded-xl bg-red-500 hover:bg-red-600 text-white h-8 sm:h-9 text-xs sm:text-sm px-3 sm:px-4"
            size="sm"
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            Close Session
          </Button>
        </div>

        {/* Student Search */}
        {students.length > 5 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search students..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        )}

        {/* Student Cards - Mobile first, table on desktop */}
        {/* Mobile: Card layout */}
        <div className="space-y-2 sm:hidden">
          {filteredStudents.map((student: AttendanceRecord, index: number) => {
            const isPending = !student.submitted_at && student.status !== 'X'
            const isPresent = student.status === 'P'
            const isProxy = student.status === 'X'

            return (
              <div
                key={student.student_email}
                className={`bg-card rounded-xl border p-3 ${isProxy ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {/* Serial + Status indicator dot */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono w-5 text-center">{index + 1}</span>
                    <div className={`w-2 h-2 rounded-full ${
                      isPending ? 'bg-amber-400' : isProxy ? 'bg-purple-500' : isPresent ? 'bg-emerald-500' : 'bg-red-500'
                    }`} />
                  </div>

                  {/* Student info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-foreground truncate">{student.student_name}</p>
                      {student.roll_no && (
                        <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{student.roll_no}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {isPending ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />Pending
                        </span>
                      ) : isProxy ? (
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium flex items-center gap-0.5">
                          <ShieldAlert className="h-2.5 w-2.5" />Proxy
                        </span>
                      ) : isPresent ? (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                          <CheckCircle2 className="h-2.5 w-2.5" />Present
                        </span>
                      ) : (
                        <span className="text-[10px] text-red-600 dark:text-red-400 font-medium flex items-center gap-0.5">
                          <XCircle className="h-2.5 w-2.5" />Absent
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Toggle button */}
                  <button
                    onClick={() => toggleStudentStatus(student.student_email, student.status)}
                    disabled={manualMarkMutation.isPending}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isPresent
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 active:bg-red-200'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 active:bg-emerald-200'
                    }`}
                  >
                    {isPresent ? 'Absent' : 'Present'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop: Table layout */}
        <div className="hidden sm:block bg-card rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">#</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roll No</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {filteredStudents.map((student: AttendanceRecord, index: number) => {
                  const isPending = !student.submitted_at && student.status !== 'X'
                  const isPresent = student.status === 'P'
                  const isProxy = student.status === 'X'

                  return (
                    <tr key={student.student_email} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${isProxy ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''}`}>
                      <td className="py-3 px-4 text-sm text-muted-foreground font-medium">{index + 1}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-sm text-foreground">{student.student_name}</p>
                        <p className="text-xs text-muted-foreground">{student.student_email}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground font-mono">{student.roll_no}</td>
                      <td className="py-3 px-4 text-center">
                        {isPending ? (
                          <Badge className="status-pending border text-xs">
                            <Clock className="h-3 w-3 mr-1" />Pending
                          </Badge>
                        ) : isProxy ? (
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs">
                            <ShieldAlert className="h-3 w-3 mr-1" />Proxy
                          </Badge>
                        ) : isPresent ? (
                          <Badge className="status-present border text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Present
                          </Badge>
                        ) : (
                          <Badge className="status-absent border text-xs">
                            <XCircle className="h-3 w-3 mr-1" />Absent
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant={isPresent ? 'destructive' : 'default'}
                          onClick={() => toggleStudentStatus(student.student_email, student.status)}
                          disabled={manualMarkMutation.isPending}
                          className="rounded-lg text-xs h-7"
                        >
                          {isPresent ? 'Mark Absent' : 'Mark Present'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredStudents.length === 0 && studentSearch && (
          <div className="text-center py-8">
            <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No students match "{studentSearch}"</p>
          </div>
        )}

        {/* Bottom spacer for mobile to prevent content being hidden by safe area */}
        <div className="h-4 sm:h-8" />
      </main>

      {/* Summary / Close Confirmation Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:mx-4">
            <div className="p-5 sm:p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-foreground">Close Session?</h3>
                  <p className="text-xs text-muted-foreground">Review attendance summary</p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-2.5">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-sm text-muted-foreground">Total Students</span>
                <span className="font-heading font-bold text-lg text-foreground">{totalStudents}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl status-present border">
                <span className="text-sm">Present</span>
                <span className="font-heading font-bold text-lg">{presentCount}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl status-absent border">
                <span className="text-sm">Absent</span>
                <span className="font-heading font-bold text-lg">{absentCount}</span>
              </div>
              {pendingCount > 0 && (
                <div className="flex justify-between items-center p-3 rounded-xl status-pending border">
                  <span className="text-sm">Pending → Absent</span>
                  <span className="font-heading font-bold text-lg">{pendingCount}</span>
                </div>
              )}
              {proxyCount > 0 && (
                <div className="flex justify-between items-center p-3 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <span className="text-sm">Proxy → Absent</span>
                  <span className="font-heading font-bold text-lg">{proxyCount}</span>
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6 border-t flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setShowSummary(false)}>
                Go Back
              </Button>
              <Button
                className="flex-1 rounded-xl h-11 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
              >
                {closeMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  'Confirm & Close'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Warning Modal */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
          <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:mx-4">
            <div className="p-5 sm:p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-100 dark:bg-red-900/50">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-foreground">Active Session!</h3>
                  <p className="text-xs text-muted-foreground">Close the session before leaving</p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Please close the session properly to save attendance records.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subject</span>
                  <span className="font-medium text-foreground">{sessionSubjectName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Class</span>
                  <span className="font-medium text-foreground">{sessionClassName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Present</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{presentCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pending</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">{pendingCount}</span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                All pending students will be marked as absent when you close the session.
              </p>
            </div>

            <div className="p-5 sm:p-6 border-t flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setShowExitWarning(false)}>
                Continue Session
              </Button>
              <Button
                className="flex-1 rounded-xl h-11 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => {
                  setShowExitWarning(false)
                  setShowSummary(true)
                }}
              >
                Close Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
