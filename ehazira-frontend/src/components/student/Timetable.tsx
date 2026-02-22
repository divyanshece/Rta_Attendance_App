import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { studentAPI, timeSlotsAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

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

  const { data: todaySchedule = [] } = useQuery({
    queryKey: ['studentTodaySchedule'],
    queryFn: studentAPI.getTodaySchedule,
  })

  const { data: weeklySchedule = [], isLoading: isLoadingWeekly } = useQuery({
    queryKey: ['studentWeeklySchedule'],
    queryFn: studentAPI.getWeeklySchedule,
  })

  const { data: timeSlots = [] } = useQuery({
    queryKey: ['timeSlots'],
    queryFn: timeSlotsAPI.list,
  })

  const today = new Date().getDay()
  const todayIndex = today === 0 ? -1 : today - 1

  const scheduleMap = new Map<string, WeeklyScheduleItem>()
  ;(weeklySchedule as WeeklyScheduleItem[]).forEach((item) => {
    scheduleMap.set(`${item.day_of_week}-${item.period_no}`, item)
  })

  const slotMap = new Map<number, TimeSlot>()
  timeSlots.forEach((slot: TimeSlot) => slotMap.set(slot.period_no, slot))

  const formatTime = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    return `${h % 12 || 12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`
  }

  const scrollTable = (direction: 'left' | 'right') => {
    const container = document.getElementById('timetable-container')
    if (container) {
      const newPosition = direction === 'left'
        ? Math.max(0, scrollPosition - 200)
        : scrollPosition + 200
      container.scrollTo({ left: newPosition, behavior: 'smooth' })
      setScrollPosition(newPosition)
    }
  }

  const presentToday = (todaySchedule as ScheduleItem[]).filter(s => s.attendance_status === 'P').length
  const absentToday = (todaySchedule as ScheduleItem[]).filter(s => s.attendance_status === 'A').length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/student')} className="rounded-xl h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-base font-heading font-bold text-foreground">Timetable</h1>
            </div>
            {/* Mobile scroll controls */}
            <div className="flex items-center gap-1 md:hidden">
              <Button variant="outline" size="icon" onClick={() => scrollTable('left')} className="rounded-lg h-7 w-7">
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => scrollTable('right')} className="rounded-lg h-7 w-7">
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {/* Today summary */}
        {todayIndex >= 0 && todaySchedule.length > 0 && (
          <div className="bg-card rounded-xl border p-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground">{DAYS_FULL[todayIndex]}</p>
                <p className="text-sm font-heading font-semibold text-foreground">{todaySchedule.length} classes today</p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-emerald-600 dark:text-emerald-400"><CheckCircle className="h-3 w-3 inline mr-0.5" />{presentToday}</span>
                <span className="text-red-600 dark:text-red-400"><XCircle className="h-3 w-3 inline mr-0.5" />{absentToday}</span>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-muted-foreground">Today</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-[10px] text-muted-foreground">Class</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-muted-foreground">Present</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-muted-foreground">Absent</span>
          </div>
        </div>

        {/* Weekly Grid */}
        {isLoadingWeekly ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        ) : (
          <div className="bg-card rounded-xl border overflow-hidden">
            <div
              id="timetable-container"
              className="overflow-x-auto"
              onScroll={(e) => setScrollPosition((e.target as HTMLDivElement).scrollLeft)}
            >
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    <th className="sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 px-2 py-2 text-left w-[90px] min-w-[90px]">
                      <span className="text-[10px] font-semibold text-muted-foreground">Period</span>
                    </th>
                    {DAYS.map((day, index) => (
                      <th
                        key={day}
                        className={`px-2 py-2 text-center min-w-[100px] ${index === todayIndex ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}
                      >
                        <span className={`text-xs font-semibold ${index === todayIndex ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                          {day}
                        </span>
                        {index === todayIndex && (
                          <span className="block text-[8px] uppercase tracking-wider text-amber-600 dark:text-amber-400">Today</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {PERIOD_NUMBERS.map((periodNo) => {
                    const timeSlot = slotMap.get(periodNo)
                    return (
                      <tr key={periodNo}>
                        <td className="sticky left-0 bg-card z-10 px-2 py-1.5 border-r dark:border-slate-800">
                          <div className="font-bold text-xs text-amber-600 dark:text-amber-400">P{periodNo}</div>
                          {timeSlot && (
                            <div className="text-[9px] text-muted-foreground">{formatTime(timeSlot.start_time)}</div>
                          )}
                        </td>
                        {DAYS.map((_, dayIndex) => {
                          const item = scheduleMap.get(`${dayIndex}-${periodNo}`)
                          const isToday = dayIndex === todayIndex

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
                            <td key={dayIndex} className={`px-1 py-1 ${isToday ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
                              {item ? (
                                <div className={`p-1.5 rounded-md text-[10px] min-h-[40px] ${
                                  sessionActive ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700' :
                                  attendanceStatus === 'P' ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' :
                                  attendanceStatus === 'A' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                                  'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800'
                                }`}>
                                  <div className="flex items-start justify-between">
                                    <p className="font-semibold text-foreground truncate flex-1 mr-1">{item.course_name}</p>
                                    {sessionActive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0 mt-0.5" />}
                                    {!sessionActive && attendanceStatus === 'P' && <CheckCircle className="h-2.5 w-2.5 text-emerald-500 flex-shrink-0" />}
                                    {!sessionActive && attendanceStatus === 'A' && <XCircle className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />}
                                  </div>
                                  <p className="text-muted-foreground truncate">{item.teacher_name}</p>
                                </div>
                              ) : (
                                <div className="p-1.5 rounded-md border border-dashed border-slate-200 dark:border-slate-700 text-center min-h-[40px] flex items-center justify-center">
                                  <span className="text-[10px] text-muted-foreground">&mdash;</span>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Today's classes list */}
        {todayIndex >= 0 && todaySchedule.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-heading font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-amber-500" />
              Today's Classes
            </h3>
            <div className="bg-card rounded-xl border divide-y">
              {(todaySchedule as ScheduleItem[]).map((item) => {
                const timeSlot = slotMap.get(item.period_no)
                return (
                  <div key={item.period_id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                      item.attendance_status === 'P' ? 'bg-emerald-500' :
                      item.attendance_status === 'A' ? 'bg-red-500' : 'bg-slate-400'
                    }`}>
                      {item.period_no}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{item.course_name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate">{item.teacher_name}</span>
                        {timeSlot && (
                          <span className="flex items-center gap-0.5 flex-shrink-0">
                            <Clock className="h-2.5 w-2.5" />
                            {formatTime(timeSlot.start_time)}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.session_active && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />}
                    {item.attendance_status === 'P' && <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                    {item.attendance_status === 'A' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Sunday */}
        {todayIndex === -1 && (
          <div className="mt-5 bg-card rounded-xl border py-8 text-center">
            <Calendar className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">It's Sunday!</p>
            <p className="text-xs text-muted-foreground">Classes resume tomorrow.</p>
          </div>
        )}
      </main>
    </div>
  )
}
