import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
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
      login(res.access_token, { id: res.user.id, username: res.user.email, name: res.user.name });
      toast.success(`${res.user.name}님, 환영합니다!`);
      navigate('/');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '로그인에 실패했습니다';
      toast.error(detail);
      console.error('Google login error:', detail);
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
      login(res.access_token, { id: '', username: 'admin', name: '관리자' });
      navigate('/');
    } catch {
      toast.error('로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-100 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[420px] mx-4">
        {/* 메인 카드 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl shadow-indigo-100/50 border border-white/60 p-10">
          {/* 로고 영역 */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-4">
              <img src="/logo.jpg" alt="iCore" className="w-20 h-20 rounded-2xl shadow-lg shadow-indigo-200 object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">iCore 강사 매칭</h1>
            <p className="text-sm text-gray-500 mt-1.5">AI 기반 최적 강사 매칭 플랫폼</p>
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">계정으로 시작하기</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google Sign-In Button */}
          <div className="flex justify-center mb-6">
            <div ref={googleBtnRef} />
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4">
              <Loader2 size={16} className="animate-spin text-indigo-500" />
              <span>로그인 처리 중...</span>
            </div>
          )}

          {/* Fallback */}
          {!GOOGLE_CLIENT_ID && (
            <div className="mt-6 border-t border-gray-100 pt-5">
              <button
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 shadow-sm"
              >
                테스트 로그인
              </button>
            </div>
          )}
        </div>

        {/* 하단 정보 */}
        <p className="text-center text-[11px] text-gray-400 mt-5">
          Google 계정 인증을 통해 안전하게 접속합니다
        </p>
      </div>
    </div>
  );
}
