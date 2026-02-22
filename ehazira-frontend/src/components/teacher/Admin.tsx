import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI, AdminTeacher, AdminDepartment, AdminStudent } from '@/services/api'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Plus,
  Trash2,
  Upload,
  Shield,
  FileSpreadsheet,
  X,
  Loader2,
  Search,
  Pencil,
  Smartphone,
  CheckCircle,
} from 'lucide-react'
import { AppLogo } from '@/components/ui/AppLogo'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()
  const [activeTab, setActiveTab] = useState<'teachers' | 'departments' | 'students'>('teachers')
  const [searchQuery, setSearchQuery] = useState('')
  const [deptSearchQuery, setDeptSearchQuery] = useState('')
  const [studentSearchInput, setStudentSearchInput] = useState('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')

  // Modal states
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddDeptModal, setShowAddDeptModal] = useState(false)
  const [showEditStudentModal, setShowEditStudentModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<AdminStudent | null>(null)
  const [editStudentForm, setEditStudentForm] = useState({ name: '', roll_no: '' })

  // Form states
  const [teacherForm, setTeacherForm] = useState({
    email: '',
    name: '',
    designation: 'Professor',
    department_id: 0,
    make_admin: false,
  })
  const [deptForm, setDeptForm] = useState({ department_name: '', school: '' })
  const [importFile, setImportFile] = useState<File | null>(null)

  // Queries
  const { data: dashboard, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: adminAPI.getDashboard,
  })

  const { data: teachersData, isLoading: isLoadingTeachers } = useQuery({
    queryKey: ['adminTeachers'],
    queryFn: adminAPI.getTeachers,
    enabled: activeTab === 'teachers' || activeTab === 'overview',
  })

  const { data: departmentsData, isLoading: isLoadingDepts } = useQuery({
    queryKey: ['adminDepartments'],
    queryFn: adminAPI.getDepartments,
    enabled: activeTab === 'departments' || activeTab === 'overview',
  })

  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['adminStudents', studentSearchQuery],
    queryFn: () => adminAPI.getStudents(studentSearchQuery || undefined),
    enabled: activeTab === 'students',
  })

  // Mutations
  const updateStudentMutation = useMutation({
    mutationFn: ({ email, data }: { email: string; data: { name?: string; roll_no?: string } }) =>
      adminAPI.updateStudent(email, data),
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] })
      setShowEditStudentModal(false)
      setEditingStudent(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update student')
    },
  })

  const resetStudentDeviceMutation = useMutation({
    mutationFn: adminAPI.resetStudentDevice,
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['adminStudents'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to reset device')
    },
  })

  const addTeacherMutation = useMutation({
    mutationFn: adminAPI.addTeacher,
    onSuccess: () => {
      toast.success('Teacher added successfully')
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowAddTeacherModal(false)
      setTeacherForm({ email: '', name: '', designation: 'Professor', department_id: 0, make_admin: false })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to add teacher')
    },
  })

  const deleteTeacherMutation = useMutation({
    mutationFn: adminAPI.deleteTeacher,
    onSuccess: () => {
      toast.success('Teacher removed')
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to remove teacher')
    },
  })

  const importTeachersMutation = useMutation({
    mutationFn: adminAPI.importTeachers,
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowImportModal(false)
      setImportFile(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to import teachers')
    },
  })

  const addDeptMutation = useMutation({
    mutationFn: adminAPI.addDepartment,
    onSuccess: () => {
      toast.success('Department created')
      queryClient.invalidateQueries({ queryKey: ['adminDepartments'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
      setShowAddDeptModal(false)
      setDeptForm({ department_name: '', school: '' })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create department')
    },
  })

  const deleteDeptMutation = useMutation({
    mutationFn: adminAPI.deleteDepartment,
    onSuccess: () => {
      toast.success('Department deleted')
      queryClient.invalidateQueries({ queryKey: ['adminDepartments'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete department')
    },
  })

  const toggleAdminMutation = useMutation({
    mutationFn: adminAPI.toggleAdmin,
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] })
      queryClient.invalidateQueries({ queryKey: ['adminDashboard'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to toggle admin status')
    },
  })

  // Debounced student search
  useEffect(() => {
    const timer = setTimeout(() => setStudentSearchQuery(studentSearchInput), 400)
    return () => clearTimeout(timer)
  }, [studentSearchInput])

  // Filtered teachers
  const filteredTeachers = (teachersData?.teachers || []).filter((t: AdminTeacher) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.department_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filtered departments
  const filteredDepts = (departmentsData?.departments || []).filter((d: AdminDepartment) =>
    d.department_name.toLowerCase().includes(deptSearchQuery.toLowerCase()) ||
    (d.school && d.school.toLowerCase().includes(deptSearchQuery.toLowerCase()))
  )

  if (isLoadingDashboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background bg-gradient-mesh">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/teacher')}
                className="rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <AppLogo size="md" />
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Organization Header with Stats */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4 mb-3">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-white/20 backdrop-blur">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-heading font-bold">{dashboard?.organization.name}</h1>
              <p className="text-white/80 text-xs sm:text-sm">{dashboard?.organization.code}</p>
            </div>
          </div>
          <div className="flex gap-4 sm:gap-6 text-white/90 text-xs sm:text-sm">
            <span><strong>{dashboard?.stats.teachers}</strong> Teachers</span>
            <span><strong>{dashboard?.stats.departments}</strong> Depts</span>
            <span><strong>{dashboard?.stats.active_classes}</strong> Classes</span>
            <span><strong>{dashboard?.stats.students}</strong> Students</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex">
            {([
              { key: 'teachers' as const, label: 'Teachers' },
              { key: 'departments' as const, label: 'Departments' },
              { key: 'students' as const, label: 'Students' },
            ]).map((tab) => (
              <button
                key={tab.key}
                className={`flex-1 px-3 sm:px-6 py-3 text-sm font-medium border-b-2 text-center ${
                  activeTab === tab.key ? 'border-amber-500 text-amber-600' : 'border-transparent text-muted-foreground'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Teachers Tab */}
        {activeTab === 'teachers' && (
          <div className="space-y-4">
            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-background text-foreground"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowImportModal(true)} className="rounded-xl">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button onClick={() => setShowAddTeacherModal(true)} className="rounded-xl bg-amber-500 hover:bg-amber-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Teacher
                </Button>
              </div>
            </div>

            {/* Teachers List */}
            {isLoadingTeachers ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl border">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">No teachers found</h3>
                <p className="text-sm text-muted-foreground">Add teachers to your organization</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredTeachers.map((teacher: AdminTeacher) => (
                  <div
                    key={teacher.email}
                    className="flex items-center justify-between p-4 bg-card rounded-xl border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {teacher.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{teacher.name}</p>
                          {teacher.is_admin && (
                            <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs">
                              <Shield className="h-2.5 w-2.5 mr-1" />
                              Admin
                            </Badge>
                          )}
                          {teacher.verified && (
                            <Badge variant="secondary" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{teacher.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {teacher.designation} • {teacher.department_name || 'No department'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAdminMutation.mutate(teacher.email)}
                        disabled={toggleAdminMutation.isPending}
                        className="rounded-lg text-xs"
                      >
                        {teacher.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          if (await confirm('Remove Teacher', `Remove ${teacher.name} from the organization?`, { confirmLabel: 'Remove' })) {
                            deleteTeacherMutation.mutate(teacher.email)
                          }
                        }}
                        disabled={deleteTeacherMutation.isPending}
                        className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="space-y-4">
            {/* Search + Add */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={deptSearchQuery}
                  onChange={(e) => setDeptSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-background text-foreground"
                />
              </div>
              <Button onClick={() => setShowAddDeptModal(true)} className="rounded-xl bg-amber-500 hover:bg-amber-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </div>

            {/* Departments List */}
            {isLoadingDepts ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
              </div>
            ) : filteredDepts.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl border">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-foreground mb-2">
                  {deptSearchQuery ? 'No departments found' : 'No departments'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {deptSearchQuery ? 'Try a different search' : 'Create departments to organize teachers'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredDepts.map((dept: AdminDepartment) => (
                  <div
                    key={dept.department_id}
                    className="flex items-center justify-between p-4 bg-card rounded-xl border hover:shadow-md transition-shadow"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{dept.department_name}</p>
                      {dept.school && <p className="text-sm text-muted-foreground">{dept.school}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {dept.teacher_count} teachers
                        </span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3 w-3" />
                          {dept.class_count} classes
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (await confirm('Delete Department', `Delete ${dept.department_name}?`, { confirmLabel: 'Delete' })) {
                          deleteDeptMutation.mutate(dept.department_id)
                        }
                      }}
                      disabled={deleteDeptMutation.isPending || dept.teacher_count > 0 || dept.class_count > 0}
                      className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or roll number..."
                value={studentSearchInput}
                onChange={(e) => setStudentSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-background text-foreground"
              />
            </div>

            {/* Students List */}
            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : !studentsData?.students?.length ? (
              <div className="text-center py-10 bg-card rounded-2xl border">
                <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {studentSearchQuery ? 'No students found' : 'Search for students or scroll to browse'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground px-1">{studentsData.count} result{studentsData.count !== 1 ? 's' : ''}</p>
                {studentsData.students.map((student: AdminStudent) => (
                  <div
                    key={student.email}
                    className="bg-card rounded-xl border p-4"
                  >
                    {/* Student Info */}
                    <div className="mb-3">
                      <p className="font-semibold text-foreground text-base">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Roll: {student.roll_no}
                        {student.class_name && <> &middot; {student.class_name}</>}
                        {student.department && <> &middot; {student.department}</>}
                      </p>
                      {(student.verified || student.has_active_device) && (
                        <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
                          {student.verified && <span className="text-emerald-600 dark:text-emerald-400">Verified</span>}
                          {student.has_active_device && <span className="text-blue-600 dark:text-blue-400">Device linked</span>}
                        </div>
                      )}
                    </div>
                    {/* Actions - clear text buttons */}
                    <div className="flex gap-2 border-t pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingStudent(student)
                          setEditStudentForm({ name: student.name, roll_no: student.roll_no })
                          setShowEditStudentModal(true)
                        }}
                        className="rounded-lg text-xs h-8"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (await confirm('Reset Device', `Reset device for ${student.name}? They will be able to login from a new device.`, { confirmLabel: 'Reset', destructive: false })) {
                            resetStudentDeviceMutation.mutate(student.email)
                          }
                        }}
                        disabled={resetStudentDeviceMutation.isPending}
                        className="rounded-lg text-xs h-8"
                      >
                        <Smartphone className="h-3.5 w-3.5 mr-1.5" />
                        Reset Device
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Teacher Modal */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-card z-10">
              <h3 className="font-heading font-bold text-lg text-foreground">Add Teacher</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddTeacherModal(false)} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="teacher@example.com"
                  className="w-full px-4 py-3 border rounded-xl bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Dr. John Doe"
                  className="w-full px-4 py-3 border rounded-xl bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Designation</label>
                <input
                  type="text"
                  value={teacherForm.designation}
                  onChange={(e) => setTeacherForm(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="Professor"
                  className="w-full px-4 py-3 border rounded-xl bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Department</label>
                <select
                  value={teacherForm.department_id}
                  onChange={(e) => setTeacherForm(prev => ({ ...prev, department_id: Number(e.target.value) }))}
                  className="w-full px-4 py-3 border rounded-xl bg-background text-foreground"
                >
                  <option value={0}>Select department</option>
                  {(departmentsData?.departments || []).map((dept: AdminDepartment) => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="make-admin"
                  checked={teacherForm.make_admin}
                  onChange={(e) => setTeacherForm(prev => ({ ...prev, make_admin: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <label htmlFor="make-admin" className="text-sm text-foreground">
                  Make this teacher an admin
                </label>
              </div>
              <Button
                onClick={() => addTeacherMutation.mutate(teacherForm)}
                disabled={!teacherForm.email || !teacherForm.name || !teacherForm.department_id || addTeacherMutation.isPending}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 h-11"
              >
                {addTeacherMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" />Add Teacher</>
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
              <h3 className="font-heading font-bold text-lg text-foreground">Import Teachers</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowImportModal(false)} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="border-2 border-dashed rounded-xl p-8 text-center">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="import-file"
                />
                <label htmlFor="import-file" className="cursor-pointer">
                  <p className="text-sm text-muted-foreground mb-2">
                    {importFile ? importFile.name : 'Click to select CSV or Excel file'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Columns: email, name, designation, department
                  </p>
                </label>
              </div>
              <Button
                onClick={() => importFile && importTeachersMutation.mutate(importFile)}
                disabled={!importFile || importTeachersMutation.isPending}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 h-11"
              >
                {importTeachersMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Import Teachers</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border shadow-2xl">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h3 className="font-heading font-bold text-lg text-foreground">Add Department</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowAddDeptModal(false)} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Department Name</label>
                <input
                  type="text"
                  value={deptForm.department_name}
                  onChange={(e) => setDeptForm(prev => ({ ...prev, department_name: e.target.value }))}
                  placeholder="e.g., Computer Science"
                  className="w-full px-4 py-3 border rounded-xl bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">School (Optional)</label>
                <input
                  type="text"
                  value={deptForm.school}
                  onChange={(e) => setDeptForm(prev => ({ ...prev, school: e.target.value }))}
                  placeholder="e.g., School of Engineering"
                  className="w-full px-4 py-3 border rounded-xl bg-background text-foreground"
                />
              </div>
              <Button
                onClick={() => addDeptMutation.mutate(deptForm)}
                disabled={!deptForm.department_name || addDeptMutation.isPending}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 h-11"
              >
                {addDeptMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  <><Plus className="h-4 w-4 mr-2" />Create Department</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Student Modal */}
      {showEditStudentModal && editingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border shadow-2xl">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h3 className="font-heading font-bold text-lg text-foreground">Edit Student</h3>
              <Button variant="ghost" size="icon" onClick={() => { setShowEditStudentModal(false); setEditingStudent(null) }} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={editingStudent.email}
                  disabled
                  className="w-full px-4 py-3 border rounded-xl bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={editStudentForm.name}
                  onChange={(e) => setEditStudentForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Student name"
                  className="w-full px-4 py-3 border rounded-xl bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Roll Number</label>
                <input
                  type="text"
                  value={editStudentForm.roll_no}
                  onChange={(e) => setEditStudentForm(prev => ({ ...prev, roll_no: e.target.value }))}
                  placeholder="Roll number"
                  className="w-full px-4 py-3 border rounded-xl bg-background text-foreground"
                />
              </div>
              <Button
                onClick={() => {
                  if (editingStudent) {
                    updateStudentMutation.mutate({
                      email: editingStudent.email,
                      data: editStudentForm,
                    })
                  }
                }}
                disabled={!editStudentForm.name || !editStudentForm.roll_no || updateStudentMutation.isPending}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 h-11"
              >
                {updateStudentMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><Pencil className="h-4 w-4 mr-2" />Save Changes</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {ConfirmDialog}
    </div>
  )
}
