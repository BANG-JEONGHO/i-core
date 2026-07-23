import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2, ArrowRight } from 'lucide-react';
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
  const [step, setStep] = useState<'intro' | 'login'>('intro');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleGoogleCallback = useCallback(async (response: any) => {
    setLoading(true);
    try {
      const res = await authApi.googleLogin(response.credential);
      login(res.access_token, { id: res.user.id, username: res.user.email, name: res.user.name });
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
    if (step !== 'login') return;
    const initGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current && GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 300,
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
        if (window.google?.accounts?.id) { initGoogle(); clearInterval(timer); }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [step, handleGoogleCallback]);

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const res = await authApi.login('admin', 'admin1234');
      login(res.access_token, { id: '', username: 'admin', name: '관리자' });
      navigate('/');
    } catch { toast.error('로그인 실패'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100 rounded-full opacity-40 blur-3xl" />
      </div>

      {/* 단일 카드 - 스텝 전환 */}
      <div className="relative w-full max-w-xl mx-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-indigo-100/50 border border-white/60 h-[450px] flex items-center justify-center overflow-hidden">
        
        {/* Step 1: 소개 */}
        {step === 'intro' && (
          <div className="text-center animate-fadeIn p-10">
            <img src="/logo.jpg" alt="iCore" className="w-20 h-20 rounded-2xl object-cover shadow-lg mx-auto mb-5" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">iCore 강사 매칭</h1>
            <p className="text-sm text-gray-500 mb-2">AI 기반 최적 강사 매칭 플랫폼</p>
            <p className="text-xs text-gray-400 leading-relaxed mb-8">
              나라장터 과업지시서를 업로드하면<br/>AI가 자동 분석하여 최적 강사를 추천합니다
            </p>
            <button
              onClick={() => setStep('login')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
            >
              시작하기
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: 로그인 */}
        {step === 'login' && (
          <div className="text-center animate-fadeIn p-10">
            <img src="/logo.jpg" alt="iCore" className="w-14 h-14 rounded-xl object-cover shadow mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">로그인</h2>
            <p className="text-xs text-gray-400 mb-6">Google 계정으로 시작하세요</p>

            {/* Google Button */}
            <div className="flex justify-center mb-4">
              <div ref={googleBtnRef} />
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-3">
                <Loader2 size={14} className="animate-spin text-indigo-500" />
                <span>로그인 처리 중...</span>
              </div>
            )}

            {!GOOGLE_CLIENT_ID && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <button onClick={handleDemoLogin} disabled={loading}
                  className="w-full py-2.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-800 disabled:opacity-50">
                  테스트 로그인
                </button>
              </div>
            )}

            <button onClick={() => setStep('intro')} className="mt-5 text-[11px] text-gray-400 hover:text-gray-600">
              ← 뒤로
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
