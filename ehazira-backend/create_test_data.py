import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ehazira.settings')
django.setup()

from core.models import Department, Teacher, Class as ClassModel, Student, Course, Subject, Period

# Create Department
dept, _ = Department.objects.get_or_create(
    department_id=1,
    defaults={'department_name': 'Computer Science & Engineering'}
)

# Create Teacher
teacher, _ = Teacher.objects.get_or_create(
    teacher_email='divyanshece242@gmail.com',
    defaults={
        'name': 'Divyansh Pandey',
        'designation': 'Professor',
        'department': dept,
        'verified': True
    }
)

# Create Class
class_obj, _ = ClassModel.objects.get_or_create(
    class_id=1,
    defaults={
        'department': dept,
        'batch': 2022,
        'semester': 5,
        'section': 'A'
    }
)

# Create Students
students_data = [
    ('divyanshcom685@gmail.com', 'Divyansh Student', '22020113'),
    ('likhatai25@gmail.com', 'Student Two', '22020114'),
    ('divyanshsingh242@gmail.com', 'Student Three', '22020115'),
]

for email, name, roll in students_data:
    Student.objects.get_or_create(
        student_email=email,
        defaults={
            'name': name,
            'roll_no': roll,
            'class_field': class_obj,
            'verified': True
        }
    )

# Create Course
course, _ = Course.objects.get_or_create(
    course_id=1,
    defaults={'course_name': 'Data Structures'}
)

# Create Subject
subject, _ = Subject.objects.get_or_create(
    subject_id=1,
    defaults={
        'course': course,
        'class_field': class_obj,
        'teacher': teacher
    }
)

# Create Period
period, _ = Period.objects.get_or_create(
    period_id=1,
    defaults={
        'subject': subject,
        'day_of_week': 0,  # Monday
        'period_no': 1
    }
)

print("✅ Test data created successfully!")
print(f"Department: {dept}")
print(f"Teacher: {teacher}")
print(f"Class: {class_obj}")
print(f"Students: {Student.objects.filter(verified=True).count()}")
print(f"Course: {course}")
print(f"Subject: {subject}")
print(f"Period: {period}")