/**
 * i-Core 프론트엔드 메인 라우터 및 애플리케이션 엔트리 컴포넌트.
 * 
 * - React Router v6 기반 페이지 라우팅 구성
 * - React Query (TanStack Query) 비동기 데이터 캐싱 관리
 * - Zustand 인증 상태 기반 ProtectedRoute 보호 라우팅
 * - react-hot-toast 글로벌 알림 토스트 설정
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/common/ProtectedRoute';

// 서비스 주요 페이지 모듈
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InstructorsPage from './pages/InstructorsPage';
import TaskOrderUploadPage from './pages/TaskOrderUploadPage';
import TaskOrderDetailPage from './pages/TaskOrderDetailPage';
import MatchingResultPage from './pages/MatchingResultPage';
import MatchingHistoryPage from './pages/MatchingHistoryPage';
import InstructorPortalPage from './pages/InstructorPortalPage';
import SettingsPage from './pages/SettingsPage';

// React Query 클라이언트 옵션 설정 (재시도 1회, 캐시 유효시간 30초)
const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { 
      retry: 1, 
      staleTime: 30000 
    } 
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* 공개 라우트 (로그인 페이지 및 외부 강사 전용 포털) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/instructor" element={<InstructorPortalPage />} />

          {/* 인증 사용자 전용 라우트 (Layout 헤더/사이드바 내부에 중첩) */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {/* 대시보드 (메인 홈) */}
            <Route path="/" element={<DashboardPage />} />
            
            {/* 강사 DB 및 목록 관리 */}
            <Route path="/instructors" element={<InstructorsPage />} />
            
            {/* 나라장터 과업지시서 파일 업로드 및 분석 요청 */}
            <Route path="/task-orders/upload" element={<TaskOrderUploadPage />} />
            <Route path="/task-orders/:id" element={<TaskOrderDetailPage />} />
            
            {/* AI 강사 매칭 결과 및 매칭 이력 조회 */}
            <Route path="/matching-history" element={<MatchingHistoryPage />} />
            <Route path="/matching/:id" element={<MatchingResultPage />} />
            
            {/* 시스템 설정 */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>

      {/* 글로벌 토스트 알림 컴포넌트 */}
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          style: { fontSize: '13px', borderRadius: '8px' }, 
          duration: 3000 
        }} 
      />
    </QueryClientProvider>
  );
}
