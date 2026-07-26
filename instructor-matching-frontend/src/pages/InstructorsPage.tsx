import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Trash2, X, ChevronLeft, ChevronRight, Users, Briefcase, GraduationCap, Phone, Mail, MapPin, Building, BookOpen, Award, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { instructorsApi } from '../api/instructors';
import type { Instructor } from '../types';

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

export default function InstructorsPage() {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const queryClient = useQueryClient();
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['instructors', keyword, page, limit],
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
    <div className="h-full flex flex-col select-none overflow-hidden space-y-4">
      {/* 헤더 & 우측 버튼 액션 */}
      <div className="flex items-center justify-between pb-1 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            강사 관리
          </h1>
          <p className="text-xs font-normal text-slate-500 mt-1">
            사내 인력 풀 인재 관리 및 엑셀 일괄 업로드
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {(data?.total ?? 0) > 0 && (
            <button
              onClick={handleDeleteAll}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg border border-red-200 transition-all shadow-2xs cursor-pointer"
            >
              <Trash2 size={14} />
              전체 삭제
            </button>
          )}
          <label className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-medium rounded-lg cursor-pointer transition-all shadow-2xs">
            <Plus size={15} />
            강사 엑셀 업로드
            <input type="file" accept=".xlsx,.csv" onChange={handleUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* 검색 바 */}
      <div className="relative max-w-md shrink-0">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="이름, 보유기술, 주요 강의분야 통합 검색..."
          value={keyword}
          onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-normal text-slate-800 placeholder:text-slate-400 focus:border-slate-800 focus:ring-2 focus:ring-slate-100 outline-none shadow-2xs transition-all"
        />
        {keyword && (
          <button
            onClick={() => { setKeyword(''); setPage(0); }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 테이블 메인 컨테이너 */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-2xs min-h-0">
        {isLoading ? (
          <div className="py-20 text-center text-xs font-normal text-slate-400">
            강사 데이터를 불러오는 중...
          </div>
        ) : data?.data?.length ? (
          <>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 backdrop-blur-xs border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs w-[190px]">강사명</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs">보유 기술 / 스페셜티</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs text-right w-[110px]">강의 건수</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-xs text-center w-[80px]">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.data.map((i: Instructor) => (
                    <tr
                      key={i.id}
                      onClick={() => setSelectedInstructor(i)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:bg-slate-900 group-hover:text-white transition-colors">
                            {i.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-900 text-xs truncate">{i.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {i.specializations?.slice(0, 5).map(s => (
                            <span
                              key={s}
                              className="text-xs bg-slate-100/90 text-slate-700 border border-slate-200/80 px-2.5 py-1 rounded-md font-normal"
                            >
                              {s}
                            </span>
                          ))}
                          {(i.specializations?.length ?? 0) > 5 && (
                            <span className="text-xs text-slate-500 font-medium ml-0.5">
                              +{i.specializations!.length - 5}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs font-semibold text-slate-900">
                          {i.experience_years}
                        </span>
                        <span className="text-xs font-normal text-slate-500 ml-1">건</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(i.id, i.name); }}
                          className="p-1.5 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-600 transition-all cursor-pointer"
                          title="강사 삭제"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 바 */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/70 shrink-0">
              <span className="text-xs font-normal text-slate-600">
                {page * limit + 1} ~ {Math.min((page + 1) * limit, data.total)} 목록 표시 중
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-md hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-semibold text-slate-900 px-2">
                    {page + 1} / {totalPages} 페이지
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-md hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-800 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Users size={32} className="text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">등록된 강사 데이터가 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">상단 [강사 엑셀 업로드] 버튼을 이용해 등록해 보세요.</p>
          </div>
        )}
      </div>

      {/* 강사 상세 프로필 우측 슬라이드 서랍 (Slide-over Drawer) */}
      {selectedInstructor && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-2xs transition-opacity animate-fadeIn"
          onClick={() => setSelectedInstructor(null)}
        >
          <div
            className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 드로어 상단 서브 헤더 */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <span className="text-xs font-bold text-slate-400 tracking-tight">강사 상세 프로필</span>
              <button
                onClick={() => setSelectedInstructor(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* 강사 프로필 메인 패널 */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                  {selectedInstructor.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{selectedInstructor.name}</h2>
                    <span className="text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 px-2 py-0.5 rounded-full">
                      인증 강사
                    </span>
                  </div>
                  <p className="text-xs font-normal text-slate-500 mt-1 leading-relaxed line-clamp-2">
                    {selectedInstructor.summary || selectedInstructor.notes || selectedInstructor.main_lecture_area || '등록된 강사 프로필'}
                  </p>
                </div>
              </div>
            </div>

            {/* 탭 네비게이션 & 내용 */}
            <DetailTabs instructor={selectedInstructor} />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailTabs({ instructor }: { instructor: Instructor }) {
  const [tab, setTab] = useState<'info' | 'history' | 'qual'>('info');

  return (
    <>
      <div className="flex gap-2 px-6 pt-3 shrink-0 border-b border-slate-100 bg-white">
        <button
          onClick={() => setTab('info')}
          className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
            tab === 'info'
              ? 'border-slate-900 text-slate-900 bg-slate-50'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          기본정보
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
            tab === 'history'
              ? 'border-indigo-600 text-indigo-900 bg-indigo-50/50'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          강의 이력 ({instructor.lecture_history?.length || 0})
        </button>
        <button
          onClick={() => setTab('qual')}
          className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all cursor-pointer ${
            tab === 'qual'
              ? 'border-purple-600 text-purple-900 bg-purple-50/50'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          자격/경력/저서 ({instructor.qualifications_career?.length || 0})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50/40">
        {tab === 'info' && <InfoTab instructor={instructor} />}
        {tab === 'history' && <HistoryTab history={instructor.lecture_history || []} />}
        {tab === 'qual' && <QualTab items={instructor.qualifications_career || []} />}
      </div>
    </>
  );
}

function InfoTab({ instructor }: { instructor: Instructor }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {instructor.affiliation && <InfoCard icon={<Building size={13} />} label="소속" value={instructor.affiliation} />}
        {instructor.region && <InfoCard icon={<MapPin size={13} />} label="지역" value={instructor.region} />}
        {instructor.degree && <InfoCard icon={<GraduationCap size={13} />} label="학위" value={instructor.degree} />}
        {instructor.school && <InfoCard icon={<GraduationCap size={13} />} label="출신 학교" value={instructor.school} />}
        {instructor.major && <InfoCard icon={<GraduationCap size={13} />} label="전공" value={instructor.major} />}
        {instructor.contact && <InfoCard icon={<Phone size={13} />} label="연락처" value={instructor.contact} />}
        {instructor.email && <InfoCard icon={<Mail size={13} />} label="이메일" value={instructor.email} />}
        <InfoCard icon={<Briefcase size={13} />} label="총 강의 수행" value={`${instructor.experience_years}건`} />
      </div>

      {instructor.main_lecture_area && (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">주요 강의 분야</p>
          <p className="text-xs font-semibold text-slate-800 leading-relaxed">{instructor.main_lecture_area}</p>
        </div>
      )}

      {instructor.keywords && instructor.keywords.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">보유 기술 스택</p>
          <div className="flex flex-wrap gap-1.5">
            {instructor.keywords.map(kw => (
              <span key={kw} className="text-xs font-normal bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md border border-slate-200">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// 강의 이력 탭
// ----------------------------------------------------
function HistoryTab({ history }: { history: any[] }) {
  if (!history.length) return <p className="text-xs font-semibold text-slate-400 text-center py-10">등록된 강의 이력이 없습니다.</p>;
  return (
    <div className="space-y-3">
      {history.slice(0, 30).map((raw, i) => {
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
          <div key={i} className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs space-y-2">
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
                {keywords.map((kw: string, kIdx: number) => (
                  <span key={kIdx} className="text-[9px] font-medium bg-slate-100/90 text-slate-600 px-1.5 py-0.5 rounded-md">
                    #{kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {history.length > 30 && <p className="text-xs font-normal text-slate-400 text-center pt-2">외 {history.length - 30}건 생략</p>}
    </div>
  );
}

// ----------------------------------------------------
// 자격/경력/저서 탭
// ----------------------------------------------------
function QualTab({ items }: { items: any[] }) {
  return <GroupedQualSection items={items || []} />;
}

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

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-xs font-semibold text-slate-900 truncate">{value}</p>
    </div>
  );
}
