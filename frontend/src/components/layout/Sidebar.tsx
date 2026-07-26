import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, FileUp, BarChart3, Settings } from 'lucide-react';

const planning = [
  { to: '/', label: '대시보드', icon: LayoutDashboard },
  { to: '/instructors', label: '강사 관리', icon: Users },
];

const work = [
  { to: '/task-orders/upload', label: '과업지시서 등록', icon: FileUp },
  { to: '/matching-history', label: '매칭 결과', icon: BarChart3 },
];

export default function Sidebar() {
  return (
    <aside className="w-[240px] bg-white text-slate-700 border-r border-slate-200/90 flex flex-col h-screen shrink-0 shadow-2xs select-none">
      {/* 사내 앱 로고 */}
      <div className="px-4 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="iCore 로고" className="h-7 w-auto object-contain shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-slate-900 leading-snug tracking-tight whitespace-nowrap">
              강사 매칭 프로젝트
            </p>
            <p className="text-[10px] font-medium text-slate-400 leading-snug whitespace-nowrap">
              사내 매칭 플랫폼
            </p>
          </div>
        </div>
      </div>

      {/* 메뉴 그룹 */}
      <div className="flex-1 overflow-y-auto py-4">
        <p className="px-5 py-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">기획 및 프로젝트</p>
        <nav className="px-3 space-y-1 mt-1">
          {planning.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive ? 'bg-slate-100 text-slate-900 font-bold shadow-2xs' : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'
              }`}>
              <item.icon size={17} strokeWidth={2} className={item.to === '/' ? 'text-slate-800' : ''} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <p className="px-5 py-1.5 mt-5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">업무 워크플로우</p>
        <nav className="px-3 space-y-1 mt-1">
          {work.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${
                isActive ? 'bg-slate-100 text-slate-900 font-bold shadow-2xs' : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'
              }`}>
              <item.icon size={17} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* 하단 시스템 설정 */}
      <div className="px-3 py-3 border-t border-slate-100 bg-slate-50/50">
        <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium w-full transition-all ${isActive ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-900'}`}>
          <Settings size={17} strokeWidth={2} />
          시스템 설정
        </NavLink>
      </div>
    </aside>
  );
}
