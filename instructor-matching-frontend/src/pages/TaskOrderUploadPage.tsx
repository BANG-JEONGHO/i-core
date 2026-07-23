import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, FileText, X, Loader2, CheckCircle2, Clock, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { taskOrdersApi } from '../api/taskOrders';

export default function TaskOrderUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const historyLimit = 4;

  const { data: taskOrders } = useQuery({
    queryKey: ['task-orders-history'],
    queryFn: () => taskOrdersApi.list(0, 50),
  });

  const handleFile = useCallback((f: File) => {
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!['.pdf', '.hwp', '.docx'].includes(ext)) {
      toast.error('PDF, HWP, DOCX 형식만 지원됩니다');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error('파일 크기가 50MB를 초과합니다');
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
      toast.success('분석 완료! 파싱 결과를 확인하세요');
      queryClient.invalidateQueries({ queryKey: ['task-orders-history'] });
      setTimeout(() => navigate(`/task-orders/${result.id}`), 1200);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || '업로드에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 과업지시서를 삭제하시겠습니까?')) return;
    try {
      await taskOrdersApi.delete(id);
      toast.success('삭제 완료');
      queryClient.invalidateQueries({ queryKey: ['task-orders-history'] });
    } catch { toast.error('삭제 실패'); }
  };

  const historyItems = taskOrders?.data || [];
  const totalPages = Math.ceil(historyItems.length / historyLimit);
  const pagedItems = historyItems.slice(historyPage * historyLimit, (historyPage + 1) * historyLimit);

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">과업지시서</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          나라장터 과업지시서를 업로드하면 자동으로 분석 후 최적 강사를 매칭합니다
        </p>
      </div>

      <div className="space-y-8">
        {/* 업로드 영역 */}
        <div className="space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">파일 업로드</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !file && !loading && document.getElementById('file-input')?.click()}
            className={`rounded-xl border-2 border-dashed p-24 text-center transition-all cursor-pointer ${
              done ? 'border-green-300 bg-green-50' :
              loading ? 'border-blue-300 bg-blue-50 pointer-events-none' :
              dragOver ? 'border-blue-400 bg-blue-50 scale-[1.01]' :
              file ? 'border-indigo-200 bg-indigo-50/30' :
              'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/20'
            }`}
          >
            {done ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 size={32} className="text-green-500" />
                <p className="text-sm font-medium text-green-700">분석 완료!</p>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={28} className="text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-blue-700">문서를 분석하고 있습니다...</p>
                <p className="text-xs text-blue-500">AI가 문서를 분석 중입니다 (최대 1분)</p>
              </div>
            ) : !file ? (
              <>
                <div className="w-12 h-12 rounded-xl bg-gray-100 mx-auto mb-3 flex items-center justify-center">
                  <Upload size={22} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">파일을 드래그하거나 클릭하여 업로드</p>
                <p className="text-xs text-gray-400 mt-1">PDF, HWP, DOCX · 최대 50MB</p>
              </>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <FileText size={18} className="text-indigo-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="p-1.5 rounded-md hover:bg-gray-200">
                  <X size={14} className="text-gray-400" />
                </button>
              </div>
            )}
            <input type="file" accept=".pdf,.hwp,.docx" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" id="file-input" />
          </div>

          {file && !loading && !done && (
            <button onClick={handleUpload}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              업로드 및 분석 시작
            </button>
          )}
        </div>

        {/* 분석 이력 (아래) */}
        {historyItems.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">분석 이력</p>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{historyItems.length}</span>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setHistoryPage(p => Math.max(0, p - 1))} disabled={historyPage === 0}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[10px] text-gray-400">{historyPage + 1}/{totalPages}</span>
                  <button onClick={() => setHistoryPage(p => Math.min(totalPages - 1, p + 1))} disabled={historyPage >= totalPages - 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {pagedItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-200 transition-colors group">
                  <Link to={`/task-orders/${item.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-indigo-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700">{item.file_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400">
                          {new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {item.parsed_at ? (
                          <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">분석완료</span>
                        ) : (
                          <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-medium">분석실패</span>
                        )}
                      </div>
                    </div>
                  </Link>
                  <button onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
