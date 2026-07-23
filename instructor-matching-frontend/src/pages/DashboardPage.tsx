import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, X, FileText, Users, CheckCircle2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { matchingApi } from '../api/matching';
import { taskOrdersApi } from '../api/taskOrders';
import { useAuthStore } from '../store/authStore';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [dateFilter, setDateFilter] = useState<string>('');
  const { data: history } = useQuery({ queryKey: ['history'], queryFn: () => matchingApi.history(0, 50), refetchOnMount: 'always' });
  const { data: taskOrders } = useQuery({ queryKey: ['task-orders'], queryFn: () => taskOrdersApi.list(0, 50), refetchOnMount: 'always' });

  const recentItems = history || [];
  
  // 날짜 필터 적용
  const filterByDate = (items: any[]) => {
    if (!dateFilter) return items;
    return items.filter((item: any) => {
      const itemDate = new Date(item.created_at).toISOString().split('T')[0];
      return itemDate === dateFilter;
    });
  };

  const filteredMatching = filterByDate(recentItems.filter((item: any) => item.top_instructor_count < 2));
  const filteredDone = filterByDate(recentItems.filter((item: any) => item.top_instructor_count >= 2));

  const matchedTaskOrderIds = new Set(recentItems.map((item: any) => item.task_order_id));
  const allPendingTaskOrders = (taskOrders?.data || []).filter(
    (to: any) => to.parsed_at && !matchedTaskOrderIds.has(to.id)
  );
  const pendingTaskOrders = dateFilter
    ? allPendingTaskOrders.filter((to: any) => new Date(to.created_at).toISOString().split('T')[0] === dateFilter)
    : allPendingTaskOrders;

  const taskOrderNameMap: Record<string, string> = {};
  (taskOrders?.data || []).forEach((to: any) => { taskOrderNameMap[to.id] = to.file_name; });

  const handleDeleteTaskOrder = async (toId: string) => {
    if (!confirm('이 과업지시서를 삭제하시겠습니까?')) return;
    try {
      await taskOrdersApi.delete(toId);
      toast.success('삭제 완료');
      queryClient.invalidateQueries({ queryKey: ['task-orders'] });
    } catch { toast.error('삭제 실패'); }
  };

  const handleDeleteMatching = async (matchingId: string) => {
    if (!confirm('이 매칭 결과를 삭제하시겠습니까?')) return;
    try {
      await matchingApi.deleteResult(matchingId);
      toast.success('삭제 완료');
      queryClient.invalidateQueries({ queryKey: ['history'] });
    } catch { toast.error('삭제 실패'); }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 보드 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">매칭 보드</h1>
          <p className="text-xs text-gray-400 mt-0.5">과업지시서 업로드부터 강사 선정까지</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Calendar size={14} className="text-gray-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs bg-transparent outline-none text-gray-700 w-[110px]"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="text-gray-400 hover:text-red-500">
                <X size={12} />
              </button>
            )}
          </div>
          <Link to="/task-orders/upload"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus size={14} />
            새 과업지시서
          </Link>
        </div>
      </div>

      {/* 칸반 보드 */}
      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        {/* 과업지시서 분석 */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs font-bold text-gray-700">과업지시서 분석</span>
            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold">{pendingTaskOrders.length}</span>
          </div>
          <div className="flex-1 bg-gray-50/80 rounded-xl p-3 overflow-y-auto space-y-3">
            {pendingTaskOrders.length > 0 ? (
              pendingTaskOrders.map((to: any) => (
                <Link key={to.id} to={`/task-orders/${to.id}`}>
                  <BoardCard
                    icon={<FileText size={14} className="text-blue-500" />}
                    title={to.file_name}
                    tag="분석완료"
                    tagColor="blue"
                    date={to.created_at}
                    userName={user?.name || '나'}
                    onDelete={() => handleDeleteTaskOrder(to.id)}
                  />
                </Link>
              ))
            ) : (
              <EmptyColumn text="과업지시서를 업로드하세요" />
            )}
          </div>
        </div>

        {/* 매칭중 */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs font-bold text-gray-700">매칭중</span>
            <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold">{filteredMatching.length}</span>
          </div>
          <div className="flex-1 bg-gray-50/80 rounded-xl p-3 overflow-y-auto space-y-3">
            {filteredMatching.length > 0 ? (
              filteredMatching.map((item: any) => (
                <Link key={item.id} to={`/matching/${item.id}`}>
                  <BoardCard
                    icon={<Users size={14} className="text-amber-500" />}
                    title={taskOrderNameMap[item.task_order_id] || '매칭 분석'}
                    tag="후보 선정 대기"
                    tagColor="amber"
                    date={item.created_at}
                    userName={user?.name || '나'}
                    onDelete={() => handleDeleteMatching(item.id)}
                  />
                </Link>
              ))
            ) : (
              <EmptyColumn text="매칭 진행 중인 건이 없습니다" />
            )}
          </div>
        </div>

        {/* 완료 */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-bold text-gray-700">완료</span>
            <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded-full font-semibold">{filteredDone.length}</span>
          </div>
          <div className="flex-1 bg-gray-50/80 rounded-xl p-3 overflow-y-auto space-y-3">
            {filteredDone.length > 0 ? (
              filteredDone.map((item: any) => (
                <Link key={item.id} to={`/matching/${item.id}`}>
                  <BoardCard
                    icon={<CheckCircle2 size={14} className="text-green-500" />}
                    title={taskOrderNameMap[item.task_order_id] || '매칭 완료'}
                    tag="강사 선정 완료"
                    tagColor="green"
                    date={item.created_at}
                    userName={user?.name || '나'}
                    onDelete={() => handleDeleteMatching(item.id)}
                  />
                </Link>
              ))
            ) : (
              <EmptyColumn text="완료된 매칭이 없습니다" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardCard({ icon, title, tag, tagColor, date, userName, onDelete }: {
  icon: React.ReactNode;
  title: string;
  tag: string;
  tagColor: string;
  date: string;
  userName?: string;
  onDelete?: () => void;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  const borderColors: Record<string, string> = {
    blue: 'border-l-blue-400',
    green: 'border-l-green-400',
    amber: 'border-l-amber-400',
  };
  return (
    <div className={`bg-white rounded-xl border-l-4 ${borderColors[tagColor]} shadow-sm hover:shadow-md transition-all cursor-pointer group relative p-4`}>
      {onDelete && (
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          className="absolute top-2.5 right-2.5 p-1 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
          <X size={12} />
        </button>
      )}
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-gray-800 group-hover:text-indigo-700 line-clamp-2 leading-relaxed pr-4">{title}</p>
          <div className="flex items-center justify-between mt-3">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${colors[tagColor]}`}>{tag}</span>
            <span className="text-[9px] text-gray-400">{new Date(date).toLocaleDateString('ko-KR')}</span>
          </div>
          {/* 작업자 프로필 */}
          <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-gray-50">
            <div className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-[7px] font-bold text-indigo-600">{(userName || '나').charAt(0)}</span>
            </div>
            <span className="text-[9px] text-gray-400">{userName || '나'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyColumn({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-32">
      <p className="text-[11px] text-gray-400">{text}</p>
    </div>
  );
}
