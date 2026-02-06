import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classAPI, scheduleAPI, teacherAPI2, subjectAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Plus,
  Users,
  Trash2,
  UserPlus,
  ChevronRight,
  X,
  CheckCircle,
  GraduationCap,
  AlertCircle,
  BookOpen,
  Loader2,
  Search,
  Minus,
  Crown,
  UserPlus2,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ClassDetail {
  class_id: number
  department: number
  department_name: string
  batch: number
  semester: number
  section: string
  student_count: number
  created_by_name?: string
  is_active: boolean
  completed_at?: string
  completed_by_name?: string
  coordinator_email?: string | null
  coordinator_name?: string | null
  is_coordinator?: boolean
}

interface Department {
  department_id: number
  department_name: string
  organization_name?: string
  organization_code?: string
}

export default function TeacherClasses() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form states - section is now optional (empty string = no section)
  const [newClass, setNewClass] = useState({
    department: 0,
    batch: new Date().getFullYear(),
    semester: 1,
    section: '',
  })

  // Queries
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: classAPI.list,
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: scheduleAPI.getDepartments,
  })

  // Mutations
  const createClassMutation = useMutation({
    mutationFn: classAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      setShowCreateModal(false)
      setNewClass({ department: 0, batch: new Date().getFullYear(), semester: 1, section: '' })
      toast.success('Class created successfully')
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      toast.error(error.response?.data?.error || 'Failed to create class')
    },
  })

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClass.department) {
      toast.error('Please select a department')
      return
    }
    createClassMutation.mutate(newClass)
  }

  const activeClasses = classes.filter((c: ClassDetail) => c.is_active)
  const completedClasses = classes.filter((c: ClassDetail) => !c.is_active)

  return (
    <div className="min-h-screen bg-background bg-gradient-mesh">
      {/* Header - Mobile Optimized */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/teacher')}
                className="rounded-xl h-9 w-9 sm:h-10 sm:w-10"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-heading font-bold text-foreground">My Classes</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Manage students & enrollments</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900 shadow-lg h-9 sm:h-10 px-3 sm:px-4"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Class</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Stats Row - Mobile Optimized */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Classes', value: classes.length, icon: BookOpen, gradient: 'from-violet-500 to-purple-600' },
            { label: 'Active', value: activeClasses.length, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-600' },
            { label: 'Completed', value: completedClasses.length, icon: GraduationCap, gradient: 'from-slate-500 to-slate-600' },
            { label: 'Students', value: classes.reduce((sum: number, c: ClassDetail) => sum + c.student_count, 0), icon: Users, gradient: 'from-amber-500 to-orange-600' },
          ].map((stat, i) => (
            <div key={stat.label} className={`stat-card p-3 sm:p-4 animate-in opacity-0 stagger-${i + 1}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 sm:mb-2">
                    {stat.label}
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-heading font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                  <stat.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-card rounded-2xl border py-16 text-center animate-in opacity-0">
            <div className="inline-flex p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="font-heading font-semibold text-foreground mb-2">No classes yet</h4>
            <p className="text-sm text-muted-foreground mb-6">
              Create your first class to start managing students
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Class
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Classes */}
            {activeClasses.length > 0 && (
              <div className="animate-in opacity-0 stagger-5">
                <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Active Classes
                </h3>
                <div className="space-y-4">
                  {activeClasses.map((cls: ClassDetail) => (
                    <ClassCard key={cls.class_id} cls={cls} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Classes */}
            {completedClasses.length > 0 && (
              <div className="animate-in opacity-0 stagger-6">
                <h3 className="text-lg font-heading font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-400" />
                  Completed Semesters
                </h3>
                <div className="space-y-4 opacity-75">
                  {completedClasses.map((cls: ClassDetail) => (
                    <ClassCard key={cls.class_id} cls={cls} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Class Modal - Modern Design */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl border shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-foreground">New Class</h3>
                  <p className="text-xs text-muted-foreground">Configure your class details</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl h-9 w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateClass} className="p-5 sm:p-6 space-y-6">
              {/* Department Select */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2.5">
                  Department
                </label>
                <div className="relative">
                  <select
                    value={newClass.department}
                    onChange={e => setNewClass({ ...newClass, department: Number(e.target.value) })}
                    className="w-full px-4 py-3.5 border rounded-xl bg-slate-50 dark:bg-slate-800/50 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all appearance-none cursor-pointer text-sm"
                  >
                    <option value={0}>Select Department</option>
                    {departments.map((dept: Department) => (
                      <option key={dept.department_id} value={dept.department_id}>
                        {dept.department_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Batch Year & Section Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2.5">
                    Batch Year
                  </label>
                  <div className="relative">
                    <select
                      value={newClass.batch}
                      onChange={e => setNewClass({ ...newClass, batch: Number(e.target.value) })}
                      className="w-full px-4 py-3.5 border rounded-xl bg-slate-50 dark:bg-slate-800/50 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all appearance-none cursor-pointer text-sm font-medium"
                    >
                      {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2.5">
                    Section <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={newClass.section}
                    onChange={e => setNewClass({ ...newClass, section: e.target.value.toUpperCase() })}
                    placeholder="A, B, C..."
                    maxLength={2}
                    className="w-full px-4 py-3.5 border rounded-xl bg-slate-50 dark:bg-slate-800/50 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm font-medium text-center uppercase"
                  />
                </div>
              </div>

              {/* Semester Visual Selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2.5">
                  Semester
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => setNewClass({ ...newClass, semester: sem })}
                      className={`relative py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        newClass.semester === sem
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 scale-[1.02]'
                          : 'bg-slate-100 dark:bg-slate-800/70 text-foreground hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-[1.02]'
                      }`}
                    >
                      {sem}
                      {newClass.semester === sem && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Select the current semester for this class
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full rounded-xl h-12 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-900 shadow-lg font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                disabled={createClassMutation.isPending || !newClass.department}
              >
                {createClassMutation.isPending ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Class
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

// Teacher Management Modal Component - Exported for use in ClassDetail
export interface TeacherManagementModalProps {
  classId: number
  onClose: () => void
}

export function TeacherManagementModal({ classId, onClose }: TeacherManagementModalProps) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ teacher_email: string; name: string; designation: string; department_name: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ email: '', name: '', designation: 'Faculty' })

  const { data: teachersData, isLoading: isLoadingTeachers, refetch: refetchTeachers } = useQuery({
    queryKey: ['classTeachers', classId],
    queryFn: () => classAPI.getTeachers(classId),
  })

  const addTeacherMutation = useMutation({
    mutationFn: (teacherEmail: string) => classAPI.addTeacher(classId, teacherEmail),
    onSuccess: () => {
      toast.success('Teacher added successfully')
      refetchTeachers()
      setSearchQuery('')
      setSearchResults([])
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to add teacher')
    },
  })

  const removeTeacherMutation = useMutation({
    mutationFn: (teacherEmail: string) => classAPI.removeTeacher(classId, teacherEmail),
    onSuccess: () => {
      toast.success('Teacher removed')
      refetchTeachers()
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to remove teacher')
    },
  })

  const createTeacherMutation = useMutation({
    mutationFn: (data: { email: string; name: string; designation?: string }) => teacherAPI2.create(data),
    onSuccess: async (data) => {
      toast.success('Teacher created successfully')
      // Add them to the class
      await addTeacherMutation.mutateAsync(data.teacher_email)
      setShowCreateForm(false)
      setCreateForm({ email: '', name: '', designation: 'Faculty' })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create teacher')
    },
  })

  const handleSearch = async () => {
    if (searchQuery.length < 2) return
    setIsSearching(true)
    try {
      const results = await teacherAPI2.search(searchQuery)
      // Filter out teachers already in the class
      const existingEmails = teachersData?.teachers.map(t => t.teacher_email) || []
      setSearchResults(results.filter(r => !existingEmails.includes(r.teacher_email)))
    } catch {
      toast.error('Failed to search teachers')
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch()
      } else {
        setSearchResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-card rounded-2xl border shadow-2xl animate-in opacity-0 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50">
              <UserPlus2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-foreground">Manage Teachers</h3>
              <p className="text-sm text-muted-foreground">{teachersData?.class_name}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Search for teachers */}
          <div className="mb-6">
            <label className="text-sm font-medium text-foreground block mb-2">Add Teacher</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Search Results */}
            {isSearching && (
              <div className="mt-2 p-4 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            )}
            {!isSearching && searchResults.length > 0 && (
              <div className="mt-2 border rounded-xl overflow-hidden divide-y">
                {searchResults.map((teacher) => (
                  <div key={teacher.teacher_email} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div>
                      <p className="font-medium text-sm text-foreground">{teacher.name}</p>
                      <p className="text-xs text-muted-foreground">{teacher.teacher_email}</p>
                      <p className="text-xs text-muted-foreground">{teacher.designation} • {teacher.department_name}</p>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-lg"
                      onClick={() => addTeacherMutation.mutate(teacher.teacher_email)}
                      disabled={addTeacherMutation.isPending}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && !showCreateForm && (
              <div className="mt-2 p-4 rounded-xl border border-dashed bg-slate-50 dark:bg-slate-800/30 text-center">
                <p className="text-sm text-muted-foreground mb-3">No teachers found with this email/name</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(true)
                    // Pre-fill email if search query looks like email
                    if (searchQuery.includes('@')) {
                      setCreateForm({ ...createForm, email: searchQuery })
                    }
                  }}
                  className="rounded-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Teacher
                </Button>
              </div>
            )}

            {/* Create Teacher Form */}
            {showCreateForm && (
              <div className="mt-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/30">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-foreground">Create New Teacher</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateForm(false)}
                    className="h-7 w-7 p-0 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Email</label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="teacher@example.com"
                      className="w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Full Name</label>
                    <input
                      type="text"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="Dr. John Doe"
                      className="w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Designation</label>
                    <select
                      value={createForm.designation}
                      onChange={(e) => setCreateForm({ ...createForm, designation: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option>Faculty</option>
                      <option>Assistant Professor</option>
                      <option>Associate Professor</option>
                      <option>Professor</option>
                      <option>HOD</option>
                    </select>
                  </div>
                  <Button
                    onClick={() => createTeacherMutation.mutate(createForm)}
                    disabled={!createForm.email || !createForm.name || createTeacherMutation.isPending}
                    className="w-full rounded-lg"
                  >
                    {createTeacherMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                    ) : (
                      <><UserPlus2 className="h-4 w-4 mr-2" />Create & Add to Class</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    The teacher will need to login with Google to verify their account.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Current Teachers */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">
              Assigned Teachers ({teachersData?.teachers.length || 0})
            </label>
            {isLoadingTeachers ? (
              <div className="p-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {teachersData?.teachers.map((teacher) => (
                  <div key={teacher.teacher_email} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <span className="text-sm font-medium">{teacher.teacher_name.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground">{teacher.teacher_name}</p>
                          {teacher.is_coordinator && (
                            <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px]">
                              <Crown className="h-2.5 w-2.5 mr-0.5" />
                              Coordinator
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{teacher.teacher_email}</p>
                      </div>
                    </div>
                    {!teacher.is_coordinator && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => removeTeacherMutation.mutate(teacher.teacher_email)}
                        disabled={removeTeacherMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {(!teachersData?.teachers || teachersData.teachers.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No teachers assigned yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Subject Enrollment Modal Component - Exported for use in ClassDetail
export interface SubjectEnrollmentModalProps {
  subjectId: number
  subjectName: string
  onClose: () => void
}

export function SubjectEnrollmentModal({ subjectId, subjectName, onClose }: SubjectEnrollmentModalProps) {
  const queryClient = useQueryClient()

  const { data: enrollmentData, isLoading, refetch } = useQuery({
    queryKey: ['subjectEnrollment', subjectId],
    queryFn: () => subjectAPI.getStudents(subjectId),
  })

  const enrollMutation = useMutation({
    mutationFn: (studentEmail: string) => subjectAPI.enrollStudent(subjectId, studentEmail),
    onSuccess: () => {
      toast.success('Student enrolled')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['classes'] })
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
      queryClient.invalidateQueries({ queryKey: ['classes'] })
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
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to enroll all students')
    },
  })

  const enrolled = enrollmentData?.enrolled || []
  const notEnrolled = enrollmentData?.not_enrolled || []

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-card rounded-2xl border shadow-2xl animate-in opacity-0 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/50">
              <Users className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base sm:text-lg text-foreground">{subjectName}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">Manage student enrollment</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Enroll All Button */}
            {notEnrolled.length > 0 && (
              <Button
                onClick={() => enrollAllMutation.mutate()}
                disabled={enrollAllMutation.isPending}
                className="w-full mb-4 rounded-xl bg-violet-500 hover:bg-violet-600 text-white"
              >
                {enrollAllMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enrolling...</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-2" />Enroll All Class Students ({notEnrolled.length})</>
                )}
              </Button>
            )}

            {/* Enrolled Students */}
            <div className="mb-6">
              <h4 className="font-medium text-sm text-foreground mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Enrolled ({enrolled.length})
              </h4>
              {enrolled.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  No students enrolled yet
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {enrolled.map((student) => (
                    <div
                      key={student.student_email}
                      className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            {student.name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{student.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.roll_no}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMutation.mutate(student.student_email)}
                        disabled={removeMutation.isPending}
                        className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Not Enrolled Students */}
            <div>
              <h4 className="font-medium text-sm text-foreground mb-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Not Enrolled ({notEnrolled.length})
              </h4>
              {notEnrolled.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  All class students are enrolled
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notEnrolled.map((student) => (
                    <div
                      key={student.student_email}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-muted-foreground">
                            {student.name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{student.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.roll_no}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => enrollMutation.mutate(student.student_email)}
                        disabled={enrollMutation.isPending}
                        className="rounded-lg text-xs flex-shrink-0"
                      >
                        <Plus className="h-3 w-3 mr-1" />
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

// Simplified Class Card Component - clicks navigate to detail page
interface ClassCardProps {
  cls: ClassDetail
}

function ClassCard({ cls }: ClassCardProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(`/teacher/classes/${cls.class_id}`)}
      className="w-full bg-card rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800 text-left p-4 sm:p-5"
    >
      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
        <div className={`flex-shrink-0 w-11 h-11 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shadow-lg ${cls.is_active ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
          <GraduationCap className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-heading font-bold text-base sm:text-lg text-foreground truncate max-w-[200px] sm:max-w-none">
              {cls.department_name}
            </h4>
            {cls.is_coordinator && (
              <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] sm:text-xs">
                <Crown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                Coordinator
              </Badge>
            )}
            {!cls.is_active && (
              <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] sm:text-xs">
                <CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                Completed
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>Batch {cls.batch}</span>
            <span>•</span>
            <span>Sem {cls.semester}</span>
            {cls.section && cls.section.trim() && (
              <>
                <span>•</span>
                <span>Sec {cls.section}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {cls.student_count} students
            </Badge>
            {cls.completed_at && (
              <span className="text-[10px] text-muted-foreground">
                Ended {new Date(cls.completed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="hidden sm:block text-right">
          <p className="text-2xl font-heading font-bold text-foreground">{cls.student_count}</p>
          <p className="text-xs text-muted-foreground">students</p>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      </div>
    </button>
  )
}

