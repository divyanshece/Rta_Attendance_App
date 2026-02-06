export type UserType = 'teacher' | 'student' | 'admin';

export interface User {
  email: string;
  name: string;
  user_type: UserType;
  roll_no?: string;
  class_id?: number;
  designation?: string;
  department?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user_type: UserType;
  user_info: User;
  device_approved: boolean;
  device_id?: number;
}

export interface GoogleAuthRequest {
  id_token: string;
  device_uuid: string;
  fingerprint_hash: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  user_type?: UserType;
  name?: string;
  designation?: string;
  department_id?: number;
  roll_no?: string;
  class_id?: number;
}

export interface Period {
  period_id: number;
  subject: number;
  subject_info?: Subject;
  day_of_week: number;
  day_name?: string;
  period_no: number;
}

export interface Subject {
  subject_id: number;
  course: number;
  course_name: string;
  class_field: number;
  class_info?: ClassInfo;
  teacher: string;
  teacher_name: string;
}

export interface ClassInfo {
  class_id: number;
  department: number;
  department_name: string;
  batch: number;
  semester: number;
  section: string;
}

export interface Session {
  session_id: number;
  period: number;
  period_info?: Period;
  date: string;
  is_active: boolean;
  closed_at?: string;
}

export interface InitiateAttendanceRequest {
  period_id: number;
  date: string;
}

export interface InitiateAttendanceResponse {
  session_id: number;
  otp: string;
  expires_in: number;
  enrolled_students: number;
}

export interface AttendanceRecord {
  session: number;
  student: string;
  student_name: string;
  roll_no: string;
  status: 'P' | 'A' | 'R';
  status_display: string;
  submitted_at?: string;
  retry_count: number;
}

export interface LiveStatusResponse {
  session_id: number;
  total_students: number;
  present: number;
  absent: number;
  pending: number;
  submissions: AttendanceRecord[];
}

export interface WebSocketMessage {
  type: 'connection_established' | 'session_joined' | 'otp_result' | 
        'attendance_started' | 'attendance_closed' | 'attendance_update' | 
        'pong' | 'error';
  message?: string;
  success?: boolean;
  status?: 'P' | 'A' | 'R';
  retry_available?: boolean;
  session_id?: number;
  student_email?: string;
  timestamp?: string;
  user_type?: UserType;
}

export interface StudentSummary {
  student_email: string;
  student_name: string;
  roll_no: string;
  total_sessions: number;
  present: number;
  absent: number;
  attendance_percentage: number;
}

export interface ClassSummary {
  class_id: number;
  class_info: string;
  subject_name: string;
  total_sessions: number;
  average_attendance: number;
  students: StudentSummary[];
}

// ============== NEW TYPES FOR CLASS/SCHEDULE/REPORTS ==============

export interface Department {
  department_id: number;
  department_name: string;
}

export interface Course {
  course_id: number;
  course_name: string;
}

export interface ClassDetail {
  class_id: number;
  department: number;
  department_name: string;
  batch: number;
  semester: number;
  section: string;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
  student_count: number;
}

export interface StudentEnrollment {
  id: number | null;
  student_email: string;
  student_name: string;
  roll_no: string;
  enrolled_at: string | null;
  verified: boolean;
}

export interface ClassStudentsResponse {
  class_id: number;
  class_name: string;
  students: StudentEnrollment[];
}

export interface StudentInviteRequest {
  email: string;
  name?: string;
  roll_no: string;
}

export interface InviteResponse {
  message: string;
  invitation_id?: number;
  enrolled: boolean;
}

export interface ImportResult {
  enrolled: number;
  invited: number;
  errors: string[];
}

export interface ScheduleItem {
  period_id: number;
  subject_id: number;
  subject_name: string;
  course_name: string;
  class_name: string;
  class_id: number;
  day_of_week: number;
  day_name: string;
  period_no: number;
}

export interface PeriodCreateRequest {
  subject: number;
  day_of_week: number;
  period_no: number;
}

export interface SubjectCreateRequest {
  course?: number;
  course_name?: string;
  class_field: number;
}

export interface DashboardStats {
  total_classes: number;
  total_students: number;
  total_subjects: number;
  todays_sessions: number;
  average_attendance: number;
}

export interface ClassReport {
  class_id: number;
  class_name: string;
  subject_id: number;
  subject_name: string;
  total_sessions: number;
  average_attendance: number;
  students: StudentAttendanceReport[];
}

export interface StudentAttendanceReport {
  student_email: string;
  student_name: string;
  roll_no: string;
  total_sessions: number;
  present: number;
  absent: number;
  percentage: number;
}

export interface TeacherProfile {
  teacher_email: string;
  name: string;
  designation: string;
  department: number;
  department_name: string;
  verified: boolean;
}

export interface StudentProfile {
  student_email: string;
  name: string;
  roll_no: string;
  class_field: number;
  class_info: ClassInfo;
  department_name: string;
  verified: boolean;
  enrolled_classes: EnrolledClass[];
}

export interface EnrolledClass {
  class_id: number;
  class_name: string;
  roll_no: string;
  enrolled_at: string;
}

export interface StudentClassWithAttendance {
  class_id: number;
  class_name: string;
  department_name: string;
  subjects: SubjectAttendance[];
  overall_attendance: number;
  total_present: number;
  total_sessions: number;
}

export interface SubjectAttendance {
  subject_id: number;
  subject_name: string;
  teacher_name: string;
  total_sessions: number;
  present: number;
  percentage: number;
}
