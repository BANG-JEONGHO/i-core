import { User, Shield, Database, LogOut, RefreshCw, KeyRound, Server, Cpu, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleClearCache = () => {
    localStorage.clear();
    toast.success('로컬 캐시 및 설정이 성공적으로 초기화되었습니다.');
  };

  const handleLogout = () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout();
      toast.success('성공적으로 로그아웃되었습니다.');
      navigate('/login');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 select-none py-2">
      
      {/* ---------------------------------------------------- */}
      {/* 타이틀 & 헤더 */}
      {/* ---------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            시스템 설정
            <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
              v1.0.4
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            계정 프로필, 로컬 캐시 및 플랫폼 시스템 환경 설정을 관리합니다.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-600 bg-emerald-50/80 border border-emerald-200/80 px-3 py-1.5 rounded-xl">
          <CheckCircle2 size={14} className="text-emerald-600" />
          <span>시스템 정상 작동 중</span>
        </div>
      </div>

      <div className="space-y-4">
        
        {/* ---------------------------------------------------- */}
        {/* 1. 프로필 관리 카드 */}
        {/* ---------------------------------------------------- */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">사용자 프로필</h2>
            </div>
            <span className="px-2.5 py-0.5 bg-sky-50 text-sky-700 text-[10px] font-extrabold rounded-md border border-sky-200/80">
              시스템 최고 관리자
            </span>
          </div>

          <div className="flex items-center gap-4 pt-1">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-md shrink-0">
              <span className="text-xl font-extrabold tracking-wider">
                {(user?.name || 'A').charAt(0)}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-base font-extrabold text-slate-900 truncate">{user?.name || '관리자 계정'}</p>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" title="온라인" />
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{user?.username || 'jjhh8889@iceu.kr'}</p>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 2. 데이터 & 로컬 저장소 관리 */}
        {/* ---------------------------------------------------- */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Database size={16} />
            </div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">데이터 & 저장소 관리</h2>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-800">로컬 상태 및 캐시 초기화</p>
              <p className="text-[11px] text-slate-400">
                브라우저에 저장된 칸반보드 필터, 검색 이력 및 임시 캐시를 클리어합니다.
              </p>
            </div>

            <button
              onClick={handleClearCache}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-xl border border-slate-200 transition-all shadow-2xs active:scale-95 shrink-0"
            >
              <RefreshCw size={13} className="text-slate-600" />
              캐시 초기화
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 3. 보안 및 인증 환경 */}
        {/* ---------------------------------------------------- */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Shield size={16} />
            </div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">보안 및 인증</h2>
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound size={13} className="text-slate-500" /> 인증 연동 방식
                </p>
                <p className="text-[11px] text-slate-400">Google OAuth 2.0 및 JWT 보안 토큰 기반</p>
              </div>
              <span className="text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                보안 연결됨
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-100/80 pt-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Server size={13} className="text-slate-500" /> API 엔드포인트
                </p>
                <p className="text-[11px] text-slate-400">FastAPI 백엔드 서버 (Port 8700)</p>
              </div>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                http://localhost:8700
              </span>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* 4. 로그아웃 섹션 */}
        {/* ---------------------------------------------------- */}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 hover:bg-rose-100/80 text-red-600 hover:text-red-700 border border-rose-200/80 text-xs font-bold rounded-2xl transition-all shadow-2xs active:scale-[0.99]"
          >
            <LogOut size={15} />
            시스템 계정 로그아웃
          </button>
        </div>

        {/* 푸터 버전 표기 */}
        <div className="text-center pt-4">
          <p className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1">
            <Cpu size={12} className="text-slate-400" /> iCore AI 강사 매칭 플랫폼 v1.0.4 • All rights reserved
          </p>
        </div>

      </div>

    </div>
  );
}
