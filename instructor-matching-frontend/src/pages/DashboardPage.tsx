import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { matchingApi } from '../api/matching';
import { taskOrdersApi } from '../api/taskOrders';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: history } = useQuery({ queryKey: ['history'], queryFn: () => matchingApi.history(0, 20), refetchOnMount: 'always' });
  const { data: taskOrders } = useQuery({ queryKey: ['task-orders'], queryFn: () => taskOrdersApi.list(0, 20), refetchOnMount: 'always' });

  const recentItems = history || [];
  
  // 매칭중 = 후보 선정 중 (final_ 없음 = count < 2), 완료 = 강사 선정됨 (final_ 있음 = count >= 2)
  // 매칭 실행만 하고 아무것도 안 한 건(count=0)도 매칭중으로 표시
  const matchingItems = recentItems.filter((item: any) => item.top_instructor_count < 2);
  const doneItems = recentItems.filter((item: any) => item.top_instructor_count >= 2);

  // 과업지시서 파싱 완료되었지만 아직 매칭되지 않은 과업지시서
  const matchedTaskOrderIds = new Set(recentItems.map((item: any) => item.task_order_id));
  const pendingTaskOrders = (taskOrders?.data || []).filter(
    (to: any) => to.parsed_at && !matchedTaskOrderIds.has(to.id)
  );

  // task_order_id → 파일명 매핑
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
        <h1 className="text-xl font-bold text-gray-900">보드</h1>
        <Link to="/task-orders/upload"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors">
          <Plus size={14} />
          새 매칭
        </Link>
      </div>

      {/* 칸반 보드 */}
      <div className="flex-1 flex gap-4">
        {/* 과업지시서 분석 */}
        <Column title="과업지시서 분석" color="text-blue-600">
          {pendingTaskOrders.length > 0 ? (
            pendingTaskOrders.map((to: any) => (
              <Link key={to.id} to={`/task-orders/${to.id}`}>
                <Card
                  title={to.file_name}
                  tag="분석완료"
                  tagColor="blue"
                  subtitle={new Date(to.created_at).toLocaleDateString('ko-KR')}
                  onDelete={() => handleDeleteTaskOrder(to.id)}
                />
              </Link>
            ))
          ) : (
            <EmptyColumn text="과업지시서를 업로드하면 여기에 표시됩니다" />
          )}
        </Column>

        {/* 매칭중 */}
        <Column title="매칭중" color="text-amber-600">
          {matchingItems.length > 0 ? (
            matchingItems.map((item: any) => (
              <Link key={item.id} to={`/matching/${item.id}`}>
                <Card
                  title={taskOrderNameMap[item.task_order_id] || '매칭 분석'}
                  tag="강사선정 대기"
                  tagColor="orange"
                  subtitle={new Date(item.created_at).toLocaleDateString('ko-KR')}
                  onDelete={() => handleDeleteMatching(item.id)}
                />
              </Link>
            ))
          ) : (
            <EmptyColumn text="매칭 진행 중인 건이 없습니다" />
          )}
        </Column>

        {/* 완료 */}
        <Column title="완료" color="text-green-600">
          {doneItems.length > 0 ? (
            doneItems.map((item: any) => (
              <Link key={item.id} to={`/matching/${item.id}`}>
                <Card
                  title={taskOrderNameMap[item.task_order_id] || '매칭 완료'}
                  tag={`강사 선정 완료`}
                  tagColor="green"
                  subtitle={new Date(item.created_at).toLocaleDateString('ko-KR')}
                  onDelete={() => handleDeleteMatching(item.id)}
                />
              </Link>
            ))
          ) : (
            <EmptyColumn text="완료된 매칭이 없습니다" />
          )}
        </Column>
      </div>
    </div>
  );
}

function Column({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-[260px]">
      <div className="flex items-center justify-center mb-3">
        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title}</span>
      </div>
      <div className="space-y-2.5 bg-gray-100/50 rounded-lg p-2.5 min-h-[200px]">
        {children}
      </div>
    </div>
  );
}

function Card({ title, tag, tagColor, subtitle, onDelete }: { title: string; tag: string; tagColor: string; subtitle: string; onDelete?: () => void }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
  };
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3.5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group relative">
      {onDelete && (
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
          <X size={14} />
        </button>
      )}
      <p className="text-[13px] font-medium text-gray-800 group-hover:text-blue-700 mb-2 pr-6 line-clamp-2">{title}</p>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[tagColor]}`}>{tag}</span>
      <div className="flex items-center justify-end mt-3 pt-2 border-t border-gray-50">
        <span className="text-[10px] text-gray-400">{subtitle}</span>
      </div>
    </div>
  );
}

function EmptyColumn({ text }: { text: string }) {
  return <div className="text-xs text-gray-400 text-center py-8">{text}</div>;
}
