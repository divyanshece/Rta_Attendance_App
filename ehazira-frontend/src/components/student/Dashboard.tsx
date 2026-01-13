import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { studentAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardCheck,
  BookOpen,
  Settings,
  LogOut,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  GraduationCap,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Megaphone,
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
  const { user, logout } = useAuthStore()

  const { data: classesData = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['studentClasses'],
    queryFn: studentAPI.getClasses,
  })

  const { data: stats } = useQuery({
    queryKey: ['studentDashboardStats'],
    queryFn: studentAPI.getDashboardStats,
  })

  const { data: todaySchedule = [], isLoading: isLoadingSchedule } = useQuery({
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

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 85) return 'text-emerald-600 dark:text-emerald-400'
    if (percentage >= 75) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getAttendanceGradient = (percentage: number) => {
    if (percentage >= 85) return 'from-emerald-500 to-teal-600'
    if (percentage >= 75) return 'from-amber-500 to-orange-600'
    return 'from-red-500 to-rose-600'
  }

  const getAttendanceIcon = (percentage: number) => {
    if (percentage >= 85) return TrendingUp
    if (percentage >= 75) return Minus
    return TrendingDown
  }

  const getAttendanceLabel = (percentage: number) => {
    if (percentage >= 85) return 'Excellent'
    if (percentage >= 75) return 'Good'
    if (percentage >= 60) return 'Low'
    return 'Critical'
  }

  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="min-h-screen bg-background bg-gradient-mesh">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <AppLogo size="md" />
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/student/announcements')}
                className="rounded-xl relative"
              >
                <Megaphone className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/student/settings')}
                className="rounded-xl"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                onClick={logout}
                className="rounded-xl text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-in opacity-0">
          <p className="text-muted-foreground text-sm font-medium mb-1">{greeting}</p>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
            {user?.name?.split(' ')[0] || 'Student'}
          </h2>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Badge variant="secondary" className="font-mono">{user?.roll_no}</Badge>
            <span className="text-sm">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Total Subjects',
              value: dashboardStats?.total_subjects || classes.reduce((sum, c) => sum + c.subjects.length, 0),
              icon: BookOpen,
              gradient: 'from-violet-500 to-purple-600',
            },
            {
              label: 'Today\'s Classes',
              value: dashboardStats?.today_classes || todaySchedule.length,
              icon: Calendar,
              gradient: 'from-blue-500 to-indigo-600',
            },
            {
              label: 'Total Attended',
              value: dashboardStats?.total_present || 0,
              icon: CheckCircle,
              gradient: 'from-emerald-500 to-teal-600',
            },
            {
              label: 'Overall Attendance',
              value: `${overallAttendance}%`,
              icon: getAttendanceIcon(overallAttendance),
              gradient: getAttendanceGradient(overallAttendance),
              highlight: overallAttendance < 75,
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`stat-card animate-in opacity-0 stagger-${i + 1} ${stat.highlight ? 'border-red-200 dark:border-red-800' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {stat.label}
                  </p>
                  <p className={`text-2xl md:text-3xl font-heading font-bold ${stat.label === 'Overall Attendance' ? getAttendanceColor(overallAttendance) : 'text-foreground'}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {/* Mark Attendance - Featured */}
          <button
            onClick={() => navigate('/student/attendance')}
            className="group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white animate-in opacity-0 stagger-1"
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
            <div className="relative">
              <div className="inline-flex p-3 rounded-xl bg-white/20 mb-4">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <h3 className="font-heading font-bold text-xl mb-1">Mark Attendance</h3>
              <p className="text-white/80 text-sm">Enter OTP to mark your presence</p>
            </div>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 text-white/80" />
          </button>

          {/* Attendance Summary */}
          <div className={`stat-card animate-in opacity-0 stagger-2 ${overallAttendance < 75 ? 'border-red-200 dark:border-red-800' : ''}`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${getAttendanceGradient(overallAttendance)} shadow-lg`}>
                {(() => {
                  const Icon = getAttendanceIcon(overallAttendance)
                  return <Icon className="h-6 w-6 text-white" />
                })()}
              </div>
              <Badge variant={overallAttendance >= 75 ? 'secondary' : 'destructive'}>
                {getAttendanceLabel(overallAttendance)}
              </Badge>
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Attendance Summary</p>
            <p className={`text-4xl font-heading font-bold ${getAttendanceColor(overallAttendance)}`}>
              {overallAttendance}%
            </p>
            <div className="flex gap-4 mt-3 text-sm">
              <span className="text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                {dashboardStats?.total_present || 0} Present
              </span>
              <span className="text-red-600 dark:text-red-400">
                <XCircle className="h-4 w-4 inline mr-1" />
                {dashboardStats?.total_absent || 0} Absent
              </span>
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        {todaySchedule.length > 0 && (
          <div className="mb-10 animate-in opacity-0 stagger-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-500" />
                Today's Classes
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{todaySchedule.length} classes</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/student/timetable')}
                  className="rounded-xl"
                >
                  View Timetable
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-2xl border overflow-hidden">
              {isLoadingSchedule ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                </div>
              ) : (
                <div className="divide-y dark:divide-slate-800">
                  {(todaySchedule as TodayScheduleItem[]).map((item, index) => (
                    <div
                      key={item.period_id}
                      className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-heading font-bold shadow-lg ${
                          item.attendance_status === 'P'
                            ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                            : item.attendance_status === 'A'
                            ? 'bg-gradient-to-br from-red-500 to-rose-600'
                            : 'bg-gradient-to-br from-slate-500 to-slate-600'
                        }`}>
                          {item.period_no}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{item.course_name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{item.teacher_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.session_active && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-0 animate-pulse">
                            <Clock className="h-3 w-3 mr-1" />
                            Live
                          </Badge>
                        )}
                        {item.attendance_status === 'P' && (
                          <Badge className="status-present">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Present
                          </Badge>
                        )}
                        {item.attendance_status === 'A' && (
                          <Badge className="status-absent">
                            <XCircle className="h-3 w-3 mr-1" />
                            Absent
                          </Badge>
                        )}
                        {!item.attendance_status && !item.session_active && (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Upcoming
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* My Subjects */}
        <div className="animate-in opacity-0 stagger-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading font-semibold text-foreground">My Subjects</h3>
            <Badge variant="secondary">
              {classes.reduce((sum, c) => sum + c.subjects.length, 0)} subjects
            </Badge>
          </div>

          {isLoadingClasses ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
            </div>
          ) : classes.length === 0 || classes.every(c => c.subjects.length === 0) ? (
            <div className="bg-card rounded-2xl border py-16 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="font-heading font-semibold text-foreground mb-2">No subjects found</h4>
              <p className="text-sm text-muted-foreground">
                Contact your teacher to get enrolled in subjects
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Flatten all subjects from all classes */}
              {classes.flatMap((classItem) =>
                classItem.subjects.map((subject, i) => {
                  const attendance = subject.percentage
                  const Icon = getAttendanceIcon(attendance)

                  return (
                    <div
                      key={`${classItem.class_id}-${subject.subject_id}`}
                      className={`bg-card rounded-2xl border p-5 hover:border-amber-500/50 hover:shadow-lg transition-all duration-300 animate-in opacity-0 stagger-${Math.min(i + 1, 6)}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${getAttendanceGradient(attendance)} shadow-lg`}>
                          <BookOpen className="h-5 w-5 text-white" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h4 className="font-heading font-bold text-foreground">
                                {subject.course_name}
                              </h4>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                                <User className="h-3 w-3" />
                                <span>{subject.teacher_name}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-2xl font-heading font-bold ${getAttendanceColor(attendance)}`}>
                                {attendance}%
                              </p>
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <Icon className={`h-3 w-3 ${getAttendanceColor(attendance)}`} />
                                <span className={`text-xs font-medium ${getAttendanceColor(attendance)}`}>
                                  {getAttendanceLabel(attendance)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Attendance Stats */}
                          <div className="flex items-center gap-3 text-xs mt-3 pt-3 border-t border-dashed">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              <CheckCircle className="h-3 w-3 inline mr-1" />
                              {subject.present} Present
                            </span>
                            <span className="text-red-600 dark:text-red-400">
                              <XCircle className="h-3 w-3 inline mr-1" />
                              {subject.absent} Absent
                            </span>
                            <span className="text-muted-foreground">
                              {subject.total_sessions} Sessions
                            </span>
                          </div>

                          {/* Class Info Badge */}
                          <div className="mt-3">
                            <Badge variant="outline" className="text-xs">
                              <GraduationCap className="h-3 w-3 mr-1" />
                              {classItem.department_name} • Sem {classItem.semester}{classItem.section && classItem.section.trim() ? ` • Sec ${classItem.section}` : ''}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
