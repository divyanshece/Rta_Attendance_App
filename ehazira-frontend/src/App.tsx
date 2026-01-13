import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/auth'
import { ROUTES } from './utils/constants'
import Login from './components/auth/Login'
import TeacherDashboard from './components/teacher/Dashboard'
import TeacherAttendance from './components/teacher/AttendanceScreen'
import TeacherClasses from './components/teacher/Classes'
import TeacherClassDetail from './components/teacher/ClassDetail'
import TeacherSchedule from './components/teacher/Schedule'
import TeacherTimetable from './components/teacher/Timetable'
import StudentTimetable from './components/student/Timetable'
import TeacherReports from './components/teacher/Reports'
import StudentDashboard from './components/student/Dashboard'
import StudentAttendance from './components/student/AttendanceScreen'
import StudentClassDetail from './components/student/ClassDetail'
import { useThemeStore } from './store/theme'
import StudentSettings from './components/student/Settings'
import TeacherSettings from './components/teacher/Settings'
import TeacherAnnouncements from './components/teacher/Announcements'
import StudentAnnouncements from './components/student/Announcements'
import TeacherAdmin from './components/teacher/Admin'

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: string[]
}) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user && !allowedRoles.includes(user.user_type)) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return <>{children}</>
}

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const { theme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.user_type === 'teacher') {
        navigate(ROUTES.TEACHER_DASHBOARD, { replace: true })
      } else if (user.user_type === 'student') {
        navigate(ROUTES.STUDENT_DASHBOARD, { replace: true })
      }
    }
  }, [])

  return (
    <div className="min-h-screen">
      <Routes>
        <Route
          path={ROUTES.LOGIN}
          element={isAuthenticated ? <Navigate to={ROUTES.HOME} replace /> : <Login />}
        />

        <Route
          path={ROUTES.TEACHER_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.TEACHER_ATTENDANCE}
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherAttendance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/settings"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherSettings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/classes"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherClasses />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/classes/:classId"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherClassDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/schedule"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherSchedule />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/reports"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherReports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/timetable"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherTimetable />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/announcements"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherAnnouncements />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/admin"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherAdmin />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.STUDENT_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.STUDENT_ATTENDANCE}
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAttendance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/settings"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentSettings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/timetable"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentTimetable />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/class/:classId"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentClassDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/announcements"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentAnnouncements />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTES.HOME}
          element={
            isAuthenticated ? (
              user?.user_type === 'teacher' ? (
                <Navigate to={ROUTES.TEACHER_DASHBOARD} replace />
              ) : (
                <Navigate to={ROUTES.STUDENT_DASHBOARD} replace />
              )
            ) : (
              <Navigate to={ROUTES.LOGIN} replace />
            )
          }
        />
      </Routes>
    </div>
  )
}

export default App
