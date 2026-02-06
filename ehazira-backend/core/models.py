from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.conf import settings


class Organization(models.Model):
    """Top-level organization (e.g., University, College)"""
    organization_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=20, unique=True)  # e.g., "GGU", "IIT-D"
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'organization'

    def __str__(self):
        return f"{self.name} ({self.code})"


class OrganizationAdmin(models.Model):
    """Admins for an organization - can manage teachers, departments, etc."""
    id = models.AutoField(primary_key=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='admins')
    teacher = models.ForeignKey('Teacher', on_delete=models.CASCADE, related_name='admin_organizations')
    added_at = models.DateTimeField(auto_now_add=True)
    added_by = models.ForeignKey('Teacher', on_delete=models.SET_NULL, null=True, related_name='admin_appointments_made')

    class Meta:
        db_table = 'organization_admin'
        unique_together = [['organization', 'teacher']]

    def __str__(self):
        return f"{self.teacher.name} - Admin of {self.organization.name}"


class Department(models.Model):
    department_id = models.AutoField(primary_key=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='departments', null=True, blank=True)
    department_name = models.CharField(max_length=100)
    school = models.CharField(max_length=200, blank=True)  # For grouping (e.g., School of Engineering)

    class Meta:
        db_table = 'department'
        # Department name must be unique within an organization
        unique_together = [['organization', 'department_name']]

    def __str__(self):
        if self.organization:
            return f"{self.department_name} ({self.organization.code})"
        return self.department_name


class Teacher(models.Model):
    teacher_email = models.EmailField(primary_key=True)
    name = models.CharField(max_length=100)
    designation = models.CharField(max_length=50)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='teachers', null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    verified = models.BooleanField(default=False)

    class Meta:
        db_table = 'teacher'

    def __str__(self):
        return f"{self.name} ({self.teacher_email})"


class Class(models.Model):
    class_id = models.AutoField(primary_key=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    batch = models.IntegerField(validators=[MinValueValidator(2000)])
    semester = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(8)])
    section = models.CharField(max_length=10)
    created_by = models.ForeignKey('Teacher', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_classes')
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    # Coordinator - the teacher who manages this class (can add teachers, manage subjects)
    coordinator = models.ForeignKey('Teacher', on_delete=models.SET_NULL, null=True, blank=True, related_name='coordinated_classes')
    # Semester management fields
    is_active = models.BooleanField(default=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey('Teacher', on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_classes')

    class Meta:
        db_table = 'class'
        unique_together = [['department', 'batch', 'semester', 'section']]
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['coordinator']),
        ]

    def __str__(self):
        status = '' if self.is_active else ' [Completed]'
        return f"{self.department.department_name} - Batch {self.batch} - Sem {self.semester} - {self.section}{status}"


class ClassTeacher(models.Model):
    """Teachers assigned to a class (can add their own subjects)"""
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='assigned_teachers')
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='assigned_classes')
    added_by = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, related_name='teacher_assignments_made')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'class_teacher'
        unique_together = [['class_obj', 'teacher']]

    def __str__(self):
        return f"{self.teacher.name} - {self.class_obj}"


class Student(models.Model):
    student_email = models.EmailField(primary_key=True)
    name = models.CharField(max_length=100)
    roll_no = models.CharField(max_length=20)
    class_field = models.ForeignKey(Class, on_delete=models.CASCADE, db_column='class_id')
    verified = models.BooleanField(default=False)
    classes = models.ManyToManyField(Class, through='StudentClass', related_name='enrolled_students')

    class Meta:
        db_table = 'student'
        unique_together = [['roll_no', 'class_field']]

    def __str__(self):
        return f"{self.name} ({self.roll_no})"


class Course(models.Model):
    course_id = models.AutoField(primary_key=True)
    course_name = models.CharField(max_length=100, unique=True)
    
    class Meta:
        db_table = 'course'
    
    def __str__(self):
        return self.course_name


class Subject(models.Model):
    subject_id = models.AutoField(primary_key=True)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    class_field = models.ForeignKey(Class, on_delete=models.CASCADE, db_column='class_id')
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, db_column='teacher_email')
    
    class Meta:
        db_table = 'subject'
        unique_together = [['course', 'class_field']]
    
    def __str__(self):
        return f"{self.course.course_name} - {self.class_field}"


class Period(models.Model):
    DAYS_OF_WEEK = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]

    period_id = models.AutoField(primary_key=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    day_of_week = models.IntegerField(choices=DAYS_OF_WEEK)
    period_no = models.IntegerField(validators=[MinValueValidator(1)])
    start_time = models.TimeField(null=True, blank=True)  # e.g., 09:00
    end_time = models.TimeField(null=True, blank=True)    # e.g., 10:00

    class Meta:
        db_table = 'period'
        unique_together = [['subject', 'day_of_week', 'period_no']]

    def __str__(self):
        time_str = ""
        if self.start_time and self.end_time:
            time_str = f" ({self.start_time.strftime('%I:%M %p')} - {self.end_time.strftime('%I:%M %p')})"
        return f"{self.subject.course.course_name} - {self.get_day_of_week_display()} - Period {self.period_no}{time_str}"


class Session(models.Model):
    CLASS_MODE_CHOICES = [
        ('offline', 'Offline'),
        ('online', 'Online'),
    ]

    session_id = models.AutoField(primary_key=True)
    period = models.ForeignKey(Period, on_delete=models.CASCADE)
    date = models.DateField()
    otp = models.CharField(max_length=4, blank=True, null=True)
    otp_generated_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=False)
    closed_at = models.DateTimeField(blank=True, null=True)
    # GPS proximity fields
    class_mode = models.CharField(max_length=10, choices=CLASS_MODE_CHOICES, default='offline')
    teacher_latitude = models.FloatField(null=True, blank=True)
    teacher_longitude = models.FloatField(null=True, blank=True)
    proximity_radius = models.IntegerField(default=30)  # meters

    class Meta:
        db_table = 'session'
        # Removed unique_together to allow multiple sessions per day for same period
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['period', 'date']),  # For efficient lookups
        ]
    
    def __str__(self):
        return f"Session {self.session_id} - {self.period} - {self.date}"
    
    def is_otp_valid(self):
        """Check if OTP is still valid"""
        if not self.otp_generated_at:
            return False
        elapsed = (timezone.now() - self.otp_generated_at).total_seconds()
        return elapsed <= getattr(settings, 'OTP_VALIDITY_SECONDS', 15)


class Attendance(models.Model):
    STATUS_CHOICES = [
        ('P', 'Present'),
        ('A', 'Absent'),
        ('R', 'Retry'),
        ('X', 'Proxy'),
    ]
    
    session = models.ForeignKey(Session, on_delete=models.CASCADE, db_column='session_id')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, db_column='student_email')
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default='A')
    submitted_at = models.DateTimeField(blank=True, null=True)
    retry_count = models.IntegerField(default=0)
    
    class Meta:
        db_table = 'attendance'
        unique_together = [['session', 'student']]
        indexes = [
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.student.name} - {self.session.session_id} - {self.status}"


class Device(models.Model):
    INTEGRITY_LEVELS = [
        ('STRONG', 'Strong'),
        ('BASIC', 'Basic'),
        ('FAIL', 'Failed'),
    ]
    
    PLATFORMS = [
        ('ANDROID', 'Android'),
        ('IOS', 'iOS'),
    ]
    
    device_id = models.AutoField(primary_key=True)
    user_email = models.EmailField()
    device_uuid = models.UUIDField()
    fingerprint_hash = models.CharField(max_length=64)
    integrity_level = models.CharField(max_length=10, choices=INTEGRITY_LEVELS)
    platform = models.CharField(max_length=10, choices=PLATFORMS)
    active = models.BooleanField(default=True)
    registered_at = models.DateTimeField(auto_now_add=True)
    last_login = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'device'
        unique_together = [['user_email', 'device_uuid', 'fingerprint_hash']]
        indexes = [
            models.Index(fields=['user_email', 'active']),
        ]
    
    def __str__(self):
        return f"{self.user_email} - {self.platform} - {self.device_uuid}"


class StudentClass(models.Model):
    """Through model for many-to-many relationship between Student and Class"""
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='student_enrollments')
    roll_no = models.CharField(max_length=20)
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'student_class'
        unique_together = [['student', 'class_obj']]

    def __str__(self):
        return f"{self.student.name} - {self.class_obj} - {self.roll_no}"


class StudentInvitation(models.Model):
    """Invitation for students to join a class"""
    invitation_id = models.AutoField(primary_key=True)
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    name = models.CharField(max_length=100, blank=True)
    roll_no = models.CharField(max_length=20)
    invited_by = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='sent_invitations')
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted = models.BooleanField(default=False)
    accepted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'student_invitation'
        unique_together = [['class_obj', 'email']]

    def __str__(self):
        return f"Invitation for {self.email} to {self.class_obj}"


class Announcement(models.Model):
    """Public announcements from teacher to students for a class"""
    announcement_id = models.AutoField(primary_key=True)
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='announcements')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, null=True, blank=True, related_name='announcements')
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='announcements')
    title = models.CharField(max_length=200)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'announcement'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['class_obj', '-created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.class_obj}"


class AnnouncementRead(models.Model):
    """Track which students have read which announcements"""
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='reads')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='read_announcements')
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'announcement_read'
        unique_together = [['announcement', 'student']]

    def __str__(self):
        return f"{self.student.name} read {self.announcement.title}"


class TeacherNote(models.Model):
    """Private notes for teacher (not visible to students)"""
    note_id = models.AutoField(primary_key=True)
    class_obj = models.ForeignKey(Class, on_delete=models.CASCADE, related_name='teacher_notes')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, null=True, blank=True, related_name='teacher_notes')
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='notes')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'teacher_note'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['teacher', '-created_at']),
        ]

    def __str__(self):
        preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"Note: {preview}"


class PeriodTimeSlot(models.Model):
    """Default time slots for periods (can be customized per teacher)"""
    slot_id = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='time_slots')
    period_no = models.IntegerField(validators=[MinValueValidator(1)])
    start_time = models.TimeField()
    end_time = models.TimeField()

    class Meta:
        db_table = 'period_time_slot'
        unique_together = [['teacher', 'period_no']]
        ordering = ['period_no']

    def __str__(self):
        return f"Period {self.period_no}: {self.start_time.strftime('%I:%M %p')} - {self.end_time.strftime('%I:%M %p')}"


class SubjectEnrollment(models.Model):
    """Subject-wise student enrollment - allows students to be enrolled in specific subjects"""
    enrollment_id = models.AutoField(primary_key=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='enrollments')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='subject_enrollments')
    enrolled_at = models.DateTimeField(auto_now_add=True)
    enrolled_by = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, related_name='subject_enrollments_made')

    class Meta:
        db_table = 'subject_enrollment'
        unique_together = [['subject', 'student']]
        indexes = [
            models.Index(fields=['subject']),
            models.Index(fields=['student']),
        ]

    def __str__(self):
        return f"{self.student.name} enrolled in {self.subject.course.course_name}"