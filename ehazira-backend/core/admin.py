# admin.py
from django.contrib import admin
from .models import (
    Department, Teacher, Student, Class, Course,
    Subject, Period, Session, Attendance, Device,
    Organization, OrganizationAdmin as OrgAdmin, StudentClass,
    ClassTeacher, StudentInvitation, Announcement, TeacherNote,
    PeriodTimeSlot, SubjectEnrollment
)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['department_id', 'department_name']
    search_fields = ['department_name']


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ['teacher_email', 'name', 'designation', 'department', 'verified']
    list_filter = ['verified', 'department']
    search_fields = ['name', 'teacher_email']
    actions = ['mark_verified', 'mark_unverified']
    
    def mark_verified(self, request, queryset):
        queryset.update(verified=True)
    mark_verified.short_description = "Mark selected teachers as verified"
    
    def mark_unverified(self, request, queryset):
        queryset.update(verified=False)
    mark_unverified.short_description = "Mark selected teachers as unverified"


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['student_email', 'name', 'roll_no', 'class_field', 'verified']
    list_filter = ['verified', 'class_field']
    search_fields = ['name', 'student_email', 'roll_no']
    actions = ['mark_verified', 'mark_unverified']
    
    def mark_verified(self, request, queryset):
        queryset.update(verified=True)
    mark_verified.short_description = "Mark selected students as verified"
    
    def mark_unverified(self, request, queryset):
        queryset.update(verified=False)
    mark_unverified.short_description = "Mark selected students as unverified"


@admin.register(Class)
class ClassAdmin(admin.ModelAdmin):
    list_display = ['class_id', 'department', 'batch', 'semester', 'section']
    list_filter = ['department', 'semester']
    search_fields = ['batch', 'section']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['course_id', 'course_name']
    search_fields = ['course_name']


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['subject_id', 'course', 'class_field', 'teacher']
    list_filter = ['course', 'class_field']
    search_fields = ['course__course_name', 'teacher__name']


@admin.register(Period)
class PeriodAdmin(admin.ModelAdmin):
    list_display = ['period_id', 'subject', 'day_of_week', 'period_no']
    list_filter = ['day_of_week']
    search_fields = ['subject__course__course_name']


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'period', 'date', 'is_active', 'otp', 'closed_at']
    list_filter = ['is_active', 'date']
    search_fields = ['period__subject__course__course_name']
    readonly_fields = ['otp', 'otp_generated_at']


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['session', 'student', 'status', 'submitted_at', 'retry_count']
    list_filter = ['status', 'session__date']
    search_fields = ['student__name', 'student__roll_no']
    readonly_fields = ['submitted_at']


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ['device_id', 'user_email', 'platform', 'integrity_level', 'active', 'registered_at']
    list_filter = ['platform', 'integrity_level', 'active']
    search_fields = ['user_email', 'device_uuid']
    readonly_fields = ['registered_at', 'last_login']
    actions = ['activate_devices', 'deactivate_devices']
    
    def activate_devices(self, request, queryset):
        queryset.update(active=True)
    activate_devices.short_description = "Activate selected devices"
    
    def deactivate_devices(self, request, queryset):
        queryset.update(active=False)
    deactivate_devices.short_description = "Deactivate selected devices"


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ['organization_id', 'name', 'code', 'address', 'created_at']
    search_fields = ['name', 'code']
    readonly_fields = ['created_at']


@admin.register(OrgAdmin)
class OrgAdminAdmin(admin.ModelAdmin):
    list_display = ['id', 'organization', 'teacher', 'added_at', 'added_by']
    list_filter = ['organization']
    search_fields = ['teacher__name', 'teacher__teacher_email']
    readonly_fields = ['added_at']


@admin.register(StudentClass)
class StudentClassAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'class_obj', 'roll_no', 'enrolled_at']
    list_filter = ['class_obj']
    search_fields = ['student__name', 'student__student_email', 'roll_no']
    readonly_fields = ['enrolled_at']


@admin.register(ClassTeacher)
class ClassTeacherAdmin(admin.ModelAdmin):
    list_display = ['id', 'class_obj', 'teacher', 'added_by', 'added_at']
    list_filter = ['class_obj']
    search_fields = ['teacher__name', 'teacher__teacher_email']
    readonly_fields = ['added_at']


@admin.register(StudentInvitation)
class StudentInvitationAdmin(admin.ModelAdmin):
    list_display = ['invitation_id', 'class_obj', 'email', 'name', 'roll_no', 'accepted', 'invited_at']
    list_filter = ['accepted', 'class_obj']
    search_fields = ['email', 'name', 'roll_no']
    readonly_fields = ['invited_at', 'accepted_at']


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['announcement_id', 'title', 'class_obj', 'subject', 'teacher', 'created_at']
    list_filter = ['class_obj', 'teacher']
    search_fields = ['title', 'content']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(TeacherNote)
class TeacherNoteAdmin(admin.ModelAdmin):
    list_display = ['note_id', 'class_obj', 'subject', 'teacher', 'created_at']
    list_filter = ['class_obj', 'teacher']
    search_fields = ['content']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PeriodTimeSlot)
class PeriodTimeSlotAdmin(admin.ModelAdmin):
    list_display = ['slot_id', 'teacher', 'period_no', 'start_time', 'end_time']
    list_filter = ['teacher', 'period_no']
    search_fields = ['teacher__name']


@admin.register(SubjectEnrollment)
class SubjectEnrollmentAdmin(admin.ModelAdmin):
    list_display = ['enrollment_id', 'subject', 'student', 'enrolled_at', 'enrolled_by']
    list_filter = ['subject']
    search_fields = ['student__name', 'student__student_email']
    readonly_fields = ['enrolled_at']