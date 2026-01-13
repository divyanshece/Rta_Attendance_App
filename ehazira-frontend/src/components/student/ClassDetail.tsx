import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { studentAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  BookOpen,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  GraduationCap,
  Calendar,
  BarChart3,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface SubjectAttendance {
  subject_id: number
  course_name: string
  teacher_name: string
  total_sessions: number
  present: number
  absent: number
  percentage: number
}

interface ClassWithAttendance {
  class_id: number
  class_name: string
  department_name: string
  batch: number
  semester: number
  section: string
  roll_no: string
  subjects: SubjectAttendance[]
  overall_percentage: number
  total_present: number
  total_absent: number
  total_sessions: number
}

export default function StudentClassDetail() {
  const navigate = useNavigate()
  const { classId } = useParams<{ classId: string }>()

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['studentClasses'],
    queryFn: studentAPI.getClasses,
  })

  const classData = classes.find((c: ClassWithAttendance) => c.class_id === Number(classId)) as ClassWithAttendance | undefined

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

  const getAttendanceBg = (percentage: number) => {
    if (percentage >= 85) return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
    if (percentage >= 75) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background bg-gradient-mesh flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-background bg-gradient-mesh">
        <header className="sticky top-0 z-50 glass border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/student')}
                  className="rounded-xl"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-heading font-bold text-foreground">Class Not Found</h1>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-card rounded-2xl border py-16 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="font-heading font-semibold text-foreground mb-2">Class not found</h4>
            <p className="text-sm text-muted-foreground mb-4">
              The class you're looking for doesn't exist or you're not enrolled
            </p>
            <Button onClick={() => navigate('/student')} variant="outline" className="rounded-xl">
              Go Back
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const attendance = classData.overall_percentage
  const AttendanceIcon = getAttendanceIcon(attendance)

  return (
    <div className="min-h-screen bg-background bg-gradient-mesh">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/student')}
                className="rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAttendanceGradient(attendance)} flex items-center justify-center shadow-lg`}>
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-heading font-bold text-foreground">{classData.class_name}</h1>
                <p className="text-xs text-muted-foreground">{classData.department_name}</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Class Info Header */}
        <div className="bg-card rounded-2xl border p-6 mb-6 animate-in opacity-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-xl bg-gradient-to-br ${getAttendanceGradient(attendance)} shadow-lg`}>
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground">{classData.class_name}</h2>
                <p className="text-muted-foreground">{classData.department_name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="font-mono">{classData.roll_no}</Badge>
                  <span>•</span>
                  <span>Batch {classData.batch}</span>
                  <span>•</span>
                  <span>Sem {classData.semester}</span>
                  {classData.section && classData.section.trim() && (
                    <>
                      <span>•</span>
                      <span>Sec {classData.section}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-4xl font-heading font-bold ${getAttendanceColor(attendance)}`}>
                {attendance}%
              </p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <AttendanceIcon className={`h-5 w-5 ${getAttendanceColor(attendance)}`} />
                <span className={`text-sm font-medium ${getAttendanceColor(attendance)}`}>
                  {getAttendanceLabel(attendance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Classes', value: classData.total_sessions, icon: Calendar, gradient: 'from-violet-500 to-purple-600' },
            { label: 'Present', value: classData.total_present, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-600' },
            { label: 'Absent', value: classData.total_absent, icon: XCircle, gradient: 'from-red-500 to-rose-600' },
            { label: 'Subjects', value: classData.subjects.length, icon: BookOpen, gradient: 'from-blue-500 to-indigo-600' },
          ].map((stat, i) => (
            <div key={stat.label} className={`stat-card animate-in opacity-0 stagger-${i + 1}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {stat.label}
                  </p>
                  <p className="text-2xl md:text-3xl font-heading font-bold text-foreground">
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

        {/* Subjects List */}
        <div className="animate-in opacity-0 stagger-5">
          <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            Subject-wise Attendance
          </h3>

          <div className="space-y-4">
            {classData.subjects.map((subject, index) => {
              const SubjectIcon = getAttendanceIcon(subject.percentage)
              return (
                <div
                  key={subject.subject_id}
                  className={`bg-card rounded-2xl border p-5 animate-in opacity-0 stagger-${Math.min(index + 1, 6)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${getAttendanceGradient(subject.percentage)} shadow-lg`}>
                      <BookOpen className="h-5 w-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h4 className="font-heading font-bold text-lg text-foreground">
                            {subject.course_name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>{subject.teacher_name}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-3xl font-heading font-bold ${getAttendanceColor(subject.percentage)}`}>
                            {subject.percentage}%
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <SubjectIcon className={`h-4 w-4 ${getAttendanceColor(subject.percentage)}`} />
                            <span className={`text-xs font-medium ${getAttendanceColor(subject.percentage)}`}>
                              {getAttendanceLabel(subject.percentage)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{subject.present} / {subject.total_sessions} classes attended</span>
                          <span>{subject.absent} absent</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${getAttendanceGradient(subject.percentage)} transition-all duration-500`}
                            style={{ width: `${subject.percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-4 text-sm">
                        <div className={`px-3 py-1.5 rounded-lg border ${getAttendanceBg(subject.percentage)}`}>
                          <span className="text-emerald-700 dark:text-emerald-400">
                            <CheckCircle className="h-3.5 w-3.5 inline mr-1" />
                            {subject.present} Present
                          </span>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                          <span className="text-red-700 dark:text-red-400">
                            <XCircle className="h-3.5 w-3.5 inline mr-1" />
                            {subject.absent} Absent
                          </span>
                        </div>
                        <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5 inline mr-1" />
                            {subject.total_sessions} Total
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {classData.subjects.length === 0 && (
              <div className="bg-card rounded-2xl border py-12 text-center">
                <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h4 className="font-heading font-semibold text-foreground mb-2">No subjects found</h4>
                <p className="text-sm text-muted-foreground">
                  No subjects have been added to this class yet
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
