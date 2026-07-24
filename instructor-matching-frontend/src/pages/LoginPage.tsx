import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight, Loader2 } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';

declare global {
  interface Window {
    google?: {
      accounts: { id: { initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void; renderButton: (element: HTMLElement, options: object) => void } };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const [step, setStep] = useState<'intro' | 'login'>('intro');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const googleButton = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const finishGoogleLogin = useCallback(async ({ credential }: { credential: string }) => {
    setLoading(true);
    try {
      const response = await authApi.googleLogin(credential);
      login(response.access_token, { id: response.user.id, username: response.user.email, name: response.user.name });
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Google 로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [login, navigate]);

  useEffect(() => {
    if (step !== 'login') return;
    if (!GOOGLE_CLIENT_ID || !googleButton.current) return;
    const initialise = () => {
      if (!window.google?.accounts.id || !googleButton.current) return false;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: finishGoogleLogin });
      window.google.accounts.id.renderButton(googleButton.current, { theme: 'outline', size: 'large', width: 320, locale: 'ko' });
      return true;
    };
    if (initialise()) return;
    const timer = window.setInterval(() => { if (initialise()) window.clearInterval(timer); }, 200);
    return () => window.clearInterval(timer);
  }, [finishGoogleLogin, step]);

  const submitPasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username || !password) return toast.error('아이디와 비밀번호를 입력하세요.');
    setLoading(true);
    try {
      const response = await authApi.login(username, password);
      login(response.access_token, { id: '', username, name: username });
      navigate('/');
    } catch {
      toast.error('아이디 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      <section className="relative w-full max-w-xl h-[450px] overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-xl shadow-indigo-100/50 backdrop-blur-sm flex items-center justify-center">
        {step === 'intro' ? (
          <div className="animate-fadeIn p-10 text-center">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-lg mx-auto mb-5">IM</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">iCore 강사 매칭</h1>
            <p className="text-sm text-gray-500 mb-2">AI 기반 최적 강사 매칭 플랫폼</p>
            <p className="text-xs text-gray-400 leading-relaxed mb-8">나라장터 과업지시서를 업로드하면<br />AI가 자동 분석하여 최적 강사를 추천합니다</p>
            <button onClick={() => setStep('login')} className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md">시작하기 <ArrowRight size={16} /></button>
          </div>
        ) : (
          <div className="w-full max-w-sm animate-fadeIn p-8 text-center">
            <div className="w-14 h-14 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm font-black shadow mx-auto mb-4">IM</div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">로그인</h2>
            <p className="text-xs text-gray-400 mb-5">Google 계정 또는 테스트 계정으로 시작하세요</p>
            {GOOGLE_CLIENT_ID && <div className="mb-4 flex justify-center" ref={googleButton} />}
            {GOOGLE_CLIENT_ID && <div className="relative my-5 border-t border-gray-100"><span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-white px-2 text-[10px] text-gray-400">또는</span></div>}
            <form onSubmit={submitPasswordLogin} className="space-y-3">
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="아이디" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" />
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="비밀번호" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" />
              <button disabled={loading} className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{loading ? <Loader2 className="mx-auto animate-spin" size={16} /> : '로그인'}</button>
            </form>
            <button onClick={() => setStep('intro')} className="mt-5 text-[11px] text-gray-400 hover:text-gray-600">← 뒤로</button>
          </div>
        )}
      </section>
    </main>
  );
}
