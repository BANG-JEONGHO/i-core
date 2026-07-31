import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, Sparkles, FileText, Cpu, UserCheck, ShieldCheck } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleGoogleCallback = useCallback(async (response: any) => {
    setLoading(true);
    try {
      const res = await authApi.googleLogin(response.credential);
      login(res.access_token, {
        id: res.user.id,
        username: res.user.email,
        name: res.user.name,
        email: res.user.email,
        picture: res.user.picture ?? undefined,
      });
      toast.success(`${res.user.name}님, 환영합니다!`);
      navigate('/');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '로그인에 실패했습니다';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  }, [login, navigate]);

  useEffect(() => {
    const initGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current && GOOGLE_CLIENT_ID) {
        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });

        // 모바일 및 PC 화면 크기에 맞춘 버튼 넓이
        const calculatedWidth = Math.min(Math.max(window.innerWidth - 80, 260), 320);

        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: calculatedWidth,
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          locale: 'ko',
        });
      }
    };

    if (window.google?.accounts?.id) {
      initGoogle();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          initGoogle();
          clearInterval(timer);
        }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [handleGoogleCallback]);

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const res = await authApi.login('admin', 'admin1234');
      login(res.access_token, { id: 'admin', username: 'admin@iceu.kr', name: '관리자', email: 'admin@iceu.kr' });
      navigate('/');
    } catch {
      toast.error('로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FDFBF7] text-slate-800 flex flex-col justify-between p-4 sm:p-8 lg:p-12 font-sans select-none overflow-x-hidden overflow-y-auto">
      
      {/* GNB (상단 헤더) - 반응형 맞춤 */}
      <header className="w-full max-w-7xl mx-auto flex justify-between items-center shrink-0 mb-6 sm:mb-8">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img 
            src="/logo.jpg" 
            alt="iCore Logo" 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover border border-amber-200/60 shadow-2xs shrink-0" 
          />
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">iCore</span>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 whitespace-nowrap">강사 매칭</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-white border border-slate-200/80 shadow-2xs text-[11px] sm:text-xs font-semibold text-slate-700 shrink-0 whitespace-nowrap">
          <ShieldCheck size={14} className="text-slate-700 shrink-0" />
          <span>회사 전용 워크스페이스</span>
        </div>
      </header>

      {/* 메인 콘텐트 (반응형 2컬럼 레이아웃) */}
      <main className="w-full max-w-7xl mx-auto flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-2 sm:py-6">
        
        {/* 좌측: 서비스 히어로 & 가이드 */}
        <div className="w-full lg:col-span-7 space-y-6 sm:space-y-8 lg:pr-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold mb-3 sm:mb-4">
              <Sparkles size={13} className="text-amber-600 shrink-0" />
              <span>AI 기반 스마트 강사 추천</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight text-slate-900 leading-[1.3] mb-3 sm:mb-4 break-keep">
              과업지시서 분석부터<br />
              <span className="underline decoration-sky-300 decoration-wavy underline-offset-8">
                최적의 강사 매칭
              </span>까지 자동으로
            </h1>

            <p className="text-xs sm:text-base text-slate-600 leading-relaxed max-w-lg break-keep">
              나라장터 문서를 업로드하면 AI가 핵심 요건을 즉시 분석하여,
              조건에 가장 부합하는 최적의 전문 강사를 제안해 드립니다.
            </p>
          </div>

          {/* 프로세스 안내 카드 (모바일 1열 / 태블릿 이상 3열) */}
          <div className="p-2 rounded-2xl bg-white border border-slate-200/70 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-100">
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <div className="p-1.5 rounded-lg bg-slate-200/70 text-slate-700 shrink-0">
                  <FileText size={15} />
                </div>
                <span className="text-xs font-bold text-slate-800">1. 과업 분석</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">공고문에서 핵심 요건 자동 추출</p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-100">
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <div className="p-1.5 rounded-lg bg-amber-100/70 text-amber-800 shrink-0">
                  <Cpu size={15} />
                </div>
                <span className="text-xs font-bold text-slate-800">2. AI 스코어링</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">강사 역량 및 부합도 자동 산출</p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-100">
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-100/70 text-emerald-800 shrink-0">
                  <UserCheck size={15} />
                </div>
                <span className="text-xs font-bold text-slate-800">3. 최적 매칭</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">검증된 추천 강사 목록 제공</p>
            </div>
          </div>
        </div>

        {/* 우측: 로그인 카드 */}
        <div className="w-full lg:col-span-5 flex justify-center lg:justify-end mt-2 lg:mt-0">
          <div className="w-full max-w-[400px] bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/50 flex flex-col justify-between min-h-[460px] sm:min-h-[500px]">
            
            {/* 카드 상단 타이틀 */}
            <div>
              <span className="text-xs font-bold text-blue-600 tracking-wide block mb-1">
                로그인
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5">
                업무 계정으로 시작해요
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                회사 Google Workspace 계정만 사용할 수 있어요.
              </p>
            </div>

            {/* 카드 중앙 영역 */}
            <div className="my-auto flex flex-col items-center w-full py-4">
              
              {/* 구글 로그인 버튼 Wrapper */}
              <div className="w-full flex flex-col items-center justify-center mb-6">
                <div ref={googleBtnRef} className="w-full flex justify-center overflow-hidden min-h-[44px]" />

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-xs text-blue-600 font-medium mt-3">
                    <Loader2 size={16} className="animate-spin" />
                    <span>로그인 처리 중...</span>
                  </div>
                )}
              </div>

              {/* 하단 과업 분석 안내 박스 */}
              <div className="w-full py-3 px-3.5 rounded-2xl bg-[#F3F6FA] flex flex-col gap-0.5 text-left">
                <p className="text-xs font-bold text-indigo-700 tracking-tight">
                  과업 분석부터 강사 매칭까지 한번에
                </p>
                <p className="text-[11px] text-indigo-500 leading-snug break-keep">
                  업로드된 과업지시서를 AI가 분석하여 적합한 강사를 제안해요.
                </p>
              </div>

              {/* 테스트 로그인 버튼 (클라이언트 ID 미설정 시만 노출) */}
              {!GOOGLE_CLIENT_ID && (
                <div className="w-full mt-4">
                  <button
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    테스트 계정으로 로그인
                  </button>
                </div>
              )}
            </div>

            {/* 카드 하단 동의 문구 */}
            <div className="pt-3 border-t border-slate-100 text-center shrink-0">
              <p className="text-[11px] text-slate-400 leading-snug break-keep">
                로그인 시 회사 보안 정책 및 Google Workspace 인증 절차에 동의하게 됩니다.
              </p>
            </div>

          </div>
        </div>

      </main>

      {/* 푸터 (반응형) */}
      <footer className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 mt-6 border-t border-slate-200/50 text-[11px] text-slate-400 shrink-0">
        <p>© 2026 iCore Instructor Matching. All rights reserved.</p>
        <p>AI 기반 최적 강사 매칭 플랫폼</p>
      </footer>
    </div>
  );
}