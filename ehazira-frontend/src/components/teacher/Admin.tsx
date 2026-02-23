import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI, AdminTeacher, AdminDepartment, AdminStudent, AdminDepartmentClass, AdminClassSubject } from '@/services/api'
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
  ChevronRight,
  MoreVertical,
  Calendar,
  UserCheck,
  BarChart3,
} from 'lucide-react'
import { AppLogo } from '@/components/ui/AppLogo'
import toast from 'react-hot-toast'

export default function AdminPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { confirm, ConfirmDialog } = useConfirm()

  // Navigation state: 'home' | 'teachers' | 'departments' | 'students'
  const [activeSection, setActiveSection] = useState<'home' | 'teachers' | 'departments' | 'students'>('home')

  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [deptSearchQuery, setDeptSearchQuery] = useState('')
  const [studentSearchInput, setStudentSearchInput] = useState('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')

  // Modal states
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showAddDeptModal, setShowAddDeptModal] = useState(false)
  const [showEditStudentModal, setShowEditStudentModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null)
  const [editingStudent, setEditingStudent] = useState<AdminStudent | null>(null)
  const [editStudentForm, setEditStudentForm] = useState({ name: '', roll_no: '' })

  // Teacher edit states
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<AdminTeacher | null>(null)
  const [editTeacherForm, setEditTeacherForm] = useState({ name: '', designation: '', department_id: 0 })
  const [teacherMenuOpen, setTeacherMenuOpen] = useState<string | null>(null)

  // Department drill-down state
  const [deptDrilldown, setDeptDrilldown] = useState<{
    departmentId?: number; departmentName?: string
    classId?: number; className?: string
    subjectId?: number; subjectName?: string
  } | null>(null)

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
    enabled: activeSection === 'teachers',
  })

  const { data: departmentsData, isLoading: isLoadingDepts } = useQuery({
    queryKey: ['adminDepartments'],
    queryFn: adminAPI.getDepartments,
    enabled: activeSection === 'departments' || activeSection === 'teachers' || showEditTeacherModal,
  })

  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['adminStudents', studentSearchQuery],
    queryFn: () => adminAPI.getStudents(studentSearchQuery || undefined),
    enabled: activeSection === 'students',
  })

  // Department drill-down queries
  const { data: deptClassesData, isLoading: isLoadingDeptClasses } = useQuery({
    queryKey: ['adminDeptClasses', deptDrilldown?.departmentId],
    queryFn: () => adminAPI.getDepartmentClasses(deptDrilldown!.departmentId!),
    enabled: activeSection === 'departments' && !!deptDrilldown?.departmentId && !deptDrilldown?.classId,
  })

  const { data: classSubjectsData, isLoading: isLoadingClassSubjects } = useQuery({
    queryKey: ['adminClassSubjects', deptDrilldown?.departmentId, deptDrilldown?.classId],
    queryFn: () => adminAPI.getClassSubjects(deptDrilldown!.departmentId!, deptDrilldown!.classId!),
    enabled: activeSection === 'departments' && !!deptDrilldown?.classId && !deptDrilldown?.subjectId,
  })

  const { data: subjectDetailData, isLoading: isLoadingSubjectDetail } = useQuery({
    queryKey: ['adminSubjectDetail', deptDrilldown?.departmentId, deptDrilldown?.classId, deptDrilldown?.subjectId],
    queryFn: () => adminAPI.getSubjectDetail(deptDrilldown!.departmentId!, deptDrilldown!.classId!, deptDrilldown!.subjectId!),
    enabled: activeSection === 'departments' && !!deptDrilldown?.subjectId,
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
      setSelectedStudent(null)
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

  const editTeacherMutation = useMutation({
    mutationFn: adminAPI.editTeacher,
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['adminTeachers'] })
      setShowEditTeacherModal(false)
      setEditingTeacher(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update teacher')
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

  // Reset drill-down when leaving departments
  useEffect(() => {
    if (activeSection !== 'departments') {
      setDeptDrilldown(null)
    }
  }, [activeSection])

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

  const handleBack = () => {
    if (activeSection !== 'home') {
      setActiveSection('home')
      setSearchQuery('')
      setDeptSearchQuery('')
      setStudentSearchInput('')
      setStudentSearchQuery('')
    } else {
      navigate('/teacher')
    }
  }

  const handleDrilldownBack = () => {
    if (!deptDrilldown) return
    if (deptDrilldown.subjectId) {
      setDeptDrilldown({ ...deptDrilldown, subjectId: undefined, subjectName: undefined })
    } else if (deptDrilldown.classId) {
      setDeptDrilldown({ ...deptDrilldown, classId: undefined, className: undefined })
    } else {
      setDeptDrilldown(null)
    }
  }

  if (isLoadingDashboard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  const sectionTitle = activeSection === 'teachers' ? 'Teachers' : activeSection === 'departments' ? 'Departments' : activeSection === 'students' ? 'Students' : ''

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
                onClick={handleBack}
                className="rounded-xl"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              {activeSection === 'home' ? (
                <AppLogo size="md" />
              ) : (
                <h1 className="text-base font-heading font-bold text-foreground">{sectionTitle}</h1>
              )}
            </div>
            <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          </div>
        </div>
      </header>

      {/* Organization Banner - only on home */}
      {activeSection === 'home' && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-heading font-bold">{dashboard?.organization.name}</h1>
                <p className="text-white/80 text-[11px] sm:text-xs">{dashboard?.organization.code}</p>
              </div>
            </div>
            <div className="flex gap-3 sm:gap-5 text-white/90 text-[11px] sm:text-xs">
              <span><strong>{dashboard?.stats.teachers}</strong> Teachers</span>
              <span><strong>{dashboard?.stats.departments}</strong> Depts</span>
              <span><strong>{dashboard?.stats.active_classes}</strong> Classes</span>
              <span><strong>{dashboard?.stats.students}</strong> Students</span>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* ============ HOME ============ */}
        {activeSection === 'home' && (
          <div className="space-y-3 mt-2">
            {/* Teachers Card */}
            <button
              onClick={() => setActiveSection('teachers')}
              className="w-full bg-card rounded-2xl border p-4 sm:p-5 flex items-center gap-4 hover:border-amber-500/50 hover:shadow-md transition-all text-left group"
            >
              <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg flex-shrink-0">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-semibold text-foreground">Teachers</h3>
                <p className="text-xs text-muted-foreground">{dashboard?.stats.teachers || 0} teachers &middot; Manage & edit</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors flex-shrink-0" />
            </button>

            {/* Departments Card */}
            <button
              onClick={() => setActiveSection('departments')}
              className="w-full bg-card rounded-2xl border p-4 sm:p-5 flex items-center gap-4 hover:border-amber-500/50 hover:shadow-md transition-all text-left group"
            >
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg flex-shrink-0">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-semibold text-foreground">Departments</h3>
                <p className="text-xs text-muted-foreground">{dashboard?.stats.departments || 0} departments &middot; Browse & explore</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors flex-shrink-0" />
            </button>

            {/* Students Card */}
            <button
              onClick={() => setActiveSection('students')}
              className="w-full bg-card rounded-2xl border p-4 sm:p-5 flex items-center gap-4 hover:border-amber-500/50 hover:shadow-md transition-all text-left group"
            >
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg flex-shrink-0">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-semibold text-foreground">Students</h3>
                <p className="text-xs text-muted-foreground">{dashboard?.stats.students || 0} students &middot; Search & manage</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-500 transition-colors flex-shrink-0" />
            </button>
          </div>
        )}

        {/* ============ TEACHERS ============ */}
        {activeSection === 'teachers' && (
          <div className="space-y-3">
            {/* Search + Actions */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-xl bg-background text-foreground text-sm"
                />
              </div>
              <button onClick={() => setShowImportModal(true)} className="p-2 border rounded-xl hover:bg-muted transition-colors flex-shrink-0">
                <Upload className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => setShowAddTeacherModal(true)} className="p-2 bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors flex-shrink-0">
                <Plus className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Teachers List */}
            {isLoadingTeachers ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-10 bg-card rounded-2xl border">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No teachers found' : 'Add teachers to your organization'}
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border divide-y">
                {filteredTeachers.map((teacher: AdminTeacher) => (
                  <div
                    key={teacher.email}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm text-foreground truncate">{teacher.name}</p>
                        {teacher.is_admin && (
                          <Shield className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        {teacher.verified && (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {teacher.designation} &middot; {teacher.department_name || 'No dept'}
                      </p>
                    </div>
                    {/* Three-dot menu */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={() => setTeacherMenuOpen(teacherMenuOpen === teacher.email ? null : teacher.email)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                      >
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                      {teacherMenuOpen === teacher.email && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setTeacherMenuOpen(null)} />
                          <div className="absolute right-0 top-full mt-1 w-44 bg-card rounded-xl border shadow-lg z-50 py-1 overflow-hidden">
                            <button
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                              onClick={() => {
                                setTeacherMenuOpen(null)
                                setEditingTeacher(teacher)
                                setEditTeacherForm({
                                  name: teacher.name,
                                  designation: teacher.designation || '',
                                  department_id: teacher.department_id || 0,
                                })
                                setShowEditTeacherModal(true)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 text-blue-500" />
                              Edit
                            </button>
                            <button
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                              onClick={() => {
                                setTeacherMenuOpen(null)
                                toggleAdminMutation.mutate(teacher.email)
                              }}
                              disabled={toggleAdminMutation.isPending}
                            >
                              <Shield className="h-3.5 w-3.5 text-amber-500" />
                              {teacher.is_admin ? 'Remove Admin' : 'Make Admin'}
                            </button>
                            <button
                              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 transition-colors"
                              onClick={async () => {
                                setTeacherMenuOpen(null)
                                if (await confirm('Remove Teacher', `Remove ${teacher.name}?`, { confirmLabel: 'Remove' })) {
                                  deleteTeacherMutation.mutate(teacher.email)
                                }
                              }}
                              disabled={deleteTeacherMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ DEPARTMENTS ============ */}
        {activeSection === 'departments' && (
          <div className="space-y-3">
            {/* Breadcrumb for drill-down */}
            {deptDrilldown && (
              <div className="flex items-center gap-1.5 text-sm">
                <button
                  onClick={handleDrilldownBack}
                  className="p-1 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                {!deptDrilldown.classId && (
                  <span className="font-medium text-foreground truncate">{deptDrilldown.departmentName}</span>
                )}
                {deptDrilldown.classId && !deptDrilldown.subjectId && (
                  <>
                    <button onClick={() => setDeptDrilldown({ departmentId: deptDrilldown.departmentId, departmentName: deptDrilldown.departmentName })} className="text-muted-foreground hover:text-foreground truncate transition-colors">
                      {deptDrilldown.departmentName}
                    </button>
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-foreground truncate">{deptDrilldown.className}</span>
                  </>
                )}
                {deptDrilldown.subjectId && (
                  <>
                    <button onClick={() => setDeptDrilldown({ departmentId: deptDrilldown.departmentId, departmentName: deptDrilldown.departmentName })} className="text-muted-foreground hover:text-foreground truncate transition-colors">
                      {deptDrilldown.departmentName}
                    </button>
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <button onClick={() => setDeptDrilldown({ ...deptDrilldown, subjectId: undefined, subjectName: undefined })} className="text-muted-foreground hover:text-foreground truncate transition-colors">
                      {deptDrilldown.className}
                    </button>
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-foreground truncate">{deptDrilldown.subjectName}</span>
                  </>
                )}
              </div>
            )}

            {/* Level 0: Department List */}
            {!deptDrilldown && (
              <>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search departments..."
                      value={deptSearchQuery}
                      onChange={(e) => setDeptSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-xl bg-background text-foreground text-sm"
                    />
                  </div>
                  <button onClick={() => setShowAddDeptModal(true)} className="p-2 bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors flex-shrink-0">
                    <Plus className="h-4 w-4 text-white" />
                  </button>
                </div>

                {isLoadingDepts ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
                  </div>
                ) : filteredDepts.length === 0 ? (
                  <div className="text-center py-10 bg-card rounded-2xl border">
                    <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {deptSearchQuery ? 'No departments found' : 'Create departments to organize teachers'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-card rounded-xl border divide-y">
                    {filteredDepts.map((dept: AdminDepartment) => (
                      <div
                        key={dept.department_id}
                        className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <button
                          onClick={() => setDeptDrilldown({ departmentId: dept.department_id, departmentName: dept.department_name })}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="font-medium text-sm text-foreground">{dept.department_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {dept.school ? `${dept.school} · ` : ''}{dept.teacher_count} teachers · {dept.class_count} classes
                          </p>
                        </button>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                          <button
                            onClick={async () => {
                              if (await confirm('Delete Department', `Delete ${dept.department_name}?`, { confirmLabel: 'Delete' })) {
                                deleteDeptMutation.mutate(dept.department_id)
                              }
                            }}
                            disabled={deleteDeptMutation.isPending || dept.teacher_count > 0 || dept.class_count > 0}
                            className="p-1.5 rounded-md text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Level 1: Classes in Department */}
            {deptDrilldown?.departmentId && !deptDrilldown?.classId && (
              <>
                {isLoadingDeptClasses ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                  </div>
                ) : !deptClassesData?.classes?.length ? (
                  <div className="text-center py-10 bg-card rounded-2xl border">
                    <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">No classes in this department</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground px-1">{deptClassesData.count} class{deptClassesData.count !== 1 ? 'es' : ''}</p>
                    <div className="bg-card rounded-xl border divide-y">
                      {deptClassesData.classes.map((cls: AdminDepartmentClass) => (
                        <button
                          key={cls.class_id}
                          onClick={() => setDeptDrilldown({
                            ...deptDrilldown,
                            classId: cls.class_id,
                            className: `Batch ${cls.batch} · Sem ${cls.semester} · ${cls.section}`,
                          })}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm text-foreground">
                                Batch {cls.batch} &middot; Sem {cls.semester} &middot; Sec {cls.section}
                              </p>
                              {cls.is_active ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-medium">Active</span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">Completed</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {cls.student_count} students · {cls.subject_count} subjects
                              {cls.coordinator_name && ` · ${cls.coordinator_name}`}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Level 2: Subjects in Class */}
            {deptDrilldown?.classId && !deptDrilldown?.subjectId && (
              <>
                {isLoadingClassSubjects ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                  </div>
                ) : !classSubjectsData?.subjects?.length ? (
                  <div className="text-center py-10 bg-card rounded-2xl border">
                    <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">No subjects in this class</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground px-1">{classSubjectsData.count} subject{classSubjectsData.count !== 1 ? 's' : ''}</p>
                    <div className="bg-card rounded-xl border divide-y">
                      {classSubjectsData.subjects.map((sub: AdminClassSubject) => (
                        <button
                          key={sub.subject_id}
                          onClick={() => setDeptDrilldown({
                            ...deptDrilldown,
                            subjectId: sub.subject_id,
                            subjectName: sub.course_name,
                          })}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm text-foreground truncate">{sub.course_name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {sub.teacher_name} · {sub.student_count} students · {sub.session_count} sessions
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Level 3: Subject Detail */}
            {deptDrilldown?.subjectId && (
              <>
                {isLoadingSubjectDetail ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                  </div>
                ) : subjectDetailData && (
                  <div className="bg-card rounded-xl border overflow-hidden">
                    {/* Subject Header */}
                    <div className="px-4 pt-4 pb-3">
                      <h3 className="font-heading font-bold text-foreground text-lg">{subjectDetailData.course_name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{subjectDetailData.class_name}</p>
                    </div>

                    <div className="border-t" />

                    {/* Teacher Info */}
                    <div className="flex items-start gap-3 px-4 py-3">
                      <UserCheck className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Teacher</p>
                        <p className="text-sm font-medium text-foreground">{subjectDetailData.teacher_name}</p>
                        <p className="text-xs text-muted-foreground">{subjectDetailData.teacher_designation}</p>
                      </div>
                    </div>

                    <div className="border-t" />

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 divide-x">
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Students</p>
                        <p className="text-lg font-bold text-foreground">{subjectDetailData.enrolled_student_count}</p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Sessions</p>
                        <p className="text-lg font-bold text-foreground">{subjectDetailData.total_sessions}</p>
                      </div>
                    </div>

                    <div className="border-t" />

                    <div className="grid grid-cols-2 divide-x">
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Avg Attendance</p>
                        <p className={`text-lg font-bold ${subjectDetailData.average_attendance >= 75 ? 'text-emerald-600 dark:text-emerald-400' : subjectDetailData.average_attendance >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                          {subjectDetailData.average_attendance}%
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Last Session</p>
                        <p className="text-sm font-medium text-foreground">
                          {subjectDetailData.last_session_date
                            ? new Date(subjectDetailData.last_session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'None yet'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ============ STUDENTS ============ */}
        {activeSection === 'students' && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name, email, or roll..."
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
                  {studentSearchQuery ? 'No students found' : 'Search for students'}
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground px-1">{studentsData.count} result{studentsData.count !== 1 ? 's' : ''}</p>
                <div className="bg-card rounded-xl border divide-y">
                  {studentsData.students.map((student: AdminStudent) => (
                    <button
                      key={student.email}
                      onClick={() => setSelectedStudent(student)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm text-foreground truncate">{student.name}</p>
                          {student.verified && (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          )}
                          {student.has_active_device && (
                            <Smartphone className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {student.roll_no}{student.class_name ? ` · ${student.class_name}` : ''}{student.department ? ` · ${student.department}` : ''}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* ============ MODALS ============ */}

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

      {/* Edit Teacher Modal */}
      {showEditTeacherModal && editingTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-card z-10">
              <h3 className="font-heading font-bold text-lg text-foreground">Edit Teacher</h3>
              <Button variant="ghost" size="icon" onClick={() => { setShowEditTeacherModal(false); setEditingTeacher(null) }} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                <input
                  type="email"
                  value={editingTeacher.email}
                  disabled
                  className="w-full px-4 py-3 border rounded-xl bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                <input
                  type="text"
                  value={editTeacherForm.name}
                  onChange={(e) => setEditTeacherForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Teacher name"
                  className="w-full px-4 py-3 border rounded-xl bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Designation</label>
                <input
                  type="text"
                  value={editTeacherForm.designation}
                  onChange={(e) => setEditTeacherForm(prev => ({ ...prev, designation: e.target.value }))}
                  placeholder="e.g., Professor"
                  className="w-full px-4 py-3 border rounded-xl bg-background text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Department</label>
                <select
                  value={editTeacherForm.department_id}
                  onChange={(e) => setEditTeacherForm(prev => ({ ...prev, department_id: Number(e.target.value) }))}
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
              <Button
                onClick={() => {
                  if (editingTeacher) {
                    editTeacherMutation.mutate({
                      email: editingTeacher.email,
                      name: editTeacherForm.name,
                      designation: editTeacherForm.designation,
                      department_id: editTeacherForm.department_id,
                    })
                  }
                }}
                disabled={!editTeacherForm.name || editTeacherMutation.isPending}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 h-11"
              >
                {editTeacherMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><Pencil className="h-4 w-4 mr-2" />Save Changes</>
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

      {/* Student Action Modal (tap a student row) */}
      {selectedStudent && !showEditStudentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setSelectedStudent(null)}>
          <div className="w-full sm:max-w-sm bg-card rounded-t-2xl sm:rounded-2xl border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-foreground">{selectedStudent.name}</p>
                <button onClick={() => setSelectedStudent(null)} className="p-1 rounded-lg hover:bg-muted">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{selectedStudent.email}</p>
              <p className="text-xs text-muted-foreground">
                Roll: {selectedStudent.roll_no}
                {selectedStudent.class_name && <> &middot; {selectedStudent.class_name}</>}
                {selectedStudent.department && <> &middot; {selectedStudent.department}</>}
              </p>
              <div className="flex gap-2 mt-1.5">
                {selectedStudent.verified && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Verified</span>
                )}
                {selectedStudent.has_active_device && (
                  <span className="text-[11px] text-blue-600 dark:text-blue-400">Device linked</span>
                )}
              </div>
            </div>
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  setEditingStudent(selectedStudent)
                  setEditStudentForm({ name: selectedStudent.name, roll_no: selectedStudent.roll_no })
                  setShowEditStudentModal(true)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <Pencil className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Edit Data</span>
              </button>
              <button
                onClick={async () => {
                  if (await confirm('Reset Device', `Reset device for ${selectedStudent.name}? They can login from a new device.`, { confirmLabel: 'Reset', destructive: false })) {
                    resetStudentDeviceMutation.mutate(selectedStudent.email)
                    setSelectedStudent(null)
                  }
                }}
                disabled={resetStudentDeviceMutation.isPending}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors text-left disabled:opacity-50"
              >
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-foreground">Reset Device</span>
              </button>
            </div>
            <div className="h-2" />
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditStudentModal && editingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border shadow-2xl">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h3 className="font-heading font-bold text-lg text-foreground">Edit Student</h3>
              <Button variant="ghost" size="icon" onClick={() => { setShowEditStudentModal(false); setEditingStudent(null); setSelectedStudent(null) }} className="rounded-xl">
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
