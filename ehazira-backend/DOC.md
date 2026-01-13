# Attendance System API Documentation

## Base URL
https://your-domain.com/api

## Authentication

All API requests (except `/auth/google`) require JWT token in Authorization header:
```
Authorization: Bearer <access_token>
```

### First-time Login & Verification Flow (Auto-create + Admin Verification)

The backend supports **auto-creating** Teacher/Student records on the first login, but new accounts are created with `verified=false` and must be **verified by an admin** before the user can login successfully.

- **Step 1 (User)**: Call `POST /auth/google`.
  - If the email is already present and `verified=true`: login succeeds.
  - If the email is not present: you can pass additional onboarding fields to auto-create the user, and the API returns `201 Created` (pending verification).
- **Step 2 (Admin)**: Admin logs in using `POST /auth/admin/login` and receives an admin JWT.
- **Step 3 (Admin)**: Admin lists pending users using `GET /auth/admin/pending-users`.
- **Step 4 (Admin)**: Admin verifies a user using `POST /auth/admin/verify-user`.
- **Step 5 (User)**: User calls `POST /auth/google` again; login succeeds.

---

## API Endpoints

### 1. Authentication

#### POST /auth/google
Authenticate user via Google OAuth and bind device.

**Request:**
```json
{
  "id_token": "google_id_token_here",
  "device_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "fingerprint_hash": "sha256_hash_of_device_fingerprint",
  "integrity_token": "google_play_integrity_token",
  "platform": "ANDROID"
}
```

**Auto-create Teacher (first-time email not found):**
```json
{
  "id_token": "google_id_token_here",
  "device_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "fingerprint_hash": "sha256_hash_of_device_fingerprint",
  "platform": "ANDROID",
  "user_type": "teacher",
  "name": "Teacher Name",
  "designation": "Assistant Professor",
  "department_id": 1
}
```

**Auto-create Student (first-time email not found):**
```json
{
  "id_token": "google_id_token_here",
  "device_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "fingerprint_hash": "sha256_hash_of_device_fingerprint",
  "platform": "ANDROID",
  "user_type": "student",
  "name": "Student Name",
  "roll_no": "CS2021001",
  "class_id": 5
}
```

**Response (200 OK):**
```json
{
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token",
  "user_type": "student",
  "user_info": {
    "email": "student@college.edu",
    "name": "John Doe",
    "roll_no": "CS2021001",
    "class_id": 5
  },
  "device_approved": true
}
```

**Error Responses:**
- `403 Forbidden`: User not verified
- `404 Not Found`: User not in system (provide onboarding fields to auto-create)
- `401 Unauthorized`: Invalid Google token

**Response (201 Created):** User auto-created but pending verification.
```json
{
  "message": "Student account created. Awaiting admin verification.",
  "user_type": "student",
  "email": "student@college.edu",
  "verified": false
}
```

---

#### POST /auth/admin/login
Admin login (Django admin user). Returns JWT for admin-only endpoints.

**Request:**
```json
{
  "username": "admin",
  "password": "admin_password"
}
```

**Response (200 OK):**
```json
{
  "access_token": "jwt_access_token",
  "refresh_token": "jwt_refresh_token",
  "user_type": "admin",
  "user_info": {
    "username": "admin",
    "email": "admin@college.edu"
  }
}
```

---

#### GET /auth/admin/pending-users
List pending (unverified) users. Requires admin JWT.

**Query Parameters (optional):**
- `user_type`: `teacher` or `student`

**Response (200 OK):**
```json
{
  "pending": [
    {
      "user_type": "student",
      "email": "student@college.edu",
      "name": "Student Name",
      "roll_no": "CS2021001",
      "class_id": 5
    }
  ]
}
```

---

#### POST /auth/admin/verify-user
Verify/unverify a user. Requires admin JWT.

**Request:**
```json
{
  "user_type": "student",
  "email": "student@college.edu",
  "verified": true
}
```

**Response (200 OK):**
```json
{
  "message": "Student updated"
}
```

---

### 2. Teacher APIs

#### POST /attendance/initiate
Initiate attendance session for a period.

**Request:**
```json
{
  "period_id": 123,
  "date": "2025-12-20"
}
```

**Response (201 Created):**
```json
{
  "session_id": 456,
  "otp": "5832",
  "expires_in": 15,
  "enrolled_students": 45
}
```

**Authorization:** Teacher only

---

#### POST /attendance/close
Close an active attendance session.

**Request:**
```json
{
  "session_id": 456
}
```

**Response (200 OK):**
```json
{
  "message": "Session closed successfully"
}
```

**Authorization:** Teacher who owns the session

---

#### GET /attendance/live-status
Get real-time attendance status for a session.

**Query Parameters:**
- `session_id` (required): Session ID

**Response (200 OK):**
```json
{
  "session_id": 456,
  "total_students": 45,
  "present": 38,
  "absent": 5,
  "pending": 2,
  "submissions": [
    {
      "student": "student1@college.edu",
      "student_name": "John Doe",
      "roll_no": "CS2021001",
      "status": "P",
      "status_display": "Present",
      "submitted_at": "2025-12-20T10:15:30Z",
      "retry_count": 0
    }
  ]
}
```

---

#### POST /attendance/manual-mark
Manually mark attendance for a student.

**Request:**
```json
{
  "session_id": 456,
  "student_email": "student@college.edu",
  "status": "P",
  "reason": "Technical issue with app"
}
```

**Response (200 OK):**
```json
{
  "message": "Attendance marked successfully"
}
```

**Authorization:** Teacher who owns the session

---

### 3. Reporting APIs

#### GET /attendance/student-summary
Get attendance summary for a student in a subject.

**Query Parameters:**
- `student_email` (required): Student email
- `subject_id` (required): Subject ID

**Response (200 OK):**
```json
{
  "student_email": "student@college.edu",
  "student_name": "John Doe",
  "roll_no": "CS2021001",
  "total_sessions": 30,
  "present": 27,
  "absent": 3,
  "attendance_percentage": 90.00
}
```

---

#### GET /attendance/class-summary
Get attendance summary for entire class in a subject.

**Query Parameters:**
- `subject_id` (required): Subject ID

**Response (200 OK):**
```json
{
  "class_id": 5,
  "class_info": "Computer Science - Batch 2021 - Sem 5 - A",
  "subject_name": "Data Structures",
  "total_sessions": 30,
  "average_attendance": 87.5,
  "students": [
    {
      "student_email": "student1@college.edu",
      "student_name": "John Doe",
      "roll_no": "CS2021001",
      "total_sessions": 30,
      "present": 27,
      "absent": 3,
      "attendance_percentage": 90.00
    }
  ]
}
```

**Authorization:** Teacher who owns the subject

---

## WebSocket API

### Connection
```
wss://your-domain.com/ws?token=<jwt_access_token>
```

### Message Types

#### Client → Server

**1. Join Session (Student)**
```json
{
  "type": "join_session",
  "session_id": 456
}
```

**2. Submit OTP (Student)**
```json
{
  "type": "submit_otp",
  "session_id": 456,
  "otp": "5832"
}
```

**3. Ping**
```json
{
  "type": "ping"
}
```

---

#### Server → Client

**1. Connection Established**
```json
{
  "type": "connection_established",
  "user_type": "student",
  "message": "WebSocket connected"
}
```

**2. Session Joined**
```json
{
  "type": "session_joined",
  "session_id": 456,
  "message": "Ready to submit OTP"
}
```

**3. OTP Result**
```json
{
  "type": "otp_result",
  "success": true,
  "status": "P",
  "message": "Attendance marked successfully",
  "retry_available": false
}
```

**4. Attendance Started (Broadcast)**
```json
{
  "type": "attendance_started",
  "session_id": 456,
  "message": "Attendance session started"
}
```

**5. Attendance Closed (Broadcast)**
```json
{
  "type": "attendance_closed",
  "session_id": 456,
  "message": "Attendance session closed"
}
```

**6. Attendance Update (Teacher Only)**
```json
{
  "type": "attendance_update",
  "session_id": 456,
  "student_email": "student@college.edu",
  "status": "P",
  "timestamp": "2025-12-20T10:15:30Z"
}
```

**7. Pong**
```json
{
  "type": "pong"
}
```

**8. Error**
```json
{
  "type": "error",
  "message": "Error description"
}
```

---

## Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication failed
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Attendance Status Values

- `P`: Present
- `A`: Absent
- `R`: Retry (wrong OTP, retry available)

---

## Device Integrity Levels

- `STRONG`: Strong device integrity (hardware-backed)
- `BASIC`: Basic device integrity
- `FAIL`: Integrity check failed (account blocked)

---

## Platform Values

- `ANDROID`: Android device
- `IOS`: iOS device

---

## Error Response Format

```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Push Notification Payload

When attendance starts, students receive:

```json
{
  "notification": {
    "title": "Attendance Started",
    "body": "Data Structures - Period 3"
  },
  "data": {
    "type": "attendance_started",
    "session_id": "456",
    "subject_name": "Data Structures",
    "period_no": "3"
  }
}
```

---

## Rate Limiting

- Authentication: 5 requests per minute
- OTP submission: 2 attempts per session
- API calls: 100 requests per minute per user

---

## Security Notes

1. **JWT Tokens**: Access tokens expire in 1 hour, refresh tokens in 7 days
2. **OTP Validity**: OTPs are valid for 15 seconds only
3. **Device Binding**: Students can only use one approved device
4. **Retry Policy**: Maximum 1 retry on wrong OTP
5. **HTTPS Only**: All communications must use HTTPS
6. **WebSocket Authentication**: Token must be provided in connection query parameter