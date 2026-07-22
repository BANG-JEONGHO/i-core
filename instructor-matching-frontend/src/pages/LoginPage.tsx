import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { toast.error('아이디와 비밀번호를 입력하세요'); return; }
    setLoading(true);
    try {
      const res = await authApi.login(username, password);
      login(res.access_token, { id: '', username, name: username });
      navigate('/');
    } catch { toast.error('아이디 또는 비밀번호가 올바르지 않습니다'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-[360px] bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
            <span className="text-white text-xs font-black">IM</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">강사 매칭 플랫폼</p>
            <p className="text-[11px] text-gray-400">사내 업무 시스템</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">아이디</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
              placeholder="아이디를 입력하세요" data-testid="login-username-input" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
              placeholder="비밀번호를 입력하세요" data-testid="login-password-input" />
          </div>
          <button type="submit" disabled={loading} data-testid="login-submit-button"
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-6">관리자에게 계정을 요청하세요</p>
      </div>
    </div>
  );
}
