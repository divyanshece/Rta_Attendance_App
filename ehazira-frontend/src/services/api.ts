import axios, { AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Flag to prevent multiple logout redirects
let isLoggingOut = false

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Helper to clear auth and redirect
const forceLogout = (message?: string) => {
  if (isLoggingOut) return
  isLoggingOut = true

  // Clear all auth data
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('device_id')
  localStorage.removeItem('user')
  localStorage.removeItem('auth-storage') // Zustand persisted state

  if (message) {
    // Store message for login page to display (use localStorage so it survives page reload on mobile)
    localStorage.setItem('auth_message', message)
  }

  // Use replace to prevent back button issues
  window.location.replace('/login')
}

// Request interceptor - add auth token, skip if logging out
api.interceptors.request.use((config) => {
  if (isLoggingOut) {
    // Cancel the request if we're logging out
    const controller = new AbortController()
    controller.abort()
    config.signal = controller.signal
    return config
  }

  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string; hint?: string; user_type?: string }>) => {
    // If request was aborted (during logout), just reject silently
    if (error.code === 'ERR_CANCELED') {
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      forceLogout('Your session has expired. Please login again.')
      return Promise.reject(error)
    }

    // Handle device not approved error (usually means wrong token in localStorage)
    if (error.response?.status === 403 && error.response?.data?.error?.includes('Device not approved')) {
      const storedUser = localStorage.getItem('user')
      const expectedUserType = storedUser ? JSON.parse(storedUser).user_type : null
      const actualUserType = error.response?.data?.user_type

      // If there's a mismatch, clear storage and redirect to login
      if (expectedUserType && actualUserType && expectedUserType !== actualUserType) {
        console.error('Token mismatch detected. Expected:', expectedUserType, 'Got:', actualUserType)
        forceLogout('Session conflict detected. You were logged in as a different user type. Please login again.')
        return Promise.reject(error)
      }
    }
    return Promise.reject(error)
  }
)

// Export helper to reset logout flag (call from login page)
export const resetLogoutFlag = () => {
  isLoggingOut = false
}

// Types
interface GoogleAuthRequest {
  id_token: string
  device_uuid?: string
  fingerprint_hash?: string
  platform?: string
}

interface AuthResponse {
  access_token: string
  refresh_token: string
  user_type: 'teacher' | 'student' | 'admin'
  user_info: {
    email: string
    name: string
    user_type: 'teacher' | 'student' | 'admin'
    designation?: string
    department?: string
    roll_no?: string
    class_id?: number
  }
  device_approved: boolean
  device_id?: number
}

interface InitiateAttendanceRequest {
  period_id?: number
  subject_id?: number
  date: string
  class_mode?: 'offline' | 'online'
  teacher_latitude?: number
  teacher_longitude?: number
  proximity_radius?: number
}

interface InitiateAttendanceResponse {
  session_id: number
  otp: string
  expires_in: number
  enrolled_students: string[]
  total_students: number
  class_name?: string
  subject_name?: string
  class_mode?: 'offline' | 'online'
}

interface AttendanceRecord {
  student_email: string
  student_name: string
  roll_no: string
  status: 'P' | 'A' | 'X'
  status_display: string
  submitted_at: string | null
}

interface LiveStatusResponse {
  session_id: number
  total_students: number
  present: number
  absent: number
  pending: number
  proxy: number
  class_mode?: 'offline' | 'online'
  submissions: AttendanceRecord[]
}

interface StudentSummary {
  student_email: string
  student_name: string
  roll_no: string
  total_sessions: number
  present: number
  absent: number
  attendance_percentage: number
}

interface ClassSummary {
  class_id: number
  class_info: string
  subject_name: string
  total_sessions: number
  average_attendance: number
  students: StudentSummary[]
}

// Auth API
export const authAPI = {
  googleLogin: async (data: GoogleAuthRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/google', data)
    return response.data
  },

  adminLogin: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/admin/login', {
      username,
      password,
    })
    return response.data
  },
}

// Classes for attendance type
interface ClassForAttendance {
  subject_id: number
  subject_name: string
  class_id: number
  class_name: string
  department_name: string
  batch: number
  semester: number
  section: string
  student_count: number
}

// Attendance API
export const attendanceAPI = {
  getClassesForAttendance: async (): Promise<ClassForAttendance[]> => {
    const response = await api.get<ClassForAttendance[]>('/attendance/classes/')
    return response.data
  },

  initiate: async (data: {
    subject_id?: number;
    period_id?: number;
    date: string;
    class_mode?: 'offline' | 'online';
    teacher_latitude?: number;
    teacher_longitude?: number;
    proximity_radius?: number;
  }): Promise<InitiateAttendanceResponse> => {
    const response = await api.post<InitiateAttendanceResponse>('/attendance/initiate', data)
    return response.data
  },

  close: async (sessionId: number): Promise<{ message: string }> => {
    const response = await api.post('/attendance/close', { session_id: sessionId })
    return response.data
  },

  getLiveStatus: async (sessionId: number): Promise<LiveStatusResponse> => {
    const response = await api.get<LiveStatusResponse>('/attendance/live-status', {
      params: { session_id: sessionId },
    })
    return response.data
  },

  manualMark: async (
    sessionId: number,
    studentEmail: string,
    status: 'P' | 'A',
    reason?: string
  ): Promise<{ message: string }> => {
    const response = await api.post('/attendance/manual-mark', {
      session_id: sessionId,
      student_email: studentEmail,
      status,
      reason,
    })
    return response.data
  },

  getStudentSummary: async (studentEmail: string, subjectId: number): Promise<StudentSummary> => {
    const response = await api.get<StudentSummary>('/attendance/student-summary', {
      params: { student_email: studentEmail, subject_id: subjectId },
    })
    return response.data
  },

  getClassSummary: async (subjectId: number): Promise<ClassSummary> => {
    const response = await api.get<ClassSummary>('/attendance/class-summary', {
      params: { subject_id: subjectId },
    })
    return response.data
  },

  regenerateOTP: async (sessionId: number): Promise<{ session_id: number; otp: string; expires_in: number }> => {
    const response = await api.post('/attendance/regenerate-otp', { session_id: sessionId })
    return response.data
  },
}

// ============== NEW API FUNCTIONS ==============

// Types for new APIs
interface ClassDetail {
  class_id: number
  department: number
  department_name: string
  batch: number
  semester: number
  section: string
  created_by?: string
  created_by_name?: string
  created_at?: string
  student_count: number
  is_active: boolean
  completed_at?: string
  completed_by_name?: string
  // Coordinator fields
  coordinator_email?: string | null
  coordinator_name?: string | null
  is_coordinator?: boolean
}

interface StudentEnrollment {
  id: number | null
  student_email: string
  student_name: string
  roll_no: string
  enrolled_at: string | null
  verified: boolean
}

interface ClassStudentsResponse {
  class_id: number
  class_name: string
  students: StudentEnrollment[]
}

interface ScheduleItem {
  period_id: number
  subject_id: number
  subject_name: string
  course_name: string
  teacher_name?: string
  class_name: string
  class_id: number
  day_of_week: number
  day_name: string
  period_no: number
  is_subject_owner?: boolean
  is_coordinator?: boolean
  can_manage?: boolean
}

interface Subject {
  subject_id: number
  course: number
  course_name: string
  class_field: number
  class_info?: ClassDetail
  teacher: string
  teacher_name: string
  is_subject_owner?: boolean
  is_coordinator?: boolean
  can_manage?: boolean
}

interface Department {
  department_id: number
  department_name: string
}

interface Course {
  course_id: number
  course_name: string
}

interface Period {
  period_id: number
  subject: number
  subject_info?: Subject
  day_of_week: number
  day_name?: string
  period_no: number
}

interface DashboardStats {
  total_classes: number
  total_students: number
  total_subjects: number
  todays_sessions: number
  average_attendance: number
}

interface ClassReport {
  class_id: number
  class_name: string
  subject_id: number
  subject_name: string
  total_sessions: number
  average_attendance: number
  students: StudentAttendanceReport[]
}

interface StudentAttendanceReport {
  student_email: string
  student_name: string
  roll_no: string
  total_sessions: number
  present: number
  absent: number
  percentage: number
}

interface TeacherProfile {
  teacher_email: string
  name: string
  designation: string
  department: number
  department_name: string
  verified: boolean
  is_admin?: boolean
  organization?: {
    organization_id: number
    name: string
    code: string
  }
}

interface StudentProfile {
  student_email: string
  name: string
  roll_no: string
  class_field: number
  class_info: ClassDetail
  department_name: string
  verified: boolean
  enrolled_classes: { class_id: number; class_name: string; roll_no: string; enrolled_at: string }[]
}

interface StudentClassWithAttendance {
  class_id: number
  class_name: string
  department_name: string
  batch: number
  semester: number
  section: string
  roll_no: string
  subjects: {
    subject_id: number
    course_name: string
    teacher_name: string
    total_sessions: number
    present: number
    absent: number
    percentage: number
  }[]
  overall_percentage: number
  total_present: number
  total_absent: number
  total_sessions: number
}

interface StudentTodaySchedule {
  period_id: number
  period_no: number
  subject_id: number
  course_name: string
  teacher_name: string
  class_name: string
  class_id: number
  department_name: string
  session_active: boolean
  session_id: number | null
  attendance_status: 'P' | 'A' | null
}

interface StudentWeeklyScheduleItem {
  period_id: number
  period_no: number
  day_of_week: number
  subject_id: number
  course_name: string
  teacher_name: string
  class_name: string
  class_id: number
  department_name: string
}

interface StudentDashboardStats {
  enrolled_classes: number
  total_subjects: number
  today_classes: number
  total_sessions: number
  total_present: number
  total_absent: number
  overall_percentage: number
}

// Class Management API
export const classAPI = {
  list: async (): Promise<ClassDetail[]> => {
    const response = await api.get<ClassDetail[]>('/classes/')
    return response.data
  },

  create: async (data: {
    department: number
    batch: number
    semester: number
    section: string
  }): Promise<ClassDetail> => {
    const response = await api.post<ClassDetail>('/classes/', data)
    return response.data
  },

  get: async (id: number): Promise<ClassDetail> => {
    const response = await api.get<ClassDetail>(`/classes/${id}/`)
    return response.data
  },

  update: async (
    id: number,
    data: Partial<{ department: number; batch: number; semester: number; section: string }>
  ): Promise<ClassDetail> => {
    const response = await api.put<ClassDetail>(`/classes/${id}/`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/classes/${id}/`)
  },

  getStudents: async (id: number): Promise<ClassStudentsResponse> => {
    const response = await api.get<ClassStudentsResponse>(`/classes/${id}/students/`)
    return response.data
  },

  inviteStudent: async (
    classId: number,
    data: { email: string; name?: string; roll_no: string }
  ): Promise<{ message: string; invitation_id?: number; enrolled: boolean }> => {
    const response = await api.post(`/classes/${classId}/invite/`, data)
    return response.data
  },

  importStudents: async (
    classId: number,
    file: File
  ): Promise<{ enrolled: number; invited: number; errors: string[] }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/classes/${classId}/import/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  removeStudent: async (classId: number, email: string): Promise<{ message: string }> => {
    const response = await api.delete(`/classes/${classId}/students/${email}/remove/`)
    return response.data
  },

  markComplete: async (classId: number): Promise<{ message: string; class_id: number; completed_at: string }> => {
    const response = await api.post(`/classes/${classId}/complete/`)
    return response.data
  },

  getStats: async (classId: number): Promise<ClassStats> => {
    const response = await api.get<ClassStats>(`/classes/${classId}/stats/`)
    return response.data
  },

  exportAttendance: async (classId: number): Promise<ExportData> => {
    const response = await api.get<ExportData>(`/classes/${classId}/export/`)
    return response.data
  },

  // Coordinator / Class Teacher Management
  getTeachers: async (classId: number): Promise<ClassTeachersResponse> => {
    const response = await api.get<ClassTeachersResponse>(`/classes/${classId}/teachers/`)
    return response.data
  },

  addTeacher: async (classId: number, teacherEmail: string): Promise<{ message: string; teacher_email: string; teacher_name: string; added_at: string }> => {
    const response = await api.post(`/classes/${classId}/teachers/`, { teacher_email: teacherEmail })
    return response.data
  },

  removeTeacher: async (classId: number, teacherEmail: string): Promise<{ message: string }> => {
    const response = await api.delete(`/classes/${classId}/teachers/`, { params: { teacher_email: teacherEmail } })
    return response.data
  },
}

// Class Teachers Response
interface ClassTeacher {
  teacher_email: string
  teacher_name: string
  designation: string
  department_name: string
  added_by: string | null
  added_at: string
  is_coordinator?: boolean
}

interface ClassTeachersResponse {
  class_id: number
  class_name: string
  coordinator_email: string | null
  coordinator_name: string | null
  teachers: ClassTeacher[]
}

// Teacher Search API
export const teacherAPI2 = {
  search: async (query: string): Promise<TeacherSearchResult[]> => {
    const response = await api.get<TeacherSearchResult[]>('/teachers/search/', { params: { q: query } })
    return response.data
  },

  create: async (data: { email: string; name: string; designation?: string }): Promise<CreateTeacherResponse> => {
    const response = await api.post<CreateTeacherResponse>('/teachers/create/', data)
    return response.data
  },
}

interface TeacherSearchResult {
  teacher_email: string
  name: string
  designation: string
  department_name: string
}

interface CreateTeacherResponse {
  teacher_email: string
  name: string
  designation: string
  department_name: string
  verified: boolean
  message: string
}

// Subject Enrollment API
interface SubjectStudent {
  student_email: string
  name: string
  roll_no: string
  verified: boolean
  enrolled_at?: string
}

interface SubjectEnrollmentResponse {
  subject_id: number
  course_name: string
  class_name: string
  enrolled: SubjectStudent[]
  not_enrolled: SubjectStudent[]
}

export const subjectAPI = {
  getStudents: async (subjectId: number): Promise<SubjectEnrollmentResponse> => {
    const response = await api.get<SubjectEnrollmentResponse>(`/subjects/${subjectId}/students/`)
    return response.data
  },

  enrollStudent: async (subjectId: number, studentEmail: string): Promise<{ message: string; enrollment_id: number }> => {
    const response = await api.post(`/subjects/${subjectId}/students/`, { student_email: studentEmail })
    return response.data
  },

  removeStudent: async (subjectId: number, studentEmail: string): Promise<{ message: string }> => {
    const response = await api.delete(`/subjects/${subjectId}/students/`, { params: { student_email: studentEmail } })
    return response.data
  },

  enrollAll: async (subjectId: number): Promise<{ message: string; enrolled_count: number }> => {
    const response = await api.post(`/subjects/${subjectId}/students/enroll-all/`)
    return response.data
  },
}

// Student Lookup API
interface StudentLookupResponse {
  exists: boolean
  student_email?: string
  name?: string
  roll_no?: string
  verified?: boolean
  pending_invitation?: boolean
}

export const studentLookupAPI = {
  lookup: async (email: string): Promise<StudentLookupResponse> => {
    const response = await api.get<StudentLookupResponse>('/students/lookup/', {
      params: { email }
    })
    return response.data
  },
}

interface ClassStats {
  class_id: number
  class_name: string
  department_name: string
  batch: number
  semester: number
  section: string
  is_active: boolean
  total_students: number
  total_subjects: number
  total_sessions: number
  classes_taken: number
  average_attendance: number
  subjects: {
    subject_id: number
    course_name: string
    teacher_name: string
    total_sessions: number
    average_attendance: number
  }[]
}

interface ExportData {
  class_info: {
    class_name: string
    department: string
    batch: number
    semester: number
    section: string
    total_students: number
    total_subjects: number
    is_active: boolean
    exported_at: string
  }
  subjects: {
    subject_id: number
    course_name: string
    teacher_name: string
    total_sessions: number
  }[]
  students: {
    roll_no: string
    name: string
    email: string
    subjects: {
      course_name: string
      total_sessions: number
      present: number
      absent: number
      percentage: number
    }[]
    total_sessions: number
    total_present: number
    total_absent: number
    overall_percentage: number
  }[]
}

// Export Register Types
interface ExportMonthInfo {
  month: number
  year: number
  month_name: string
  total_sessions: number
}

interface ExportRegisterMeta {
  subject_name: string
  class_name: string
  department: string
  batch: number
  semester: number
  section: string
  teacher_name: string
}

interface ExportRegisterMonthsResponse extends ExportRegisterMeta {
  months: ExportMonthInfo[]
}

interface ExportRegisterMonthlyResponse extends ExportRegisterMeta {
  month: number
  year: number
  month_name: string
  sessions: { date: string; day: string }[]
  students: {
    roll_no: string
    name: string
    email: string
    attendance: number[]
    total_present: number
    total_classes: number
    percentage: number
  }[]
}

interface ExportRegisterSemesterResponse extends ExportRegisterMeta {
  months: ExportMonthInfo[]
  students: {
    roll_no: string
    name: string
    email: string
    monthly_stats: { present: number; total: number; percentage: number }[]
    total_present: number
    total_classes: number
    percentage: number
  }[]
}

// Export Register API
export const exportRegisterAPI = {
  getMonths: async (subjectId: number): Promise<ExportRegisterMonthsResponse> => {
    const response = await api.get<ExportRegisterMonthsResponse>(`/subjects/${subjectId}/export-register/`, {
      params: { mode: 'months' },
    })
    return response.data
  },

  getMonthly: async (subjectId: number, month: number, year: number): Promise<ExportRegisterMonthlyResponse> => {
    const response = await api.get<ExportRegisterMonthlyResponse>(`/subjects/${subjectId}/export-register/`, {
      params: { mode: 'monthly', month, year },
    })
    return response.data
  },

  getSemester: async (subjectId: number): Promise<ExportRegisterSemesterResponse> => {
    const response = await api.get<ExportRegisterSemesterResponse>(`/subjects/${subjectId}/export-register/`, {
      params: { mode: 'semester' },
    })
    return response.data
  },
}

// Schedule/Period API
export const scheduleAPI = {
  getAll: async (day?: number, classId?: number): Promise<ScheduleItem[]> => {
    const params: { day?: number; class_id?: number } = {}
    if (day !== undefined) params.day = day
    if (classId !== undefined) params.class_id = classId
    const response = await api.get<ScheduleItem[]>('/schedule/', { params })
    return response.data
  },

  getToday: async (): Promise<ScheduleItem[]> => {
    const response = await api.get<ScheduleItem[]>('/schedule/today/')
    return response.data
  },

  createPeriod: async (data: {
    subject: number
    day_of_week: number
    period_no: number
  }): Promise<Period> => {
    const response = await api.post<Period>('/periods/', data)
    return response.data
  },

  updatePeriod: async (
    id: number,
    data: Partial<{ subject: number; day_of_week: number; period_no: number }>
  ): Promise<Period> => {
    const response = await api.put<Period>(`/periods/${id}/`, data)
    return response.data
  },

  deletePeriod: async (id: number): Promise<void> => {
    await api.delete(`/periods/${id}/`)
  },

  getSubjects: async (classId?: number): Promise<Subject[]> => {
    const params = classId ? { class_id: classId } : {}
    const response = await api.get<Subject[]>('/subjects/', { params })
    return response.data
  },

  createSubject: async (data: {
    course?: number
    course_name?: string
    class_field: number
  }): Promise<Subject> => {
    const response = await api.post<Subject>('/subjects/', data)
    return response.data
  },

  getCourses: async (): Promise<Course[]> => {
    const response = await api.get<Course[]>('/courses/')
    return response.data
  },

  getDepartments: async (): Promise<Department[]> => {
    const response = await api.get<Department[]>('/departments/')
    return response.data
  },
}

// Reports API
export const reportsAPI = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/reports/dashboard/')
    return response.data
  },

  getClassReport: async (classId: number, subjectId?: number): Promise<ClassReport[]> => {
    const params = subjectId ? { subject_id: subjectId } : {}
    const response = await api.get<ClassReport[]>(`/reports/class/${classId}/`, { params })
    return response.data
  },

  getSubjectReport: async (subjectId: number): Promise<ClassReport> => {
    const response = await api.get<ClassReport>(`/reports/subject/${subjectId}/`)
    return response.data
  },
}

// Teacher Profile API
export const teacherAPI = {
  getProfile: async (): Promise<TeacherProfile> => {
    const response = await api.get<TeacherProfile>('/teacher/profile/')
    return response.data
  },

  updateProfile: async (data: {
    name?: string
    designation?: string
    department?: number
    department_name?: string
  }): Promise<TeacherProfile> => {
    const response = await api.put<TeacherProfile>('/teacher/profile/', data)
    return response.data
  },
}

// Student API
export const studentAPI = {
  getProfile: async (): Promise<StudentProfile> => {
    const response = await api.get<StudentProfile>('/student/profile/')
    return response.data
  },

  getClasses: async (): Promise<StudentClassWithAttendance[]> => {
    const response = await api.get<StudentClassWithAttendance[]>('/student/classes/')
    return response.data
  },

  getTodaySchedule: async (): Promise<StudentTodaySchedule[]> => {
    const response = await api.get<StudentTodaySchedule[]>('/student/schedule/today/')
    return response.data
  },

  getWeeklySchedule: async (): Promise<StudentWeeklyScheduleItem[]> => {
    const response = await api.get<StudentWeeklyScheduleItem[]>('/student/schedule/weekly/')
    return response.data
  },

  getDashboardStats: async (): Promise<StudentDashboardStats> => {
    const response = await api.get<StudentDashboardStats>('/student/dashboard/')
    return response.data
  },

  getAnnouncements: async (): Promise<StudentAnnouncementsResponse> => {
    const response = await api.get<StudentAnnouncementsResponse>('/student/announcements/')
    return response.data
  },

  markAnnouncementRead: async (announcementId: number): Promise<{ message: string }> => {
    const response = await api.post('/student/announcements/', { announcement_id: announcementId })
    return response.data
  },
}

// ============== ANNOUNCEMENTS & NOTES ==============

// Types for Announcements
interface Announcement {
  announcement_id: number
  class_id: number
  class_name: string
  subject_id: number | null
  subject_name: string | null
  title: string
  content: string
  created_at: string
  updated_at: string
}

interface StudentAnnouncement extends Announcement {
  teacher_name: string
  is_read: boolean
  read_at: string | null
}

interface StudentAnnouncementsResponse {
  unread_count: number
  announcements: StudentAnnouncement[]
}

// Types for Teacher Notes
interface TeacherNote {
  note_id: number
  class_id: number
  class_name: string
  subject_id: number | null
  subject_name: string | null
  content: string
  created_at: string
  updated_at: string
}

// Types for Time Slots
interface TimeSlot {
  slot_id: number
  period_no: number
  start_time: string
  end_time: string
}

// Announcements API (Teacher)
export const announcementAPI = {
  list: async (classId?: number): Promise<Announcement[]> => {
    const params = classId ? { class_id: classId } : {}
    const response = await api.get<Announcement[]>('/announcements/', { params })
    return response.data
  },

  create: async (data: {
    class_id: number
    subject_id?: number
    title: string
    content: string
  }): Promise<Announcement> => {
    const response = await api.post<Announcement>('/announcements/', data)
    return response.data
  },

  update: async (id: number, data: {
    title?: string
    content?: string
  }): Promise<Announcement> => {
    const response = await api.put<Announcement>(`/announcements/${id}/`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/announcements/${id}/`)
  },
}

// Teacher Notes API (Private)
export const notesAPI = {
  list: async (classId?: number): Promise<TeacherNote[]> => {
    const params = classId ? { class_id: classId } : {}
    const response = await api.get<TeacherNote[]>('/notes/', { params })
    return response.data
  },

  create: async (data: {
    class_id: number
    subject_id?: number
    content: string
  }): Promise<TeacherNote> => {
    const response = await api.post<TeacherNote>('/notes/', data)
    return response.data
  },

  update: async (id: number, data: { content: string }): Promise<TeacherNote> => {
    const response = await api.put<TeacherNote>(`/notes/${id}/`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/notes/${id}/`)
  },
}

// Time Slots API
export const timeSlotsAPI = {
  list: async (): Promise<TimeSlot[]> => {
    const response = await api.get<TimeSlot[]>('/time-slots/')
    return response.data
  },

  save: async (slots: { period_no: number; start_time: string; end_time: string }[]): Promise<TimeSlot[]> => {
    const response = await api.post<TimeSlot[]>('/time-slots/', { slots })
    return response.data
  },

  delete: async (periodNo: number): Promise<void> => {
    await api.delete('/time-slots/', { data: { period_no: periodNo } })
  },
}

// Organization Admin API
export interface AdminCheckResponse {
  is_admin: boolean
  organization: {
    organization_id: number
    name: string
    code: string
  } | null
}

export interface AdminDashboardResponse {
  organization: {
    organization_id: number
    name: string
    code: string
    address: string
  }
  stats: {
    teachers: number
    departments: number
    active_classes: number
    students: number
  }
  admins: {
    email: string
    name: string
    added_at: string | null
  }[]
}

export interface AdminTeacher {
  email: string
  name: string
  designation: string
  department_id: number | null
  department_name: string | null
  verified: boolean
  is_admin: boolean
}

export interface AdminDepartment {
  department_id: number
  department_name: string
  school: string
  teacher_count: number
  class_count: number
}

export const adminAPI = {
  // Check if current user is an admin
  checkAdmin: async (): Promise<AdminCheckResponse> => {
    const response = await api.get<AdminCheckResponse>('/api/admin/check/')
    return response.data
  },

  // Get admin dashboard stats
  getDashboard: async (): Promise<AdminDashboardResponse> => {
    const response = await api.get<AdminDashboardResponse>('/api/admin/dashboard/')
    return response.data
  },

  // Get teachers in organization
  getTeachers: async (): Promise<{ organization_id: number; organization_name: string; teachers: AdminTeacher[]; count: number }> => {
    const response = await api.get('/api/admin/teachers/')
    return response.data
  },

  // Add a new teacher
  addTeacher: async (data: {
    email: string
    name: string
    designation?: string
    department_id: number
    make_admin?: boolean
  }): Promise<{ message: string; email: string; name: string; is_admin: boolean }> => {
    const response = await api.post('/api/admin/teachers/', data)
    return response.data
  },

  // Delete a teacher
  deleteTeacher: async (email: string): Promise<{ message: string }> => {
    const response = await api.delete('/api/admin/teachers/', { params: { email } })
    return response.data
  },

  // Import teachers from file
  importTeachers: async (file: File): Promise<{ message: string; added: number; skipped: number; errors: string[] }> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/api/admin/teachers/import/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  // Get departments in organization
  getDepartments: async (): Promise<{ organization_id: number; organization_name: string; departments: AdminDepartment[]; count: number }> => {
    const response = await api.get('/api/admin/departments/')
    return response.data
  },

  // Add a new department
  addDepartment: async (data: { department_name: string; school?: string }): Promise<{ message: string; department_id: number; department_name: string }> => {
    const response = await api.post('/api/admin/departments/', data)
    return response.data
  },

  // Delete a department
  deleteDepartment: async (departmentId: number): Promise<{ message: string }> => {
    const response = await api.delete('/api/admin/departments/', { params: { department_id: departmentId } })
    return response.data
  },

  // Toggle admin status for a teacher
  toggleAdmin: async (teacherEmail: string): Promise<{ message: string; is_admin: boolean }> => {
    const response = await api.post('/api/admin/toggle/', { teacher_email: teacherEmail })
    return response.data
  },
}

export default api