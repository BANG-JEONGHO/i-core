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
    } catch {
      toast.error('로그인에 실패했습니다');
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

  // Demo login fallback (when no Google Client ID configured)
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-[400px] bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-black">IM</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">강사 매칭 플랫폼</p>
            <p className="text-[11px] text-gray-400">사내 업무 시스템</p>
          </div>
        </div>

        <div className="text-center mb-6">
          <p className="text-sm text-gray-600">구글 계정으로 로그인하여 시작하세요</p>
        </div>

        {/* Google Sign-In Button */}
        <div className="flex justify-center mb-4">
          <div ref={googleBtnRef} />
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mt-4">
            <Loader2 size={14} className="animate-spin" />
            <span>로그인 처리 중...</span>
          </div>
        )}

        {/* Fallback: when no Google Client ID */}
        {!GOOGLE_CLIENT_ID && (
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-[10px] text-gray-400 text-center mb-3">Google Client ID 미설정 시 테스트 로그인</p>
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              테스트 로그인 (admin)
            </button>
          </div>
        )}

        <p className="text-[10px] text-gray-400 text-center mt-6">
          Google 계정 인증을 통해 안전하게 접속합니다
        </p>
      </div>
    </div>
  );
}
