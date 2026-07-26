/**
 * i-Core 프론트엔드 전역 인증 상태 관리 스토어 (Zustand).
 * 
 * - 사용자 JWT 토큰 및 사용자 프로필 세션 보관 (localStorage 연동)
 * - 로그인 / 로그아웃 핸들러 및 인증 상태 조회 메소드 제공
 */

import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  /** JWT 인증 토큰 */
  token: string | null;
  /** 현재 로그인한 사용자 정보 */
  user: User | null;
  /** 로그인 처리 함수 (토큰 및 사용자 상태 업데이트) */
  login: (token: string, user: User) => void;
  /** 로그아웃 처리 함수 (세션 및 로컬스토리지 정리) */
  logout: () => void;
  /** 인증 여부 반환 함수 */
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // 브라우저 로컬스토리지에서 기존 세션 복원
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),

  /** 로그인 성공 시 세션을 로컬스토리지 및 전역 상태에 저장 */
  login: (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
  },

  /** 로그아웃 시 로컬스토리지 및 전역 상태 초기화 */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null });
  },

  /** 토큰 존재 여부로 인증 상태 체크 */
  isAuthenticated: () => !!get().token,
}));
