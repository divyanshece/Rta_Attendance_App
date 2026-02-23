import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { studentAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LogOut, Mail, Hash, GraduationCap, Building2, BookOpen } from 'lucide-react'

interface StudentProfile {
  email: string
  name: string
  roll_no: string
  class_name: string
  department_name: string
  batch: number
  semester: number
  section: string
  overall_attendance: number
  organization?: {
    organization_id: number
    name: string
    code: string
  }
}

export default function StudentSettings() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: studentAPI.getProfile,
  })

  const profile = profileData as StudentProfile | undefined

  const getAttendanceColor = (pct: number) => {
    if (pct >= 75) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
    if (pct >= 60) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  const attendance = profile?.overall_attendance || 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center h-14">
            <Button variant="ghost" size="icon" onClick={() => navigate('/student')} className="rounded-xl h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-base font-heading font-bold text-foreground ml-3">Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Identity Card */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {profile?.name?.charAt(0) || user?.name?.charAt(0) || 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground text-[15px] leading-tight truncate">{profile?.name || user?.name || 'Student'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground truncate">{profile?.email || user?.email}</p>
              </div>
            </div>
          </div>

          {/* Attendance Badge */}
          <div className="mx-4 mb-3">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${getAttendanceColor(attendance)}`}>
              <BookOpen className="h-3 w-3" />
              {attendance}% Attendance
            </div>
          </div>

          <div className="border-t" />

          {/* Roll + Section row */}
          <div className="grid grid-cols-2 divide-x">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Roll No</p>
              <p className="text-sm font-medium text-foreground font-mono">{profile?.roll_no || '--'}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Section</p>
              <p className="text-sm font-medium text-foreground">{profile?.section || '--'}</p>
            </div>
          </div>

          <div className="border-t" />

          {/* Batch + Semester row */}
          <div className="grid grid-cols-2 divide-x">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Batch</p>
              <p className="text-sm font-medium text-foreground">{profile?.batch || '--'}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Semester</p>
              <p className="text-sm font-medium text-foreground">{profile?.semester || '--'}</p>
            </div>
          </div>
        </div>

        {/* Academic Info */}
        <div className="bg-card rounded-xl border divide-y">
          <div className="flex items-start gap-3 px-4 py-3">
            <GraduationCap className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Class</p>
              <p className="text-sm font-medium text-foreground break-words leading-snug">{profile?.class_name || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3">
            <Building2 className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Department</p>
              <p className="text-sm font-medium text-foreground break-words leading-snug">{profile?.department_name || 'N/A'}</p>
            </div>
          </div>
          {profile?.organization && (
            <div className="flex items-start gap-3 px-4 py-3">
              <Hash className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Organization</p>
                <p className="text-sm font-medium text-foreground break-words leading-snug">{profile.organization.name}</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Contact your teacher or admin to update profile info.
        </p>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full rounded-xl h-11 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>

        <p className="text-center text-[11px] text-muted-foreground pb-2">Rta v1.0.0</p>
      </main>
    </div>
  )
}
