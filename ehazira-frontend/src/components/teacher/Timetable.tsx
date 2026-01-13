import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduleAPI, classAPI, timeSlotsAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Check,
  X,
  Edit3,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import toast from 'react-hot-toast'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PERIOD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8] // Fixed 8 periods

interface ScheduleItem {
  period_id: number
  subject_id: number
  subject_name: string
  course_name: string
  class_name: string
  class_id: number
  day_of_week: number
  day_name: string
  period_no: number
}

interface ClassDetail {
  class_id: number
  is_active: boolean
}

interface TimeSlot {
  slot_id: number
  period_no: number
  start_time: string
  end_time: string
}

export default function TeacherTimetable() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [scrollPosition, setScrollPosition] = useState(0)
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [editTimes, setEditTimes] = useState({ start: '', end: '' })
  const startInputRef = useRef<HTMLInputElement>(null)

  const { data: allSchedule = [], isLoading } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => scheduleAPI.getAll(),
  })

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: classAPI.list,
  })

  const { data: timeSlots = [] } = useQuery({
    queryKey: ['timeSlots'],
    queryFn: timeSlotsAPI.list,
  })

  const saveSlotsMutation = useMutation({
    mutationFn: timeSlotsAPI.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] })
      setEditingSlot(null)
      toast.success('Time slot saved')
    },
    onError: () => {
      toast.error('Failed to save time slot')
    },
  })

  // Focus on start input when editing starts
  useEffect(() => {
    if (editingSlot !== null && startInputRef.current) {
      startInputRef.current.focus()
    }
  }, [editingSlot])

  // Filter out completed classes - only show active classes in timetable
  const activeClassIds = new Set(
    (classes as ClassDetail[]).filter(c => c.is_active).map(c => c.class_id)
  )
  const schedule = allSchedule.filter((s: ScheduleItem) => activeClassIds.has(s.class_id))

  // Create a map from period_no to time slot
  const slotMap = new Map<number, TimeSlot>()
  timeSlots.forEach((slot: TimeSlot) => {
    slotMap.set(slot.period_no, slot)
  })

  // Create schedule map for quick lookup: key = "day-period"
  const scheduleMap = new Map<string, ScheduleItem>()
  schedule.forEach((item: ScheduleItem) => {
    const key = `${item.day_of_week}-${item.period_no}`
    scheduleMap.set(key, item)
  })

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

  // Get today's day index (0 = Monday, 5 = Saturday)
  const today = new Date().getDay()
  const todayIndex = today === 0 ? -1 : today - 1 // Sunday = -1 (not shown)

  const formatTime = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const suffix = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${suffix}`
  }

  const startEditingSlot = (periodNo: number) => {
    const existing = slotMap.get(periodNo)
    setEditTimes({
      start: existing?.start_time || '',
      end: existing?.end_time || '',
    })
    setEditingSlot(periodNo)
  }

  const handleSaveSlot = (periodNo: number) => {
    if (!editTimes.start || !editTimes.end) {
      toast.error('Please enter both start and end times')
      return
    }
    saveSlotsMutation.mutate([{
      period_no: periodNo,
      start_time: editTimes.start,
      end_time: editTimes.end,
    }])
  }

  const cancelEdit = () => {
    setEditingSlot(null)
    setEditTimes({ start: '', end: '' })
  }

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
                onClick={() => navigate('/teacher')}
                className="rounded-xl h-9 w-9 sm:h-10 sm:w-10"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-heading font-bold text-foreground">My Timetable</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Weekly schedule by time</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                onClick={() => navigate('/teacher/classes')}
                className="rounded-xl h-9 sm:h-10 px-3"
              >
                <BookOpen className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Manage Classes</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
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

        {isLoading ? (
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

                {/* Body - Fixed 8 Period Rows */}
                <tbody className="divide-y dark:divide-slate-800">
                  {PERIOD_NUMBERS.map((periodNo) => {
                    const timeSlot = slotMap.get(periodNo)
                    const isEditing = editingSlot === periodNo

                    return (
                      <tr key={periodNo} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        {/* Period/Time Column */}
                        <td className="sticky left-0 bg-card z-10 px-2 py-2 border-r dark:border-slate-800">
                          {isEditing ? (
                            <div className="flex flex-col gap-1.5 py-1">
                              <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">P{periodNo}</div>
                              <div className="flex flex-col gap-1">
                                <input
                                  ref={startInputRef}
                                  type="time"
                                  value={editTimes.start}
                                  onChange={(e) => setEditTimes(prev => ({ ...prev, start: e.target.value }))}
                                  className="w-full h-7 px-2 text-xs border rounded bg-background text-foreground"
                                />
                                <input
                                  type="time"
                                  value={editTimes.end}
                                  onChange={(e) => setEditTimes(prev => ({ ...prev, end: e.target.value }))}
                                  className="w-full h-7 px-2 text-xs border rounded bg-background text-foreground"
                                />
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="flex-1 h-6 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-xs"
                                  onClick={() => handleSaveSlot(periodNo)}
                                  disabled={saveSlotsMutation.isPending}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 px-2"
                                  onClick={cancelEdit}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="group flex items-center gap-2 cursor-pointer" onClick={() => startEditingSlot(periodNo)}>
                              <div className="flex-1 min-w-0">
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
                                    Click to set time
                                  </div>
                                )}
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditingSlot(periodNo)
                                }}
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>

                        {/* Day Cells */}
                        {DAYS.map((_, dayIndex) => {
                          const key = `${dayIndex}-${periodNo}`
                          const item = scheduleMap.get(key)

                          return (
                            <td
                              key={dayIndex}
                              className={`px-1.5 py-1.5 ${
                                dayIndex === todayIndex
                                  ? 'bg-amber-50/50 dark:bg-amber-900/10'
                                  : ''
                              }`}
                            >
                              {item ? (
                                <div className="group relative p-2 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-600/10 dark:from-violet-500/20 dark:to-purple-600/20 border border-violet-200 dark:border-violet-800 hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer min-h-[50px]">
                                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
                                  <p className="font-semibold text-xs text-foreground truncate mb-0.5">
                                    {item.course_name}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {item.class_name}
                                  </p>
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

                {/* Footer Row - Day Totals (inside table for alignment) */}
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800/70 border-t-2 border-slate-300 dark:border-slate-600">
                    <td className="sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 px-2 py-3 border-r dark:border-slate-700">
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</span>
                    </td>
                    {DAYS.map((_, dayIndex) => {
                      const dayClasses = schedule.filter((s: ScheduleItem) => s.day_of_week === dayIndex)
                      const isToday = dayIndex === todayIndex

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
                            {dayClasses.length}
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
      </main>
    </div>
  )
}
