import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Target, ArrowRight, CheckCircle2, Calendar, FileText, MessageSquare, ExternalLink } from 'lucide-react';
import { matchingApi } from '../api/matching';
import { taskOrdersApi } from '../api/taskOrders';

export default function MatchingHistoryPage() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['matching-history-all'],
    queryFn: () => matchingApi.history(0, 100),
  });

  const { data: taskOrders } = useQuery({
    queryKey: ['task-orders-for-history'],
    queryFn: () => taskOrdersApi.list(0, 100),
  });

  // task_order_id → 파일명 매핑
  const nameMap: Record<string, string> = {};
  (taskOrders?.data || []).forEach((to: any) => { nameMap[to.id] = to.file_name; });

  // 완료된 매칭만 표시 (강사 최종 선정 완료된 항목)
  const isFinalSelected = (item: any) =>
    item.has_final || (item.candidates && item.candidates.some((c: string) => c.startsWith('final_')));

  const completedItems = (history || []).filter((item: any) => isFinalSelected(item));

  return (
    <div className="h-full flex flex-col space-y-5 select-none">
      
      {/* 헤더 */}
      <div className="pb-1">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          매칭 결과
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full font-bold">
            완료 {completedItems.length}건
          </span>
        </h1>
        <p className="text-xs font-normal text-slate-500 mt-1">
          강사 선정이 최종 완료된 매칭 과업 목록을 확인합니다.
        </p>
      </div>

      {/* 메인 콘텐츠 영역 (모던 카드 그리드 레이아웃) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="py-20 text-center text-xs font-normal text-slate-400">
            매칭 결과를 불러오는 중...
          </div>
        ) : completedItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-6">
            {completedItems.map((item: any) => {
              const fileName = nameMap[item.task_order_id] || '과업지시서 매칭';

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
                >
                  {/* 상단 뱃지 및 날짜 */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={18} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(item.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* 과업지시서 제목 */}
                    <h3 className="text-sm font-bold text-slate-900 leading-relaxed line-clamp-2 mb-3">
                      {fileName}
                    </h3>

                    {/* 담당자 코멘트 요약 (있을 경우만) */}
                    {item.memo && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-lg font-medium mb-1">
                        <MessageSquare size={12} className="text-amber-600 shrink-0" />
                        {item.memo_author_name && (
                          <span className="font-bold text-slate-900 shrink-0">{item.memo_author_name}:</span>
                        )}
                        <span className="truncate">{item.memo}</span>
                      </div>
                    )}
                  </div>

                  {/* 카드 하단 분리 액션 바 */}
                  <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                    {/* 과업지시서 내용 확인 바로가기 */}
                    <Link
                      to={`/task-orders/${item.task_order_id}`}
                      className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 transition-colors font-medium"
                      title="과업지시서 분석 내용 보기"
                    >
                      <FileText size={12} className="text-slate-400" /> 과업지시서 내용 확인
                    </Link>

                    {/* 매칭 결과 보기 바로가기 */}
                    <Link
                      to={`/matching/${item.id}`}
                      className="flex items-center gap-1 text-[11px] text-slate-900 font-bold hover:text-blue-700 transition-colors"
                      title="선정된 매칭 결과 확인"
                    >
                      매칭 결과 보기 <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-24 text-center bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <Target size={36} className="text-slate-300 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-700 mb-1">완료된 매칭 결과가 없습니다.</p>
            <p className="text-xs text-slate-400 mb-4">과업지시서 매칭 실행 후 최종 강사를 선정하면 여기에 자동으로 등록됩니다.</p>
            <Link 
              to="/task-orders/upload" 
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg shadow-2xs transition-all"
            >
              새 과업지시서 분석하기 <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}
