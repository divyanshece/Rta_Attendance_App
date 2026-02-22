import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { studentAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'

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

  const getAttendanceColor = (pct: number) => {
    if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400'
    if (pct >= 60) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getBarColor = (pct: number) => {
    if (pct >= 75) return 'bg-emerald-500'
    if (pct >= 60) return 'bg-amber-500'
    return 'bg-red-500'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 glass border-b">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex items-center h-14">
              <Button variant="ghost" size="icon" onClick={() => navigate('/student')} className="rounded-xl h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-base font-heading font-bold text-foreground ml-3">Class Not Found</h1>
            </div>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-card rounded-xl border py-10 text-center">
            <p className="text-sm text-muted-foreground mb-3">This class doesn't exist or you're not enrolled.</p>
            <Button onClick={() => navigate('/student')} variant="outline" size="sm" className="rounded-xl">
              Go Back
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center h-14">
            <Button variant="ghost" size="icon" onClick={() => navigate('/student')} className="rounded-xl h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="ml-3 min-w-0">
              <h1 className="text-base font-heading font-bold text-foreground truncate">{classData.class_name}</h1>
              <p className="text-[11px] text-muted-foreground">{classData.department_name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {/* Overview Card */}
        <div className="bg-card rounded-xl border p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={`text-3xl font-heading font-bold ${getAttendanceColor(classData.overall_percentage)}`}>
                {classData.overall_percentage}%
              </p>
              <p className="text-[11px] text-muted-foreground">Overall Attendance</p>
            </div>
            <div className="text-right text-[11px]">
              <p className="text-muted-foreground">Roll: <span className="font-mono font-medium text-foreground">{classData.roll_no}</span></p>
              <p className="text-muted-foreground">Batch {classData.batch} &middot; Sem {classData.semester}{classData.section?.trim() ? ` &middot; Sec ${classData.section}` : ''}</p>
            </div>
          </div>
          <div className="flex gap-4 text-xs">
            <span className="text-emerald-600 dark:text-emerald-400"><CheckCircle className="h-3 w-3 inline mr-0.5" />{classData.total_present} Present</span>
            <span className="text-red-600 dark:text-red-400"><XCircle className="h-3 w-3 inline mr-0.5" />{classData.total_absent} Absent</span>
            <span className="text-muted-foreground">{classData.total_sessions} Total</span>
          </div>
        </div>

        {/* Subjects */}
        <h3 className="text-sm font-heading font-semibold text-foreground mb-2">Subjects</h3>
        {classData.subjects.length === 0 ? (
          <div className="bg-card rounded-xl border py-10 text-center">
            <p className="text-sm text-muted-foreground">No subjects found</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border divide-y">
            {classData.subjects.map((subject) => (
              <div key={subject.subject_id} className="px-3 py-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm font-medium text-foreground truncate">{subject.course_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{subject.teacher_name}</p>
                  </div>
                  <p className={`text-lg font-heading font-bold flex-shrink-0 ${getAttendanceColor(subject.percentage)}`}>
                    {subject.percentage}%
                  </p>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full ${getBarColor(subject.percentage)} transition-all`}
                    style={{ width: `${subject.percentage}%` }}
                  />
                </div>
                <div className="flex gap-3 text-[11px] text-muted-foreground">
                  <span className="text-emerald-600 dark:text-emerald-400">{subject.present}P</span>
                  <span className="text-red-600 dark:text-red-400">{subject.absent}A</span>
                  <span>{subject.total_sessions} total</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
