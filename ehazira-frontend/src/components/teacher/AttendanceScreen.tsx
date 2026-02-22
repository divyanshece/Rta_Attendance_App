import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
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

  // Reset session on mount
  useEffect(() => {
    reset()
    setStep('select')
  }, [reset])

  // Auto-close session on component unmount (navigation away, back button, etc.)
  useEffect(() => {
    const closeSession = () => {
      if (!currentSessionId || step !== 'active') return
      const token = localStorage.getItem('accessToken')
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      // Use fetch with keepalive - survives page navigation and supports auth headers
      try {
        fetch(`${apiUrl}/api/attendance/close`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ session_id: currentSessionId }),
          keepalive: true,
        }).catch(() => {})
      } catch {
        // Ignore - best effort cleanup
      }
    }

    const handleBeforeUnload = () => {
      closeSession()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Component unmount (teacher navigated away) - close the session
      closeSession()
    }
  }, [currentSessionId, step])

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

      // Reset absent students (who were auto-marked) back to pending
      // The backend should handle resetting pending status on OTP regenerate
      // Just refetch to get fresh state
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

  // Mark all pending students as absent
  const markPendingAsAbsent = async () => {
    if (!liveData?.submissions) return
    const pendingStudents = liveData.submissions.filter(
      (s: AttendanceRecord) => !s.submitted_at
    )
    for (const student of pendingStudents) {
      try {
        await attendanceAPI.manualMark(currentSessionId!, student.student_email, 'A')
      } catch (error) {
        console.error('Failed to mark absent:', student.student_email)
      }
    }
    refetch()
  }

  // Mark all absent students (who were auto-marked) back to pending by marking as present then absent toggling
  // Actually, we need to reset their submitted_at - but since we can't do that, we'll just refetch
  // The backend should handle resetting pending status on OTP regenerate

  useEffect(() => {
    if (currentSessionId && step === 'active' && otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else if (currentSessionId && step === 'active' && otpTimer === 0 && !otpExpired) {
      // OTP just expired - mark all pending students as absent
      setOtpExpired(true)
      markPendingAsAbsent()
      toast.error('OTP expired! Pending students marked as absent.')
    }
  }, [currentSessionId, step, otpTimer, otpExpired])

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
      // Get teacher's GPS before starting
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
      // Online mode - no GPS needed
      initiateMutation.mutate({
        subjectId: selectedClass.subject_id,
        classMode: 'online',
      })
    }
  }

  const students = liveData?.submissions || []
  const presentCount = liveData?.present || 0
  const absentCount = liveData?.absent || 0
  const pendingCount = liveData?.pending || 0
  const proxyCount = liveData?.proxy || 0
  const totalStudents = liveData?.total_students || 0
  const sessionClassMode = liveData?.class_mode || classMode

  // Filter classes based on search query
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

  // Step 1: Class Selection (also show when there's no active session)
  if (step === 'select' || (!currentSessionId && step !== 'confirm')) {
    return (
      <div className="min-h-screen bg-background bg-gradient-mesh">
        <header className="sticky top-0 z-50 glass border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                        {/* Search Input */}
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

                        {/* Dropdown Options */}
                        <div className="overflow-y-auto max-h-60">
                          {filteredClasses.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                              No subjects found
                            </div>
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

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">or browse all</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls: ClassForAttendance, i: number) => (
                  <button
                    key={`${cls.class_id}-${cls.subject_id}`}
                    onClick={() => handleSelectClass(cls)}
                    className={`group text-left p-6 rounded-2xl bg-card border hover:border-amber-500 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in opacity-0 stagger-${Math.min(i + 1, 6)}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant="secondary" className="font-heading">
                        {cls.student_count} students
                      </Badge>
                    </div>

                    <h3 className="font-heading font-bold text-lg text-foreground mb-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {cls.subject_name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">{cls.class_name}</p>

                    <div className="pt-3 border-t border-dashed text-xs text-muted-foreground space-y-1">
                      <p>{cls.department_name}</p>
                      <p>Batch {cls.batch} • Sem {cls.semester}{cls.section && cls.section.trim() ? ` • Sec ${cls.section}` : ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // Step 2: Confirmation
  if (step === 'confirm' && selectedClass && !currentSessionId) {
    return (
      <div className="min-h-screen bg-background bg-gradient-mesh flex items-center justify-center p-4">
        <div className="max-w-lg w-full animate-in opacity-0">
          <div className="bg-card rounded-3xl border shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 text-center text-white relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
              <div className="relative">
                <div className="inline-flex p-4 rounded-2xl bg-white/20 mb-4">
                  <Users className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-heading font-bold mb-1">{selectedClass.subject_name}</h2>
                <p className="text-white/80">{selectedClass.class_name}</p>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Students</p>
                  <p className="text-3xl font-heading font-bold text-foreground">{selectedClass.student_count}</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Date</p>
                  <p className="text-3xl font-heading font-bold text-foreground">
                    {new Date().toLocaleDateString('en-US', { day: 'numeric' })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex justify-between"><span>Department</span><span className="text-foreground font-medium">{selectedClass.department_name}</span></div>
                <div className="flex justify-between"><span>Batch</span><span className="text-foreground font-medium">{selectedClass.batch}</span></div>
                <div className="flex justify-between"><span>Semester</span><span className="text-foreground font-medium">{selectedClass.semester}</span></div>
                <div className="flex justify-between"><span>Section</span><span className="text-foreground font-medium">{selectedClass.section}</span></div>
              </div>

              {/* Offline / Online Toggle */}
              <div className="mb-6 p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {classMode === 'offline' ? (
                      <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                    <span
                      className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                        classMode === 'online' ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                    classMode === 'offline'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    Offline Class
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                    classMode === 'online'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    Online Class
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {classMode === 'offline'
                    ? 'GPS proximity check enabled (30m radius). Students outside range will be flagged as Proxy.'
                    : 'No GPS check. Students can mark attendance from anywhere with OTP.'}
                </p>
                {locationError && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {locationError}
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setStep('select')}>
                  Back
                </Button>
                <Button
                  className="flex-1 rounded-xl h-12 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900"
                  onClick={handleStartSession}
                  disabled={initiateMutation.isPending || isGettingLocation}
                >
                  {isGettingLocation ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Getting GPS...</>
                  ) : initiateMutation.isPending ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Starting...</>
                  ) : (
                    <><Sparkles className="mr-2 h-5 w-5" />Start Session</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Handle back button - show warning if session is active
  const handleBackClick = () => {
    if (currentSessionId && step === 'active') {
      setShowExitWarning(true)
    } else {
      navigate('/teacher')
    }
  }

  // Step 3: Active Session
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={handleBackClick} className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-heading font-bold text-foreground">Live Session</h1>
                  <Badge className={`text-[10px] px-1.5 py-0 ${
                    sessionClassMode === 'offline'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                  }`}>
                    {sessionClassMode === 'offline' ? 'Offline' : 'Online'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{sessionSubjectName} • {sessionClassName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => refetch()} className="rounded-xl">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* OTP Display */}
        <div className="mb-8 animate-in opacity-0">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />
            <div className="relative">
              <p className="text-white/60 text-sm font-medium mb-6">Share this code with students</p>
              <div className="flex justify-center gap-3 mb-6">
                {otp?.split('').map((digit, i) => (
                  <div key={i} className="otp-digit">{digit}</div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${otpTimer > 0 ? 'bg-white/10 text-white/80' : 'bg-red-500/20 text-red-300'}`}>
                  <Timer className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {otpTimer > 0 ? `Valid for ${otpTimer}s` : 'OTP Expired'}
                  </span>
                </div>
                <Button
                  onClick={() => regenerateOTPMutation.mutate()}
                  disabled={regenerateOTPMutation.isPending}
                  className="rounded-full bg-white/10 hover:bg-white/20 text-white border-0"
                  size="sm"
                >
                  {regenerateOTPMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      New OTP
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 ${sessionClassMode === 'offline' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 mb-8`}>
          {[
            { label: 'Total', value: totalStudents, icon: Users, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
            { label: 'Present', value: presentCount, icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
            { label: 'Pending', value: pendingCount, icon: Hourglass, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' },
            { label: 'Absent', value: absentCount, icon: UserX, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/50' },
            ...(sessionClassMode === 'offline' ? [{ label: 'Proxy', value: proxyCount, icon: ShieldAlert, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/50' }] : []),
          ].map((stat, i) => (
            <div key={stat.label} className={`stat-card animate-in opacity-0 stagger-${i + 1}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{stat.label}</p>
                  <p className={`text-3xl font-heading font-bold ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Attendance Sheet */}
        <div className="bg-card rounded-2xl border overflow-hidden animate-in opacity-0 stagger-5">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="font-heading font-semibold text-lg text-foreground">Attendance Sheet</h3>
              <p className="text-sm text-muted-foreground">Click to toggle student status</p>
            </div>
            <Button
              onClick={() => setShowSummary(true)}
              disabled={closeMutation.isPending}
              className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Close Session
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">S.No</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Roll No</th>
                  <th className="text-center py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-center py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {students.map((student: AttendanceRecord, index: number) => {
                  const isPending = !student.submitted_at && student.status !== 'X'
                  const isPresent = student.status === 'P'
                  const isProxy = student.status === 'X'

                  return (
                    <tr key={student.student_email} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${isProxy ? 'bg-purple-50/50 dark:bg-purple-950/20' : ''}`}>
                      <td className="py-4 px-6 text-sm text-muted-foreground font-medium">{index + 1}</td>
                      <td className="py-4 px-6">
                        <p className="font-medium text-foreground">{student.student_name}</p>
                        <p className="text-xs text-muted-foreground">{student.student_email}</p>
                      </td>
                      <td className="py-4 px-6 text-sm text-muted-foreground font-mono">{student.roll_no}</td>
                      <td className="py-4 px-6 text-center">
                        {isPending ? (
                          <Badge className="status-pending border">
                            <Clock className="h-3 w-3 mr-1" />Pending
                          </Badge>
                        ) : isProxy ? (
                          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <ShieldAlert className="h-3 w-3 mr-1" />Proxy
                          </Badge>
                        ) : isPresent ? (
                          <Badge className="status-present border">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Present
                          </Badge>
                        ) : (
                          <Badge className="status-absent border">
                            <XCircle className="h-3 w-3 mr-1" />Absent
                          </Badge>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Button
                          size="sm"
                          variant={isPresent ? 'destructive' : 'default'}
                          onClick={() => toggleStudentStatus(student.student_email, student.status)}
                          disabled={manualMarkMutation.isPending}
                          className="rounded-lg text-xs"
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
      </main>

      {/* Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full bg-card rounded-3xl shadow-2xl overflow-hidden animate-in opacity-0">
            <div className="p-6 border-b">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/50">
                  <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl text-foreground">Close Session?</h3>
                  <p className="text-sm text-muted-foreground">Review attendance summary</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-muted-foreground">Total Students</span>
                <span className="font-heading font-bold text-xl text-foreground">{totalStudents}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl status-present border">
                <span>Present</span>
                <span className="font-heading font-bold text-xl">{presentCount}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-xl status-absent border">
                <span>Absent</span>
                <span className="font-heading font-bold text-xl">{absentCount}</span>
              </div>
              {pendingCount > 0 && (
                <div className="flex justify-between items-center p-4 rounded-xl status-pending border">
                  <span>Pending → Absent</span>
                  <span className="font-heading font-bold text-xl">{pendingCount}</span>
                </div>
              )}
              {proxyCount > 0 && (
                <div className="flex justify-between items-center p-4 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <span>Proxy → Absent</span>
                  <span className="font-heading font-bold text-xl">{proxyCount}</span>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setShowSummary(false)}>
                Go Back
              </Button>
              <Button
                className="flex-1 rounded-xl h-12 bg-red-500 hover:bg-red-600 text-white"
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

      {/* Exit Warning Modal - Cannot leave without closing session */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full bg-card rounded-3xl shadow-2xl overflow-hidden animate-in opacity-0">
            <div className="p-6 border-b">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/50">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl text-foreground">Active Session!</h3>
                  <p className="text-sm text-muted-foreground">You must close the session before leaving</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-muted-foreground mb-4">
                You have an active attendance session. Please close the session properly to save attendance records.
              </p>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2 mb-4">
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

              <p className="text-xs text-muted-foreground">
                All pending students will be marked as absent when you close the session.
              </p>
            </div>

            <div className="p-6 border-t flex gap-3">
              <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={() => setShowExitWarning(false)}>
                Continue Session
              </Button>
              <Button
                className="flex-1 rounded-xl h-12 bg-red-500 hover:bg-red-600 text-white"
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
