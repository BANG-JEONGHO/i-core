import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Phone, Mail, Sparkles, UserCheck, UserPlus, FileCheck, Printer, ExternalLink, X, MapPin, GraduationCap, Briefcase, BookOpen, Award, Layers, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { matchingApi } from '../api/matching';
import { instructorsApi } from '../api/instructors';
import { taskOrdersApi } from '../api/taskOrders';
import type { MatchScore, Instructor, ScoreBreakdown } from '../types';

// React JSX에 객체가 직접 렌더링되어 Crash 나는 현상을 100% 방지하는 안전 변환 함수
function renderSafeText(data: any): string {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    if (typeof data.summary === 'string') return data.summary;
    if (Array.isArray(data)) {
      return data
        .map((item) => (typeof item === 'string' ? item : item.description || JSON.stringify(item)))
        .filter(Boolean)
        .join('\n');
    }
    return data.summary ? String(data.summary) : JSON.stringify(data);
  }
  return String(data);
}

// raw JSON 문자열 또는 객체를 안심하고 객체화하는 파싱 헬퍼 함수
function parseHistoryItem(rawItem: any) {
  if (!rawItem) return {};
  if (typeof rawItem === 'string') {
    try {
      const parsed = JSON.parse(rawItem);
      if (typeof parsed === 'object' && parsed !== null) return parsed;
      return { title: rawItem };
    } catch {
      return { title: rawItem };
    }
  }
  return rawItem;
}

export default function MatchingResultPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<MatchScore | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const [candidates, setCandidates] = useState<Set<string>>(new Set());
  const [finalSelected, setFinalSelected] = useState<string | null>(null);

  // 강사 프로필 이력 Drawer 상태
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<'lecture' | 'qualification'>('lecture');

  // 매칭 결과 정보
  const { data: result, isLoading } = useQuery({
    queryKey: ['matching-result', id],
    queryFn: () => matchingApi.get(id!),
    enabled: !!id,
  });

  // 과업지시서 세부 정보
  const { data: taskOrder } = useQuery({
    queryKey: ['task-order-detail', result?.task_order_id],
    queryFn: () => taskOrdersApi.get(result!.task_order_id),
    enabled: !!result?.task_order_id,
  });

  // 후보 및 최종선정 강사 초기화 & 진입 시 자동으로 최종선정(또는 후보 강사, 없으면 1위) 강사 선택
  useEffect(() => {
    if (result) {
      if (result.candidates) {
        const cands = result.candidates;
        setCandidates(new Set(cands));
        const finalItem = cands.find((c: string) => c.startsWith('final_'));
        const finalId = finalItem ? finalItem.replace('final_', '') : null;
        setFinalSelected(finalId);

        // 후보 강사 중 final_ 접두사가 아닌 첫 번째 후보 강사 ID 찾기
        const normalCandidates = cands.filter((c: string) => !c.startsWith('final_'));
        const firstCandidateId = normalCandidates.length > 0 ? normalCandidates[0] : null;

        if (result.results && result.results.length > 0) {
          // 이미 유저가 강사를 클릭하여 selected 상태가 있으면 보존! 없을 때만 초기 target 설정
          setSelected(prevSelected => {
            if (prevSelected) {
              const refreshed = result.results.find(r => r.instructor_id === prevSelected.instructor_id);
              return refreshed || prevSelected;
            }
            return (
              result.results.find((r) => r.instructor_id === finalId) ||
              result.results.find((r) => r.instructor_id === firstCandidateId) ||
              result.results[0]
            );
          });
        }
      } else if (result.results && result.results.length > 0) {
        setSelected(prevSelected => prevSelected || result.results[0]);
      }
    }
  }, [result]);

  useEffect(() => {
    if (selected) {
      instructorsApi.get(selected.instructor_id)
        .then(setSelectedInstructor)
        .catch(() => setSelectedInstructor(null));
    }
  }, [selected]);

  const handleCandidate = async (instructorId: string) => {
    if (!id) return;
    try {
      if (candidates.has(instructorId)) {
        await matchingApi.removeCandidate(id, instructorId);
        setCandidates(prev => { const next = new Set(prev); next.delete(instructorId); return next; });
        if (finalSelected === instructorId) setFinalSelected(null);
      } else {
        await matchingApi.addCandidate(id, instructorId);
        setCandidates(prev => { const next = new Set(prev); next.add(instructorId); return next; });
        toast.success('후보 선정 완료');
      }
      queryClient.invalidateQueries({ queryKey: ['matching-result', id] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    } catch { toast.error('저장 실패'); }
  };

  const handleFinalSelect = async (instructorId: string) => {
    if (!id) return;
    try {
      for (const cid of candidates) {
        if (cid !== instructorId) await matchingApi.removeCandidate(id, cid);
      }
      if (!candidates.has(instructorId)) await matchingApi.addCandidate(id, instructorId);
      await matchingApi.addCandidate(id, `final_${instructorId}`);
      setCandidates(new Set([instructorId, `final_${instructorId}`]));
      setFinalSelected(instructorId);
      toast.success('강사 선정 완료!');
      queryClient.invalidateQueries({ queryKey: ['matching-result', id] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    } catch { toast.error('저장 실패'); }
  };

  // PDF 내보내기 / 인쇄 핸들러
  const handlePrintPdf = () => {
    window.print();
  };

  if (isLoading) return <div className="py-16 text-center text-xs font-semibold text-slate-400">결과를 불러오는 중...</div>;
  if (!result) return <div className="py-16 text-center text-xs font-semibold text-slate-400">결과가 없습니다.</div>;

  const top20 = result.results ? result.results.slice(0, 20) : [];

  return (
    <div className="h-full flex flex-col select-none overflow-hidden">
      
      {/* ---------------------------------------------------- */}
      {/* 화면용 인쇄/PDF 스타일 정의 */}
      {/* ---------------------------------------------------- */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            font-size: 12pt;
          }
          aside, header, nav, .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      {/* ---------------------------------------------------- */}
      {/* 웹 UI 헤더 & PDF 버튼 */}
      {/* ---------------------------------------------------- */}
      <div className="no-print mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-200/80 shrink-0">
        <div>
          <h1 className="text-base font-bold text-slate-800 tracking-tight">
            {taskOrder?.file_name || '매칭 결과 분석 보고서'}
          </h1>
          <p className="text-[11px] font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
            <span>상위 적합 강사 추천 및 AI 심층 분석</span>
            {finalSelected && <span className="text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full text-[10px]">· 강사 선정 완료</span>}
            {!finalSelected && candidates.size > 0 && <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full text-[10px]">· 후보 선정 진행 중 ({candidates.size}명)</span>}
          </p>
        </div>

        {/* 상단 상시 노출 PDF 출력 버튼 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Printer size={14} className="text-amber-300" />
            PDF 보고서 출력
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 웹 화면 메인 레이아웃 (no-print) */}
      {/* ---------------------------------------------------- */}
      <div className="no-print flex gap-4 flex-1 min-h-0">
        {/* 강사 목록 (좌측) */}
        <div className="flex-1 bg-white border border-slate-200/90 rounded-xl overflow-y-auto shadow-2xs">
          {top20.map((s, idx) => {
            const isSelected = selected?.instructor_id === s.instructor_id;
            return (
              <button
                key={s.instructor_id}
                onClick={() => setSelected(s)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left border-b border-slate-100 last:border-none transition-all cursor-pointer ${
                  isSelected ? 'bg-slate-100/90 font-bold border-l-4 border-l-slate-900' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-mono font-bold text-slate-400 w-5 text-center">{idx + 1}</span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-[11px] shrink-0 shadow-2xs ${
                    isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {s.instructor_name.charAt(0)}
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">{s.instructor_name}</span>
                  {finalSelected === s.instructor_id && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-extrabold shrink-0">
                      최종 선정
                    </span>
                  )}
                  {candidates.has(s.instructor_id) && finalSelected !== s.instructor_id && (
                    <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded font-bold shrink-0 shadow-2xs">
                      ★ 후보
                    </span>
                  )}
                </div>
                <Score value={s.total_score} />
              </button>
            );
          })}
        </div>

        {/* 강사 상세 분석 카드 (우측) */}
        <div className="w-[370px] bg-white border border-slate-200/90 rounded-xl overflow-y-auto shadow-2xs flex flex-col shrink-0">
          {selected ? (
            <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
              <div className="space-y-3.5">
                {/* 상단 강사 프로필 헤더 */}
                <div className="pb-3 border-b border-slate-100">
                  {/* 동그라미 아바타 라인 & 우측 끝 이력보기 버튼 */}
                  <div className="relative flex items-center justify-center mb-2">
                    <div className="w-11 h-11 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center font-extrabold text-sm text-slate-800 shadow-2xs">
                      {selected.instructor_name.charAt(0)}
                    </div>

                    <button
                      onClick={() => setIsProfileDrawerOpen(true)}
                      title="강사 상세 이력 & 자격증 확인"
                      className="absolute right-0 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs hover:scale-102"
                    >
                      <FileText size={13} className="text-indigo-600" />
                      <span>이력보기</span>
                      <ExternalLink size={11} className="text-indigo-400" />
                    </button>
                  </div>
                  
                  {/* 강사 이름 & 선정/후보 뱃지 */}
                  <div className="flex items-center justify-center gap-2">
                    <h2 className="text-sm font-extrabold text-slate-900">
                      {selected.instructor_name}
                    </h2>
                    {finalSelected === selected.instructor_id && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                        선정 강사
                      </span>
                    )}
                    {candidates.has(selected.instructor_id) && finalSelected !== selected.instructor_id && (
                      <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-md font-bold shadow-2xs">
                        ★ 후보 지정 강사
                      </span>
                    )}
                  </div>
                </div>

                {/* 연락처 블록 */}
                {selectedInstructor && (selectedInstructor.contact || selectedInstructor.email) && (
                  <div className="bg-slate-50/90 border border-slate-200/70 rounded-lg p-2.5 space-y-1 text-[11px]">
                    {selectedInstructor.contact && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone size={12} className="text-slate-400 shrink-0" />
                        <span className="font-semibold">{selectedInstructor.contact}</span>
                      </div>
                    )}
                    {selectedInstructor.email && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Mail size={12} className="text-slate-400 shrink-0" />
                        <span className="font-semibold truncate">{selectedInstructor.email}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 도넛 차트 & 총점 분석 요약 */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <FileCheck size={14} className="text-slate-700" />
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                      {hasAgentReview(selected.breakdown) ? 'AI 검증 항목' : '후보 검색 항목'}
                    </h3>
                  </div>

                  <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3">
                    <DonutChart score={selected.total_score} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">총점 매칭 분석</span>
                      <p className="text-base font-extrabold text-slate-900 tracking-tight leading-tight">
                        {formatScore(selected.total_score)} <span className="text-[10px] text-slate-500 font-semibold">/ 100점</span>
                      </p>
                      <p className="text-[10px] font-medium text-slate-500 leading-tight mt-0.5 truncate">
                        {selected.total_score >= 70 ? '요구조건 우수 부합' : selected.total_score >= 40 ? '주요 조건 충족' : '일부 조건 미흡'}
                      </p>
                    </div>
                  </div>

                  {/* 세부 항목 막대 차트 카드 리스트 */}
                  <div className="space-y-2 bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
                    {getScoreRows(selected).map((row) => (
                      <BarChartRow key={row.criterion} label={row.label} score={row.score} max={row.maxScore} />
                    ))}
                  </div>
                </div>

                {/* AI 추천 분석 소평 */}
                <AiReasonSection matchingId={id!} instructorId={selected.instructor_id} key={selected.instructor_id} />
              </div>

              {/* 하단 액션 버튼 */}
              <div className="border-t border-slate-200/80 pt-3 space-y-1.5 mt-2">
                {!candidates.has(selected.instructor_id) && (
                  <button
                    onClick={() => handleCandidate(selected.instructor_id)}
                    className="w-full py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus size={13} /> 후보 선정
                  </button>
                )}
                {candidates.has(selected.instructor_id) && finalSelected !== selected.instructor_id && (
                  <div className="space-y-1.5">
                    <button
                      onClick={() => handleFinalSelect(selected.instructor_id)}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck size={13} /> 최종 강사 선정
                    </button>
                    <button
                      onClick={() => handleCandidate(selected.instructor_id)}
                      className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-all border border-slate-200 cursor-pointer"
                    >
                      후보 지정 해제
                    </button>
                  </div>
                )}
                {finalSelected === selected.instructor_id && (
                  <div className="text-center py-1.5 bg-emerald-50 border border-emerald-200/90 rounded-lg">
                    <span className="text-[11px] font-extrabold text-emerald-800 flex items-center justify-center gap-1">
                      <CheckCircle size={13} /> 최종 강사 선정 완료
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
              <Sparkles size={22} className="text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-400 leading-relaxed">
                좌측 목록에서 강사를 선택하시면<br />상세 매칭 차트가 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 강사 상세 이력 Slide-over Drawer 패널 */}
      {/* ---------------------------------------------------- */}
      {isProfileDrawerOpen && selectedInstructor && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-2xs transition-opacity animate-fadeIn no-print"
          onClick={() => setIsProfileDrawerOpen(false)}
        >
          <div
            className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 드로어 헤더 */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{selectedInstructor.name} 강사 상세 프로필</span>
                <span className="text-xs bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full font-bold">
                  인증 강사
                </span>
              </div>
              <button
                onClick={() => setIsProfileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 강사 서머리 카드 */}
            <div className="p-6 bg-slate-50/60 border-b border-slate-100 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-center font-extrabold text-xl shadow-md shrink-0">
                  {selectedInstructor.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{selectedInstructor.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedInstructor.affiliation || '소속 정보 없음'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl flex items-center gap-2">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-semibold truncate">{selectedInstructor.region || '지역 미지정'}</span>
                </div>
                <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl flex items-center gap-2">
                  <GraduationCap size={14} className="text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-semibold truncate">{selectedInstructor.degree || selectedInstructor.school || '학위 정보 없음'}</span>
                </div>
                <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl flex items-center gap-2">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-semibold truncate">{selectedInstructor.contact || '연락처 미등록'}</span>
                </div>
                <div className="bg-white border border-slate-200/80 p-2.5 rounded-xl flex items-center gap-2">
                  <Mail size={14} className="text-slate-400 shrink-0" />
                  <span className="text-slate-700 font-semibold truncate">{selectedInstructor.email || '이메일 미등록'}</span>
                </div>
              </div>
            </div>

            {/* 탭 버튼 */}
            <div className="flex border-b border-slate-200 bg-white px-6">
              <button
                onClick={() => setHistoryTab('lecture')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  historyTab === 'lecture' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                강의 수행 이력
              </button>
              <button
                onClick={() => setHistoryTab('qualification')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  historyTab === 'qualification' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                자격증 / 저서 / 경력
              </button>
            </div>

            {/* 탭 내용 리스트 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/30">
              {historyTab === 'lecture' ? (
                selectedInstructor.lecture_history && selectedInstructor.lecture_history.length > 0 ? (
                  selectedInstructor.lecture_history.map((rawItem: any, idx: number) => (
                    <LectureCard key={idx} raw={rawItem} />
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-10">등록된 강의 수행 이력이 없습니다.</p>
                )
              ) : (
                <GroupedQualSection items={selectedInstructor.qualifications_career || []} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* PDF 전용 인쇄 양식 서식 (print-only) */}
      {/* ---------------------------------------------------- */}
      <div className="print-only p-8 space-y-8 font-sans">
        
        {/* 문서 타이틀 헤더 */}
        <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">iCore AI 강사 매칭 결과 분석 보고서</span>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {taskOrder?.file_name || '과업지시서 AI 분석 결과 보고서'}
            </h1>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>발행일자: {new Date().toLocaleDateString('ko-KR')}</p>
            <p className="font-bold text-slate-800">상태: {finalSelected ? '최종 강사 선정 완료' : '후보 검토 진행 중'}</p>
          </div>
        </div>

        {/* 1. 과업지시서 주요 내용 요약 */}
        {taskOrder && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-900 border-l-4 border-slate-900 pl-2.5">
              1. 과업지시서 핵심 요구사항
            </h2>
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-700 block mb-1">■ 과업 개요:</span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{renderSafeText(taskOrder.overview) || '개요 정보 없음'}</p>
              </div>
              {taskOrder.qualifications && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">■ 필수 자격요건:</span>
                  <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{renderSafeText(taskOrder.qualifications)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. 매칭 결과 상위 강사 표 */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 border-l-4 border-slate-900 pl-2.5">
            2. 적합 강사 매칭 결과 (TOP 10)
          </h2>
          
          <table className="w-full text-xs text-left border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                <th className="p-2.5 border-r border-slate-200 text-center w-12">순위</th>
                <th className="p-2.5 border-r border-slate-200">강사명</th>
                <th className="p-2.5 border-r border-slate-200 text-center w-24">매칭 적합도</th>
                <th className="p-2.5 border-r border-slate-200">주요 강점 및 적합 사유</th>
                <th className="p-2.5 text-center w-24">선정 상태</th>
              </tr>
            </thead>
            <tbody>
              {top20.slice(0, 10).map((s, idx) => (
                <tr key={s.instructor_id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-2.5 border-r border-slate-200 text-center font-bold">{idx + 1}</td>
                  <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">{s.instructor_name}</td>
                  <td className="p-2.5 border-r border-slate-200 text-center font-extrabold text-slate-900">
                    {formatScore(s.total_score)}점
                  </td>
                  <td className="p-2.5 border-r border-slate-200 text-slate-700 leading-tight">
                    {s.total_score >= 70 ? '요구 조건 우수 충족 (전문성/경력 우수)' : '주요 필수 자격 부합'}
                  </td>
                  <td className="p-2.5 text-center font-bold">
                    {finalSelected === s.instructor_id ? (
                      <span className="text-emerald-700 font-extrabold">최종 선정</span>
                    ) : candidates.has(s.instructor_id) ? (
                      <span className="text-amber-700 font-bold">후보</span>
                    ) : (
                      <span className="text-slate-400 font-normal">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 보고서 서명/확인란 */}
        <div className="pt-8 border-t border-slate-200 flex justify-end">
          <div className="text-right space-y-1 text-xs text-slate-600">
            <p className="font-bold text-slate-900">iCore 강사 매칭 시스템 자동 생성 보고서</p>
            <p>검토자 확인: ____________________ (인/서명)</p>
          </div>
        </div>

      </div>

    </div>
  );
}

{/* 강의 이력 개별 가공 카드 컴포넌트 */}
function LectureCard({ raw }: { raw: any }) {
  const item = parseHistoryItem(raw);
  const courseTitle = item.course || item.course_name || item.title || item.subject || '강의 과정';
  const clientName = item.client || item.organization || item.institution || item.agency;
  const startDate = item.start ? String(item.start).replace(/-/g, '.') : '';
  const endDate = item.end ? String(item.end).replace(/-/g, '.') : '';
  const period = startDate && endDate ? `${startDate} ~ ${endDate}` : startDate || endDate || item.period;
  const role = item.role || item.position;
  const keywords = typeof item.keywords === 'string' 
    ? item.keywords.split(',').map((k: string) => k.trim()).filter(Boolean) 
    : (Array.isArray(item.keywords) ? item.keywords : []);

  return (
    <div className="bg-white border border-slate-200/90 p-3.5 rounded-xl shadow-2xs space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded-md border border-blue-200/80">
          {item.type || item.category || '강의'}
        </span>
        {period && (
          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded-full">
            {period}
          </span>
        )}
      </div>

      <h4 className="text-xs font-bold text-slate-900 leading-snug">{courseTitle}</h4>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 font-medium">
        {clientName && (
          <span className="flex items-center gap-1">
            <span className="font-semibold text-slate-700">기관:</span> {clientName}
          </span>
        )}
        {role && (
          <span className="flex items-center gap-1">
            <span className="font-semibold text-slate-700">역할:</span> {role}
          </span>
        )}
        {item.hours && (
          <span className="flex items-center gap-1">
            <span className="font-semibold text-slate-700">시간:</span> {item.hours}시간
          </span>
        )}
      </div>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-100">
          {keywords.map((kw: string, i: number) => (
            <span key={i} className="text-[9px] font-medium bg-slate-100/90 text-slate-600 px-1.5 py-0.5 rounded-md">
              #{kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

{/* 자격/경력/저서 개별 가공 카드 컴포넌트 */}
function CareerCard({ raw, categoryType }: { raw: any; categoryType?: 'career' | 'cert' | 'publication' }) {
  const item = parseHistoryItem(raw);
  let type = String(item.type || item.category || '');
  if (!type || type === 'undefined') {
    if (categoryType === 'cert') type = '자격증';
    else if (categoryType === 'publication') type = '저서/논문';
    else type = '회사경력';
  }

  const isCert = categoryType === 'cert' || type.includes('자격') || type.includes('Cert');
  const isBook = categoryType === 'publication' || type.includes('저서') || type.includes('논문') || type.includes('출판') || type.includes('특허') || type.includes('수상');

  const title = item.title || item.name || item.detail || item.course || '자격/경력 사항';
  const issuer = item.issuer || item.organization || item.institution || item.publisher || item.client;
  const date = item.date || item.year || (item.start ? `${item.start} ${item.end ? '~ ' + item.end : ''}` : '');
  const desc = item.description || item.keywords;

  return (
    <div className="p-3.5 rounded-xl border shadow-2xs space-y-2 bg-white border-slate-200/90">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {isCert ? <Award size={14} className="text-purple-600" /> : isBook ? <BookOpen size={14} className="text-emerald-600" /> : <Briefcase size={14} className="text-amber-600" />}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
            isCert ? 'bg-purple-50 text-purple-700 border-purple-200' : isBook ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {type}
          </span>
        </div>
        {date && <span className="text-[10px] font-semibold text-slate-500">{date}</span>}
      </div>

      <h4 className="text-xs font-bold text-slate-900 leading-snug">{title}</h4>

      {issuer && (
        <p className="text-[11px] font-medium text-slate-600">
          <span className="font-semibold text-slate-700">발행/기관:</span> {issuer}
        </p>
      )}

      {desc && (
        <p className="text-[10px] font-normal text-slate-500 leading-relaxed pt-1 border-t border-slate-200/40">
          {desc}
        </p>
      )}
    </div>
  );
}

{/* 자격증 / 저서 / 회사경력 카테고리별 분리 그룹화 섹션 */}
function categorizeQualifications(items: any[]) {
  const careers: any[] = [];
  const certs: any[] = [];
  const publications: any[] = [];
  const others: any[] = [];

  items.forEach((raw) => {
    const item = parseHistoryItem(raw);
    const type = String(item.type || item.category || '').trim().toLowerCase();
    const title = String(item.title || item.name || item.detail || item.course || '').trim();

    // 1. 명확한 type 키워드 매칭
    if (type.includes('자격') || type.includes('면허') || type.includes('cert') || type.includes('license')) {
      certs.push(raw);
      return;
    }
    
    if (type.includes('저서') || type.includes('논문') || type.includes('출판') || type.includes('특허') || type.includes('수상') || type.includes('포상') || type.includes('학술')) {
      publications.push(raw);
      return;
    }

    if (type.includes('회사') || type.includes('경력') || type.includes('재직') || type.includes('근무') || type.includes('이력') || type.includes('직장')) {
      careers.push(raw);
      return;
    }

    // 2. type이 없거나 모호할 때 제목/키워드 매칭
    const careerKeywords = ['대표', '강사', '연구원', '팀장', '이사', '사원', '주임', '선임', '책임', '수석', '교수', '센터장', '본부장', '실장', '매니저', '개발자', '엔지니어', '디자이너', '재직'];
    const isCareer = careerKeywords.some(kw => title.includes(kw)) || item.start || item.end || item.period;

    const certKeywords = ['자격', '기사', '산업기사', '기술사', '마스터', '인증'];
    const isCert = certKeywords.some(kw => title.includes(kw));

    const pubKeywords = ['논문', '석사', '박사', '저서', '도서', '출판', '특허', '수상', '표창', '장관상', '최우수상', '우수상', '대상', '상장', '저자', '집필'];
    const isPub = pubKeywords.some(kw => title.includes(kw));

    if (isCareer) {
      careers.push(raw);
    } else if (isCert) {
      certs.push(raw);
    } else if (isPub) {
      publications.push(raw);
    } else {
      careers.push(raw);
    }
  });

  return { careers, certs, publications, others };
}

function GroupedQualSection({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return <p className="text-xs text-slate-400 text-center py-10">등록된 자격/경력/저서 이력이 없습니다.</p>;
  }

  const { careers, certs, publications, others } = categorizeQualifications(items);

  return (
    <div className="space-y-5">
      {/* 1. 회사 경력 */}
      {careers.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Briefcase size={14} className="text-amber-600" />
              <span>회사 경력</span>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {careers.length}건
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {careers.map((raw, idx) => (
              <CareerCard key={idx} raw={raw} categoryType="career" />
            ))}
          </div>
        </div>
      )}

      {/* 2. 자격증 */}
      {certs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Award size={14} className="text-purple-600" />
              <span>자격증 및 면허</span>
              <span className="text-[10px] font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                {certs.length}건
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {certs.map((raw, idx) => (
              <CareerCard key={idx} raw={raw} categoryType="cert" />
            ))}
          </div>
        </div>
      )}

      {/* 3. 저서 / 논문 / 수상 */}
      {publications.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <BookOpen size={14} className="text-emerald-600" />
              <span>저서 / 논문 / 수상</span>
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {publications.length}건
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {publications.map((raw, idx) => (
              <CareerCard key={idx} raw={raw} categoryType="publication" />
            ))}
          </div>
        </div>
      )}

      {/* 4. 기타 이력 */}
      {others.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Layers size={14} className="text-slate-600" />
              <span>기타 이력</span>
              <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                {others.length}건
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {others.map((raw, idx) => (
              <CareerCard key={idx} raw={raw} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

{/* 도넛 차트 SVG 컴포넌트 */}
function DonutChart({ score }: { score: number }) {
  const size = 56;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="text-slate-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="text-slate-900 transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-[11px] font-extrabold text-slate-900 block leading-none">{Math.round(score)}%</span>
      </div>
    </div>
  );
}

{/* 세부 항목 막대 차트 행 컴포넌트 */}
function BarChartRow({ label, score, max }: { label: string; score: number; max: number }) {
  const width = max > 0 ? Math.max(0, Math.min(100, (score / max) * 100)) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="font-bold text-slate-900">
          {formatScore(score)} <span className="text-[9px] text-slate-400 font-medium">/ {formatScore(max)}점</span>
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
        <div
          className="h-full bg-slate-800 rounded-full transition-all duration-300"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function AiReasonSection({ matchingId, instructorId }: { matchingId: string; instructorId: string }) {
  const [data, setData] = useState<{ strengths?: string[]; weaknesses?: string[]; summary?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await matchingApi.getAiReason(matchingId, instructorId);
      try {
        const parsed = JSON.parse(result.reason);
        setData(parsed);
      } catch {
        setData({ strengths: [], weaknesses: [], summary: result.reason });
      }
    } catch {
      setData({ strengths: [], weaknesses: [], summary: 'AI 분석을 수행할 수 없습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-slate-200/80 pt-2.5 space-y-1.5">
      <p className="text-[11px] font-bold text-slate-900 flex items-center gap-1">
        <Sparkles size={12} className="text-slate-700" /> AI 추천 분석 소평
      </p>
      {data ? (
        <div className="space-y-1.5">
          {data.strengths && data.strengths.length > 0 && (
            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-lg p-2 space-y-0.5">
              <p className="text-[9px] font-extrabold text-emerald-900">강점 요약</p>
              {data.strengths.map((s, i) => (
                <p key={i} className="text-[10px] font-medium text-emerald-800 leading-snug">• {s}</p>
              ))}
            </div>
          )}
          {data.weaknesses && data.weaknesses.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-lg p-2 space-y-0.5">
              <p className="text-[9px] font-extrabold text-amber-900">약점 / 고려사항</p>
              {data.weaknesses.map((w, i) => (
                <p key={i} className="text-[10px] font-medium text-amber-800 leading-snug">• {w}</p>
              ))}
            </div>
          )}
          {data.summary && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 space-y-0.5">
              <p className="text-[9px] font-extrabold text-slate-800">종합의견</p>
              <p className="text-[10px] font-medium text-slate-700 leading-snug">{data.summary}</p>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] font-bold rounded-lg transition-all disabled:opacity-50 shadow-2xs cursor-pointer"
        >
          {loading ? 'AI 심층 분석 생성 중...' : '✨ AI 추천 이유 보고서 생성'}
        </button>
      )}
    </div>
  );
}

function Score({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : value >= 40 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-800 border-rose-200';
  return <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${color}`}>{value}점</span>;
}

const SCORE_LABELS: Record<string, string> = {
  topic_tags: '기술·주제 태그',
  teaching_experience: '강의 경력',
  project_and_work_experience: '프로젝트·실무 경력',
  required_certifications: '필수 자격증',
  overview_context_fit: '과업 개요 적합도',
  topic_match: '과목·기술 적합도',
  teaching_depth: '강의 수행 깊이',
  audience_fit: '교육 대상 적합도',
  career_and_certification: '경력·자격증',
  evidence_completeness: '근거 충실도',
};

type ScoreRow = { criterion: string; label: string; score: number; maxScore: number };

function hasAgentReview(breakdown: ScoreBreakdown[]) {
  return breakdown.some((item) => item.source === 'agent_a' || item.source === 'agent_b');
}

function getScoreRows(match: MatchScore): ScoreRow[] {
  const agentA = match.breakdown.filter((item) => item.source === 'agent_a');
  const agentB = new Map(
    match.breakdown
      .filter((item) => item.source === 'agent_b')
      .map((item) => [item.criterion, item]),
  );

  if (agentA.length > 0) {
    return agentA.map((item) => {
      const verifierItem = agentB.get(item.criterion);
      return {
        criterion: item.criterion,
        label: SCORE_LABELS[item.criterion] ?? item.criterion,
        score: verifierItem ? (item.score + verifierItem.score) / 2 : item.score,
        maxScore: item.max_score,
      };
    });
  }

  const retrievalItems = match.breakdown.filter(
    (item) => item.source === 'deterministic_retrieval' || !item.source,
  );
  const activeMax = retrievalItems.reduce((sum, item) => sum + item.max_score, 0);

  return retrievalItems.map((item) => ({
    criterion: item.criterion,
    label: SCORE_LABELS[item.criterion] ?? item.criterion,
    score: activeMax > 0 ? (item.score / activeMax) * 100 : 0,
    maxScore: activeMax > 0 ? (item.max_score / activeMax) * 100 : 0,
  }));
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
