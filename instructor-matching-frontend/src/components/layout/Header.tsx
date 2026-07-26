import { useState } from 'react';
import { Search, LogOut, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      const query = searchValue.trim().toLowerCase();
      if (query.includes('강사')) navigate('/instructors');
      else if (query.includes('과업') || query.includes('업로드')) navigate('/task-orders/upload');
      else if (query.includes('매칭') || query.includes('결과')) navigate('/matching-history');
      else if (query.includes('보드') || query.includes('대시')) navigate('/');
      else navigate(`/instructors?keyword=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue('');
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200/90 flex items-center justify-between px-6 shrink-0 z-10 shadow-xs select-none">
      
      {/* 좌측 여백 */}
      <div className="flex items-center gap-2" />

      {/* 중앙 통합 서치바 */}
      <div className="flex-1 flex justify-center px-6">
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 border border-slate-200/80 rounded-lg w-full max-w-md transition-all">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="통합 검색... (강사, 과업지시서, 매칭결과 검색 후 엔터)"
            className="bg-transparent text-xs text-slate-800 outline-none w-full placeholder-slate-400 font-medium"
          />
        </div>
      </div>

      {/* 우측 도구 및 사용자 계정 */}
      <div className="flex items-center gap-3 shrink-0">
        <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all" title="알림">
          <Bell size={16} />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        {/* 유저 아바타 & 이메일 */}
        <div className="flex items-center gap-2 py-1">
          {user?.picture ? (
            <img
              src={user.picture}
              alt="프로필"
              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
              {user?.name?.charAt(0) || '관'}
            </div>
          )}
          <div className="text-xs font-bold text-slate-800 whitespace-nowrap">
            <span>{user?.name || '관리자'}</span>
            <span className="text-slate-400 font-normal ml-1.5 text-[11px]">
              ({user?.email || user?.username || 'admin@iceu.kr'})
            </span>
          </div>
        </div>

        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1 text-xs font-semibold shrink-0"
          title="로그아웃"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
