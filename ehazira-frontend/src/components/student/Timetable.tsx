import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { studentAPI, timeSlotsAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { AppLogoIcon } from '@/components/ui/AppLogo'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const PERIOD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8]

interface ScheduleItem {
  period_id: number
  period_no: number
  subject_id: number
  course_name: string
  teacher_name: string
  class_name: string
  class_id: number
  department_name: string
  day_of_week?: number
  session_active?: boolean
  session_id?: number | null
  attendance_status?: 'P' | 'A' | null
}

interface WeeklyScheduleItem {
  period_id: number
  period_no: number
  day_of_week: number
  subject_id: number
  course_name: string
  teacher_name: string
  class_name: string
  class_id: number
  department_name: string
}

interface TimeSlot {
  slot_id: number
  period_no: number
  start_time: string
  end_time: string
}

export default function StudentTimetable() {
  const navigate = useNavigate()
  const [scrollPosition, setScrollPosition] = useState(0)

  // Get today's schedule (with attendance info)
  const { data: todaySchedule = [], isLoading: isLoadingToday } = useQuery({
    queryKey: ['studentTodaySchedule'],
    queryFn: studentAPI.getTodaySchedule,
  })

  // Get full weekly schedule
  const { data: weeklySchedule = [], isLoading: isLoadingWeekly } = useQuery({
    queryKey: ['studentWeeklySchedule'],
    queryFn: studentAPI.getWeeklySchedule,
  })

  // Get time slots
  const { data: timeSlots = [] } = useQuery({
    queryKey: ['timeSlots'],
    queryFn: timeSlotsAPI.list,
  })

  // Get today's day index (0 = Monday, 5 = Saturday)
  const today = new Date().getDay()
  const todayIndex = today === 0 ? -1 : today - 1 // Sunday = -1 (not shown)

  // Create schedule map for quick lookup: key = "day-period"
  const scheduleMap = new Map<string, WeeklyScheduleItem>()
  ;(weeklySchedule as WeeklyScheduleItem[]).forEach((item) => {
    const key = `${item.day_of_week}-${item.period_no}`
    scheduleMap.set(key, item)
  })

  // Create a map from period_no to time slot
  const slotMap = new Map<number, TimeSlot>()
  timeSlots.forEach((slot: TimeSlot) => {
    slotMap.set(slot.period_no, slot)
  })

  const formatTime = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const suffix = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${suffix}`
  }

  const scrollTable = (direction: 'left' | 'right') => {
    const container = document.getElementById('timetable-container')
    if (container) {
      const scrollAmount = 200
      const newPosition = direction === 'left'
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount
      container.scrollTo({ left: newPosition, behavior: 'smooth' })
      setScrollPosition(newPosition)
    }
  }

  // Count classes per day for footer
  const classesPerDay = DAYS.map((_, dayIndex) =>
    (weeklySchedule as WeeklyScheduleItem[]).filter(s => s.day_of_week === dayIndex).length
  )

  const totalTodayClasses = todaySchedule.length
  const presentToday = (todaySchedule as ScheduleItem[]).filter(s => s.attendance_status === 'P').length
  const absentToday = (todaySchedule as ScheduleItem[]).filter(s => s.attendance_status === 'A').length

  return (
    <div className="min-h-screen bg-background bg-gradient-mesh">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/student')}
                className="rounded-xl h-9 w-9 sm:h-10 sm:w-10"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <AppLogoIcon size="md" />
              <div>
                <h1 className="text-base sm:text-lg font-heading font-bold text-foreground">My Timetable</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Weekly class schedule</p>
              </div>
            </div>

          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Today's Summary Card */}
        {todayIndex >= 0 && totalTodayClasses > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white animate-in opacity-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80 mb-1">Today - {DAYS_FULL[todayIndex]}</p>
                <p className="text-2xl font-heading font-bold">{totalTodayClasses} Classes</p>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-heading font-bold">{presentToday}</p>
                  <p className="text-xs opacity-80 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Present
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-heading font-bold">{absentToday}</p>
                  <p className="text-xs opacity-80 flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Absent
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-500 to-orange-600" />
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600" />
              <span className="text-xs text-muted-foreground">Class</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600" />
              <span className="text-xs text-muted-foreground">Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-red-500 to-rose-600" />
              <span className="text-xs text-muted-foreground">Absent</span>
            </div>
          </div>

          {/* Mobile scroll controls */}
          <div className="flex items-center gap-1.5 md:hidden">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollTable('left')}
              className="rounded-lg h-7 w-7"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scrollTable('right')}
              className="rounded-lg h-7 w-7"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Weekly Timetable Grid */}
        {isLoadingWeekly ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        ) : (
          <div className="bg-card rounded-2xl border overflow-hidden animate-in opacity-0">
            <div
              id="timetable-container"
              className="overflow-x-auto"
              onScroll={(e) => setScrollPosition((e.target as HTMLDivElement).scrollLeft)}
            >
              <table className="w-full min-w-[700px]">
                {/* Header Row - Days */}
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 px-2 py-3 text-left w-[100px] min-w-[100px]">
                      <span className="text-xs font-semibold text-muted-foreground">Period</span>
                    </th>
                    {DAYS.map((day, index) => (
                      <th
                        key={day}
                        className={`px-2 py-3 text-center min-w-[100px] ${
                          index === todayIndex
                            ? 'bg-amber-50 dark:bg-amber-900/20'
                            : ''
                        }`}
                      >
                        <div className={`flex flex-col items-center gap-0.5 ${
                          index === todayIndex ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                        }`}>
                          <span className="text-xs font-semibold">{day}</span>
                          {index === todayIndex && (
                            <span className="text-[9px] uppercase tracking-wider bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded-full">
                              Today
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Body - Period Rows */}
                <tbody className="divide-y dark:divide-slate-800">
                  {PERIOD_NUMBERS.map((periodNo) => {
                    const timeSlot = slotMap.get(periodNo)

                    return (
                      <tr key={periodNo} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        {/* Period/Time Column */}
                        <td className="sticky left-0 bg-card z-10 px-2 py-2 border-r dark:border-slate-800">
                          <div className="font-bold text-sm text-amber-600 dark:text-amber-400 mb-0.5">
                            P{periodNo}
                          </div>
                          {timeSlot ? (
                            <>
                              <div className="text-[10px] text-muted-foreground">
                                {formatTime(timeSlot.start_time)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {formatTime(timeSlot.end_time)}
                              </div>
                            </>
                          ) : (
                            <div className="text-[10px] text-muted-foreground opacity-60">
                              —
                            </div>
                          )}
                        </td>

                        {/* Day Cells */}
                        {DAYS.map((_, dayIndex) => {
                          const key = `${dayIndex}-${periodNo}`
                          const item = scheduleMap.get(key)
                          const isToday = dayIndex === todayIndex

                          // For today's column, check attendance status
                          let attendanceStatus: 'P' | 'A' | null = null
                          let sessionActive = false
                          if (isToday && item) {
                            const todayItem = (todaySchedule as ScheduleItem[]).find(
                              s => s.period_no === periodNo && s.subject_id === item.subject_id
                            )
                            if (todayItem) {
                              attendanceStatus = todayItem.attendance_status || null
                              sessionActive = todayItem.session_active || false
                            }
                          }

                          return (
                            <td
                              key={dayIndex}
                              className={`px-1.5 py-1.5 ${
                                isToday
                                  ? 'bg-amber-50/50 dark:bg-amber-900/10'
                                  : ''
                              }`}
                            >
                              {item ? (
                                <div className={`group relative p-2 rounded-lg min-h-[50px] transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer ${
                                  sessionActive
                                    ? 'bg-gradient-to-br from-emerald-500/20 to-teal-600/20 dark:from-emerald-500/30 dark:to-teal-600/30 border border-emerald-300 dark:border-emerald-700'
                                    : attendanceStatus === 'P'
                                    ? 'bg-gradient-to-br from-emerald-500/10 to-teal-600/10 dark:from-emerald-500/20 dark:to-teal-600/20 border border-emerald-200 dark:border-emerald-800'
                                    : attendanceStatus === 'A'
                                    ? 'bg-gradient-to-br from-red-500/10 to-rose-600/10 dark:from-red-500/20 dark:to-rose-600/20 border border-red-200 dark:border-red-800'
                                    : 'bg-gradient-to-br from-violet-500/10 to-purple-600/10 dark:from-violet-500/20 dark:to-purple-600/20 border border-violet-200 dark:border-violet-800'
                                }`}>
                                  {/* Status indicator */}
                                  <div className="absolute top-1.5 right-1.5">
                                    {sessionActive && (
                                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    )}
                                    {!sessionActive && attendanceStatus === 'P' && (
                                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                                    )}
                                    {!sessionActive && attendanceStatus === 'A' && (
                                      <XCircle className="h-3 w-3 text-red-500" />
                                    )}
                                    {!sessionActive && !attendanceStatus && (
                                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                    )}
                                  </div>
                                  <p className="font-semibold text-xs text-foreground truncate mb-0.5 pr-4">
                                    {item.course_name}
                                  </p>
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                                    <User className="h-2.5 w-2.5 flex-shrink-0" />
                                    <span className="truncate">{item.teacher_name}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 text-center min-h-[50px] flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">—</span>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>

                {/* Footer Row - Day Totals */}
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800/70 border-t-2 border-slate-300 dark:border-slate-600">
                    <td className="sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 px-2 py-3 border-r dark:border-slate-700">
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</span>
                    </td>
                    {DAYS.map((_, dayIndex) => {
                      const isToday = dayIndex === todayIndex
                      const count = classesPerDay[dayIndex]

                      return (
                        <td
                          key={dayIndex}
                          className={`px-2 py-3 text-center ${
                            isToday ? 'bg-amber-100/70 dark:bg-amber-900/30' : ''
                          }`}
                        >
                          <span className={`text-xl sm:text-2xl font-heading font-bold ${
                            isToday ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                          }`}>
                            {count}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Today's Detailed Schedule */}
        {todayIndex >= 0 && (
          <div className="mt-8 animate-in opacity-0 stagger-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-lg font-heading font-semibold text-foreground">
                Today's Classes
              </h3>
              <Badge variant="secondary">{todaySchedule.length}</Badge>
            </div>

            {isLoadingToday ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
              </div>
            ) : todaySchedule.length === 0 ? (
              <div className="bg-card rounded-2xl border py-12 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-4">
                  <Calendar className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h4 className="font-heading font-semibold text-foreground mb-2">No classes today!</h4>
                <p className="text-sm text-muted-foreground">Enjoy your free day.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {PERIOD_NUMBERS.map((periodNo) => {
                  const item = (todaySchedule as ScheduleItem[]).find(s => s.period_no === periodNo)
                  const timeSlot = slotMap.get(periodNo)

                  return (
                    <div
                      key={periodNo}
                      className={`relative p-4 rounded-xl border transition-all ${
                        item
                          ? item.session_active
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                            : item.attendance_status === 'P'
                            ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                            : item.attendance_status === 'A'
                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                          : 'bg-slate-50/50 dark:bg-slate-800/20 border-dashed border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {/* Period Badge */}
                      <div className="absolute -top-2 -left-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-heading font-bold text-sm shadow ${
                          item
                            ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-muted-foreground'
                        }`}>
                          {periodNo}
                        </div>
                      </div>

                      {/* Time slot */}
                      {timeSlot && (
                        <div className="absolute -top-2 right-2">
                          <Badge variant="outline" className="text-[9px] bg-background">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            {formatTime(timeSlot.start_time)}
                          </Badge>
                        </div>
                      )}

                      {item ? (
                        <div className="pt-4">
                          {/* Status Badge */}
                          <div className="flex justify-end mb-2">
                            {item.session_active && (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-0 animate-pulse">
                                <Clock className="h-3 w-3 mr-1" />
                                Live
                              </Badge>
                            )}
                            {!item.session_active && item.attendance_status === 'P' && (
                              <Badge className="status-present">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Present
                              </Badge>
                            )}
                            {!item.session_active && item.attendance_status === 'A' && (
                              <Badge className="status-absent">
                                <XCircle className="h-3 w-3 mr-1" />
                                Absent
                              </Badge>
                            )}
                            {!item.session_active && !item.attendance_status && (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>

                          <h4 className="font-semibold text-foreground truncate mb-1">
                            {item.course_name}
                          </h4>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">{item.teacher_name}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-6 text-center">
                          <p className="text-sm text-muted-foreground">Free Period</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Sunday Message */}
        {todayIndex === -1 && (
          <div className="mt-8 bg-card rounded-2xl border py-12 text-center animate-in opacity-0 stagger-2">
            <div className="inline-flex p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 mb-4">
              <Calendar className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="font-heading font-semibold text-foreground mb-2">It's Sunday!</h4>
            <p className="text-sm text-muted-foreground">
              Enjoy your day off. Classes resume tomorrow.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
