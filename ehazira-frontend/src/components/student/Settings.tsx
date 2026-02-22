import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { studentAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, LogOut } from 'lucide-react'

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
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
            <h1 className="text-base font-heading font-bold text-foreground ml-3">Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        <div className="space-y-5">
          {/* Profile Card */}
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {profile?.name?.charAt(0) || user?.name?.charAt(0) || 'S'}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{profile?.name || user?.name || 'Student'}</p>
                <p className="text-xs text-muted-foreground truncate">{profile?.email || user?.email}</p>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Roll No</span>
                <span className="text-sm font-medium text-foreground font-mono">{profile?.roll_no || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Class</span>
                <span className="text-sm font-medium text-foreground">{profile?.class_name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Department</span>
                <span className="text-sm font-medium text-foreground">{profile?.department_name || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Batch</span>
                <span className="text-sm font-medium text-foreground">{profile?.batch || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Semester</span>
                <span className="text-sm font-medium text-foreground">{profile?.semester || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Section</span>
                <span className="text-sm font-medium text-foreground">{profile?.section || 'N/A'}</span>
              </div>
              {profile?.organization && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Organization</span>
                  <span className="text-sm font-medium text-foreground">{profile.organization.name}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t">
              Contact your teacher or admin to update profile info.
            </p>
          </div>

          {/* Logout */}
          <Button
            variant="outline"
            className="w-full rounded-xl h-11 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>

          <p className="text-center text-xs text-muted-foreground">Rta v1.0.0</p>
        </div>
      </main>
    </div>
  )
}
