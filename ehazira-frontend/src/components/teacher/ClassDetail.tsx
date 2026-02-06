import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classAPI, scheduleAPI, studentLookupAPI, subjectAPI, exportRegisterAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Plus,
  Users,
  Trash2,
  Upload,
  UserPlus,
  X,
  CheckCircle,
  GraduationCap,
  FileSpreadsheet,
  AlertCircle,
  BookOpen,
  Download,
  BarChart3,
  Loader2,
  Minus,
  MoreVertical,
  UserPlus2,
  Crown,
  Calendar,
  FileDown,
} from 'lucide-react'
import { TeacherManagementModal } from './Classes'
import { useConfirm } from '@/components/ui/confirm-dialog'
import toast from 'react-hot-toast'

interface StudentEnrollment {
  id: number | null
  student_email: string
  student_name: string
  roll_no: string
  enrolled_at: string | null
  verified: boolean
}

interface Subject {
  subject_id: number
  course_name: string
  class_info?: { class_id: number }
  teacher_name: string
  is_subject_owner?: boolean
  can_manage?: boolean
}

interface ScheduleItem {
  period_id: number
  subject_id: number
  subject_name: string
  course_name: string
  teacher_name?: string
  class_name: string
  class_id: number
  day_of_week: number
  day_name: string
  period_no: number
  is_subject_owner?: boolean
  is_coordinator?: boolean
  can_manage?: boolean
}

interface SubjectStudent {
  student_email: string
  name: string
  roll_no: string
  verified: boolean
  enrolled_at?: string
}

interface ClassInfo {
  class_id: number
  department_name: string
  batch: number
  semester: number
  section: string
  student_count: number
  is_active: boolean
  completed_at?: string
  coordinator_email?: string | null
  coordinator_name?: string | null
  is_coordinator?: boolean
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ClassDetailPage() {
  const navigate = useNavigate()
  const { classId } = useParams<{ classId: string }>()
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()
  const [activeTab, setActiveTab] = useState<'students' | 'subjects' | 'stats'>('students')

  // Modal states
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false)
  const [showEnrollmentModal, setShowEnrollmentModal] = useState<{ subjectId: number; subjectName: string } | null>(null)
  const [showAddPeriodModal, setShowAddPeriodModal] = useState<{ subjectId: number; subjectName: string } | null>(null)
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // Form states
  const [studentForm, setStudentForm] = useState({ email: '', name: '', roll_no: '' })
  const [subjectForm, setSubjectForm] = useState({ course_name: '' })
  const [periodForm, setPeriodForm] = useState<{ days: number[]; periods: number[] }>({ days: [], periods: [] })
  const [importFile, setImportFile] = useState<File | null>(null)
  const [exportingSubjectId, setExportingSubjectId] = useState<number | null>(null)
  const [showExportModal, setShowExportModal] = useState<{ subjectId: number; subjectName: string } | null>(null)
  const [exportMonths, setExportMonths] = useState<{ month: number; year: number; month_name: string; total_sessions: number }[]>([])
  const [isLoadingExportMonths, setIsLoadingExportMonths] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Student lookup
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupResult, setLookupResult] = useState<{ exists: boolean; name?: string; roll_no?: string } | null>(null)

  const classIdNum = parseInt(classId || '0')

  // Queries
  const { data: studentsData, isLoading: isLoadingStudents, refetch: refetchStudents } = useQuery({
    queryKey: ['classStudents', classIdNum],
    queryFn: () => classAPI.getStudents(classIdNum),
    enabled: !!classIdNum,
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', classIdNum],
    queryFn: () => scheduleAPI.getSubjects(classIdNum),
    enabled: !!classIdNum,
  })

  // Fetch schedule for this specific class (includes all subjects with can_manage flags)
  const { data: schedule = [] } = useQuery({
    queryKey: ['classSchedule', classIdNum],
    queryFn: () => scheduleAPI.getAll(undefined, classIdNum),
    enabled: !!classIdNum,
  })

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['classStats', classIdNum],
    queryFn: () => classAPI.getStats(classIdNum),
    enabled: activeTab === 'stats' && !!classIdNum,
  })

  // Get class info from classes list
  const { data: classesData = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: classAPI.list,
  })
  const classInfo = classesData.find((c: ClassInfo) => c.class_id === classIdNum)

  // Subjects are already filtered by classId via the API, schedule needs filtering
  const classSubjects = subjects
  // Schedule is already filtered by class_id from API
  const classSchedule = schedule

  // Mutations
  const addStudentMutation = useMutation({
    mutationFn: (data: { email: string; name: string; roll_no: string }) =>
      classAPI.inviteStudent(classIdNum, { email: data.email, name: data.name, roll_no: data.roll_no }),
    onSuccess: () => {
      toast.success('Student added successfully')
      refetchStudents()
      setShowAddStudentModal(false)
      setStudentForm({ email: '', name: '', roll_no: '' })
      setLookupResult(null)
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to add student')
    },
  })

  const removeStudentMutation = useMutation({
    mutationFn: (email: string) => classAPI.removeStudent(classIdNum, email),
    onSuccess: () => {
      toast.success('Student removed')
      refetchStudents()
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to remove student')
    },
  })

  const importStudentsMutation = useMutation({
    mutationFn: (file: File) => classAPI.importStudents(classIdNum, file),
    onSuccess: (data) => {
      toast.success(`Imported ${data.enrolled} students`)
      refetchStudents()
      setShowImportModal(false)
      setImportFile(null)
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to import students')
    },
  })

  const addSubjectMutation = useMutation({
    mutationFn: (data: { course_name: string }) =>
      scheduleAPI.createSubject({ course_name: data.course_name, class_field: classIdNum }),
    onSuccess: () => {
      toast.success('Subject added')
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setShowAddSubjectModal(false)
      setSubjectForm({ course_name: '' })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to add subject')
    },
  })

  const [isAddingPeriods, setIsAddingPeriods] = useState(false)

  const addPeriodsMutation = useMutation({
    mutationFn: async (data: { subject: number; periods: { day_of_week: number; period_no: number }[] }) => {
      // Add periods sequentially to handle potential conflicts gracefully
      const results = []
      for (const period of data.periods) {
        try {
          await scheduleAPI.createPeriod({
            subject: data.subject,
            day_of_week: period.day_of_week,
            period_no: period.period_no,
          })
          results.push({ success: true, period })
        } catch (err) {
          results.push({ success: false, period, error: err })
        }
      }
      return results
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length
      if (successCount > 0) {
        toast.success(`${successCount} period${successCount > 1 ? 's' : ''} added${failCount > 0 ? ` (${failCount} failed - may already exist)` : ''}`)
      } else if (failCount > 0) {
        toast.error('Failed to add periods - they may already exist')
      }
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
      queryClient.invalidateQueries({ queryKey: ['classSchedule'] })
      setShowAddPeriodModal(null)
      setPeriodForm({ days: [], periods: [] })
      setIsAddingPeriods(false)
    },
    onError: () => {
      toast.error('Failed to add periods')
      setIsAddingPeriods(false)
    },
  })

  const deletePeriodMutation = useMutation({
    mutationFn: scheduleAPI.deletePeriod,
    onSuccess: () => {
      toast.success('Period removed')
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to remove period')
    },
  })

  // Class management mutations
  const markCompleteMutation = useMutation({
    mutationFn: () => classAPI.markComplete(classIdNum),
    onSuccess: () => {
      toast.success('Semester marked as complete')
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to mark complete')
    },
  })

  const deleteClassMutation = useMutation({
    mutationFn: () => classAPI.delete(classIdNum),
    onSuccess: () => {
      toast.success('Class deleted')
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      navigate('/teacher/classes')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete class')
    },
  })

  // Student lookup
  const handleEmailChange = async (email: string) => {
    setStudentForm(prev => ({ ...prev, email }))
    if (email.includes('@') && email.length > 5) {
      setIsLookingUp(true)
      try {
        const result = await studentLookupAPI.lookup(email)
        setLookupResult(result)
        if (result.exists && result.name && result.roll_no) {
          setStudentForm(prev => ({ ...prev, name: result.name || '', roll_no: result.roll_no || '' }))
        }
      } catch {
        setLookupResult(null)
      } finally {
        setIsLookingUp(false)
      }
    } else {
      setLookupResult(null)
    }
  }

  const handleOpenExportModal = async (subjectId: number, subjectName: string) => {
    setShowExportModal({ subjectId, subjectName })
    setIsLoadingExportMonths(true)
    setExportMonths([])
    try {
      const data = await exportRegisterAPI.getMonths(subjectId)
      setExportMonths(data.months)
    } catch {
      toast.error('Failed to load export data')
      setShowExportModal(null)
    } finally {
      setIsLoadingExportMonths(false)
    }
  }

  const downloadCSV = async (content: string, filename: string) => {
    try {
      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')

        // Save directly to Documents folder (accessible in Files app)
        await Filesystem.writeFile({
          path: filename,
          data: content,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        })
        return
      }
    } catch {
      // Fall through to web download
    }

    // Web: standard blob download
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const escapeCSV = (val: string | number) => {
    const str = String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const handleExportMonthly = async (month: number, year: number, monthName: string) => {
    if (!showExportModal) return
    setIsExporting(true)
    try {
      const data = await exportRegisterAPI.getMonthly(showExportModal.subjectId, month, year)

      // Build date column headers: "06 Jan (Mon)"
      const dateHeaders = data.sessions.map(s => {
        const d = new Date(s.date)
        const day = d.getDate().toString().padStart(2, '0')
        const mon = d.toLocaleString('en-US', { month: 'short' })
        const dayName = s.day.substring(0, 3)
        return `${day} ${mon} (${dayName})`
      })

      const headers = ['S.No', 'Roll No', 'Name', 'Email', ...dateHeaders, 'Total Present', 'Total Classes', 'Attendance %']

      const rows = data.students.map((student, idx) => [
        idx + 1,
        escapeCSV(student.roll_no),
        escapeCSV(student.name),
        escapeCSV(student.email),
        ...student.attendance,
        student.total_present,
        student.total_classes,
        `${student.percentage}%`,
      ])

      const csvContent = [
        `Subject: ${escapeCSV(data.subject_name)}`,
        `Class: ${escapeCSV(data.class_name)}`,
        `Department: ${escapeCSV(data.department)}`,
        `Teacher: ${escapeCSV(data.teacher_name)}`,
        `Month: ${monthName} ${year}`,
        `Batch: ${data.batch}${data.section?.trim() ? ` | Semester: ${data.semester} | Section: ${data.section}` : ` | Semester: ${data.semester}`}`,
        `Exported: ${new Date().toLocaleString()}`,
        '',
        headers.map(h => escapeCSV(h)).join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      const filename = `attendance_${data.subject_name.replace(/\s+/g, '_')}_${monthName}_${year}.csv`
      await downloadCSV(csvContent, filename)
      toast.success(`${monthName} ${year} attendance exported`)
    } catch {
      toast.error('Failed to export monthly attendance')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSemester = async () => {
    if (!showExportModal) return
    setIsExporting(true)
    try {
      const data = await exportRegisterAPI.getSemester(showExportModal.subjectId)

      // Build month column headers: "Jan '26 (P/T)", "Jan '26 %"
      const monthHeaders: string[] = []
      for (const m of data.months) {
        const shortMonth = m.month_name.substring(0, 3)
        const shortYear = String(m.year).substring(2)
        monthHeaders.push(`${shortMonth} '${shortYear} (P/T)`)
        monthHeaders.push(`${shortMonth} '${shortYear} %`)
      }

      const headers = ['S.No', 'Roll No', 'Name', 'Email', ...monthHeaders, 'Total Present', 'Total Classes', 'Overall %']

      const rows = data.students.map((student, idx) => {
        const monthCols: (string | number)[] = []
        for (const ms of student.monthly_stats) {
          monthCols.push(`${ms.present}/${ms.total}`)
          monthCols.push(`${ms.percentage}%`)
        }
        return [
          idx + 1,
          escapeCSV(student.roll_no),
          escapeCSV(student.name),
          escapeCSV(student.email),
          ...monthCols,
          student.total_present,
          student.total_classes,
          `${student.percentage}%`,
        ]
      })

      const csvContent = [
        `Subject: ${escapeCSV(data.subject_name)}`,
        `Class: ${escapeCSV(data.class_name)}`,
        `Department: ${escapeCSV(data.department)}`,
        `Teacher: ${escapeCSV(data.teacher_name)}`,
        `Semester Summary`,
        `Batch: ${data.batch}${data.section?.trim() ? ` | Semester: ${data.semester} | Section: ${data.section}` : ` | Semester: ${data.semester}`}`,
        `Exported: ${new Date().toLocaleString()}`,
        '',
        headers.map(h => escapeCSV(h)).join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      const filename = `attendance_${data.subject_name.replace(/\s+/g, '_')}_semester_summary.csv`
      await downloadCSV(csvContent, filename)
      toast.success('Semester summary exported')
    } catch {
      toast.error('Failed to export semester summary')
    } finally {
      setIsExporting(false)
    }
  }

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 75) return 'text-emerald-600 dark:text-emerald-400'
    if (percentage >= 50) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  if (isLoadingStudents) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  const className = studentsData?.class_name || 'Class'

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Mobile Optimized */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/classes')} className="rounded-xl h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0 ${classInfo?.is_active ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-lg font-heading font-bold text-foreground truncate max-w-[120px] sm:max-w-none">{className}</h1>
                  {classInfo?.is_coordinator && (
                    <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] sm:text-xs px-1.5 py-0.5">
                      <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Coordinator</span>
                    </Badge>
                  )}
                  {!classInfo?.is_active && (
                    <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs px-1.5 py-0.5">
                      <span className="hidden sm:inline">Completed</span>
                      <span className="sm:hidden">Done</span>
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{studentsData?.students?.length || 0} students</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Management menu */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMenu(!showMenu)}
                  className="rounded-xl h-8 w-8 sm:h-9 sm:w-9 p-0"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-44 sm:w-48 bg-card rounded-xl border shadow-lg z-50 py-1 overflow-hidden">
                      {classInfo?.is_coordinator && (
                        <button
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                          onClick={() => {
                            setShowMenu(false)
                            setShowTeacherModal(true)
                          }}
                        >
                          <UserPlus2 className="h-4 w-4 text-blue-500" />
                          Manage Teachers
                        </button>
                      )}
                      {classInfo?.is_active && classInfo?.is_coordinator && (
                        <button
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                          onClick={async () => {
                            setShowMenu(false)
                            if (await confirm('End Semester', 'Mark this semester as complete? This will close any active sessions.', { confirmLabel: 'Complete', destructive: false })) {
                              markCompleteMutation.mutate()
                            }
                          }}
                          disabled={markCompleteMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 text-amber-500" />
                          End Semester
                        </button>
                      )}
                      {classInfo?.is_coordinator && (
                        <button
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600"
                          onClick={async () => {
                            setShowMenu(false)
                            if (await confirm('Delete Class', 'Delete this class? This action cannot be undone.', { confirmLabel: 'Delete' })) {
                              deleteClassMutation.mutate()
                            }
                          }}
                          disabled={deleteClassMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Class
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs - Mobile Optimized */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex">
            <button
              className={`flex-1 px-2 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'students' ? 'border-amber-500 text-amber-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('students')}
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Students</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">{studentsData?.students?.length || 0}</Badge>
            </button>
            <button
              className={`flex-1 px-2 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'subjects' ? 'border-amber-500 text-amber-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('subjects')}
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Subjects</span>
              <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2">{classSubjects.length}</Badge>
            </button>
            <button
              className={`flex-1 px-2 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-colors border-b-2 flex items-center justify-center gap-1 sm:gap-2 ${activeTab === 'stats' ? 'border-amber-500 text-amber-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              onClick={() => setActiveTab('stats')}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Stats</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-xl font-heading font-semibold text-foreground">Enrolled Students</h2>
              {classInfo?.is_coordinator && (
                <div className="flex gap-1.5 sm:gap-2">
                  <Button variant="outline" onClick={() => setShowImportModal(true)} className="rounded-xl h-9 px-2.5 sm:px-4">
                    <Upload className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Import</span>
                  </Button>
                  <Button onClick={() => setShowAddStudentModal(true)} className="rounded-xl bg-amber-500 hover:bg-amber-600 h-9 px-2.5 sm:px-4">
                    <UserPlus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Add Student</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Students List */}
            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
              </div>
            ) : studentsData?.students?.length === 0 ? (
              <div className="text-center py-8 sm:py-12 bg-card rounded-2xl border">
                <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No students enrolled</h3>
                <p className="text-sm text-muted-foreground mb-4">Add students to get started</p>
              </div>
            ) : (
              <div className="grid gap-2 sm:gap-3">
                {studentsData?.students?.map((student: StudentEnrollment) => (
                  <div
                    key={student.student_email}
                    className="flex items-center justify-between p-3 sm:p-4 bg-card rounded-xl border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
                      <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                        {student.student_name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">{student.student_name}</p>
                          {student.verified && (
                            <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs px-1.5 py-0.5">
                              <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 sm:mr-1" />
                              <span className="hidden sm:inline">Verified</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{student.student_email}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Roll: {student.roll_no}</p>
                      </div>
                    </div>
                    {classInfo?.is_coordinator && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (await confirm('Remove Student', `Remove ${student.student_name} from this class?`, { confirmLabel: 'Remove' })) {
                            removeStudentMutation.mutate(student.student_email)
                          }
                        }}
                        className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Subjects Tab */}
        {activeTab === 'subjects' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-xl font-heading font-semibold text-foreground">Subjects & Schedule</h2>
              <Button onClick={() => setShowAddSubjectModal(true)} className="rounded-xl bg-amber-500 hover:bg-amber-600 h-9 px-2.5 sm:px-4">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Add Subject</span>
              </Button>
            </div>

            {/* Subjects List */}
            {classSubjects.length === 0 ? (
              <div className="text-center py-8 sm:py-12 bg-card rounded-2xl border">
                <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No subjects yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Add subjects to create schedules</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {classSubjects.map((subject: Subject) => {
                  const subjectPeriods = classSchedule.filter((s: ScheduleItem) => s.subject_id === subject.subject_id)
                  const periodsByDay: { [key: number]: ScheduleItem[] } = {}
                  subjectPeriods.forEach((p: ScheduleItem) => {
                    if (!periodsByDay[p.day_of_week]) periodsByDay[p.day_of_week] = []
                    periodsByDay[p.day_of_week].push(p)
                  })

                  return (
                    <div key={subject.subject_id} className="bg-card rounded-2xl border p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-foreground truncate">{subject.course_name}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                            <span className="truncate max-w-[120px] sm:max-w-none">by {subject.teacher_name}</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span>{subjectPeriods.length} periods/week</span>
                            {subject.is_subject_owner && (
                              <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] px-1.5 py-0.5">
                                You
                              </Badge>
                            )}
                          </div>
                        </div>
                        {subject.can_manage && (
                          <Button
                            variant="outline"
                            onClick={() => setShowEnrollmentModal({ subjectId: subject.subject_id, subjectName: subject.course_name })}
                            className="rounded-xl h-9 px-3 text-xs sm:text-sm w-full sm:w-auto"
                          >
                            <Users className="h-4 w-4 mr-1.5 sm:mr-2" />
                            Manage Students
                          </Button>
                        )}
                      </div>

                      {/* Schedule Grid - Horizontal scroll on mobile */}
                      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
                        <div className="grid grid-cols-6 gap-1.5 sm:gap-2 min-w-[320px]">
                          {DAYS.map((day, dayIndex) => {
                            const dayPeriods = periodsByDay[dayIndex] || []
                            return (
                              <div key={day} className="text-center">
                                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2">{day}</p>
                                <div className="space-y-1 min-h-[50px] sm:min-h-[60px]">
                                  {dayPeriods.map((p: ScheduleItem) => (
                                    <div
                                      key={p.period_id}
                                      className="group relative bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md sm:rounded-lg"
                                    >
                                      P{p.period_no}
                                      {(p.can_manage || subject.can_manage) && (
                                        <button
                                          onClick={async () => {
                                            if (await confirm('Delete Period', 'Delete this period?', { confirmLabel: 'Delete' })) {
                                              deletePeriodMutation.mutate(p.period_id)
                                            }
                                          }}
                                          className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 text-white rounded-full text-[8px] sm:opacity-0 sm:group-hover:opacity-100 sm:transition-opacity flex items-center justify-center"
                                        >
                                          <X className="h-2 w-2" />
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {dayPeriods.length === 0 && (
                                    <div className="text-[10px] sm:text-xs text-muted-foreground py-1.5 sm:py-2">—</div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {subject.can_manage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddPeriodModal({ subjectId: subject.subject_id, subjectName: subject.course_name })}
                          className="w-full rounded-xl border-dashed h-9 text-xs sm:text-sm"
                        >
                          <Plus className="h-4 w-4 mr-1.5 sm:mr-2" />
                          Add Period
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-base sm:text-xl font-heading font-semibold text-foreground">Attendance Statistics</h2>

            {isLoadingStats ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
              </div>
            ) : stats ? (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="bg-card rounded-xl sm:rounded-2xl border p-3 sm:p-6">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1 sm:mb-2">Classes Taken</p>
                    <p className="text-2xl sm:text-3xl font-heading font-bold text-foreground">{stats.classes_taken}</p>
                  </div>
                  <div className="bg-card rounded-xl sm:rounded-2xl border p-3 sm:p-6">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1 sm:mb-2">Total Sessions</p>
                    <p className="text-2xl sm:text-3xl font-heading font-bold text-foreground">{stats.total_sessions}</p>
                  </div>
                  <div className="bg-card rounded-xl sm:rounded-2xl border p-3 sm:p-6">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1 sm:mb-2">Students</p>
                    <p className="text-2xl sm:text-3xl font-heading font-bold text-foreground">{stats.total_students}</p>
                  </div>
                  <div className="bg-card rounded-xl sm:rounded-2xl border p-3 sm:p-6">
                    <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1 sm:mb-2">Avg Attendance</p>
                    <p className={`text-2xl sm:text-3xl font-heading font-bold ${getAttendanceColor(stats.average_attendance)}`}>
                      {stats.average_attendance}%
                    </p>
                  </div>
                </div>

                {/* Subject-wise Stats */}
                {stats.subjects.length > 0 && (
                  <div className="bg-card rounded-xl sm:rounded-2xl border p-3 sm:p-6">
                    <h3 className="text-sm sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      Subject-wise Attendance
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      {stats.subjects.map((subject: { subject_id: number; course_name: string; teacher_name: string; total_sessions: number; average_attendance: number; is_subject_owner?: boolean; can_export?: boolean }) => (
                        <div
                          key={subject.subject_id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <p className="font-semibold text-foreground text-sm sm:text-base truncate">{subject.course_name}</p>
                              {subject.is_subject_owner && (
                                <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] px-1.5 py-0.5">
                                  You
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              by {subject.teacher_name} • {subject.total_sessions} sessions
                            </p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                            <p className={`text-xl sm:text-2xl font-heading font-bold ${getAttendanceColor(subject.average_attendance)}`}>
                              {subject.average_attendance}%
                            </p>
                            {subject.can_export && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenExportModal(subject.subject_id, subject.course_name)}
                                className="rounded-xl h-8 px-2 sm:px-3"
                              >
                                <Download className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Export</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 sm:py-12 bg-card rounded-xl sm:rounded-2xl border">
                <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No data available</h3>
                <p className="text-sm text-muted-foreground">Start taking attendance to see statistics</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-card z-10">
              <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">Add Student</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddStudentModal(false)} className="rounded-xl h-8 w-8 sm:h-10 sm:w-10">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl bg-background text-foreground text-sm sm:text-base"
                  />
                  {isLookingUp && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {lookupResult?.exists && (
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Student found - details auto-filled
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl bg-background text-foreground text-sm sm:text-base"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Roll Number</label>
                <input
                  type="text"
                  value={studentForm.roll_no}
                  onChange={(e) => setStudentForm(prev => ({ ...prev, roll_no: e.target.value }))}
                  placeholder="22030101"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl bg-background text-foreground text-sm sm:text-base"
                />
              </div>
              <Button
                onClick={() => addStudentMutation.mutate(studentForm)}
                disabled={!studentForm.email || !studentForm.name || !studentForm.roll_no || addStudentMutation.isPending}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 h-10 sm:h-11"
              >
                {addStudentMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" />Add Student</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border shadow-2xl">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">Import Students</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowImportModal(false)} className="rounded-xl h-8 w-8 sm:h-10 sm:w-10">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="border-2 border-dashed rounded-xl p-6 sm:p-8 text-center">
                <FileSpreadsheet className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-muted-foreground mb-3" />
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="import-file"
                />
                <label htmlFor="import-file" className="cursor-pointer">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                    {importFile ? importFile.name : 'Click to select CSV or Excel file'}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Columns: email, name, roll_no
                  </p>
                </label>
              </div>
              <Button
                onClick={() => importFile && importStudentsMutation.mutate(importFile)}
                disabled={!importFile || importStudentsMutation.isPending}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 h-10 sm:h-11"
              >
                {importStudentsMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Import Students</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border shadow-2xl">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">Add Subject</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddSubjectModal(false)} className="rounded-xl h-8 w-8 sm:h-10 sm:w-10">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Subject Name</label>
                <input
                  type="text"
                  value={subjectForm.course_name}
                  onChange={(e) => setSubjectForm({ course_name: e.target.value })}
                  placeholder="e.g., Data Structures"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-xl bg-background text-foreground text-sm sm:text-base"
                />
              </div>
              <Button
                onClick={() => addSubjectMutation.mutate(subjectForm)}
                disabled={!subjectForm.course_name || addSubjectMutation.isPending}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 h-10 sm:h-11"
              >
                {addSubjectMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" />Add Subject</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Period Modal - Bulk Addition Support */}
      {showAddPeriodModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <div className="min-w-0">
                <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">Add Periods</h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{showAddPeriodModal.subjectName}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setShowAddPeriodModal(null); setPeriodForm({ days: [], periods: [] }) }} className="rounded-xl h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Day Selection - Multi-select chips */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Select Days</label>
                  <button
                    onClick={() => {
                      if (periodForm.days.length === 6) {
                        setPeriodForm(prev => ({ ...prev, days: [] }))
                      } else {
                        setPeriodForm(prev => ({ ...prev, days: [0, 1, 2, 3, 4, 5] }))
                      }
                    }}
                    className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    {periodForm.days.length === 6 ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day, i) => {
                    const isSelected = periodForm.days.includes(i)
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          if (isSelected) {
                            setPeriodForm(prev => ({ ...prev, days: prev.days.filter(d => d !== i) }))
                          } else {
                            setPeriodForm(prev => ({ ...prev, days: [...prev.days, i].sort() }))
                          }
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                            : 'bg-slate-100 dark:bg-slate-800 text-foreground hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Period Selection - Multi-select grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Select Periods</label>
                  <button
                    onClick={() => {
                      if (periodForm.periods.length === 8) {
                        setPeriodForm(prev => ({ ...prev, periods: [] }))
                      } else {
                        setPeriodForm(prev => ({ ...prev, periods: [1, 2, 3, 4, 5, 6, 7, 8] }))
                      }
                    }}
                    className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    {periodForm.periods.length === 8 ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => {
                    const isSelected = periodForm.periods.includes(num)
                    return (
                      <button
                        key={num}
                        onClick={() => {
                          if (isSelected) {
                            setPeriodForm(prev => ({ ...prev, periods: prev.periods.filter(p => p !== num) }))
                          } else {
                            setPeriodForm(prev => ({ ...prev, periods: [...prev.periods, num].sort((a, b) => a - b) }))
                          }
                        }}
                        className={`p-3 rounded-xl border text-center font-semibold text-sm transition-all ${
                          isSelected
                            ? 'bg-gradient-to-br from-violet-500 to-purple-600 border-violet-500 text-white shadow-lg shadow-violet-500/25'
                            : 'bg-background border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-700'
                        }`}
                      >
                        P{num}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Preview of selected combinations */}
              {periodForm.days.length > 0 && periodForm.periods.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-dashed">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Will add {periodForm.days.length * periodForm.periods.length} period(s):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {periodForm.days.slice(0, 3).flatMap(day =>
                      periodForm.periods.slice(0, 2).map(period => (
                        <Badge
                          key={`${day}-${period}`}
                          variant="secondary"
                          className="text-[10px] px-2 py-0.5"
                        >
                          {DAYS[day]} P{period}
                        </Badge>
                      ))
                    )}
                    {(periodForm.days.length * periodForm.periods.length) > 6 && (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                        +{(periodForm.days.length * periodForm.periods.length) - 6} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with action button */}
            <div className="p-4 sm:p-6 border-t bg-card">
              <Button
                onClick={() => {
                  if (periodForm.days.length === 0 || periodForm.periods.length === 0) {
                    toast.error('Please select at least one day and one period')
                    return
                  }
                  setIsAddingPeriods(true)
                  const periods = periodForm.days.flatMap(day =>
                    periodForm.periods.map(period => ({
                      day_of_week: day,
                      period_no: period,
                    }))
                  )
                  addPeriodsMutation.mutate({
                    subject: showAddPeriodModal.subjectId,
                    periods,
                  })
                }}
                disabled={isAddingPeriods || periodForm.days.length === 0 || periodForm.periods.length === 0}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 h-11 text-sm font-semibold"
              >
                {isAddingPeriods ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding {periodForm.days.length * periodForm.periods.length} periods...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" />Add {periodForm.days.length > 0 && periodForm.periods.length > 0 ? `${periodForm.days.length * periodForm.periods.length} Period${periodForm.days.length * periodForm.periods.length > 1 ? 's' : ''}` : 'Periods'}</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Subject Enrollment Modal */}
      {showEnrollmentModal && (
        <SubjectEnrollmentModal
          subjectId={showEnrollmentModal.subjectId}
          subjectName={showEnrollmentModal.subjectName}
          onClose={() => setShowEnrollmentModal(null)}
        />
      )}

      {/* Teacher Management Modal */}
      {showTeacherModal && (
        <TeacherManagementModal
          classId={classIdNum}
          onClose={() => setShowTeacherModal(false)}
        />
      )}

      {/* Export Attendance Register Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-lg w-full bg-card rounded-3xl shadow-2xl overflow-hidden animate-in opacity-0">
            <div className="p-6 border-b">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                  <FileDown className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-bold text-xl text-foreground">Export Attendance Register</h3>
                  <p className="text-sm text-muted-foreground">{showExportModal.subjectName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setShowExportModal(null); setExportMonths([]) }}
                  className="rounded-xl"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-6">
              {isLoadingExportMonths ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                </div>
              ) : exportMonths.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No attendance sessions found for this subject.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select a month for date-wise attendance register (1/0 for each class)
                  </p>

                  {/* Month Chips */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {exportMonths.map((m) => {
                      const shortMonth = m.month_name.substring(0, 3)
                      const shortYear = String(m.year).substring(2)
                      return (
                        <button
                          key={`${m.year}-${m.month}`}
                          onClick={() => handleExportMonthly(m.month, m.year, m.month_name)}
                          disabled={isExporting}
                          className="flex flex-col items-center px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-800/50 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="text-sm font-semibold text-foreground">{shortMonth} '{shortYear}</span>
                          <span className="text-[10px] text-muted-foreground">{m.total_sessions} classes</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Semester Summary Button */}
                  <Button
                    onClick={handleExportSemester}
                    disabled={isExporting}
                    className="w-full rounded-xl h-12 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white"
                  >
                    {isExporting ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Exporting...</>
                    ) : (
                      <><FileSpreadsheet className="mr-2 h-5 w-5" />Full Semester Summary</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Month-wise summary with present/total for each month
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Subject Enrollment Modal Component
function SubjectEnrollmentModal({ subjectId, subjectName, onClose }: { subjectId: number; subjectName: string; onClose: () => void }) {
  const { data: enrollmentData, isLoading, refetch } = useQuery({
    queryKey: ['subjectEnrollment', subjectId],
    queryFn: () => subjectAPI.getStudents(subjectId),
  })

  const enrollMutation = useMutation({
    mutationFn: (studentEmail: string) => subjectAPI.enrollStudent(subjectId, studentEmail),
    onSuccess: () => {
      toast.success('Student enrolled')
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to enroll student')
    },
  })

  const removeMutation = useMutation({
    mutationFn: (studentEmail: string) => subjectAPI.removeStudent(subjectId, studentEmail),
    onSuccess: () => {
      toast.success('Student removed from subject')
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to remove student')
    },
  })

  const enrollAllMutation = useMutation({
    mutationFn: () => subjectAPI.enrollAll(subjectId),
    onSuccess: (data) => {
      toast.success(`${data.enrolled_count} students enrolled`)
      refetch()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to enroll all students')
    },
  })

  const enrolled = enrollmentData?.enrolled || []
  const notEnrolled = enrollmentData?.not_enrolled || []

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl border shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-card z-10">
          <div className="min-w-0 flex-1">
            <h3 className="font-heading font-bold text-base sm:text-lg text-foreground truncate">{subjectName}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage student enrollment</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {notEnrolled.length > 0 && (
              <Button
                onClick={() => enrollAllMutation.mutate()}
                disabled={enrollAllMutation.isPending}
                className="w-full mb-4 rounded-xl bg-violet-500 hover:bg-violet-600 text-white h-10 sm:h-11 text-sm"
              >
                {enrollAllMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enrolling...</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" />Enroll All ({notEnrolled.length})</>
                )}
              </Button>
            )}

            <div className="mb-4 sm:mb-6">
              <h4 className="font-medium text-xs sm:text-sm text-foreground mb-2 sm:mb-3 flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                Enrolled ({enrolled.length})
              </h4>
              {enrolled.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  No students enrolled yet
                </p>
              ) : (
                <div className="space-y-1.5 sm:space-y-2 max-h-36 sm:max-h-48 overflow-y-auto">
                  {enrolled.map((student: SubjectStudent) => (
                    <div
                      key={student.student_email}
                      className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] sm:text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            {student.name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs sm:text-sm text-foreground truncate">{student.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{student.roll_no}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMutation.mutate(student.student_email)}
                        disabled={removeMutation.isPending}
                        className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 h-7 w-7 sm:h-8 sm:w-8 p-0 flex-shrink-0"
                      >
                        <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="font-medium text-xs sm:text-sm text-foreground mb-2 sm:mb-3 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                Not Enrolled ({notEnrolled.length})
              </h4>
              {notEnrolled.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground text-center py-3 sm:py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  All class students are enrolled
                </p>
              ) : (
                <div className="space-y-1.5 sm:space-y-2 max-h-36 sm:max-h-48 overflow-y-auto">
                  {notEnrolled.map((student: SubjectStudent) => (
                    <div
                      key={student.student_email}
                      className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                            {student.name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs sm:text-sm text-foreground truncate">{student.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{student.roll_no}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => enrollMutation.mutate(student.student_email)}
                        disabled={enrollMutation.isPending}
                        className="rounded-lg text-[10px] sm:text-xs h-7 sm:h-8 px-2 sm:px-3 flex-shrink-0"
                      >
                        <Plus className="h-3 w-3 mr-0.5 sm:mr-1" />
                        Enroll
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
