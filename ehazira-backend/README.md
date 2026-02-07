# eHazira Backend

A real-time attendance management system built with Django, Django REST Framework, and Django Channels (WebSockets).

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Authentication](#authentication)
- [Deployment](#deployment)

## Overview

eHazira is a mobile-first attendance application designed for educational institutions. It provides:

- Real-time attendance tracking using OTP-based verification
- GPS proximity validation for offline classes
- Multi-organization support for deploying across multiple colleges
- Role-based access control (Teachers, Students, Organization Admins)
- Device binding for students to prevent proxy attendance

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Django 5.x |
| API | Django REST Framework |
| WebSockets | Django Channels + Daphne |
| Database | PostgreSQL (production) / SQLite (development) |
| Authentication | Firebase Auth + JWT |
| Cache/Channel Layer | Redis (production) / In-Memory (development) |

## Project Structure

```
ehazira-backend/
├── ehazira/                 # Project configuration
│   ├── settings.py          # Django settings
│   ├── urls.py              # Root URL configuration
│   ├── asgi.py              # ASGI application (WebSocket support)
│   └── wsgi.py              # WSGI application
├── core/                    # Main application
│   ├── models.py            # Database models
│   ├── views.py             # API views
│   ├── serializers.py       # DRF serializers
│   ├── consumers.py         # WebSocket consumers
│   ├── middleware.py        # JWT authentication middleware
│   ├── authentication.py    # Permission classes
│   ├── admin.py             # Django admin configuration
│   ├── urls.py              # API URL routes
│   └── routing.py           # WebSocket URL routes
├── requirements.txt         # Python dependencies
├── Procfile                 # Process configuration for deployment
└── manage.py                # Django management script
```

## Installation

### Prerequisites

- Python 3.11+
- PostgreSQL (for production)
- Redis (for production WebSocket support)
- Firebase project with Authentication enabled

### Local Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd ehazira-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Set up environment variables (create .env file)
cp .env.example .env
# Edit .env with your configuration

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | Django secret key | Yes |
| `DEBUG` | Debug mode (True/False) | No (default: True) |
| `DATABASE_URL` | PostgreSQL connection string | Production only |
| `REDIS_URL` | Redis connection string | Production only |
| `FIREBASE_KEY_JSON` | Firebase service account JSON | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `JWT_SECRET` | Secret for JWT signing | No (uses SECRET_KEY) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | Production only |
| `CSRF_TRUSTED_ORIGINS` | Comma-separated trusted origins | Production only |
| `OTP_VALIDITY_SECONDS` | OTP validity duration | No (default: 15) |

## Database Schema

### Entity Relationship

```
Organization (1) ──── (N) Department
     │
     └── (N) OrganizationAdmin

Department (1) ──── (N) Teacher
     │
     └── (N) Class

Class (1) ──── (N) Student
  │      └── (N) Subject ──── (N) Period ──── (N) Session ──── (N) Attendance
  │
  └── (N) ClassTeacher

Student (1) ──── (N) Device
```

### Models Reference

| Model | Description | Primary Key |
|-------|-------------|-------------|
| Organization | Institution (college/university) | organization_id |
| OrganizationAdmin | Admin users for an organization | id |
| Department | Academic department | department_id |
| Teacher | Faculty member | teacher_email |
| Student | Student user | student_email |
| Class | Batch/semester/section combination | class_id |
| ClassTeacher | Teacher assignments to classes | id |
| Course | Course/subject name | course_id |
| Subject | Course taught to a class by a teacher | subject_id |
| Period | Scheduled class period | period_id |
| Session | Attendance session instance | session_id |
| Attendance | Student attendance record | (session, student) |
| Device | Registered student device | device_id |
| Announcement | Teacher announcements | announcement_id |
| TeacherNote | Private teacher notes | note_id |
| SubjectEnrollment | Subject-wise student enrollment | enrollment_id |

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/google` | Google OAuth login | No |
| POST | `/auth/logout` | Student logout (deactivates device) | Yes |
| POST | `/auth/admin/login` | Admin login | No |
| GET | `/auth/admin/pending-users` | List pending verifications | Yes (Admin) |
| POST | `/auth/admin/verify-user` | Verify teacher/student | Yes (Admin) |

### Device Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/devices/approve` | Approve student device | Yes (Teacher) |
| POST | `/devices/reset` | Reset student device | Yes (Teacher) |
| GET | `/devices/info/<email>/` | Get device info | Yes (Teacher) |

### Attendance Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/attendance/initiate` | Start attendance session | Yes (Teacher) |
| POST | `/attendance/close` | Close attendance session | Yes (Teacher) |
| POST | `/attendance/regenerate-otp` | Generate new OTP | Yes (Teacher) |
| GET | `/attendance/live-status` | Get live session status | Yes (Teacher) |
| POST | `/attendance/manual-mark` | Manually mark attendance | Yes (Teacher) |
| GET | `/attendance/classes/` | Get classes for attendance | Yes (Teacher) |

### Class Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/classes/` | List teacher's classes | Yes |
| POST | `/classes/` | Create new class | Yes (Teacher) |
| GET | `/classes/<id>/` | Get class details | Yes |
| DELETE | `/classes/<id>/` | Delete class | Yes (Coordinator) |
| GET | `/classes/<id>/students/` | List class students | Yes |
| POST | `/classes/<id>/invite/` | Invite student | Yes |
| POST | `/classes/<id>/import/` | Import students (CSV) | Yes |
| DELETE | `/classes/<id>/students/<email>/remove/` | Remove student | Yes |
| POST | `/classes/<id>/complete/` | Mark semester complete | Yes (Coordinator) |
| GET | `/classes/<id>/stats/` | Get class statistics | Yes |
| GET | `/classes/<id>/export/` | Export attendance CSV | Yes |
| GET | `/classes/<id>/teachers/` | List class teachers | Yes |

### Subject Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/subjects/` | List subjects | Yes |
| POST | `/subjects/` | Create subject | Yes (Teacher) |
| GET | `/subjects/<id>/students/` | List enrolled students | Yes |
| POST | `/subjects/<id>/students/` | Enroll student | Yes |
| DELETE | `/subjects/<id>/students/` | Remove student | Yes |
| POST | `/subjects/<id>/students/enroll-all/` | Enroll all class students | Yes |
| GET | `/subjects/<id>/export-register/` | Export attendance register | Yes |

### Schedule Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/schedule/` | Get full schedule | Yes |
| GET | `/schedule/today/` | Get today's schedule | Yes |
| POST | `/periods/` | Create period | Yes |
| DELETE | `/periods/<id>/` | Delete period | Yes |
| GET | `/time-slots/` | Get time slot configuration | Yes |
| POST | `/time-slots/` | Save time slots | Yes |

### Reports

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/reports/dashboard/` | Teacher dashboard stats | Yes (Teacher) |
| GET | `/reports/class/<id>/` | Class attendance report | Yes |
| GET | `/reports/subject/<id>/` | Subject attendance report | Yes |

### Student Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/student/profile/` | Get student profile | Yes (Student) |
| GET | `/student/classes/` | Get enrolled classes | Yes (Student) |
| GET | `/student/schedule/today/` | Get today's schedule | Yes (Student) |
| GET | `/student/schedule/weekly/` | Get weekly schedule | Yes (Student) |
| GET | `/student/dashboard/` | Get dashboard stats | Yes (Student) |
| GET | `/student/announcements/` | Get announcements | Yes (Student) |

### Organization Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/check/` | Check admin status | Yes |
| GET | `/admin/dashboard/` | Admin dashboard | Yes (OrgAdmin) |
| GET | `/admin/teachers/` | List organization teachers | Yes (OrgAdmin) |
| POST | `/admin/teachers/import/` | Import teachers (CSV) | Yes (OrgAdmin) |
| GET | `/admin/departments/` | List departments | Yes (OrgAdmin) |
| POST | `/admin/toggle/` | Toggle admin status | Yes (OrgAdmin) |

### Other Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/departments/` | List all departments | No |
| GET | `/courses/` | List all courses | Yes |
| GET | `/organizations/` | List organizations | Yes |
| GET | `/teachers/search/` | Search teachers | Yes |
| POST | `/teachers/create/` | Create teacher | Yes |
| GET | `/students/lookup/` | Search students | Yes |

## WebSocket Events

### Connection

```
ws://<host>/ws/?token=<JWT_TOKEN>
```

### Client to Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `submit_otp` | Submit attendance OTP | `{ otp, session_id, latitude?, longitude? }` |

### Server to Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `attendance_started` | New session started | `{ session_id, subject_name, otp, teacher_name }` |
| `otp_regenerated` | New OTP generated | `{ otp, session_id }` |
| `attendance_closed` | Session closed | `{ session_id }` |
| `otp_result` | OTP submission result | `{ success, status, message }` |
| `attendance_update` | Status update (teachers) | `{ student_email, status }` |

## Authentication

### JWT Token Structure

```json
{
  "email": "user@example.com",
  "user_type": "teacher|student",
  "device_id": 123,
  "exp": 1234567890,
  "iat": 1234567890,
  "type": "access|refresh"
}
```

### Token Expiry

- Access Token: 1 day
- Refresh Token: 7 days

### Student Device Security

- Students can only login from mobile apps (web blocked)
- One active device per student
- Device UUID and fingerprint are stored
- Teachers can reset student devices

## Deployment

### Railway Deployment

1. Create a new project on Railway
2. Add PostgreSQL and Redis services
3. Connect GitHub repository
4. Set environment variables
5. Deploy

Required environment variables for Railway:
```
DATABASE_URL=<auto-set by Railway>
REDIS_URL=<auto-set by Railway>
FIREBASE_KEY_JSON=<your-firebase-json>
GOOGLE_CLIENT_ID=<your-client-id>
SECRET_KEY=<generate-secure-key>
DEBUG=False
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
CSRF_TRUSTED_ORIGINS=https://your-backend-domain.railway.app
```

### Procfile

```
release: python manage.py migrate --noinput
web: daphne -b 0.0.0.0 -p $PORT ehazira.asgi:application
```

## License

Proprietary - All rights reserved.
