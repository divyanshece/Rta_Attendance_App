import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { studentAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardCheck,
  Settings,
  ChevronRight,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Megaphone,
  RefreshCw,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AppLogo } from '@/components/ui/AppLogo'

interface StudentClassWithAttendance {
  class_id: number
  class_name: string
  department_name: string
  batch: number
  semester: number
  section: string
  roll_no: string
  subjects: {
    subject_id: number
    course_name: string
    teacher_name: string
    total_sessions: number
    present: number
    absent: number
    percentage: number
  }[]
  overall_percentage: number
  total_present: number
  total_absent: number
  total_sessions: number
}

interface StudentDashboardStats {
  enrolled_classes: number
  total_subjects: number
  today_classes: number
  total_sessions: number
  total_present: number
  total_absent: number
  overall_percentage: number
}

interface TodayScheduleItem {
  period_id: number
  period_no: number
  subject_id: number
  course_name: string
  teacher_name: string
  class_name: string
  class_id: number
  department_name: string
  session_active: boolean
  session_id: number | null
  attendance_status: 'P' | 'A' | null
}

export default function StudentDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  // Pull-to-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const touchStartY = useRef(0)
  const isPulling = useRef(false)

  const PULL_THRESHOLD = 80

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY
      isPulling.current = true
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(dy * 0.5, 120))
    } else {
      isPulling.current = false
      setPullDistance(0)
    }
  }, [isRefreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return
    isPulling.current = false
    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(PULL_THRESHOLD)
      await queryClient.invalidateQueries({ queryKey: ['studentClasses'] })
      await queryClient.invalidateQueries({ queryKey: ['studentDashboardStats'] })
      await queryClient.invalidateQueries({ queryKey: ['studentTodaySchedule'] })
      await queryClient.invalidateQueries({ queryKey: ['studentAnnouncements'] })
      setIsRefreshing(false)
    }
    setPullDistance(0)
  }, [pullDistance, isRefreshing, queryClient])

  const { data: classesData = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['studentClasses'],
    queryFn: studentAPI.getClasses,
  })

  const { data: stats } = useQuery({
    queryKey: ['studentDashboardStats'],
    queryFn: studentAPI.getDashboardStats,
  })

  const { data: todaySchedule = [] } = useQuery({
    queryKey: ['studentTodaySchedule'],
    queryFn: studentAPI.getTodaySchedule,
  })

  const { data: announcementsData } = useQuery({
    queryKey: ['studentAnnouncements'],
    queryFn: studentAPI.getAnnouncements,
  })

  const unreadCount = announcementsData?.unread_count || 0
  const classes = classesData as StudentClassWithAttendance[]
  const dashboardStats = stats as StudentDashboardStats | undefined
  const overallAttendance = dashboardStats?.overall_percentage || 0

  const getAttendanceColor = (pct: number) => {
    if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400'
    if (pct >= 60) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div
      className="min-h-screen bg-background"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
          style={{ height: isRefreshing ? PULL_THRESHOLD : pullDistance }}
        >
          <RefreshCw className={`h-5 w-5 text-amber-500 transition-transform ${
            isRefreshing ? 'animate-spin' : pullDistance >= PULL_THRESHOLD ? 'rotate-180' : ''
          }`} />
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <AppLogo size="md" />
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={() => navigate('/student/announcements')} className="rounded-xl relative h-9 w-9">
                <Megaphone className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/student/settings')} className="rounded-xl h-9 w-9">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5">
        {/* Welcome + Attendance */}
        <div className="mb-5">
          <p className="text-xs text-muted-foreground">{greeting}</p>
          <h2 className="text-xl font-heading font-bold text-foreground">{user?.name?.split(' ')[0] || 'Student'}</h2>
        </div>

        {/* Attendance + Mark Button */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-card rounded-xl border p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Attendance</p>
            <p className={`text-3xl font-heading font-bold ${getAttendanceColor(overallAttendance)}`}>{overallAttendance}%</p>
            <div className="flex gap-3 mt-1.5 text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400">{dashboardStats?.total_present || 0}P</span>
              <span className="text-red-600 dark:text-red-400">{dashboardStats?.total_absent || 0}A</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/student/attendance')}
            className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3 text-white text-left flex flex-col justify-between"
          >
            <ClipboardCheck className="h-6 w-6 mb-2" />
            <div>
              <p className="font-heading font-bold text-sm">Mark Attendance</p>
              <p className="text-[11px] text-white/70">Enter OTP</p>
            </div>
          </button>
        </div>

        {/* Today's Schedule */}
        {(todaySchedule as TodayScheduleItem[]).length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-heading font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-amber-500" />
                Today
              </h3>
              <button onClick={() => navigate('/student/timetable')} className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center">
                Timetable <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="bg-card rounded-xl border divide-y">
              {(todaySchedule as TodayScheduleItem[]).map((item) => (
                <div key={item.period_id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                    item.attendance_status === 'P' ? 'bg-emerald-500' :
                    item.attendance_status === 'A' ? 'bg-red-500' : 'bg-slate-400'
                  }`}>
                    {item.period_no}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.course_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.teacher_name}</p>
                  </div>
                  {item.session_active && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-0 text-[10px] animate-pulse">
                      <Clock className="h-2.5 w-2.5 mr-0.5" />Live
                    </Badge>
                  )}
                  {item.attendance_status === 'P' && <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                  {item.attendance_status === 'A' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Subjects */}
        <div>
          <h3 className="text-sm font-heading font-semibold text-foreground mb-2">My Subjects</h3>
          {isLoadingClasses ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
            </div>
          ) : classes.length === 0 || classes.every(c => c.subjects.length === 0) ? (
            <div className="bg-card rounded-xl border py-10 text-center">
              <p className="text-sm text-muted-foreground">No subjects found. Contact your teacher.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border divide-y">
              {classes.flatMap((classItem) =>
                classItem.subjects.map((subject) => (
                  <div key={`${classItem.class_id}-${subject.subject_id}`} className="flex items-center justify-between px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{subject.course_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {subject.teacher_name} &middot; {subject.present}/{subject.total_sessions} classes
                      </p>
                    </div>
                    <p className={`text-base font-heading font-bold flex-shrink-0 ml-3 ${getAttendanceColor(subject.percentage)}`}>
                      {subject.percentage}%
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
