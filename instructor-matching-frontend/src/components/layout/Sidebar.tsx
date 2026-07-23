import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileUp, BarChart3, Settings } from 'lucide-react';

const planning = [
  { to: '/', label: '보드', icon: LayoutDashboard },
  { to: '/instructors', label: '강사 관리', icon: Users },
];

const work = [
  { to: '/task-orders/upload', label: '과업지시서', icon: FileUp },
  { to: '/matching-history', label: '매칭 결과', icon: BarChart3 },
];

export default function Sidebar() {
  return (
    <aside className="w-[220px] bg-white border-r border-gray-200 flex flex-col h-screen shrink-0">
      {/* 프로젝트 */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="iCore" className="w-7 h-7 rounded object-cover" />
          <div>
            <p className="text-[13px] font-semibold text-gray-900">강사 매칭</p>
            <p className="text-[10px] text-gray-400">사내 업무 플랫폼</p>
          </div>
        </div>
      </div>

      {/* 메뉴 */}
      <div className="flex-1 overflow-y-auto py-3">
        <p className="px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">기획</p>
        <nav className="px-2 space-y-0.5">
          {planning.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded text-[13px] transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <item.icon size={16} strokeWidth={1.8} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <p className="px-4 py-1.5 mt-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">업무</p>
        <nav className="px-2 space-y-0.5">
          {work.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded text-[13px] transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <item.icon size={16} strokeWidth={1.8} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* 하단 설정 */}
      <div className="px-2 py-3 border-t border-gray-100">
        <button className="flex items-center gap-2.5 px-3 py-2 rounded text-[13px] text-gray-500 hover:bg-gray-50 w-full">
          <Settings size={16} strokeWidth={1.8} />
          설정
        </button>
      </div>
    </aside>
  );
}
