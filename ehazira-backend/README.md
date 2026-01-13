I am building a **mobile-first attendance application** with two user roles: **Teacher** and **Student**.
The backend must be implemented using **Django**, **Django REST Framework**, and **WebSockets (Django Channels)**.

The system follows a **real-time architecture inspired by WhatsApp**:

* **Push Notifications** are used to wake student apps when attendance starts
* **WebSockets** are used for real-time coordination while the app is open
* **HTTPS REST APIs** are used for authenticated, authoritative actions
* The **server is the single source of truth**

---

## Functional Requirements

1. Only **pre-verified teachers and students** can use the system.
2. Each student is allowed to log in from **only one approved device**.
3. Device identity is enforced using:

   * App-generated UUID
   * Device fingerprint hash
   * Google Play Integrity result
4. Attendance is taken using a **short-lived OTP** visible only to the teacher.
5. Attendance must work even if:

   * Student apps are closed initially
   * Internet is unstable (within policy limits)

---

## Attendance Flow

1. A teacher initiates attendance for a scheduled session.
2. The backend:

   * Generates a **4-digit OTP** valid for ~15 seconds
   * Sends a **push notification** to all enrolled students
   * Broadcasts a real-time event over WebSocket to active students
3. Students open the app and establish a WebSocket connection.
4. Students enter the OTP.
5. The server validates:

   * Student authentication
   * Session validity
   * OTP correctness
   * Time window
6. Attendance is marked automatically:

   * Correct OTP → PRESENT
   * No submission by timeout → ABSENT
   * One retry allowed on wrong OTP
7. Teacher receives real-time submission updates.

---

## Database Schema

1. **TEACHER**

   * TEACHER_EMAIL (PK)
   * NAME
   * DESIGNATION
   * DEPARTMENT_ID (FK)
   * VERIFIED (BOOLEAN)

2. **STUDENT**

   * STUDENT_EMAIL (PK)
   * NAME
   * ROLL_NO
   * CLASS_ID (FK)
   * VERIFIED (BOOLEAN)
   * UNIQUE (ROLL_NO, CLASS_ID)

3. **CLASS**

   * CLASS_ID (PK)
   * DEPARTMENT_ID (FK)
   * BATCH
   * SEMESTER
   * SECTION
   * UNIQUE (DEPARTMENT_ID, BATCH, SEMESTER, SECTION)

4. **COURSE**

   * COURSE_ID (PK)
   * COURSE_NAME

5. **SUBJECT**

   * SUBJECT_ID (PK)
   * COURSE_ID (FK)
   * CLASS_ID (FK)
   * TEACHER_EMAIL (FK)
   * UNIQUE (COURSE_ID, CLASS_ID)

6. **PERIOD**

   * PERIOD_ID (PK)
   * SUBJECT_ID (FK)
   * DAY_OF_WEEK
   * PERIOD_NO
   * UNIQUE (SUBJECT_ID, DAY_OF_WEEK, PERIOD_NO)

7. **SESSION**

   * SESSION_ID (PK)
   * PERIOD_ID (FK)
   * DATE
   * UNIQUE (PERIOD_ID, DATE)

8. **ATTENDANCE**

   * SESSION_ID (PK, FK)
   * STUDENT_EMAIL (PK, FK)
   * STATUS ENUM ('P','A','R')

9. **DEPARTMENT**

   * DEPARTMENT_ID (PK)
   * DEPARTMENT_NAME

10. **DEVICE**

    * DEVICE_ID (PK)
    * USER_EMAIL (FK)
    * DEVICE_UUID (DUMMY for WEB)
    * FINGERPRINT_HASH OR IP (WEB)
    * INTEGRITY_LEVEL ENUM ('STRONG','BASIC','FAIL')
    * PLATFORM ENUM ('WEB','ANDROID','IOS')
    * ACTIVE (BOOLEAN)

---

## Authentication & Device Binding

* Authentication is via **Google OAuth**.
* On first successful login:

  * Device UUID and fingerprint are stored.
* On subsequent logins:

  * UUID + fingerprint are validated.
* Policy:

  * Reinstall on same device → allowed
  * New device → teacher approval required
  * Integrity failure → account flagged and blocked

---

## Required Backend Endpoints

### Authentication

* `POST /auth/google`

### WebSocket

* `GET /ws?token=<JWT>`

### Teacher APIs

* `POST /attendance/initiate`
* `POST /attendance/close`
* `GET /attendance/live-status`
* `POST /attendance/manual-mark`

### Student APIs

* Attendance handled via WebSocket events
* No direct DB writes from client

### Reporting

* `GET /attendance/student-summary`
* `GET /attendance/class-summary`

---

## Constraints

* No MAC address or hardware identifiers
* No background sockets
* No client-side authority
* All attendance decisions are server-side
* Follow KISS and DRY principles

---

**Generate Django models, serializers, views, WebSocket consumers, and API contracts accordingly.**














Problem Description

Attendance tracking in most colleges is still done manually, usually through roll calls or paper registers. This consumes valuable teaching time and often leads to errors such as incorrect entries or proxy attendance. In larger classes, the issue becomes even harder to manage.

Additionally, faculty and administrators lack easy access to attendance insights, making it difficult to identify students at risk or to track patterns in engagement. As education undergoes digital transformation, continuing to rely on outdated systems creates unnecessary inefficiencies and delays.

There is a clear need for a solution that not only automates attendance but also provides analytics for better academic planning. Such a system should be user-friendly, reliable, and work seamlessly in both in-person and online settings.

Impact / Why this problem needs to be solved

• Saves valuable teaching time otherwise wasted on manual attendance.
• Reduces errors and eliminates the problem of proxy attendance.
• Provides actionable insights for faculty to identify disengaged or struggling students.
• Enhances transparency and accountability in academic processes.
• Supports digital transformation of higher education institutions.

Expected Outcomes

• Automated attendance system using QR codes, biometrics, or facial recognition.
• Cloud-based dashboard for administrators and faculty to review attendance records.
• Analytics to identify attendance trends and student engagement levels.
• Compatibility with both offline and online classes.

Relevant Stakeholders / Beneficiaries

• Students
• Faculty and academic administrators
• College management bodies
• Education departments and policymakers




MAKE A COMIC STORY, WITH 8 IMAGES. SHOWING ALL THE STEPS AND THE PROCESS OF USING EHAZIRA APP. THE IMAGES SHOULD BE REALISTIC AND HAVE TEXT BUBBLE IF REQUIRED. SIMPLE BUT TO THE POINT. 

1) TEACHER TELLS ALL THE STUDENTS PRESENT IN THE CLASS TO TAKE OUT THEIR SMART PHONE, AND OPEN THE EHAZIRA APP.
2) ONCE ALL THE STUDENTS ARE ON THE EHAZIRA APP, THE INITIATION PROCESS STARTS.
3) THE TEACHER WRITES/TELLS A 4 DIGIT OTP TO THE CLASS. 
4) ALL THE STUDENTS ENTERS THE OTP IN THEIR UI, AND THEIR ATTENDANCE IS MARKED INSTANTLY.
5) SOME STUDENTS TRIES TO COPY THE OTP, SWITCH TAB OR CALL FRIENDS, BUT THEY COULDN'T, BUT THEY ARE SPOTTED BY THE SYSTEM.
6) TEACHER CAN EXPORT IN EXCEL, AND STUDENTS CAN ALSO TRACK THEIR ATTENDANCE ON DAY TO DAY BASIS