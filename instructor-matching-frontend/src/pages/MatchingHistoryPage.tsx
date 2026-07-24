import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Target, ArrowRight, CheckCircle } from 'lucide-react';
import { matchingApi } from '../api/matching';
import { taskOrdersApi } from '../api/taskOrders';

export default function MatchingHistoryPage() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['matching-history-all'],
    queryFn: () => matchingApi.history(0, 50),
  });
  const { data: taskOrders } = useQuery({
    queryKey: ['task-orders-for-history'],
    queryFn: () => taskOrdersApi.list(0, 50),
  });

  // task_order_id → 파일명 매핑
  const nameMap: Record<string, string> = {};
  (taskOrders?.data || []).forEach((to: any) => { nameMap[to.id] = to.file_name; });

  // 완료된 매칭만 표시 (강사 선정됨 = final_ 접두사 있음)
  const completedItems = (history || []).filter((item: any) => item.top_instructor_count >= 1);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-900">매칭 결과</h1>
        <p className="text-sm text-gray-500 mt-0.5">최종 후보가 선정된 매칭 결과를 확인할 수 있습니다</p>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">로딩 중...</div>
        ) : completedItems.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {completedItems.map((item: any) => (
              <Link key={item.id} to={`/matching/${item.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-blue-50/30 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                    <CheckCircle size={16} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700">
                      {nameMap[item.task_order_id] || '과업지시서 매칭'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-semibold">
                    후보 {item.top_instructor_count}명 선정
                  </span>
                  <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <Target size={28} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-1">완료된 매칭 결과가 없습니다</p>
            <p className="text-xs text-gray-300 mb-4">과업지시서 매칭 후 후보를 선정하면 여기에 표시됩니다</p>
            <Link to="/task-orders/upload" className="text-xs text-blue-600 font-medium hover:underline">
              과업지시서 업로드하기 →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
