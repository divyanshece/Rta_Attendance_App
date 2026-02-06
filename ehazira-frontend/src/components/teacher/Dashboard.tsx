import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { scheduleAPI, adminAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import {
  ClipboardList,
  Users,
  Calendar,
  Settings,
  BarChart3,
  ChevronRight,
  Clock,
  Megaphone,
  Shield,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AppLogo } from '@/components/ui/AppLogo'

interface ScheduleItem {
  period_id: number
  subject_id: number
  subject_name: string
  course_name: string
  class_name: string
  class_id: number
  period_no: number
}

export default function TeacherDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data: todaySchedule = [], isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['todaySchedule'],
    queryFn: scheduleAPI.getToday,
  })

  const { data: adminCheck } = useQuery({
    queryKey: ['adminCheck'],
    queryFn: adminAPI.checkAdmin,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const quickActions = [
    {
      title: 'Take Attendance',
      description: 'Start a new session',
      icon: ClipboardList,
      action: () => navigate('/teacher/attendance'),
      gradient: 'from-amber-500 to-orange-600',
      featured: true,
    },
    {
      title: 'My Classes',
      description: 'Manage students',
      icon: Users,
      action: () => navigate('/teacher/classes'),
      gradient: 'from-emerald-500 to-teal-600',
    },
    {
      title: 'Reports',
      description: 'View analytics',
      icon: BarChart3,
      action: () => navigate('/teacher/reports'),
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      title: 'Timetable',
      description: 'View schedule',
      icon: Calendar,
      action: () => navigate('/teacher/timetable'),
      gradient: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Announcements',
      description: 'Notes & messages',
      icon: Megaphone,
      action: () => navigate('/teacher/announcements'),
      gradient: 'from-rose-500 to-pink-600',
    },
  ]

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
              {adminCheck?.is_admin && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/teacher/admin')}
                  className="rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-500 dark:hover:text-amber-400 dark:hover:bg-amber-500/10"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              )}
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/teacher/settings')}
                className="rounded-xl"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-10 animate-in opacity-0">
          <p className="text-muted-foreground text-sm font-medium mb-1">{greeting}</p>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-2">
            {user?.name?.split(' ')[0] || 'Teacher'}
          </h2>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-10">
          <h3 className="text-lg font-heading font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {quickActions.map((action, i) => (
              <button
                key={action.title}
                onClick={action.action}
                className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl animate-in opacity-0 stagger-${i + 1} ${
                  action.featured
                    ? 'col-span-2 lg:col-span-1 bg-gradient-to-br ' + action.gradient + ' text-white'
                    : 'bg-card border hover:border-amber-500/50'
                }`}
              >
                {action.featured && (
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
                )}

                <div
                  className={`inline-flex p-3 rounded-xl mb-4 ${
                    action.featured
                      ? 'bg-white/20'
                      : 'bg-gradient-to-br ' + action.gradient + ' shadow-lg'
                  }`}
                >
                  <action.icon className="h-6 w-6 text-white" />
                </div>

                <h4
                  className={`font-heading font-semibold text-lg mb-1 ${
                    action.featured ? 'text-white' : 'text-foreground'
                  }`}
                >
                  {action.title}
                </h4>
                <p
                  className={`text-sm ${
                    action.featured ? 'text-white/80' : 'text-muted-foreground'
                  }`}
                >
                  {action.description}
                </p>

                <ChevronRight
                  className={`absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 ${
                    action.featured ? 'text-white/80' : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="animate-in opacity-0 stagger-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-heading font-semibold text-foreground">Today's Schedule</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/teacher/schedule')}
              className="text-muted-foreground hover:text-foreground"
            >
              View all
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="bg-card rounded-2xl border overflow-hidden">
            {isLoadingSchedule ? (
              <div className="flex items-center justify-center py-16">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                </div>
              </div>
            ) : todaySchedule.length === 0 ? (
              <div className="py-16 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-heading font-semibold text-foreground mb-2">No classes today</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Your schedule is clear for today
                </p>
                <Button variant="outline" onClick={() => navigate('/teacher/schedule')}>
                  Manage Schedule
                </Button>
              </div>
            ) : (
              <div className="divide-y dark:divide-slate-800">
                {todaySchedule.map((item: ScheduleItem, index: number) => (
                  <div
                    key={item.period_id}
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-heading font-bold shadow-lg shadow-amber-500/20">
                        {item.period_no}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{item.course_name}</h4>
                      <p className="text-sm text-muted-foreground truncate">{item.class_name}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Period {item.period_no}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={e => {
                          e.stopPropagation()
                          navigate('/teacher/attendance')
                        }}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Take Attendance
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
