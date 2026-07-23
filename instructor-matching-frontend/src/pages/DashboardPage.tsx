import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, X, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { matchingApi } from '../api/matching';
import { taskOrdersApi } from '../api/taskOrders';
import { useAuthStore } from '../store/authStore';

// 이번 주 월요일~일요일 범위 계산
function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { data: history } = useQuery({ queryKey: ['history'], queryFn: () => matchingApi.history(0, 50), refetchOnMount: 'always' });
  const { data: taskOrders } = useQuery({ queryKey: ['task-orders'], queryFn: () => taskOrdersApi.list(0, 50), refetchOnMount: 'always' });

  const recentItems = history || [];
  const weekRange = getWeekRange();

  // 이번 주 데이터만 필터
  const isThisWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    return d >= weekRange.start && d <= weekRange.end;
  };

  const weekMatching = recentItems.filter((item: any) => item.top_instructor_count < 2 && isThisWeek(item.created_at));
  const weekDone = recentItems.filter((item: any) => item.top_instructor_count >= 2 && isThisWeek(item.created_at));

  const matchedTaskOrderIds = new Set(recentItems.map((item: any) => item.task_order_id));
  const pendingTaskOrders = (taskOrders?.data || []).filter(
    (to: any) => to.parsed_at && !matchedTaskOrderIds.has(to.id) && isThisWeek(to.created_at)
  );

  const taskOrderNameMap: Record<string, string> = {};
  (taskOrders?.data || []).forEach((to: any) => { taskOrderNameMap[to.id] = to.file_name; });

  const handleDeleteTaskOrder = async (toId: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await taskOrdersApi.delete(toId);
      toast.success('삭제 완료');
      queryClient.invalidateQueries({ queryKey: ['task-orders'] });
    } catch { toast.error('삭제 실패'); }
  };

  const handleDeleteMatching = async (matchingId: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await matchingApi.deleteResult(matchingId);
      toast.success('삭제 완료');
      queryClient.invalidateQueries({ queryKey: ['history'] });
    } catch { toast.error('삭제 실패'); }
  };

  const weekLabel = `${weekRange.start.getMonth() + 1}/${weekRange.start.getDate()} - ${weekRange.end.getMonth() + 1}/${weekRange.end.getDate()}`;

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">매칭 보드</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">이번 주 ({weekLabel})</p>
        </div>
        <Link to="/task-orders/upload"
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus size={14} />
          새 과업지시서
        </Link>
      </div>

      {/* 칸반 보드 */}
      <div className="flex-1 grid grid-cols-3 gap-5 min-h-0">
        {/* 과업지시서 분석 */}
        <KanbanColumn
          title="과업지시서 분석"
          count={pendingTaskOrders.length}
          color="blue"
        >
          {pendingTaskOrders.map((to: any) => (
            <Link key={to.id} to={`/task-orders/${to.id}`}>
              <KanbanCard
                title={to.file_name}
                date={to.created_at}
                userName={user?.name}
                onDelete={() => handleDeleteTaskOrder(to.id)}
              />
            </Link>
          ))}
        </KanbanColumn>

        {/* 매칭중 */}
        <KanbanColumn
          title="매칭중"
          count={weekMatching.length}
          color="amber"
        >
          {weekMatching.map((item: any) => (
            <Link key={item.id} to={`/matching/${item.id}`}>
              <KanbanCard
                title={taskOrderNameMap[item.task_order_id] || '매칭 분석'}
                date={item.created_at}
                userName={user?.name}
                onDelete={() => handleDeleteMatching(item.id)}
              />
            </Link>
          ))}
        </KanbanColumn>

        {/* 완료 */}
        <KanbanColumn
          title="완료"
          count={weekDone.length}
          color="green"
        >
          {weekDone.map((item: any) => (
            <Link key={item.id} to={`/matching/${item.id}`}>
              <KanbanCard
                title={taskOrderNameMap[item.task_order_id] || '매칭 완료'}
                date={item.created_at}
                userName={user?.name}
                onDelete={() => handleDeleteMatching(item.id)}
              />
            </Link>
          ))}
        </KanbanColumn>
      </div>
    </div>
  );
}

function KanbanColumn({ title, count, color, children }: {
  title: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  const dotColors: Record<string, string> = {
    blue: 'bg-blue-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
  };
  const badgeColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${badgeColors[color]}`}>{title}</span>
          <span className="text-[11px] text-gray-400 font-medium">{count}</span>
        </div>
        <button className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <MoreHorizontal size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3">
        {React.Children.count(children) > 0 ? children : (
          <div className="text-center py-10">
            <p className="text-[11px] text-gray-300">항목 없음</p>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ title, date, userName, onDelete }: {
  title: string;
  date: string;
  userName?: string;
  onDelete?: () => void;
}) {
  const initial = (userName || '?').charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative">
      {onDelete && (
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          className="absolute top-3 right-3 p-0.5 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <X size={12} />
        </button>
      )}
      {/* 제목 */}
      <p className="text-[12px] font-medium text-gray-800 leading-relaxed line-clamp-2 pr-5 mb-3">{title}</p>

      {/* 하단: 날짜 + 프로필 아바타 */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">{new Date(date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
        <div className="relative group/avatar">
          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center cursor-pointer">
            <span className="text-[9px] font-bold text-indigo-600">{initial}</span>
          </div>
          {/* 호버 시 이름 툴팁 */}
          <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-gray-800 text-white text-[9px] rounded whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none">
            {userName || '담당자'}
          </div>
        </div>
      </div>
    </div>
  );
}
