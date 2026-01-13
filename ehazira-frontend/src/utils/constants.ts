export const APP_NAME = 'Rta';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const OTP_LENGTH = 4;
export const OTP_VALIDITY_SECONDS = 15;

export const STATUS_COLORS = {
  P: 'text-green-600 bg-green-50',
  A: 'text-red-600 bg-red-50',
  R: 'text-yellow-600 bg-yellow-50',
} as const;

export const STATUS_LABELS = {
  P: 'Present',
  A: 'Absent',
  R: 'Retry',
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  TEACHER_DASHBOARD: '/teacher',
  TEACHER_ATTENDANCE: '/teacher/attendance',
  TEACHER_REPORTS: '/teacher/reports',
  STUDENT_DASHBOARD: '/student',
  STUDENT_ATTENDANCE: '/student/attendance',
  STUDENT_HISTORY: '/student/history',
} as const;

export const DEVICE_UUID_KEY = 'device_uuid';
export const FINGERPRINT_KEY = 'device_fingerprint';

export const generateDeviceUUID = (): string => {
  let uuid = localStorage.getItem(DEVICE_UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(DEVICE_UUID_KEY, uuid);
  }
  return uuid;
};

export const generateDeviceFingerprint = (): string => {
  let fingerprint = localStorage.getItem(FINGERPRINT_KEY);
  if (!fingerprint) {
    const data = [
      navigator.userAgent,
      navigator.language,
      new Date().getTimezoneOffset(),
      screen.width,
      screen.height,
      screen.colorDepth,
    ].join('|');
    
    fingerprint = btoa(data).substring(0, 64);
    localStorage.setItem(FINGERPRINT_KEY, fingerprint);
  }
  return fingerprint;
};
