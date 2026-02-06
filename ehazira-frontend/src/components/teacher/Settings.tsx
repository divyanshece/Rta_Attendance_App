import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { teacherAPI, scheduleAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Mail,
  Briefcase,
  Building2,
  LogOut,
  Edit2,
  Save,
  X,
  Shield,
  KeyRound,
  Landmark,
} from 'lucide-react'
import { AppLogoIcon, AppLogoCompact } from '@/components/ui/AppLogo'
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
  const { user, logout } = useAuthStore()

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    designation: '',
    department_id: 0,
    department_name: '',
  })

  // Fetch teacher profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['teacherProfile'],
    queryFn: teacherAPI.getProfile,
  })

  // Fetch departments from API
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: scheduleAPI.getDepartments,
    enabled: isEditing,
  })

  // Update form data when profile loads
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

  const { updateUser } = useAuthStore()

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: teacherAPI.updateProfile,
    onSuccess: (data) => {
      // Update local auth store
      updateUser({ name: data.name })
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['teacherProfile'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      setIsEditing(false)
      toast.success('Profile updated successfully')
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Failed to update profile')
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

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const deptId = Number(e.target.value)
    const dept = departments.find((d: Department) => d.department_id === deptId)
    setFormData({
      ...formData,
      department_id: deptId,
      department_name: dept?.department_name || '',
    })
  }

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
                onClick={() => navigate('/teacher')}
                className="rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <AppLogoIcon size="md" />
              <div>
                <h1 className="text-lg font-heading font-bold text-foreground">Settings</h1>
                <p className="text-xs text-muted-foreground">Manage your profile</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-card rounded-2xl border overflow-hidden animate-in opacity-0">
              {/* Profile Header */}
              <div className="relative">
                <div className="h-24 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-amber-500 dark:via-orange-500 dark:to-amber-500" />
                <div className="absolute -bottom-10 left-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl border-4 border-card">
                    <span className="text-2xl font-heading font-bold text-white">
                      {formData.name?.charAt(0) || 'T'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-14 px-6 pb-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="text-2xl font-heading font-bold bg-background border rounded-xl px-4 py-2 w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Your name"
                      />
                    ) : (
                      <h2 className="text-2xl font-heading font-bold text-foreground">
                        {formData.name}
                      </h2>
                    )}
                    <p className="text-muted-foreground mt-1">
                      {formData.designation || 'Teacher'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-0">
                      <Shield className="h-3 w-3 mr-1" />
                      Teacher
                    </Badge>
                    {profile?.is_admin && (
                      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-0">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    {!isEditing && (
                      <Button
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900"
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Email - Not Editable */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow">
                      <Mail className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Email Address
                      </p>
                      <p className="font-medium text-foreground break-all">
                        {user?.email || 'teacher@example.com'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <KeyRound className="h-3 w-3" />
                        Cannot be changed
                      </p>
                    </div>
                  </div>

                  {/* Designation */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow">
                      <Briefcase className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Designation
                      </p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.designation}
                          onChange={e => setFormData({ ...formData, designation: e.target.value })}
                          className="font-medium bg-background border rounded-xl px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                          placeholder="e.g., Assistant Professor"
                        />
                      ) : (
                        <p className="font-medium text-foreground">
                          {formData.designation || 'Not set'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Department */}
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Department
                      </p>
                      {isEditing ? (
                        <select
                          value={formData.department_id}
                          onChange={handleDepartmentChange}
                          className="font-medium bg-background border rounded-xl px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value={0}>Select Department</option>
                          {departments.map((dept: Department) => (
                            <option key={dept.department_id} value={dept.department_id}>
                              {dept.department_name}
                              {dept.organization_name && ` (${dept.organization_name})`}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="font-medium text-foreground">
                          {formData.department_name || 'Not set'}
                        </p>
                      )}
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

                {/* Edit Actions */}
                {isEditing && (
                  <div className="flex gap-3 mt-6 pt-6 border-t">
                    <Button
                      onClick={handleSave}
                      className="flex-1 rounded-xl h-12 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900 shadow-lg"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="flex-1 rounded-xl h-12"
                      disabled={updateProfileMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-card rounded-2xl border p-6 animate-in opacity-0 stagger-1">
              <h3 className="font-heading font-semibold text-foreground mb-4">Account</h3>
              <Button
                variant="outline"
                className="w-full rounded-xl h-12 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                onClick={logout}
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
        )}
      </main>
    </div>
  )
}
