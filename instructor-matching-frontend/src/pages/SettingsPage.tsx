import { useState } from 'react';
import { User, Bell, Shield, Palette, Database, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-6">설정</h1>

      <div className="space-y-4">
        {/* 프로필 */}
        <SettingSection title="프로필" icon={<User size={16} />}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
              <span className="text-lg font-bold text-indigo-600">{(user?.name || '?').charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{user?.name || '사용자'}</p>
              <p className="text-xs text-gray-500">{user?.username || ''}</p>
            </div>
          </div>
        </SettingSection>

        {/* 알림 */}
        <SettingSection title="알림" icon={<Bell size={16} />}>
          <ToggleRow
            label="매칭 완료 알림"
            description="강사 매칭이 완료되면 알림을 받습니다"
            checked={notifications}
            onChange={setNotifications}
          />
        </SettingSection>

        {/* 테마 */}
        <SettingSection title="화면" icon={<Palette size={16} />}>
          <ToggleRow
            label="다크 모드"
            description="어두운 테마를 사용합니다 (준비중)"
            checked={darkMode}
            onChange={(v) => { setDarkMode(v); toast('다크 모드는 준비중입니다', { icon: '🌙' }); }}
          />
        </SettingSection>

        {/* 데이터 */}
        <SettingSection title="데이터 관리" icon={<Database size={16} />}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-700">캐시 초기화</p>
                <p className="text-[10px] text-gray-400">로컬 캐시를 삭제합니다</p>
              </div>
              <button
                onClick={() => { localStorage.clear(); toast.success('캐시가 초기화되었습니다'); }}
                className="px-3 py-1.5 text-[11px] font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                초기화
              </button>
            </div>
          </div>
        </SettingSection>

        {/* 보안 */}
        <SettingSection title="보안" icon={<Shield size={16} />}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-700">로그인 방식</p>
              <p className="text-[10px] text-gray-400">Google OAuth 2.0</p>
            </div>
            <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">연결됨</span>
          </div>
        </SettingSection>

        {/* 로그아웃 */}
        <div className="pt-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        </div>

        {/* 앱 정보 */}
        <div className="text-center pt-4">
          <p className="text-[10px] text-gray-300">iCore 강사 매칭 플랫폼 v1.0</p>
        </div>
      </div>
    </div>
  );
}

function SettingSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-gray-500">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <p className="text-[10px] text-gray-400">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-500' : 'bg-gray-200'}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
