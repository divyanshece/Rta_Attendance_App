import { create } from 'zustand';
import type { AttendanceRecord } from '@/types';

interface AttendanceState {
  currentSessionId: number | null;
  otp: string | null;
  expiresIn: number;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  pendingCount: number;
  submissions: AttendanceRecord[];
  isSessionActive: boolean;
  
  setSession: (sessionId: number, otp: string, expiresIn: number, totalStudents: number) => void;
  updateLiveStatus: (data: {
    present: number;
    absent: number;
    pending: number;
    submissions: AttendanceRecord[];
  }) => void;
  addSubmission: (submission: AttendanceRecord) => void;
  closeSession: () => void;
  reset: () => void;
}

export const useAttendanceStore = create<AttendanceState>((set) => ({
  currentSessionId: null,
  otp: null,
  expiresIn: 0,
  totalStudents: 0,
  presentCount: 0,
  absentCount: 0,
  pendingCount: 0,
  submissions: [],
  isSessionActive: false,

  setSession: (sessionId, otp, expiresIn, totalStudents) => {
    set({
      currentSessionId: sessionId,
      otp,
      expiresIn,
      totalStudents,
      presentCount: 0,
      absentCount: 0,
      pendingCount: totalStudents,
      submissions: [],
      isSessionActive: true,
    });
  },

  updateLiveStatus: (data) => {
    set({
      presentCount: data.present,
      absentCount: data.absent,
      pendingCount: data.pending,
      submissions: data.submissions,
    });
  },

  addSubmission: (submission) => {
    set((state) => {
      const existingIndex = state.submissions.findIndex(
        (s) => s.student === submission.student
      );

      let newSubmissions;
      if (existingIndex >= 0) {
        newSubmissions = [...state.submissions];
        newSubmissions[existingIndex] = submission;
      } else {
        newSubmissions = [...state.submissions, submission];
      }

      const present = newSubmissions.filter((s) => s.status === 'P').length;
      const absent = newSubmissions.filter((s) => s.status === 'A').length;
      const pending = state.totalStudents - present - absent;

      return {
        submissions: newSubmissions,
        presentCount: present,
        absentCount: absent,
        pendingCount: pending,
      };
    });
  },

  closeSession: () => {
    set({ isSessionActive: false });
  },

  reset: () => {
    set({
      currentSessionId: null,
      otp: null,
      expiresIn: 0,
      totalStudents: 0,
      presentCount: 0,
      absentCount: 0,
      pendingCount: 0,
      submissions: [],
      isSessionActive: false,
    });
  },
}));
