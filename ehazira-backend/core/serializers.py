from rest_framework import serializers
from .models import (
    Organization, Department, Teacher, Student, Class, Course,
    Subject, Period, Session, Attendance, Device,
    StudentClass, StudentInvitation
)


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'


class DepartmentSerializer(serializers.ModelSerializer):
    organization_name = serializers.CharField(source='organization.name', read_only=True, allow_null=True)
    organization_code = serializers.CharField(source='organization.code', read_only=True, allow_null=True)

    class Meta:
        model = Department
        fields = ['department_id', 'department_name', 'school', 'organization', 'organization_name', 'organization_code']


class TeacherSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    
    class Meta:
        model = Teacher
        fields = ['teacher_email', 'name', 'designation', 'department', 'department_name', 'verified']


class ClassSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    
    class Meta:
        model = Class
        fields = ['class_id', 'department', 'department_name', 'batch', 'semester', 'section']


class StudentSerializer(serializers.ModelSerializer):
    class_info = ClassSerializer(source='class_field', read_only=True)
    
    class Meta:
        model = Student
        fields = ['student_email', 'name', 'roll_no', 'class_field', 'class_info', 'verified']


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = '__all__'


class SubjectSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.course_name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    class_info = ClassSerializer(source='class_field', read_only=True)
    
    class Meta:
        model = Subject
        fields = ['subject_id', 'course', 'course_name', 'class_field', 'class_info', 'teacher', 'teacher_name']


class PeriodSerializer(serializers.ModelSerializer):
    subject_info = SubjectSerializer(source='subject', read_only=True)
    day_name = serializers.CharField(source='get_day_of_week_display', read_only=True)
    
    class Meta:
        model = Period
        fields = ['period_id', 'subject', 'subject_info', 'day_of_week', 'day_name', 'period_no']


class SessionSerializer(serializers.ModelSerializer):
    period_info = PeriodSerializer(source='period', read_only=True)
    
    class Meta:
        model = Session
        fields = ['session_id', 'period', 'period_info', 'date', 'is_active', 'closed_at']
        read_only_fields = ['otp', 'otp_generated_at']


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    roll_no = serializers.CharField(source='student.roll_no', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Attendance
        fields = ['session', 'student', 'student_name', 'roll_no', 'status', 'status_display', 'submitted_at', 'retry_count']


class DeviceSerializer(serializers.ModelSerializer):
    integrity_display = serializers.CharField(source='get_integrity_level_display', read_only=True)
    platform_display = serializers.CharField(source='get_platform_display', read_only=True)
    
    class Meta:
        model = Device
        fields = [
            'device_id', 'user_email', 'device_uuid', 'fingerprint_hash',
            'integrity_level', 'integrity_display', 'platform', 'platform_display',
            'active', 'registered_at', 'last_login'
        ]
        read_only_fields = ['registered_at', 'last_login']


# Request/Response Serializers for specific API actions

class InitiateAttendanceSerializer(serializers.Serializer):
    period_id = serializers.IntegerField()
    date = serializers.DateField()


class InitiateAttendanceResponseSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    otp = serializers.CharField()
    expires_in = serializers.IntegerField()
    enrolled_students = serializers.IntegerField()


class SubmitOTPSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    otp = serializers.CharField(max_length=4)


class SubmitOTPResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    status = serializers.CharField()
    message = serializers.CharField()
    retry_available = serializers.BooleanField(required=False)


class ManualMarkSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    student_email = serializers.EmailField()
    status = serializers.ChoiceField(choices=['P', 'A'])
    reason = serializers.CharField(required=False, allow_blank=True)


class LiveStatusSerializer(serializers.Serializer):
    session_id = serializers.IntegerField()
    total_students = serializers.IntegerField()
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    pending = serializers.IntegerField()
    submissions = AttendanceSerializer(many=True)


class StudentSummarySerializer(serializers.Serializer):
    student_email = serializers.EmailField()
    student_name = serializers.CharField()
    roll_no = serializers.CharField()
    total_sessions = serializers.IntegerField()
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    attendance_percentage = serializers.FloatField()


class ClassSummarySerializer(serializers.Serializer):
    class_id = serializers.IntegerField()
    class_info = serializers.CharField()
    subject_name = serializers.CharField()
    total_sessions = serializers.IntegerField()
    average_attendance = serializers.FloatField()
    students = StudentSummarySerializer(many=True)


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField()
    device_uuid = serializers.CharField(required=False, allow_blank=True)
    fingerprint_hash = serializers.CharField(required=False, allow_blank=True)
    platform = serializers.CharField(required=False, default='WEB')


class AuthResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    user_type = serializers.ChoiceField(choices=['teacher', 'student'])
    user_info = serializers.DictField()
    device_approved = serializers.BooleanField()


class AdminLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class VerifyUserSerializer(serializers.Serializer):
    user_type = serializers.ChoiceField(choices=['teacher', 'student'])
    email = serializers.EmailField()
    verified = serializers.BooleanField(required=False, default=True)


# ============== NEW SERIALIZERS FOR CLASS/STUDENT/SCHEDULE MANAGEMENT ==============

class ClassCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating classes"""
    class Meta:
        model = Class
        fields = ['department', 'batch', 'semester', 'section']


class ClassDetailSerializer(serializers.ModelSerializer):
    """Serializer for class details with student count"""
    department_name = serializers.CharField(source='department.department_name', read_only=True)
    student_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.name', read_only=True, allow_null=True)
    completed_by_name = serializers.CharField(source='completed_by.name', read_only=True, allow_null=True)

    class Meta:
        model = Class
        fields = ['class_id', 'department', 'department_name', 'batch', 'semester', 'section',
                  'created_by', 'created_by_name', 'created_at', 'student_count',
                  'is_active', 'completed_at', 'completed_by', 'completed_by_name']
        read_only_fields = ['created_by', 'created_at', 'completed_at', 'completed_by']

    def get_student_count(self, obj):
        return obj.student_enrollments.count()


class StudentEnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for student enrollment in a class"""
    student_email = serializers.EmailField(source='student.student_email', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    verified = serializers.BooleanField(source='student.verified', read_only=True)

    class Meta:
        model = StudentClass
        fields = ['id', 'student_email', 'student_name', 'roll_no', 'enrolled_at', 'verified']


class StudentInviteSerializer(serializers.Serializer):
    """Serializer for inviting a student to a class"""
    email = serializers.EmailField()
    name = serializers.CharField(required=False, allow_blank=True)
    roll_no = serializers.CharField()


class CSVImportSerializer(serializers.Serializer):
    """Serializer for CSV import of students"""
    file = serializers.FileField()


class StudentInvitationSerializer(serializers.ModelSerializer):
    """Serializer for student invitations"""
    class_name = serializers.SerializerMethodField()
    invited_by_name = serializers.CharField(source='invited_by.name', read_only=True)

    class Meta:
        model = StudentInvitation
        fields = ['invitation_id', 'class_obj', 'class_name', 'email', 'name', 'roll_no',
                  'invited_by', 'invited_by_name', 'invited_at', 'accepted', 'accepted_at']
        read_only_fields = ['invited_by', 'invited_at']

    def get_class_name(self, obj):
        return str(obj.class_obj)


class TeacherProfileSerializer(serializers.ModelSerializer):
    """Serializer for teacher profile updates"""
    department_name = serializers.CharField(source='department.department_name', read_only=True)

    class Meta:
        model = Teacher
        fields = ['teacher_email', 'name', 'designation', 'department', 'department_name', 'verified']
        read_only_fields = ['teacher_email', 'verified']


class StudentProfileSerializer(serializers.ModelSerializer):
    """Serializer for student profile - aligned with frontend expectations"""
    email = serializers.EmailField(source='student_email', read_only=True)
    class_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()
    batch = serializers.SerializerMethodField()
    semester = serializers.SerializerMethodField()
    section = serializers.SerializerMethodField()
    overall_attendance = serializers.SerializerMethodField()
    enrolled_classes = serializers.SerializerMethodField()
    organization = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['email', 'name', 'roll_no', 'class_name', 'department_name',
                  'batch', 'semester', 'section', 'overall_attendance',
                  'verified', 'enrolled_classes', 'organization']
        read_only_fields = ['email', 'verified']

    def get_class_name(self, obj):
        return str(obj.class_field) if obj.class_field else None

    def get_department_name(self, obj):
        if obj.class_field and obj.class_field.department:
            return obj.class_field.department.department_name
        return None

    def get_batch(self, obj):
        return obj.class_field.batch if obj.class_field else None

    def get_semester(self, obj):
        return obj.class_field.semester if obj.class_field else None

    def get_section(self, obj):
        return obj.class_field.section if obj.class_field else None

    def get_overall_attendance(self, obj):
        """Calculate overall attendance percentage across all enrolled classes"""
        # Gather all class IDs: primary class + enrolled classes
        enrolled_class_ids = list(
            StudentClass.objects.filter(student=obj).values_list('class_obj_id', flat=True)
        )
        class_ids = enrolled_class_ids + ([obj.class_field_id] if obj.class_field_id else [])
        if not class_ids:
            return 0.0

        # Get attendance records for this student across all classes
        student_attendance = Attendance.objects.filter(
            student=obj,
            session__period__subject__class_field__class_id__in=class_ids,
        )
        present_count = student_attendance.filter(status='P').count()
        absent_count = student_attendance.filter(status='A').count()
        total_attended = present_count + absent_count
        if total_attended == 0:
            return 0.0
        return round((present_count / total_attended) * 100, 2)

    def get_enrolled_classes(self, obj):
        enrollments = StudentClass.objects.filter(student=obj).select_related(
            'class_obj__department'
        )
        return [{
            'class_id': e.class_obj.class_id,
            'class_name': str(e.class_obj),
            'roll_no': e.roll_no,
            'enrolled_at': e.enrolled_at
        } for e in enrollments]

    def get_organization(self, obj):
        """Get organization info through class -> department -> organization"""
        if obj.class_field and obj.class_field.department and obj.class_field.department.organization:
            org = obj.class_field.department.organization
            return {
                'organization_id': org.organization_id,
                'name': org.name,
                'code': org.code
            }
        return None


class ScheduleItemSerializer(serializers.Serializer):
    """Serializer for schedule items"""
    period_id = serializers.IntegerField()
    subject_id = serializers.IntegerField()
    subject_name = serializers.CharField()
    course_name = serializers.CharField()
    class_name = serializers.CharField()
    class_id = serializers.IntegerField()
    day_of_week = serializers.IntegerField()
    day_name = serializers.CharField()
    period_no = serializers.IntegerField()


class PeriodCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating periods"""
    class Meta:
        model = Period
        fields = ['subject', 'day_of_week', 'period_no']


class SubjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating subjects"""
    class Meta:
        model = Subject
        fields = ['course', 'class_field', 'teacher']


class CourseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating courses"""
    class Meta:
        model = Course
        fields = ['course_name']


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for teacher dashboard stats"""
    total_classes = serializers.IntegerField()
    total_students = serializers.IntegerField()
    total_subjects = serializers.IntegerField()
    todays_sessions = serializers.IntegerField()
    average_attendance = serializers.FloatField()


class ClassReportSerializer(serializers.Serializer):
    """Serializer for class attendance report"""
    class_id = serializers.IntegerField()
    class_name = serializers.CharField()
    subject_id = serializers.IntegerField()
    subject_name = serializers.CharField()
    total_sessions = serializers.IntegerField()
    average_attendance = serializers.FloatField()
    students = serializers.ListField()


class StudentAttendanceReportSerializer(serializers.Serializer):
    """Serializer for individual student attendance report"""
    student_email = serializers.EmailField()
    student_name = serializers.CharField()
    roll_no = serializers.CharField()
    total_sessions = serializers.IntegerField()
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    percentage = serializers.FloatField()


class StudentClassListSerializer(serializers.Serializer):
    """Serializer for student's class list with attendance"""
    class_id = serializers.IntegerField()
    class_name = serializers.CharField()
    department_name = serializers.CharField()
    subjects = serializers.ListField()
    overall_attendance = serializers.FloatField()
    total_present = serializers.IntegerField()
    total_sessions = serializers.IntegerField()