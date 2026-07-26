import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Upload, FileText, X, Loader2, CheckCircle2, Clock, Trash2, 
  Sparkles, FileSpreadsheet, ArrowRight, ShieldCheck, FolderArchive, Search, ExternalLink
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { taskOrdersApi } from '../api/taskOrders';

export default function TaskOrderUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // 보관함 Drawer 및 검색 상태
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveSearch, setArchiveSearch] = useState('');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: taskOrders } = useQuery({
    queryKey: ['task-orders-history'],
    queryFn: () => taskOrdersApi.list(0, 100),
  });

  const handleFile = useCallback((f: File) => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!['.pdf', '.hwp', '.docx'].includes(ext)) {
      toast.error('PDF, HWP, DOCX 파일만 업로드할 수 있습니다.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error('파일 크기는 최대 50MB까지 가능합니다.');
      return;
    }
    setFile(f);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const result = await taskOrdersApi.upload(file);
      setDone(true);
      toast.success('과업지시서 AI 분석이 성공적으로 완료되었습니다!');
      queryClient.invalidateQueries({ queryKey: ['task-orders-history'] });
      setTimeout(() => navigate(`/task-orders/${result.id}`), 1000);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '과업지시서 분석에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('이 과업지시서 이력을 삭제하시겠습니까?')) return;
    try {
      await taskOrdersApi.delete(id);
      toast.success('이력이 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['task-orders-history'] });
    } catch { toast.error('삭제 처리에 실패했습니다.'); }
  };

  const historyItems = taskOrders?.data || [];
  // 최근 메인 화면에는 4개만 깔끔하게 노출
  const recentItems = historyItems.slice(0, 4);

  // 보관함 필터링
  const filteredArchive = historyItems.filter((item: any) =>
    item.file_name.toLowerCase().includes(archiveSearch.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-7 select-none py-2">
      
      {/* ---------------------------------------------------- */}
      {/* 프리미엄 타이틀 & AI 파이프라인 소개 */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">과업지시서 분석 & 등록</h1>
          <p className="text-xs text-slate-500 mt-1">
            과업지시서를 등록하면 AI가 필요 역량과 평가 기준을 자동으로 추출하여 적합한 강사를 매칭합니다.
          </p>
        </div>

        {/* 3단계 프로세스 배지 */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-[11px] font-semibold text-slate-600">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-200 shadow-2xs">
            <FileText size={12} className="text-slate-700" />
            <span>1. 문서 업로드</span>
          </div>
          <ArrowRight size={10} className="text-slate-300 shrink-0" />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-200 shadow-2xs">
            <Sparkles size={12} className="text-slate-700" />
            <span>2. AI 역량 추출</span>
          </div>
          <ArrowRight size={10} className="text-slate-300 shrink-0" />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-md border border-slate-200 shadow-2xs">
            <ShieldCheck size={12} className="text-emerald-600" />
            <span>3. 강사 매칭</span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 고도화된 AI 드롭존 박스 */}
      {/* ---------------------------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Upload size={14} className="text-slate-600" /> 문서 드롭존
          </label>
          <span className="text-[11px] text-slate-400">지원 형식: PDF, HWP, DOCX (최대 50MB)</span>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !file && !loading && document.getElementById('file-input')?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-9 text-center transition-all duration-200 cursor-pointer overflow-hidden ${
            done ? 'border-emerald-400 bg-emerald-50/60' :
            loading ? 'border-slate-400 bg-slate-50/90 pointer-events-none' :
            dragOver ? 'border-slate-800 bg-slate-100/80 scale-[1.005] shadow-lg' :
            file ? 'border-slate-800 bg-slate-50/50' :
            'border-slate-200/90 bg-white hover:border-slate-400 hover:bg-slate-50/50 shadow-2xs'
          }`}
        >
          {done ? (
            <div className="flex flex-col items-center justify-center py-5 gap-3 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <p className="text-base font-bold text-emerald-900">과업지시서 분석 완료!</p>
                <p className="text-xs text-emerald-700 mt-1">분석 상세 결과 페이지로 이동 중입니다...</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-5 gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-md animate-pulse">
                <Loader2 size={24} className="animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">AI가 과업지시서를 분석하고 있습니다...</p>
                <p className="text-xs text-slate-500">핵심 자격요건 및 교육 내용을 정밀 추출하는 중입니다</p>
              </div>
            </div>
          ) : !file ? (
            <div className="flex flex-col items-center justify-center py-3 space-y-3.5">
              <div className="w-13 h-13 rounded-2xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                <Upload size={22} className="text-slate-600" />
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">
                  과업지시서 파일을 <span className="text-slate-900 underline underline-offset-4 decoration-slate-300">드래그하여 놓거나 클릭</span>하세요
                </p>
                <p className="text-xs text-slate-400">
                  공공기관 및 기업 과업지시서 첨부문서를 그대로 업로드하세요
                </p>
              </div>

              {/* 지원 파일 태그 칩 */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200/80">PDF</span>
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200/80">HWP</span>
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200/80">DOCX</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-white border border-slate-300 p-4 rounded-xl shadow-xs max-w-xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={20} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-xs">{file.name}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setFile(null); }} 
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all"
                title="파일 삭제"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <input 
            type="file" 
            accept=".pdf,.hwp,.docx" 
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} 
            className="hidden" 
            id="file-input" 
          />
        </div>

        {/* 파일 선택 시 활성화되는 실행 버튼 */}
        {file && !loading && !done && (
          <button 
            onClick={handleUpload}
            className="w-full py-3 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Sparkles size={14} className="text-amber-300" /> 과업지시서 AI 업로드 및 분석 시작
          </button>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 슬림한 최근 분석 이력 + 보관함 Drawer 버튼 */}
      {/* ---------------------------------------------------- */}
      {historyItems.length > 0 && (
        <div className="pt-3 border-t border-slate-200/80 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-500" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">최근 분석된 과업지시서</h3>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-extrabold border border-slate-200/60">
                {historyItems.length}개
              </span>
            </div>

            {/* 보관함 열기 버튼 */}
            <button
              onClick={() => setIsArchiveOpen(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
            >
              <FolderArchive size={14} className="text-slate-600" />
              분석 이력 보관함 전체보기 ({historyItems.length}) <ArrowRight size={13} />
            </button>
          </div>

          {/* 최근 4개만 슬림하게 2x2 타일 스타일 배치 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentItems.map((item: any) => (
              <Link
                key={item.id}
                to={`/task-orders/${item.id}`}
                className="bg-white border border-slate-200/90 hover:border-slate-400 rounded-xl p-3.5 shadow-2xs hover:shadow-md transition-all group relative flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                      <FileText size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate group-hover:text-black">
                        {item.file_name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all shrink-0"
                    title="이력 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  {item.parsed_at ? (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md border border-emerald-200/80">
                      분석완료
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-rose-50 text-red-600 font-bold rounded-md border border-rose-200/80">
                      분석실패
                    </span>
                  )}

                  <span className="font-semibold text-slate-500 group-hover:text-slate-900 flex items-center gap-1 transition-colors text-[11px]">
                    결과 보기 <ArrowRight size={11} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 우측 분석 이력 보관함 Slide-over Drawer */}
      {/* ---------------------------------------------------- */}
      {isArchiveOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-2xs transition-opacity animate-fadeIn"
          onClick={() => setIsArchiveOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 보관함 헤더 */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FolderArchive size={16} className="text-slate-700" />
                <span className="text-sm font-bold text-slate-900">과업지시서 분석 이력 보관함</span>
                <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-extrabold">
                  {historyItems.length}
                </span>
              </div>
              <button
                onClick={() => setIsArchiveOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* 검색 바 */}
            <div className="px-6 py-3 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="보관함 내 문서명 검색..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none text-slate-800 focus:bg-white focus:border-slate-400"
                />
              </div>
            </div>

            {/* 이력 수록 리스트 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/30">
              {filteredArchive.length > 0 ? (
                filteredArchive.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setIsArchiveOpen(false);
                      navigate(`/task-orders/${item.id}`);
                    }}
                    className="bg-white border border-slate-200 hover:border-slate-400 p-4 rounded-xl shadow-2xs hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate group-hover:text-black">
                            {item.file_name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {new Date(item.created_at).toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all shrink-0"
                        title="보관함에서 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-md border border-emerald-200/80 text-[10px]">
                        분석완료
                      </span>

                      <span className="font-semibold text-slate-600 group-hover:text-slate-900 flex items-center gap-1 transition-colors text-[11px]">
                        상세 결과 보기 <ExternalLink size={12} />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-xs font-semibold text-slate-400">
                  검색 조건과 일치하는 과업지시서가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
