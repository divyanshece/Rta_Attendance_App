import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
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
import Onboarding, { hasCompletedOnboarding } from './components/Onboarding'

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

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function ExitConfirmDialog({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 mx-6 w-full max-w-xs border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-heading font-semibold text-slate-800 dark:text-white text-center mb-2">
          Exit App?
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
          Are you sure you want to exit?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const { theme } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => !hasCompletedOnboarding())

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

  // Hardware back button handling (Android)
  const handleExitConfirm = useCallback(async () => {
    setShowExitDialog(false)
    try {
      const { App: CapApp } = await import('@capacitor/app')
      CapApp.exitApp()
    } catch {
      // On web, just close the dialog
    }
  }, [])

  useEffect(() => {
    let cleanup: (() => void) | undefined

    async function setupBackButton() {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) return

        const { App: CapApp } = await import('@capacitor/app')
        const listener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          const path = window.location.pathname
          const isRootScreen =
            path === '/login' ||
            path === '/teacher' ||
            path === '/student'

          if (isRootScreen) {
            setShowExitDialog(true)
          } else if (canGoBack) {
            window.history.back()
          }
        })

        cleanup = () => listener.remove()
      } catch {
        // Not on native platform
      }
    }

    setupBackButton()
    return () => cleanup?.()
  }, [])

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />
  }

  return (
    <div className="min-h-screen">
      <ScrollToTop />
      <ExitConfirmDialog
        open={showExitDialog}
        onConfirm={handleExitConfirm}
        onCancel={() => setShowExitDialog(false)}
      />
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
