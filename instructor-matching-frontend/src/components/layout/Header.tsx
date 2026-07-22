import { useState } from 'react';
import { Search, LogOut } from 'lucide-react';
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
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">프로젝트</span>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">강사 매칭</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-md w-72">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="검색... (Enter로 이동)"
            className="bg-transparent text-sm text-gray-700 outline-none w-full placeholder-gray-400"
          />
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center" title={user?.name}>
          <span className="text-white text-[10px] font-bold">{user?.name?.charAt(0) || 'U'}</span>
        </div>
        <button onClick={() => { logout(); navigate('/login'); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors" title="로그아웃">
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}
