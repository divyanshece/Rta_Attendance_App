import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { reportsAPI, classAPI, scheduleAPI } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, BarChart3, Users, BookOpen, TrendingUp } from 'lucide-react'

interface ClassDetail {
  class_id: number
  department_name: string
  batch: number
  semester: number
  section: string
}

interface Subject {
  subject_id: number
  course_name: string
}

interface ClassReport {
  class_id: number
  class_name: string
  subject_id: number
  subject_name: string
  total_sessions: number
  average_attendance: number
  students: StudentReport[]
}

interface StudentReport {
  student_email: string
  student_name: string
  roll_no: string
  total_sessions: number
  present: number
  absent: number
  percentage: number
}

export default function TeacherReports() {
  const navigate = useNavigate()
  const [selectedClass, setSelectedClass] = useState<number | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)

  // Queries
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: reportsAPI.getDashboardStats,
  })

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: classAPI.list,
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => scheduleAPI.getSubjects(),
  })

  const { data: classReports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ['classReport', selectedClass, selectedSubject],
    queryFn: () =>
      selectedClass ? reportsAPI.getClassReport(selectedClass, selectedSubject || undefined) : Promise.resolve([]),
    enabled: !!selectedClass,
  })

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600 dark:text-green-400'
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getAttendanceBadge = (percentage: number) => {
    if (percentage >= 75) return 'default'
    if (percentage >= 50) return 'secondary'
    return 'destructive'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/teacher')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  View attendance reports and analytics
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Classes
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {dashboardStats.total_classes}
                    </p>
                  </div>
                  <div className="bg-green-500 w-12 h-12 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Students
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {dashboardStats.total_students}
                    </p>
                  </div>
                  <div className="bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Subjects
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {dashboardStats.total_subjects}
                    </p>
                  </div>
                  <div className="bg-purple-500 w-12 h-12 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Avg. Attendance
                    </p>
                    <p
                      className={`text-2xl font-bold ${getAttendanceColor(dashboardStats.average_attendance)}`}
                    >
                      {dashboardStats.average_attendance}%
                    </p>
                  </div>
                  <div className="bg-orange-500 w-12 h-12 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Reports</CardTitle>
            <CardDescription>Select a class and subject to view detailed reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Class
                </label>
                <select
                  value={selectedClass || ''}
                  onChange={e => {
                    setSelectedClass(e.target.value ? Number(e.target.value) : null)
                    setSelectedSubject(null)
                  }}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls: ClassDetail) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.department_name} - Batch {cls.batch} - Sem {cls.semester} - {cls.section}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject (Optional)
                </label>
                <select
                  value={selectedSubject || ''}
                  onChange={e => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">All Subjects</option>
                  {subjects.map((subject: Subject) => (
                    <option key={subject.subject_id} value={subject.subject_id}>
                      {subject.course_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports */}
        {selectedClass ? (
          isLoadingReports ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : classReports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No attendance data
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  No attendance sessions have been recorded for this class yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {classReports.map((report: ClassReport) => (
                <Card key={`${report.class_id}-${report.subject_id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{report.subject_name}</CardTitle>
                        <CardDescription>{report.class_name}</CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Total Sessions: {report.total_sessions}
                        </p>
                        <p className={`text-lg font-bold ${getAttendanceColor(report.average_attendance)}`}>
                          Avg: {report.average_attendance}%
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {report.students.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                        No students in this class
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b dark:border-gray-700">
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                Roll No
                              </th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                                Name
                              </th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                Present
                              </th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                Absent
                              </th>
                              <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                Attendance
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.students.map((student: StudentReport) => (
                              <tr
                                key={student.student_email}
                                className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                              >
                                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                  {student.roll_no}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {student.student_name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {student.student_email}
                                  </p>
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-green-600 dark:text-green-400">
                                  {student.present}
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-red-600 dark:text-red-400">
                                  {student.absent}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge variant={getAttendanceBadge(student.percentage)}>
                                    {student.percentage}%
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select a class
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a class from the filter above to view attendance reports
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
