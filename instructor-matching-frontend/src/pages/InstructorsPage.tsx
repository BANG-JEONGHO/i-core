import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { instructorsApi } from '../api/instructors';
import type { Instructor } from '../types';

export default function InstructorsPage() {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const queryClient = useQueryClient();
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['instructors', keyword, page],
    queryFn: () => instructorsApi.list(keyword || undefined, page * limit, limit),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => instructorsApi.delete(id),
    onSuccess: () => {
      toast.success('강사가 삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    },
    onError: () => toast.error('삭제에 실패했습니다'),
  });

  const handleDeleteAll = async () => {
    if (!confirm('등록된 모든 강사를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    try {
      const r = await instructorsApi.deleteAll();
      toast.success(`${r.deleted}명 삭제 완료`);
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    } catch { toast.error('삭제에 실패했습니다'); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const r = await instructorsApi.upload(file);
      if (r.errors.length > 0) {
        toast.success(`${r.success}/${r.total}명 업로드 (${r.errors.length}건 건너뜀)`, { duration: 5000 });
        console.log('업로드 에러:', r.errors);
      } else {
        toast.success(`${r.success}명 업로드 완료`);
      }
      queryClient.invalidateQueries({ queryKey: ['instructors'] });
    } catch { toast.error('업로드에 실패했습니다'); }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`'${name}' 강사를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(id);
    }
  };

  const totalPages = Math.ceil((data?.total ?? 0) / limit);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">강사 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">총 {data?.total ?? 0}명</p>
        </div>
        <div className="flex items-center gap-2">
          {(data?.total ?? 0) > 0 && (
            <button onClick={handleDeleteAll} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-md hover:bg-red-100 transition-colors">
              <Trash2 size={14} />
              전체 삭제
            </button>
          )}
          <label className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md cursor-pointer hover:bg-blue-700">
            <Plus size={14} />
            파일 업로드
            <input type="file" accept=".xlsx,.csv" onChange={handleUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* 검색 */}
      <div className="relative max-w-sm mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="이름, 보유기술, 강의분야 검색..." value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-blue-500 outline-none bg-white" />
      </div>

      {/* 테이블 */}
      <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">로딩 중...</div>
        ) : data?.data?.length ? (
          <>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase w-[160px]">이름</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase">보유기술</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase w-[80px]">강의건수</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase w-[60px]">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.data.map((i: Instructor) => (
                    <tr key={i.id} className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedInstructor(i)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center shrink-0">
                            <span className="text-white text-[10px] font-bold">{i.name.charAt(0)}</span>
                          </div>
                          <span className="font-medium text-gray-800">{i.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {i.specializations?.slice(0, 4).map(s => (
                            <span key={s} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                          {(i.specializations?.length ?? 0) > 4 && (
                            <span className="text-[10px] text-gray-400">+{i.specializations!.length - 4}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-700">{i.experience_years}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(i.id, i.name); }}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <span className="text-xs text-gray-500">{page * limit + 1}~{Math.min((page + 1) * limit, data.total)} / {data.total}명</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-gray-600 px-2">{page + 1} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-400 mb-2">등록된 강사가 없습니다</p>
            <p className="text-xs text-gray-300">엑셀(xlsx, csv) 파일을 업로드하여 강사를 등록하세요</p>
          </div>
        )}
      </div>

      {/* 강사 상세 모달 */}
      {selectedInstructor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setSelectedInstructor(null)}>
          <div className="bg-white rounded-2xl w-full max-w-xl h-[600px] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 - 이름 + 파란색 라인 */}
            <div className="px-6 pt-5 pb-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-600">{selectedInstructor.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{selectedInstructor.name}</p>
                    <p className="text-[10px] text-gray-400">{selectedInstructor.summary || selectedInstructor.main_lecture_area || '전문 강사'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedInstructor(null)} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
              <div className="h-[2px] bg-blue-500 rounded-full mt-3" />
            </div>

            {/* 탭 */}
            <DetailTabs instructor={selectedInstructor} />
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

function DetailTabs({ instructor }: { instructor: Instructor }) {
  const [tab, setTab] = useState<'info' | 'history' | 'qual' | 'schedule'>('info');

  return (
    <>
      <div className="flex gap-1 px-6 pt-3 shrink-0">
        <button onClick={() => setTab('info')} className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${tab === 'info' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>기본정보</button>
        <button onClick={() => setTab('history')} className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${tab === 'history' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>강의 이력 ({instructor.lecture_history?.length || 0})</button>
        <button onClick={() => setTab('qual')} className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${tab === 'qual' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>자격/경력 ({instructor.qualifications_career?.length || 0})</button>
        <button onClick={() => setTab('schedule')} className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${tab === 'schedule' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>일정</button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tab === 'info' && <InfoTab instructor={instructor} />}
        {tab === 'history' && <HistoryTab history={instructor.lecture_history || []} />}
        {tab === 'qual' && <QualTab items={instructor.qualifications_career || []} />}
        {tab === 'schedule' && <ScheduleTab instructor={instructor} />}
      </div>
    </>
  );
}

function InfoTab({ instructor }: { instructor: Instructor }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {instructor.affiliation && <InfoCard label="소속" value={instructor.affiliation} />}
        {instructor.region && <InfoCard label="지역" value={instructor.region} />}
        {instructor.degree && <InfoCard label="학위" value={instructor.degree} />}
        {instructor.school && <InfoCard label="학교" value={instructor.school} />}
        {instructor.major && <InfoCard label="전공" value={instructor.major} />}
        {instructor.contact && <InfoCard label="연락처" value={instructor.contact} />}
        {instructor.email && <InfoCard label="이메일" value={instructor.email} />}
        <InfoCard label="강의건수" value={`${instructor.experience_years}건`} />
      </div>
      {instructor.main_lecture_area && (
        <div>
          <p className="text-[11px] text-gray-500 font-semibold mb-1.5">주요 강의분야</p>
          <p className="text-sm text-gray-700">{instructor.main_lecture_area}</p>
        </div>
      )}
      {instructor.keywords && instructor.keywords.length > 0 && (
        <div>
          <p className="text-[11px] text-gray-500 font-semibold mb-1.5">기술스택</p>
          <div className="flex flex-wrap gap-1">
            {instructor.keywords.map(kw => (
              <span key={kw} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{kw}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ history }: { history: any[] }) {
  if (!history.length) return <p className="text-xs text-gray-400 text-center py-8">등록된 강의 이력이 없습니다.</p>;
  return (
    <div className="space-y-1.5">
      {history.slice(0, 30).map((h, i) => (
        <div key={i} className="py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
          <p className="text-[12px] font-medium text-gray-800">{h.course || h.client}</p>
          <div className="flex items-center gap-2 mt-1">
            {h.client && h.client !== h.course && <span className="text-[10px] text-indigo-500">{h.client}</span>}
            <span className="text-[10px] text-gray-400">{h.start}{h.end ? ` ~ ${h.end}` : ''}</span>
            {h.type && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{h.type}</span>}
          </div>
        </div>
      ))}
      {history.length > 30 && <p className="text-[10px] text-gray-400 text-center pt-2">외 {history.length - 30}건</p>}
    </div>
  );
}

function QualTab({ items }: { items: any[] }) {
  if (!items.length) return <p className="text-sm text-gray-400 text-center py-8">등록된 자격/경력이 없습니다.</p>;
  const grouped = items.reduce((acc: Record<string, any[]>, item) => {
    const type = item.type || '기타';
    if (!acc[type]) acc[type] = [];
    acc[type].push(item);
    return acc;
  }, {});

  const typeStyles: Record<string, { bg: string; text: string; border: string }> = {
    '회사경력': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-l-blue-500' },
    '자격증': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-l-emerald-500' },
    '저서': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-l-amber-500' },
    '교육이수': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-l-purple-500' },
  };

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([type, list]) => {
        const style = typeStyles[type] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-l-gray-400' };
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${style.bg} ${style.text}`}>{type}</span>
              <span className="text-[10px] text-gray-400">{list.length}건</span>
            </div>
            <div className="space-y-2">
              {list.map((item: any, i: number) => (
                <div key={i} className="bg-white border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-800 flex-1">{item.detail}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {item.issuer && <span className="text-[11px] font-medium text-indigo-600">{item.issuer}</span>}
                    {item.start && <span className="text-[10px] text-gray-400">{item.start}{item.end && item.end !== '-' && item.end !== 'nan' ? ` ~ ${item.end}` : ''}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}

function ScheduleTab({ instructor }: { instructor: Instructor }) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ project_name: '', start_date: '', end_date: '', note: '' });

  const loadSchedules = async () => {
    try {
      const { schedulesApi } = await import('../api/schedules');
      const data = await schedulesApi.list(instructor.id);
      setSchedules(data);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useState(() => { loadSchedules(); });

  const handleAdd = async () => {
    if (!form.project_name || !form.start_date || !form.end_date) {
      toast.error('프로젝트명, 시작일, 종료일을 입력하세요');
      return;
    }
    try {
      const { schedulesApi } = await import('../api/schedules');
      await schedulesApi.create({
        instructor_id: instructor.id,
        instructor_name: instructor.name,
        project_name: form.project_name,
        start_date: form.start_date,
        end_date: form.end_date,
        note: form.note || undefined,
      });
      toast.success('일정 등록 완료');
      setForm({ project_name: '', start_date: '', end_date: '', note: '' });
      setShowForm(false);
      loadSchedules();
    } catch { toast.error('등록 실패'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      const { schedulesApi } = await import('../api/schedules');
      await schedulesApi.delete(id);
      toast.success('삭제 완료');
      loadSchedules();
    } catch { toast.error('삭제 실패'); }
  };

  if (loading) return <p className="text-xs text-gray-400 text-center py-8">로딩 중...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-gray-600">참가중인 강의/프로젝트</p>
        <button onClick={() => setShowForm(!showForm)} className="text-[10px] text-indigo-600 font-medium hover:text-indigo-800">
          {showForm ? '취소' : '+ 일정 추가'}
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <input type="text" placeholder="프로젝트/강의명" value={form.project_name}
            onChange={(e) => setForm({ ...form, project_name: e.target.value })}
            className="w-full text-[11px] px-3 py-2 rounded border border-gray-200 outline-none focus:border-indigo-400" />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="text-[11px] px-3 py-2 rounded border border-gray-200 outline-none focus:border-indigo-400" />
            <input type="date" value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="text-[11px] px-3 py-2 rounded border border-gray-200 outline-none focus:border-indigo-400" />
          </div>
          <input type="text" placeholder="비고 (선택)" value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="w-full text-[11px] px-3 py-2 rounded border border-gray-200 outline-none focus:border-indigo-400" />
          <button onClick={handleAdd} className="w-full py-2 bg-indigo-600 text-white text-[11px] font-medium rounded hover:bg-indigo-700">
            등록
          </button>
        </div>
      )}

      {schedules.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">등록된 일정이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {schedules.map((s: any) => {
            const isActive = new Date(s.end_date) >= new Date();
            return (
              <div key={s.id} className={`rounded-lg p-3 border ${isActive ? 'border-red-100 bg-red-50/50' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-medium text-gray-800">{s.project_name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.start_date} ~ {s.end_date}</p>
                    {s.note && <p className="text-[9px] text-gray-400 mt-0.5">{s.note}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {isActive && <span className="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">진행중</span>}
                    <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
