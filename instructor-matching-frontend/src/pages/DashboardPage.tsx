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

  const filterByDate = (items: any[]) => {
    if (!dateFilter) return items;
    return items.filter((item: any) => new Date(item.created_at).toISOString().split('T')[0] === dateFilter);
  };

  const allMatching = recentItems.filter((item: any) => item.top_instructor_count < 2);
  const allDone = recentItems.filter((item: any) => item.top_instructor_count >= 2);
  const matchedTaskOrderIds = new Set(recentItems.map((item: any) => item.task_order_id));
  const allPending = (taskOrders?.data || []).filter((to: any) => to.parsed_at && !matchedTaskOrderIds.has(to.id));

  const pendingTaskOrders = filterByDate(allPending);
  const matchingItems = filterByDate(allMatching);
  const doneItems = filterByDate(allDone);

  const taskOrderNameMap: Record<string, string> = {};
  (taskOrders?.data || []).forEach((to: any) => { taskOrderNameMap[to.id] = to.file_name; });

  const handleDeleteTaskOrder = async (toId: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try { await taskOrdersApi.delete(toId); toast.success('삭제'); queryClient.invalidateQueries({ queryKey: ['task-orders'] }); } catch { toast.error('실패'); }
  };
  const handleDeleteMatching = async (matchingId: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try { await matchingApi.deleteResult(matchingId); toast.success('삭제'); queryClient.invalidateQueries({ queryKey: ['history'] }); } catch { toast.error('실패'); }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-bold text-gray-900">보드</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-md px-2.5 py-1.5">
            <Calendar size={13} className="text-gray-400" />
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
              className="text-[11px] bg-transparent outline-none text-gray-600 w-[105px]" />
            {dateFilter && <button onClick={() => setDateFilter('')} className="text-gray-400 hover:text-red-500"><X size={10} /></button>}
          </div>
          <Link to="/task-orders/upload"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white text-[11px] font-semibold rounded-md hover:bg-indigo-700">
            <Plus size={13} /> 새 과업지시서
          </Link>
        </div>
      </div>

      {/* 칸반 보드 - Jira 스타일 */}
      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
        <Column title="과업지시서 분석" count={pendingTaskOrders.length}>
          {pendingTaskOrders.map((to: any) => (
            <Link key={to.id} to={`/task-orders/${to.id}`}>
              <Card title={to.file_name} tag="분석완료" tagColor="blue" userName={user?.name} onDelete={() => handleDeleteTaskOrder(to.id)} />
            </Link>
          ))}
        </Column>

        <Column title="매칭중" count={matchingItems.length}>
          {matchingItems.map((item: any) => (
            <Link key={item.id} to={`/matching/${item.id}`}>
              <Card title={taskOrderNameMap[item.task_order_id] || '매칭 분석'} tag="후보대기" tagColor="amber" userName={user?.name} onDelete={() => handleDeleteMatching(item.id)} />
            </Link>
          ))}
        </Column>

        <Column title="완료" count={doneItems.length}>
          {doneItems.map((item: any) => (
            <Link key={item.id} to={`/matching/${item.id}`}>
              <Card title={taskOrderNameMap[item.task_order_id] || '매칭 완료'} tag="선정완료" tagColor="green" userName={user?.name} onDelete={() => handleDeleteMatching(item.id)} />
            </Link>
          ))}
        </Column>
      </div>
    </div>
  );
}

function Column({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-0 bg-gray-50 rounded-lg">
      {/* 컬럼 헤더 - 가운데 정렬 */}
      <div className="flex items-center justify-center gap-2 px-3 py-2.5 border-b border-gray-200/60">
        <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{title}</span>
        <span className="text-[10px] text-gray-400 bg-gray-200 w-5 h-5 rounded-full flex items-center justify-center font-semibold">{count}</span>
      </div>
      {/* 카드 영역 */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {React.Children.count(children) > 0 ? children : (
          <div className="text-center py-10"><p className="text-[10px] text-gray-300">항목 없음</p></div>
        )}
      </div>
    </div>
  );
}

function Card({ title, tag, tagColor, userName, onDelete }: {
  title: string; tag: string; tagColor: string; userName?: string; onDelete?: () => void;
}) {
  const tagColors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
  };
  const initial = (userName || '?').charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-md p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group relative">
      {onDelete && (
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 p-0.5 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <X size={11} />
        </button>
      )}
      {/* 제목 */}
      <p className="text-[11px] font-medium text-gray-800 leading-relaxed line-clamp-2 pr-4 mb-2.5">{title}</p>
      {/* 하단: 태그 + 프로필 */}
      <div className="flex items-center justify-between">
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm ${tagColors[tagColor]}`}>{tag}</span>
        <div className="relative group/avatar">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center">
            <span className="text-[8px] font-bold text-orange-800">{initial}</span>
          </div>
          <div className="absolute bottom-full right-0 mb-1 px-2 py-0.5 bg-gray-800 text-white text-[8px] rounded whitespace-nowrap opacity-0 group-hover/avatar:opacity-100 transition-opacity pointer-events-none z-10">
            {userName || '담당자'}
          </div>
        </div>
      </div>
    </div>
  );
}
