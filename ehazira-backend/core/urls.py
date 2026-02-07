from django.urls import path
from .views import (
    GoogleAuthView,
    AdminLoginView,
    PendingUsersView,
    VerifyUserView,
    ApproveDeviceView,
    StudentLogoutView,
    ResetStudentDeviceView,
    StudentDeviceInfoView,
    InitiateAttendanceView,
    CloseAttendanceView,
    RegenerateOTPView,
    LiveStatusView,
    ManualMarkView,
    StudentSummaryView,
    ClassSummaryView,
    # New views
    ClassListCreateView,
    ClassDetailView,
    ClassStudentsView,
    InviteStudentView,
    ImportStudentsView,
    RemoveStudentView,
    StudentLookupView,
    ScheduleListView,
    TodayScheduleView,
    PeriodCreateView,
    PeriodDetailView,
    SubjectListCreateView,
    CourseListView,
    DepartmentListView,
    DashboardStatsView,
    ClassReportView,
    SubjectReportView,
    TeacherProfileView,
    StudentProfileView,
    StudentClassesView,
    StudentTodayScheduleView,
    StudentWeeklyScheduleView,
    StudentDashboardStatsView,
    ExportClassAttendanceView,
    ClassDetailedStatsView,
    # Organization & Semester Management
    OrganizationListView,
    MarkSemesterCompleteView,
    TeacherClassesForAttendanceView,
    # Announcements, Notes, Time Slots
    AnnouncementListView,
    AnnouncementDetailView,
    StudentAnnouncementsView,
    TeacherNoteListView,
    TeacherNoteDetailView,
    PeriodTimeSlotListView,
    # Coordinator / Class Teacher Management
    ClassTeacherListView,
    TeacherSearchView,
    CreateTeacherView,
    SubjectEnrollmentView,
    EnrollAllStudentsView,
    ExportSubjectAttendanceView,
    # Organization Admin Management
    AdminCheckView,
    AdminDashboardView,
    AdminTeacherListView,
    AdminTeacherImportView,
    AdminDepartmentListView,
    AdminToggleView,
)

urlpatterns = [
    # Authentication
    path('auth/google', GoogleAuthView.as_view(), name='google-auth'),
    path('auth/admin/login', AdminLoginView.as_view(), name='admin-login'),
    path('auth/admin/pending-users', PendingUsersView.as_view(), name='pending-users'),
    path('auth/admin/verify-user', VerifyUserView.as_view(), name='verify-user'),
    path('devices/approve', ApproveDeviceView.as_view(), name='approve-device'),

    # Student Device Management
    path('auth/logout', StudentLogoutView.as_view(), name='student-logout'),
    path('devices/reset', ResetStudentDeviceView.as_view(), name='reset-student-device'),
    path('devices/info/<str:email>/', StudentDeviceInfoView.as_view(), name='student-device-info'),

    # Teacher APIs - Attendance Management
    path('attendance/initiate', InitiateAttendanceView.as_view(), name='initiate-attendance'),
    path('attendance/close', CloseAttendanceView.as_view(), name='close-attendance'),
    path('attendance/regenerate-otp', RegenerateOTPView.as_view(), name='regenerate-otp'),
    path('attendance/live-status', LiveStatusView.as_view(), name='live-status'),
    path('attendance/manual-mark', ManualMarkView.as_view(), name='manual-mark'),

    # Reporting APIs (existing)
    path('attendance/student-summary', StudentSummaryView.as_view(), name='student-summary'),
    path('attendance/class-summary', ClassSummaryView.as_view(), name='class-summary'),

    # Class Management
    path('classes/', ClassListCreateView.as_view(), name='class-list-create'),
    path('classes/<int:pk>/', ClassDetailView.as_view(), name='class-detail'),
    path('classes/<int:pk>/students/', ClassStudentsView.as_view(), name='class-students'),
    path('classes/<int:pk>/invite/', InviteStudentView.as_view(), name='invite-student'),
    path('classes/<int:pk>/import/', ImportStudentsView.as_view(), name='import-students'),
    path('classes/<int:pk>/students/<str:email>/remove/', RemoveStudentView.as_view(), name='remove-student'),
    path('students/lookup/', StudentLookupView.as_view(), name='student-lookup'),

    # Schedule/Period Management
    path('schedule/', ScheduleListView.as_view(), name='schedule-list'),
    path('schedule/today/', TodayScheduleView.as_view(), name='today-schedule'),
    path('periods/', PeriodCreateView.as_view(), name='period-create'),
    path('periods/<int:pk>/', PeriodDetailView.as_view(), name='period-detail'),
    path('subjects/', SubjectListCreateView.as_view(), name='subject-list-create'),
    path('courses/', CourseListView.as_view(), name='course-list'),
    path('departments/', DepartmentListView.as_view(), name='department-list'),

    # Reports
    path('reports/dashboard/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('reports/class/<int:pk>/', ClassReportView.as_view(), name='class-report'),
    path('reports/subject/<int:pk>/', SubjectReportView.as_view(), name='subject-report'),

    # Profiles
    path('teacher/profile/', TeacherProfileView.as_view(), name='teacher-profile'),
    path('student/profile/', StudentProfileView.as_view(), name='student-profile'),
    path('student/classes/', StudentClassesView.as_view(), name='student-classes'),
    path('student/schedule/today/', StudentTodayScheduleView.as_view(), name='student-today-schedule'),
    path('student/schedule/weekly/', StudentWeeklyScheduleView.as_view(), name='student-weekly-schedule'),
    path('student/dashboard/', StudentDashboardStatsView.as_view(), name='student-dashboard-stats'),

    # Organization & Semester Management
    path('organizations/', OrganizationListView.as_view(), name='organization-list'),
    path('classes/<int:pk>/complete/', MarkSemesterCompleteView.as_view(), name='mark-semester-complete'),
    path('attendance/classes/', TeacherClassesForAttendanceView.as_view(), name='attendance-classes'),

    # Class Stats & Export
    path('classes/<int:pk>/export/', ExportClassAttendanceView.as_view(), name='export-class-attendance'),
    path('classes/<int:pk>/stats/', ClassDetailedStatsView.as_view(), name='class-detailed-stats'),

    # Announcements (Teacher)
    path('announcements/', AnnouncementListView.as_view(), name='announcement-list'),
    path('announcements/<int:pk>/', AnnouncementDetailView.as_view(), name='announcement-detail'),

    # Announcements (Student)
    path('student/announcements/', StudentAnnouncementsView.as_view(), name='student-announcements'),

    # Teacher Notes (Private)
    path('notes/', TeacherNoteListView.as_view(), name='note-list'),
    path('notes/<int:pk>/', TeacherNoteDetailView.as_view(), name='note-detail'),

    # Period Time Slots
    path('time-slots/', PeriodTimeSlotListView.as_view(), name='time-slot-list'),

    # Coordinator / Class Teacher Management
    path('classes/<int:pk>/teachers/', ClassTeacherListView.as_view(), name='class-teachers'),
    path('teachers/search/', TeacherSearchView.as_view(), name='teacher-search'),
    path('teachers/create/', CreateTeacherView.as_view(), name='create-teacher'),

    # Subject Enrollment (subject-wise student management)
    path('subjects/<int:pk>/students/', SubjectEnrollmentView.as_view(), name='subject-enrollment'),
    path('subjects/<int:pk>/students/enroll-all/', EnrollAllStudentsView.as_view(), name='enroll-all-students'),
    path('subjects/<int:pk>/export-register/', ExportSubjectAttendanceView.as_view(), name='export-subject-register'),

    # Organization Admin Management
    path('admin/check/', AdminCheckView.as_view(), name='admin-check'),
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/teachers/', AdminTeacherListView.as_view(), name='admin-teachers'),
    path('admin/teachers/import/', AdminTeacherImportView.as_view(), name='admin-teachers-import'),
    path('admin/departments/', AdminDepartmentListView.as_view(), name='admin-departments'),
    path('admin/toggle/', AdminToggleView.as_view(), name='admin-toggle'),
]
