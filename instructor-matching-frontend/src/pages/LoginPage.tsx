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
        picture: res.user.picture,
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
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
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
    <div className="h-screen w-full bg-[#FDFBF7] text-slate-800 flex flex-col justify-between px-8 py-8 lg:px-16 font-sans select-none overflow-hidden">
      
      {/* GNB (상단 헤더) - PC 규격 핏 */}
      <header className="w-full max-w-7xl mx-auto flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.jpg" 
            alt="iCore Logo" 
            className="w-10 h-10 rounded-xl object-cover border border-amber-200/60 shadow-xs" 
          />
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900">iCore</span>
            <span className="text-xs font-semibold text-slate-500">강사 매칭</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-xs text-xs font-medium text-slate-600">
          <ShieldCheck size={14} className="text-slate-700" />
          <span>회사 전용 워크스페이스</span>
        </div>
      </header>

      {/* 메인 콘텐트 (2컬럼 레이아웃 - PC 비율 맞춤) */}
      <main className="w-full max-w-7xl mx-auto grid grid-cols-12 gap-12 items-center my-auto py-4">
        
        {/* 좌측: 서비스 히어로 & 가이드 */}
        <div className="col-span-7 space-y-9 pr-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold mb-5">
              <Sparkles size={13} className="text-amber-600" />
              AI 기반 스마트 강사 추천
            </div>

            <h1 className="text-[44px] font-extrabold tracking-tight text-slate-900 leading-[1.25] mb-5">
              과업지시서 분석부터<br />
              <span className="underline decoration-sky-300 decoration-wavy underline-offset-8">
                최적의 강사 매칭
              </span>까지 자동으로
            </h1>

            <p className="text-base text-slate-600 leading-relaxed max-w-lg">
              나라장터 문서를 업로드하면 AI가 핵심 요건을 즉시 분석하여,<br />
              조건에 가장 부합하는 최적의 전문 강사를 제안해 드립니다.
            </p>
          </div>

          {/* 가로형 프로세스 안내 카드 */}
          <div className="p-2 rounded-2xl bg-white border border-slate-200/70 shadow-xs grid grid-cols-3 gap-2">
            <div className="p-4 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-slate-200/70 text-slate-700">
                  <FileText size={16} />
                </div>
                <span className="text-xs font-bold text-slate-800">1. 과업 분석</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">공고문에서 핵심 요건 자동 추출</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-amber-100/70 text-amber-800">
                  <Cpu size={16} />
                </div>
                <span className="text-xs font-bold text-slate-800">2. AI 스코어링</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">강사 역량 및 부합도 자동 산출</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-100/70 text-emerald-800">
                  <UserCheck size={16} />
                </div>
                <span className="text-xs font-bold text-slate-800">3. 최적 매칭</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">검증된 추천 강사 목록 제공</p>
            </div>
          </div>
        </div>

        {/* 우측: PC 규격 로그인 카드 */}
        <div className="col-span-5 flex justify-end">
          <div className="w-[410px] bg-white rounded-[32px] p-9 border border-slate-200/80 shadow-2xl shadow-slate-200/60 flex flex-col justify-between h-[540px]">
            
            {/* 카드 상단 타이틀 */}
            <div>
              <span className="text-xs font-bold text-blue-600 tracking-wide block mb-1.5">
                로그인
              </span>
              <h2 className="text-2.5xl font-extrabold text-slate-900 tracking-tight mb-2">
                업무 계정으로 시작해요
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                회사 Google Workspace 계정만 사용할 수 있어요.
              </p>
            </div>

            {/* 카드 중앙 영역 */}
            <div className="my-auto flex flex-col items-center w-full">
              
              {/* 구글 로그인 버튼 Wrapper */}
              <div className="w-full flex flex-col items-center justify-center mb-8">
                <div ref={googleBtnRef} className="w-full flex justify-center" />

                {loading && (
                  <div className="flex items-center justify-center gap-2 text-xs text-blue-600 font-medium mt-3">
                    <Loader2 size={16} className="animate-spin" />
                    <span>로그인 처리 중...</span>
                  </div>
                )}
              </div>

              {/* 하단 과업 분석 안내 박스 */}
              <div className="w-full py-3.5 px-4 rounded-[16px] bg-[#F3F6FA] flex flex-col gap-1">
                <p className="text-[12px] font-bold text-indigo-700 tracking-tight whitespace-nowrap">
                  과업 분석부터 강사 매칭까지 한번에.
                </p>
                <p className="text-[11px] text-indigo-400 tracking-tighter whitespace-nowrap">
                  업로드된 과업지시서를 AI가 분석하여 적합한 강사를 제안해요.
                </p>
              </div>

              {/* 테스트 로그인 버튼 (클라이언트 ID 미설정 시만 노출) */}
              {!GOOGLE_CLIENT_ID && (
                <div className="w-full mt-4">
                  <button
                    onClick={handleDemoLogin}
                    disabled={loading}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    테스트 계정으로 로그인
                  </button>
                </div>
              )}
            </div>

            {/* 카드 하단 동의 문구 */}
            <div className="pt-4 border-t border-slate-100 text-center shrink-0">
              <p className="text-[11px] text-slate-400 tracking-tighter whitespace-nowrap">
                로그인 시 회사 보안 정책 및 Google Workspace 인증 절차에 동의하게 됩니다.
              </p>
            </div>

          </div>
        </div>

      </main>

      {/* 푸터 (PC 하단 고정 비율) */}
      <footer className="w-full max-w-7xl mx-auto flex justify-between items-center pt-4 border-t border-slate-200/50 text-[11px] text-slate-400 shrink-0">
        <p>© 2026 iCore Instructor Matching. All rights reserved.</p>
        <p>AI 기반 최적 강사 매칭 플랫폼</p>
      </footer>
    </div>
  );
}