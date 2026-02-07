import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { studentAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Mail,
  Hash,
  BookOpen,
  Building2,
  LogOut,
  GraduationCap,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  Landmark,
} from 'lucide-react'
import { AppLogoIcon, AppLogoCompact } from '@/components/ui/AppLogo'

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

  // Fetch student profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['studentProfile'],
    queryFn: studentAPI.getProfile,
  })

  const profile = profileData as StudentProfile | undefined

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background bg-gradient-mesh flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  const attendance = profile?.overall_attendance || 0
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
              <AppLogoIcon size="md" />
              <div>
                <h1 className="text-lg font-heading font-bold text-foreground">Profile</h1>
                <p className="text-xs text-muted-foreground">Your account details</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-card rounded-2xl border overflow-hidden animate-in opacity-0">
            {/* Profile Header */}
            <div className="relative">
              <div className="h-24 bg-gradient-to-r from-violet-600 via-purple-600 to-violet-600 dark:from-violet-500 dark:via-purple-500 dark:to-violet-500" />
              <div className="absolute -bottom-10 left-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl border-4 border-card">
                  <span className="text-2xl font-heading font-bold text-white">
                    {profile?.name?.charAt(0) || user?.name?.charAt(0) || 'S'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-14 px-6 pb-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground">
                    {profile?.name || user?.name || 'Student Name'}
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {profile?.class_name || 'Student'}
                  </p>
                </div>
                <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-400 border-0">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  Student
                </Badge>
              </div>

              {/* Attendance Summary */}
              <div className={`p-4 rounded-xl bg-gradient-to-br ${getAttendanceGradient(attendance)} mb-6`}>
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-sm opacity-80">Overall Attendance</p>
                    <p className="text-3xl font-heading font-bold">{attendance}%</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <AttendanceIcon className="h-5 w-5" />
                      <span className="font-medium">{getAttendanceLabel(attendance)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Email Address
                    </p>
                    <p className="font-medium text-foreground break-all">
                      {profile?.email || user?.email || 'Not available'}
                    </p>
                  </div>
                </div>

                {/* Roll Number */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow">
                    <Hash className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Roll Number
                    </p>
                    <p className="font-medium font-mono text-foreground">
                      {profile?.roll_no || user?.roll_no || 'Not assigned'}
                    </p>
                  </div>
                </div>

                {/* Class Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Batch
                      </p>
                      <p className="font-medium text-foreground">
                        {profile?.batch || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow">
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Semester
                      </p>
                      <p className="font-medium text-foreground">
                        {profile?.semester || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 shadow">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Section
                      </p>
                      <p className="font-medium text-foreground">
                        {profile?.section || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Department */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 shadow">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Department
                    </p>
                    <p className="font-medium text-foreground">
                      {profile?.department_name || 'Not assigned'}
                    </p>
                  </div>
                </div>

                {/* Organization */}
                {profile?.organization && (
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow">
                      <Landmark className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Organization
                      </p>
                      <p className="font-medium text-foreground">
                        {profile.organization.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Code: {profile.organization.code}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Note */}
              <div className="mt-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    To update your profile information, please contact your class teacher or administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-card rounded-2xl border p-6 animate-in opacity-0 stagger-1">
            <h3 className="font-heading font-semibold text-foreground mb-4">Account</h3>
            <Button
              variant="outline"
              className="w-full rounded-xl h-12 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* App Info */}
          <div className="text-center py-4 animate-in opacity-0 stagger-2">
            <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
              <AppLogoCompact />
              <span className="text-muted-foreground">v1.0.0</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
