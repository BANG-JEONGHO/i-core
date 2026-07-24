import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Play, CheckCircle, AlertCircle, ChevronDown, ChevronUp, RefreshCw, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { taskOrdersApi } from '../api/taskOrders';
import { matchingApi } from '../api/matching';
import type { TaskOrder } from '../types';

export default function TaskOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [matching, setMatching] = useState(false);
  const [reparsing, setReparsing] = useState(false);

  const { data: taskOrder, isLoading } = useQuery({
    queryKey: ['task-order', id],
    queryFn: () => taskOrdersApi.get(id!),
    enabled: !!id,
  });

  const handleMatch = async () => {
    if (!id) return;
    setMatching(true);
    try {
      const result = await matchingApi.execute(id);
      toast.success('매칭 완료!');
      navigate(`/matching/${result.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '매칭에 실패했습니다');
    } finally {
      setMatching(false);
    }
  };

  if (isLoading) return <div className="py-16 text-center text-sm text-gray-400">로딩 중...</div>;
  if (!taskOrder) return <div className="py-16 text-center text-sm text-gray-400">과업지시서를 찾을 수 없습니다.</div>;

  const hasOverview = Boolean(taskOrder.overview?.summary || taskOrder.overview?.matching_rules?.length);
  const hasData = (taskOrder.qualifications?.length > 0) || (taskOrder.evaluation_criteria?.length > 0) || hasOverview;

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 140px)' }}>
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">과업지시서 분석 결과</h1>
          <div className="flex items-center gap-2 mt-1">
            <FileText size={14} className="text-gray-400" />
            <span className="text-sm text-gray-500">{taskOrder.file_name}</span>
            {taskOrder.parsed_at && (
              <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <CheckCircle size={10} />
                파싱 완료
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleMatch}
          disabled={matching || !hasData}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Play size={16} />
          {matching ? '매칭 중...' : '매칭 시작'}
        </button>
      </div>

      {!hasData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 mb-4">
          <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">파싱된 데이터가 없습니다</p>
            <p className="text-xs text-amber-600 mt-0.5">문서에서 신청자격/평가기준을 자동 추출하지 못했습니다. 지원하는 형식인지 확인해 주세요.</p>
          </div>
          <button
            disabled={reparsing}
            onClick={async () => {
              if (!id) return;
              setReparsing(true);
              try {
                await taskOrdersApi.reparse(id);
                toast.success('재파싱이 완료되었습니다.');
                await queryClient.invalidateQueries({ queryKey: ['task-order', id] });
              } catch (error: any) {
                toast.error(error.response?.data?.detail || '재파싱에 실패했습니다.');
              } finally { setReparsing(false); }
            }}
            className="shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            <RefreshCw size={12} className={reparsing ? 'animate-spin' : ''} />
            {reparsing ? '파싱 중...' : '재파싱'}
          </button>
        </div>
      )}

      {hasOverview && <OverviewCard overview={taskOrder.overview} />}

      <div className="grid grid-cols-2 gap-5 flex-1 min-h-0">
        {/* 신청자격 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">신청자격 / 참여자격</h2>
              <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                {taskOrder.qualifications?.length || 0}건
              </span>
            </div>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {taskOrder.qualifications?.length > 0 ? (
              taskOrder.qualifications.map((q: any, i: number) => (
                <QualCard key={i} item={q} />
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">추출된 자격 요건이 없습니다</p>
            )}
          </div>
        </div>

        {/* 평가기준 */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">평가기준</h2>
              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                {taskOrder.evaluation_criteria?.length || 0}건
              </span>
            </div>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {taskOrder.evaluation_criteria?.length > 0 ? (
              taskOrder.evaluation_criteria.map((e: any, i: number) => (
                <EvalCard key={i} item={e} />
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">추출된 평가기준이 없습니다</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({ overview }: { overview: TaskOrder['overview'] }) {
  const [expanded, setExpanded] = useState(false);
  const rules = overview.matching_rules || [];

  return (
    <section className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-900">과업 핵심 요약</h2>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">매칭 반영</span>
          </div>
          <p className="text-sm text-gray-700 mt-2 leading-6">{overview.summary}</p>
        </div>
        <button
          onClick={() => setExpanded((value) => !value)}
          className="shrink-0 text-xs text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
        >
          {expanded ? '근거 접기' : '근거 보기'}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {rules.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {rules.slice(0, 5).flatMap((rule) => rule.values.slice(0, 3).map((value) => (
            <span key={`${rule.key}-${value}`} className="text-[11px] bg-white text-indigo-700 border border-indigo-100 px-2 py-1 rounded-full">
              {rule.label}: {value}
            </span>
          )))}
        </div>
      )}

      {expanded && (
        <div className="mt-4 pt-4 border-t border-indigo-100 space-y-3">
          {overview.section_titles?.length > 0 && (
            <p className="text-xs text-gray-500">인식된 섹션: {overview.section_titles.join(', ')}</p>
          )}
          {rules.map((rule) => (
            <div key={rule.key} className="text-xs">
              <span className="font-medium text-gray-700">{rule.label}</span>
              <span className="text-gray-600"> · {rule.values.join(', ')}</span>
            </div>
          ))}
          {overview.source_excerpt && (
            <p className="text-xs text-gray-500 whitespace-pre-line bg-white/70 rounded-lg p-3 leading-5">
              {overview.source_excerpt}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function QualCard({ item }: { item: any }) {
  return (
    <div className="border border-gray-100 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-gray-800 line-clamp-3">{item.description}</p>
        {item.is_mandatory ? (
          <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-bold shrink-0">필수</span>
        ) : (
          <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold shrink-0">우대</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.category}</span>
        {item.keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.keywords.slice(0, 5).map((kw: string) => (
              <span key={kw} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{kw}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EvalCard({ item }: { item: any }) {
  return (
    <div className="border border-gray-100 rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-gray-800 line-clamp-3">{item.description}</p>
        {item.weight && (
          <span className="text-[10px] font-bold text-purple-600 shrink-0">{item.weight}점</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{item.category}</span>
        {item.keywords?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.keywords.slice(0, 5).map((kw: string) => (
              <span key={kw} className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">{kw}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
