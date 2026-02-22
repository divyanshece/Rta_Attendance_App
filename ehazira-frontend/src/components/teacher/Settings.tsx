import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { teacherAPI, scheduleAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  LogOut,
  Save,
  X,
  Pencil,
  Loader2,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Department {
  department_id: number
  department_name: string
  school?: string
  organization_name?: string
}

export default function TeacherSettings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout, updateUser } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    department_id: 0,
    department_name: '',
  })

  const { data: profile, isLoading } = useQuery({
    queryKey: ['teacherProfile'],
    queryFn: teacherAPI.getProfile,
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: scheduleAPI.getDepartments,
    enabled: isEditing,
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || user?.name || '',
        designation: profile.designation || '',
        department_id: profile.department || 0,
        department_name: profile.department_name || '',
      })
    }
  }, [profile, user?.name])

  const updateProfileMutation = useMutation({
    mutationFn: teacherAPI.updateProfile,
    onSuccess: (data) => {
      updateUser({ name: data.name })
      queryClient.invalidateQueries({ queryKey: ['teacherProfile'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      setIsEditing(false)
      toast.success('Profile updated')
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Failed to update')
    },
  })

  const handleSave = () => {
    updateProfileMutation.mutate({
      name: formData.name,
      designation: formData.designation,
      department: formData.department_id,
    })
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || user?.name || '',
        designation: profile.designation || '',
        department_id: profile.department || 0,
        department_name: profile.department_name || '',
      })
    }
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/teacher')} className="rounded-xl h-9 w-9">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-base font-heading font-bold text-foreground">Settings</h1>
            </div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 font-medium">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        <div className="space-y-5">
          {/* Profile Section */}
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {formData.name?.charAt(0) || 'T'}
              </div>
              <div className="min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="text-base font-semibold bg-background border rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-amber-500 text-foreground"
                    placeholder="Your name"
                  />
                ) : (
                  <p className="font-semibold text-foreground truncate">{formData.name}</p>
                )}
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Designation</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={e => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g., Assistant Professor"
                  />
                ) : (
                  <p className="text-sm text-foreground">{formData.designation || 'Not set'}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Department</label>
                {isEditing ? (
                  <select
                    value={formData.department_id}
                    onChange={(e) => {
                      const deptId = Number(e.target.value)
                      const dept = departments.find((d: Department) => d.department_id === deptId)
                      setFormData({ ...formData, department_id: deptId, department_name: dept?.department_name || '' })
                    }}
                    className="w-full px-3 py-2 border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={0}>Select Department</option>
                    {departments.map((dept: Department) => (
                      <option key={dept.department_id} value={dept.department_id}>{dept.department_name}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-foreground">{formData.department_name || 'Not set'}</p>
                )}
              </div>

              {profile?.organization && (
                <div>
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">Organization</label>
                  <p className="text-sm text-foreground">{profile.organization.name}</p>
                </div>
              )}
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  onClick={handleSave}
                  className="flex-1 rounded-xl h-10 bg-amber-500 hover:bg-amber-600"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><Save className="h-4 w-4 mr-1.5" />Save</>
                  )}
                </Button>
                <Button variant="outline" onClick={handleCancel} className="flex-1 rounded-xl h-10" disabled={updateProfileMutation.isPending}>
                  <X className="h-4 w-4 mr-1.5" />Cancel
                </Button>
              </div>
            )}
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
