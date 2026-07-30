import React, { useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus, Filter, Clock,
  CheckCircle2, FileText, Sparkles, MessageSquare, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { matchingApi } from '../api/matching';
import { taskOrdersApi } from '../api/taskOrders';
import { useAuthStore } from '../store/authStore';
import IssueDetailDrawer, { type IssueDetailItem } from '../components/board/IssueDetailDrawer';

// ----------------------------------------------------
// 로컬 타임존 기준 YYYY-MM-DD 변환 유틸리티
// ----------------------------------------------------
const getLocalDateString = (dateStr?: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const STORAGE_KEY_START = 'dashboard_filter_startDate';
const STORAGE_KEY_END = 'dashboard_filter_endDate';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [searchParams, setSearchParams] = useSearchParams();

  // 1. URL 쿼리 파라미터 또는 localStorage에서 영구 필터값 복원
  const startDate = searchParams.get('startDate') ?? localStorage.getItem(STORAGE_KEY_START) ?? '';
  const endDate = searchParams.get('endDate') ?? localStorage.getItem(STORAGE_KEY_END) ?? '';

  // URL 파라미터와 localStorage 동기화
  useEffect(() => {
    const urlStart = searchParams.get('startDate');
    const urlEnd = searchParams.get('endDate');

    if (urlStart === null && urlEnd === null) {
      const savedStart = localStorage.getItem(STORAGE_KEY_START);
      const savedEnd = localStorage.getItem(STORAGE_KEY_END);
      if (savedStart || savedEnd) {
        const params: Record<string, string> = {};
        if (savedStart) params.startDate = savedStart;
        if (savedEnd) params.endDate = savedEnd;
        setSearchParams(params, { replace: true });
      }
    } else {
      if (urlStart) localStorage.setItem(STORAGE_KEY_START, urlStart);
      else localStorage.removeItem(STORAGE_KEY_START);

      if (urlEnd) localStorage.setItem(STORAGE_KEY_END, urlEnd);
      else localStorage.removeItem(STORAGE_KEY_END);
    }
  }, [searchParams, setSearchParams]);

  // Drawer 및 팝오버 상태
  const [selectedIssue, setSelectedIssue] = React.useState<IssueDetailItem | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ----------------------------------------------------
  // 데이터 로딩
  // ----------------------------------------------------
  const { data: history } = useQuery({ queryKey: ['history'], queryFn: () => matchingApi.history(0, 100), refetchOnMount: 'always' });
  const { data: taskOrders } = useQuery({ queryKey: ['task-orders'], queryFn: () => taskOrdersApi.list(0, 100), refetchOnMount: 'always' });

  const recentItems = history || [];

  const isFinalSelected = (item: any) =>
    item.has_final || (item.candidates && item.candidates.some((c: string) => c.startsWith('final_')));

  const allMatching = recentItems.filter((item: any) => !isFinalSelected(item));
  const allDone = recentItems.filter((item: any) => isFinalSelected(item));
  const matchedTaskOrderIds = new Set(recentItems.map((item: any) => item.task_order_id));
  const allPending = (taskOrders?.data || []).filter((taskOrder: any) => !matchedTaskOrderIds.has(taskOrder.id));

  const taskOrderNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (taskOrders?.data || []).forEach((taskOrder: any) => { map[taskOrder.id] = taskOrder.file_name; });
    return map;
  }, [taskOrders]);

  // ----------------------------------------------------
  // 필터링 함수 (날짜 범위)
  // ----------------------------------------------------
  const filterItem = (itemDateStr?: string) => {
    if (!itemDateStr) return true;
    const localDate = getLocalDateString(itemDateStr);
    if (startDate && localDate < startDate) return false;
    if (endDate && localDate > endDate) return false;
    return true;
  };

  const pendingTaskOrders = useMemo(() =>
    allPending.filter((item: any) => filterItem(item.created_at)),
    [allPending, startDate, endDate]
  );

  const matchingItems = useMemo(() =>
    allMatching.filter((item: any) => filterItem(item.created_at)),
    [allMatching, startDate, endDate]
  );

  const doneItems = useMemo(() =>
    allDone.filter((item: any) => filterItem(item.created_at)),
    [allDone, startDate, endDate]
  );

  // ----------------------------------------------------
  // 삭제 처리 핸들러
  // ----------------------------------------------------
  const handleDeleteCard = async (id: string, type: 'task_order' | 'matching' | 'done', title: string) => {
    if (!window.confirm(`'${title}' 항목을 보드에서 삭제하시겠습니까?`)) {
      return;
    }

    try {
      if (type === 'task_order') {
        await taskOrdersApi.delete(id);
      } else {
        await matchingApi.deleteResult(id);
      }

      toast.success('성공적으로 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['task-orders'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    } catch {
      toast.error('삭제 처리 중 오류가 발생했습니다.');
    }
  };

  // ----------------------------------------------------
  // 오늘 날짜 필터링 토글 핸들러
  // ----------------------------------------------------
  const todayStr = getTodayString();
  const isTodayActive = startDate === todayStr && endDate === todayStr;

  const handleToggleToday = () => {
    if (isTodayActive) {
      clearAllFilters();
      toast.success('오늘 날짜 필터가 해제되었습니다.');
    } else {
      updateDates(todayStr, todayStr);
      toast.success(`오늘(${todayStr}) 생성된 리스트만 필터링됩니다.`);
    }
  };

  const updateDates = (start: string, end: string) => {
    if (start) localStorage.setItem(STORAGE_KEY_START, start);
    else localStorage.removeItem(STORAGE_KEY_START);

    if (end) localStorage.setItem(STORAGE_KEY_END, end);
    else localStorage.removeItem(STORAGE_KEY_END);

    const params: Record<string, string> = {};
    if (start) params.startDate = start;
    if (end) params.endDate = end;
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    localStorage.removeItem(STORAGE_KEY_START);
    localStorage.removeItem(STORAGE_KEY_END);
    setSearchParams({});
  };

  const isFilterActive = Boolean(startDate || endDate);

  return (
    <div className="h-full flex flex-col select-none">

      {/* ---------------------------------------------------- */}
      {/* 툴바 컨트롤 바 */}
      {/* ---------------------------------------------------- */}
      <div className="flex items-center justify-end gap-2 mb-5 pb-3 border-b border-slate-200/80 flex-wrap">

        {/* 오늘 버튼 (안 눌렸을 때는 연한 톤, 눌렸을 때는 찐하고 선명한 톤) */}
        <button
          onClick={handleToggleToday}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all border ${isTodayActive
            ? 'bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-sm'
            : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200/80'
            }`}
          title={isTodayActive ? '클릭 시 오늘 필터 해제' : '오늘 생성된 항목만 보기'}
        >
          오늘
        </button>

        {/* 날짜 범위 지정 필터 */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded-lg shadow-2xs transition-all ${isFilterActive && !isTodayActive
              ? 'bg-sky-50 border-sky-300 text-sky-800 font-bold'
              : isFilterActive
                ? 'bg-slate-100 border-slate-300 text-slate-800 font-bold'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
          >
            <Filter size={14} className={isFilterActive ? 'text-sky-700' : 'text-slate-500'} />
            필터 {isFilterActive && <span className="w-1.5 h-1.5 bg-sky-600 rounded-full"></span>}
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 p-4 text-left animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>날짜 범위 필터</span>
                {isFilterActive && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-slate-400 hover:text-red-500 font-normal"
                  >
                    초기화
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1 font-semibold">시작 날짜</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => updateDates(e.target.value, endDate)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 outline-none text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <span className="block text-[11px] text-slate-400 mb-1 font-semibold">기한 (종료 날짜)</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => updateDates(startDate, e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-slate-50 outline-none text-slate-800 font-semibold"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 새 과업지시서 등록 */}
        <Link to="/task-orders/upload" className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-black shadow-xs transition-all ml-1">
          <Plus size={15} /> 새 과업지시서
        </Link>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 보드 뷰 */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">

        {/* 과업지시서 분석 (분석완료: 파란색) */}
        <JiraColumn title="과업지시서 분석" count={pendingTaskOrders.length} statusColor="border-blue-500 bg-blue-100/70">
          {pendingTaskOrders.map((taskOrder: any) => (
            <JiraCard
              key={taskOrder.id}
              title={taskOrder.file_name}
              date={getLocalDateString(taskOrder.created_at)}
              status="과업지시서 분석"
              tag="분석완료"
              tagColor="blue"
              typeIcon={<FileText size={15} className="text-blue-600" />}
              assignee={user?.name || '관리자'}
              onDelete={() => handleDeleteCard(taskOrder.id, 'task_order', taskOrder.file_name)}
              onClick={() => setSelectedIssue({
                id: taskOrder.id,
                type: 'task_order',
                title: taskOrder.file_name,
                status: '과업지시서 분석',
                date: getLocalDateString(taskOrder.created_at),
                assignee: user?.name || '관리자',
                taskOrderId: taskOrder.id,
              })}
            />
          ))}
        </JiraColumn>

        {/* 매칭중 (매칭중: 핑크색) */}
        <JiraColumn title="매칭중" count={matchingItems.length} statusColor="border-pink-500 bg-pink-50/70">
          {matchingItems.map((item: any) => {
            const hasCandidates = item.candidates && item.candidates.length > 0;
            const title = taskOrderNameMap[item.task_order_id] || '매칭 분석';
            return (
              <JiraCard
                key={item.id}
                title={title}
                date={getLocalDateString(item.created_at)}
                status="매칭중"
                tag={hasCandidates ? "후보선정" : "매칭중"}
                tagColor="pink"
                typeIcon={<Sparkles size={15} className="text-pink-600" />}
                assignee={user?.name || '관리자'}
                onDelete={() => handleDeleteCard(item.id, 'matching', title)}
                onClick={() => setSelectedIssue({
                  id: item.id,
                  type: 'matching',
                  title: title,
                  status: '매칭중',
                  date: getLocalDateString(item.created_at),
                  assignee: user?.name || '관리자',
                  matchingId: item.id,
                })}
              />
            );
          })}
        </JiraColumn>

        {/* 완료 (완료: 초록색) */}
        <JiraColumn title="완료" count={doneItems.length} statusColor="border-emerald-500 bg-emerald-50/70">
          {doneItems.map((item: any) => {
            const title = taskOrderNameMap[item.task_order_id] || '매칭 완료';
            return (
              <JiraCard
                key={item.id}
                title={title}
                date={getLocalDateString(item.created_at)}
                status="완료"
                tag="강사선정 완료"
                tagColor="green"
                typeIcon={<CheckCircle2 size={15} className="text-emerald-600" />}
                assignee={user?.name || '관리자'}
                memo={item.memo}
                memoAuthor={item.memo_author_name}
                onDelete={() => handleDeleteCard(item.id, 'done', title)}
                onClick={() => setSelectedIssue({
                  id: item.id,
                  type: 'done',
                  title: title,
                  status: '완료',
                  date: getLocalDateString(item.created_at),
                  assignee: user?.name || '관리자',
                  memo: item.memo,
                  memoAuthor: item.memo_author_name,
                  matchingId: item.id,
                })}
              />
            );
          })}
        </JiraColumn>

      </div>

      {/* 이슈 상세 Drawer */}
      <IssueDetailDrawer
        item={selectedIssue}
        onClose={() => setSelectedIssue(null)}
        onUpdateMemo={() => {
          queryClient.invalidateQueries({ queryKey: ['history'] });
        }}
      />

    </div>
  );
}

// ----------------------------------------------------
// 하위 컴포넌트: JiraColumn & JiraCard
// ----------------------------------------------------
function JiraColumn({ title, count, statusColor, children }: { title: string; count: number; statusColor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-0 bg-slate-100/60 border border-slate-200/90 rounded-xl shadow-2xs">
      {/* 컬럼 헤더 */}
      <div className={`flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200/80 bg-white/90 rounded-t-xl`}>
        <div className={`w-2.5 h-2.5 rounded-full border ${statusColor}`} />
        <span className="text-xs font-bold text-slate-800 tracking-tight text-center flex-1">{title}</span>
        <span className="text-[11px] font-extrabold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>

      {/* 카드 컨테이너 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {React.Children.count(children) > 0 ? children : (
          <div className="text-center py-12">
            <p className="text-xs text-slate-400">표시할 항목이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function JiraCard({
  title,
  date,
  status,
  tag,
  tagColor,
  typeIcon,
  assignee,
  memo,
  memoAuthor,
  onDelete,
  onClick
}: {
  title: string;
  date: string;
  status: string;
  tag: string;
  tagColor: string;
  typeIcon: React.ReactNode;
  assignee: string;
  memo?: string;
  memoAuthor?: string;
  onDelete: () => void;
  onClick: () => void;
}) {
  const tagColors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    pink: 'bg-pink-50 text-pink-700 border-pink-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  };

  const commentAuthor = memoAuthor || assignee;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer group relative flex flex-col justify-between"
    >
      {/* 카드 상단: 아이콘, 날짜 & 삭제 버튼 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {typeIcon}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <Clock size={10} /> {date}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
            title="삭제"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* 카드 제목 */}
      <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 pr-2 mb-3">{title}</p>

      {/* 코멘트 요약 */}
      {memo && status === '완료' && (
        <div className="mb-3 text-[11px] bg-slate-50/90 p-2 rounded-lg border border-slate-200/80 flex items-center gap-1.5 font-medium text-slate-700 min-w-0">
          <MessageSquare size={12} className="text-slate-500 shrink-0" />
          <span className="font-bold text-slate-900 shrink-0">{commentAuthor}:</span>
          <span className="truncate text-slate-700">{memo}</span>
        </div>
      )}

      {/* 하단: 태그 & 담당자 아바타 */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${tagColors[tagColor] || tagColors.blue}`}>
          {tag}
        </span>

        <div className="flex items-center">
          <div className="w-5.5 h-5.5 rounded-full bg-amber-100 border border-amber-200 text-slate-900 flex items-center justify-center font-bold text-[10px] shadow-2xs" title={assignee}>
            {assignee.charAt(0)}
          </div>
        </div>
      </div>
    </div>
  );
}
