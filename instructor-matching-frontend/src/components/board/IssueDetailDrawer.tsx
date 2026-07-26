import React, { useState, useEffect } from 'react';
import { X, Calendar, MessageSquare, FileText, CheckCircle2, ArrowRight, Send, Trash2, Edit3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { matchingApi } from '../../api/matching';

export type IssueDetailItem = {
  issueKey?: string;
  id: string;
  type: 'task_order' | 'matching' | 'done';
  title: string;
  status: string;
  date: string;
  assignee: string;
  memo?: string;
  taskOrderId?: string;
  matchingId?: string;
  rawDetails?: any;
};

interface IssueDetailDrawerProps {
  item: IssueDetailItem | null;
  onClose: () => void;
  onUpdateMemo?: (id: string, newMemo: string) => void;
}

export default function IssueDetailDrawer({ item, onClose, onUpdateMemo }: IssueDetailDrawerProps) {
  const [memo, setMemo] = useState('');
  const [isEditing, setIsFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setMemo(item.memo || '');
      setIsFocused(!item.memo); // 코멘트가 없을 때만 작성 모드로
    }
  }, [item]);

  if (!item) return null;

  const isDoneItem = item.type === 'done' || item.status.includes('완료') || item.status.includes('선정');

  const handleSaveMemo = async () => {
    if (!isDoneItem) return;
    setIsSaving(true);
    try {
      if (item.matchingId || item.type !== 'task_order') {
        const idToUpdate = item.matchingId || item.id;
        await matchingApi.updateMemo(idToUpdate, memo);
      }
      if (onUpdateMemo) {
        onUpdateMemo(item.id, memo);
      }
      toast.success('코멘트가 저장되었습니다.');
      setIsFocused(false);
    } catch {
      toast.error('코멘트 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMemo = async () => {
    if (!window.confirm('작성된 코멘트를 삭제하시겠습니까?')) return;
    setIsSaving(true);
    try {
      const idToUpdate = item.matchingId || item.id;
      await matchingApi.updateMemo(idToUpdate, '');
      setMemo('');
      if (onUpdateMemo) {
        onUpdateMemo(item.id, '');
      }
      toast.success('코멘트가 삭제되었습니다.');
      setIsFocused(true);
    } catch {
      toast.error('코멘트 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status.includes('완료') || status.includes('선정')) {
      return <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-md">완료</span>;
    }
    if (status.includes('매칭') || status.includes('후보')) {
      return <span className="px-2.5 py-1 text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200/80 rounded-md">매칭중</span>;
    }
    return <span className="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-md">분석완료</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/25 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white h-full shadow-xl flex flex-col border-l border-slate-200/80 animate-in slide-in-from-right duration-200">
        
        {/* 헤더 */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">과업 상세 정보</span>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-all"
            title="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* 과업/매칭 제목 */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug break-words tracking-tight">{item.title}</h2>
          </div>

          {/* 메타 정보 카드 (상태, 담당자, 등록일) */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50/80 border border-slate-200/60 rounded-xl text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-1.5">상태</span>
              {getStatusBadge(item.status)}
            </div>
            <div>
              <span className="text-slate-400 font-medium block mb-1.5">담당자</span>
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <div className="w-4.5 h-4.5 rounded-full bg-amber-100 border border-amber-200 text-slate-900 flex items-center justify-center font-bold text-[9px]">
                  {item.assignee.charAt(0)}
                </div>
                <span className="truncate">{item.assignee}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-medium block mb-1.5">등록일</span>
              <div className="flex items-center gap-1 font-medium text-slate-700">
                <Calendar size={12} className="text-slate-400 shrink-0" />
                <span>{item.date}</span>
              </div>
            </div>
          </div>

          {/* 상세보기 이동 버튼 */}
          <div>
            {item.type === 'task_order' && (
              <Link 
                to={`/task-orders/${item.id}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-all shadow-2xs"
              >
                <FileText size={14} /> 과업지시서 분석 상세보기 <ArrowRight size={14} />
              </Link>
            )}
            {(item.type === 'matching' || item.type === 'done') && (
              <Link 
                to={`/matching/${item.matchingId || item.id}`}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-all shadow-2xs"
              >
                <CheckCircle2 size={14} className="text-slate-300" /> 매칭 결과 및 후보 강사 확인 <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {/* 완료 상태인 경우 코멘트 영역 */}
          {isDoneItem && (
            <div className="pt-3 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <MessageSquare size={14} className="text-slate-600" />
                  <span>코멘트 목록</span>
                </div>
                <span className="text-[11px] text-slate-400">완료 과업 전용</span>
              </div>

              {/* 작성된 코멘트가 있고 수정 중이 아닐 때: 작성자 + 내용 + 삭제 버튼 카드 */}
              {item.memo && !isEditing ? (
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-200 text-slate-900 flex items-center justify-center font-bold text-[9px]">
                        {item.assignee.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-slate-900">{item.assignee}</span>
                      <span className="text-[10px] text-slate-400">• {item.date}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsFocused(true)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-all"
                        title="코멘트 수정"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={handleDeleteMemo}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                        title="코멘트 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap pl-7">
                    {item.memo}
                  </p>
                </div>
              ) : (
                /* 작성/수정 모드 */
                <div className="border border-slate-300 ring-2 ring-slate-100 bg-white rounded-xl shadow-xs transition-all">
                  <div className="p-3 flex gap-2.5 items-start">
                    <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {item.assignee.charAt(0)}
                    </div>
                    <textarea 
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="팀원과 공유할 의견이나 코멘트를 작성하세요..."
                      className="w-full text-xs text-slate-800 bg-transparent outline-none resize-none min-h-[70px] placeholder:text-slate-400 leading-relaxed"
                    />
                  </div>

                  <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">작성자: {item.assignee}</span>
                    <div className="flex items-center gap-2">
                      {item.memo && (
                        <button 
                          onClick={() => setIsFocused(false)}
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-[11px] font-medium transition-all"
                        >
                          취소
                        </button>
                      )}
                      <button
                        onClick={handleSaveMemo}
                        disabled={isSaving || !memo.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-lg transition-all shadow-2xs"
                      >
                        <Send size={11} />
                        {isSaving ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
