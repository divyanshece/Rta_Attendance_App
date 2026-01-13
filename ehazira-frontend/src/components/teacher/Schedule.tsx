import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduleAPI, timeSlotsAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, X, Clock, Trash2 } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import toast from 'react-hot-toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

interface Subject {
  subject_id: number
  course_name: string
  class_info?: { class_id: number }
  teacher_name: string
}

interface TimeSlot {
  slot_id: number
  period_no: number
  start_time: string
  end_time: string
}

export default function TeacherSchedule() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Modal states
  const [addingToDay, setAddingToDay] = useState<number | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<number>(0)
  const [selectedPeriodNo, setSelectedPeriodNo] = useState<number>(1)
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false)
  const [timeSlotForm, setTimeSlotForm] = useState<{ period_no: number; start_time: string; end_time: string }[]>([])

  // Queries
  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ['schedule'],
    queryFn: () => scheduleAPI.getAll(),
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => scheduleAPI.getSubjects(),
  })

  const { data: timeSlots = [] } = useQuery({
    queryKey: ['timeSlots'],
    queryFn: timeSlotsAPI.list,
  })

  // Mutations
  const createPeriodMutation = useMutation({
    mutationFn: scheduleAPI.createPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
      setAddingToDay(null)
      setSelectedSubject(0)
      setSelectedPeriodNo(1)
      toast.success('Period added')
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Failed to add period')
    },
  })

  const deletePeriodMutation = useMutation({
    mutationFn: scheduleAPI.deletePeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
      toast.success('Period removed')
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Failed to delete period')
    },
  })

  const saveTimeSlotMutation = useMutation({
    mutationFn: timeSlotsAPI.save,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] })
      setShowTimeSlotModal(false)
      toast.success('Time slots saved')
    },
    onError: () => {
      toast.error('Failed to save time slots')
    },
  })

  // Group schedule by day
  const scheduleByDay: { [key: number]: ScheduleItem[] } = {}
  DAYS.forEach((_, index) => {
    scheduleByDay[index] = []
  })
  schedule.forEach((item: ScheduleItem) => {
    if (scheduleByDay[item.day_of_week]) {
      scheduleByDay[item.day_of_week].push(item)
    }
  })
  // Sort each day's periods by period_no
  Object.keys(scheduleByDay).forEach((day) => {
    scheduleByDay[parseInt(day)].sort((a, b) => a.period_no - b.period_no)
  })

  // Get time slot for a period
  const getTimeSlot = (periodNo: number): TimeSlot | undefined => {
    return timeSlots.find((ts: TimeSlot) => ts.period_no === periodNo)
  }

  const formatTime = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  const handleAddPeriod = () => {
    if (!selectedSubject) {
      toast.error('Select a subject')
      return
    }
    if (addingToDay === null) return

    createPeriodMutation.mutate({
      subject: selectedSubject,
      day_of_week: addingToDay,
      period_no: selectedPeriodNo,
    })
  }

  const handleDeletePeriod = (periodId: number) => {
    if (confirm('Remove this period?')) {
      deletePeriodMutation.mutate(periodId)
    }
  }

  const openTimeSlotModal = () => {
    // Initialize with existing time slots or default 8 periods
    const slots: { period_no: number; start_time: string; end_time: string }[] = []
    for (let i = 1; i <= 8; i++) {
      const existing = getTimeSlot(i)
      slots.push({
        period_no: i,
        start_time: existing?.start_time || '',
        end_time: existing?.end_time || '',
      })
    }
    setTimeSlotForm(slots)
    setShowTimeSlotModal(true)
  }

  const handleSaveTimeSlots = () => {
    // Only save slots that have both times filled
    const filledSlots = timeSlotForm.filter(slot => slot.start_time && slot.end_time)
    if (filledSlots.length === 0) {
      toast.error('Fill at least one time slot')
      return
    }
    saveTimeSlotMutation.mutate(filledSlots)
  }

  const updateTimeSlotForm = (periodNo: number, field: 'start_time' | 'end_time', value: string) => {
    setTimeSlotForm(prev => prev.map(slot =>
      slot.period_no === periodNo ? { ...slot, [field]: value } : slot
    ))
  }

  // Get available period numbers (1-8)
  const periodNumbers = [1, 2, 3, 4, 5, 6, 7, 8]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/teacher')} className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-heading font-bold text-foreground">Timetable</h1>
                <p className="text-xs text-muted-foreground">
                  Your weekly schedule
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={openTimeSlotModal} className="rounded-xl">
                <Clock className="h-4 w-4 mr-2" />
                Set Times
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Subjects Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Create subjects in your classes first, then you can schedule them here.
            </p>
            <Button onClick={() => navigate('/teacher/classes')} className="rounded-xl">
              Go to Classes
            </Button>
          </div>
        ) : (
          <>
            {/* Compact Day-Column Timetable */}
            <div className="overflow-x-auto">
              <div className="grid grid-cols-6 gap-3 min-w-[600px]">
                {DAYS.map((day, dayIndex) => {
                  const dayPeriods = scheduleByDay[dayIndex] || []

                  return (
                    <div key={day} className="flex flex-col">
                      {/* Day Header */}
                      <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-center mb-2">
                        <span className="font-semibold text-amber-800 dark:text-amber-300 hidden sm:inline">
                          {day}
                        </span>
                        <span className="font-semibold text-amber-800 dark:text-amber-300 sm:hidden">
                          {SHORT_DAYS[dayIndex]}
                        </span>
                      </div>

                      {/* Periods Stack */}
                      <div className="flex flex-col gap-2 flex-1">
                        {dayPeriods.length === 0 ? (
                          <div className="flex-1 min-h-[100px] rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center">
                            <button
                              onClick={() => setAddingToDay(dayIndex)}
                              className="p-3 text-muted-foreground hover:text-amber-500 transition-colors"
                            >
                              <Plus className="h-6 w-6" />
                            </button>
                          </div>
                        ) : (
                          <>
                            {dayPeriods.map((period) => {
                              const timeSlot = getTimeSlot(period.period_no)
                              return (
                                <div
                                  key={period.period_id}
                                  className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 group relative"
                                >
                                  {/* Period Number Badge */}
                                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow">
                                    {period.period_no}
                                  </div>

                                  {/* Delete Button */}
                                  <button
                                    onClick={() => handleDeletePeriod(period.period_id)}
                                    className="absolute top-2 right-2 p-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>

                                  {/* Content */}
                                  <div className="pt-1">
                                    <p className="text-sm font-semibold text-foreground line-clamp-2">
                                      {period.course_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                      {period.class_name}
                                    </p>
                                    {timeSlot && (
                                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                        {formatTime(timeSlot.start_time)} - {formatTime(timeSlot.end_time)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                            {/* Add More Button */}
                            <button
                              onClick={() => setAddingToDay(dayIndex)}
                              className="p-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-muted-foreground hover:border-amber-300 hover:text-amber-500 transition-colors flex items-center justify-center gap-1"
                            >
                              <Plus className="h-4 w-4" />
                              <span className="text-xs">Add</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Your Subjects */}
            <div className="mt-8">
              <h3 className="text-lg font-heading font-semibold text-foreground mb-4">Your Subjects</h3>
              {subjects.length === 0 ? (
                <p className="text-muted-foreground">No subjects assigned yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subjects.map((subject: Subject) => (
                    <div
                      key={subject.subject_id}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm"
                    >
                      <span className="font-medium text-foreground">{subject.course_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Add Period Modal */}
      {addingToDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-semibold text-foreground">
                Add Period to {DAYS[addingToDay]}
              </h3>
              <button
                onClick={() => {
                  setAddingToDay(null)
                  setSelectedSubject(0)
                  setSelectedPeriodNo(1)
                }}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Subject Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border bg-background text-foreground"
                >
                  <option value={0}>Select subject...</option>
                  {subjects.map((subject: Subject) => (
                    <option key={subject.subject_id} value={subject.subject_id}>
                      {subject.course_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period Number Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Period Number</label>
                <div className="grid grid-cols-4 gap-2">
                  {periodNumbers.map((num) => {
                    const timeSlot = getTimeSlot(num)
                    return (
                      <button
                        key={num}
                        onClick={() => setSelectedPeriodNo(num)}
                        className={`p-2 rounded-xl border text-center transition-colors ${
                          selectedPeriodNo === num
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-background border-border hover:border-amber-300'
                        }`}
                      >
                        <span className="block text-sm font-semibold">P{num}</span>
                        {timeSlot && (
                          <span className="block text-xs opacity-70">
                            {formatTime(timeSlot.start_time).replace(' ', '')}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddingToDay(null)
                    setSelectedSubject(0)
                    setSelectedPeriodNo(1)
                  }}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddPeriod}
                  disabled={!selectedSubject || createPeriodMutation.isPending}
                  className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600"
                >
                  {createPeriodMutation.isPending ? 'Adding...' : 'Add Period'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Slots Modal */}
      {showTimeSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-semibold text-foreground">
                Set Period Times
              </h3>
              <button
                onClick={() => setShowTimeSlotModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {timeSlotForm.map((slot) => (
                <div key={slot.period_no} className="flex items-center gap-2">
                  <div className="w-12 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                      P{slot.period_no}
                    </span>
                  </div>
                  <input
                    type="time"
                    value={slot.start_time}
                    onChange={(e) => updateTimeSlotForm(slot.period_no, 'start_time', e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg border bg-background text-sm"
                    placeholder="Start"
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="time"
                    value={slot.end_time}
                    onChange={(e) => updateTimeSlotForm(slot.period_no, 'end_time', e.target.value)}
                    className="flex-1 px-2 py-1.5 rounded-lg border bg-background text-sm"
                    placeholder="End"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowTimeSlotModal(false)}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTimeSlots}
                disabled={saveTimeSlotMutation.isPending}
                className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600"
              >
                {saveTimeSlotMutation.isPending ? 'Saving...' : 'Save Times'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
