import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, X, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { matchingApi } from '../api/matching';
import { taskOrdersApi } from '../api/taskOrders';
import { useAuthStore } from '../store/authStore';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [dateFilter, setDateFilter] = useState<string>('');
  const { data: history } = useQuery({ queryKey: ['history'], queryFn: () => matchingApi.history(0, 100), refetchOnMount: 'always' });
  const { data: taskOrders } = useQuery({ queryKey: ['task-orders'], queryFn: () => taskOrdersApi.list(0, 100), refetchOnMount: 'always' });

  const recentItems = history || [];

  // 날짜 필터
  const filterByDate = (items: any[]) => {
    if (!dateFilter) return items;
    return items.filter((item: any) => {
      const itemDate = new Date(item.created_at).toISOString().split('T')[0];
      return itemDate === dateFilter;
    });
  };

  const allMatching = recentItems.filter((item: any) => item.top_instructor_count < 2);
  const allDone = recentItems.filter((item: any) => item.top_instructor_count >= 2);

  const matchedTaskOrderIds = new Set(recentItems.map((item: any) => item.task_order_id));
  const allPending = (taskOrders?.data || []).filter(
    (to: any) => to.parsed_at && !matchedTaskOrderIds.has(to.id)
  );

  const pendingTaskOrders = filterByDate(allPending);
  const weekMatching = filterByDate(allMatching);
  const weekDone = filterByDate(allDone);

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

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">매칭 보드</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* 날짜 필터 */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <Calendar size={13} className="text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-[11px] bg-transparent outline-none text-gray-600 w-[110px]"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="text-gray-400 hover:text-red-500">
                <X size={11} />
              </button>
            )}
          </div>
          <Link to="/task-orders/upload"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus size={14} />
            새 과업지시서
          </Link>
        </div>
      </div>

      {/* 칸반 보드 */}
      <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
        <KanbanColumn title="과업지시서 분석" count={pendingTaskOrders.length} color="blue">
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

        <KanbanColumn title="매칭중" count={weekMatching.length} color="amber">
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

        <KanbanColumn title="완료" count={weekDone.length} color="green">
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
  const badgeColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    green: 'bg-green-100 text-green-700',
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded ${badgeColors[color]}`}>{title}</span>
        <span className="text-[11px] text-gray-400 font-medium">{count}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {React.Children.count(children) > 0 ? children : (
          <div className="text-center py-12">
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
    <div className="bg-white rounded-lg px-3.5 py-3 shadow-sm hover:shadow transition-shadow cursor-pointer group relative">
      {onDelete && (
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          className="absolute top-2.5 right-2.5 p-0.5 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <X size={11} />
        </button>
      )}
      <p className="text-[12px] font-medium text-gray-800 leading-relaxed line-clamp-2 pr-4 mb-2.5">{title}</p>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          {new Date(date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
        </span>
        <div className="relative group/avatar">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
            <span className="text-[8px] font-bold text-indigo-600">{initial}</span>
          </div>
          <div className="absolute bottom-full right-0 mb-1.5 px-2 py-1 bg-gray-900 text-white text-[9px] rounded-md whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
            {userName || '담당자'}
          </div>
        </div>
      </div>
    </div>
  );
}
