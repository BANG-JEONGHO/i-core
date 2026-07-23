import { useState, useEffect } from 'react';
import { Calendar, Upload, Trash2, FileText, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8700', timeout: 30000 });

type Step = 'landing' | 'upload' | 'done';

export default function InstructorPortalPage() {
  const [step, setStep] = useState<Step>('landing');
  const [instructors, setInstructors] = useState<{id: string; name: string}[]>([]);
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [form, setForm] = useState({ project_name: '', start_date: '', end_date: '', note: '' });
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  useEffect(() => {
    api.get('/api/portal/instructors').then(r => setInstructors(r.data)).catch(() => {});
  }, []);

  // 이름 입력 후 시작
  const handleStart = async () => {
    if (!name.trim()) { toast.error('이름을 입력하세요'); return; }
    try {
      // 서버에 강사 등록/확인 요청
      const res = await api.post('/api/portal/register', { name: name.trim() });
      const { instructor_id, is_new } = res.data;
      setSelectedId(instructor_id);
      setStep('upload');
      if (is_new) {
        toast.success('새 강사로 등록되었습니다');
      }
      // 기존 일정 로드
      api.get(`/api/portal/schedules/${instructor_id}`).then(r => setSchedules(r.data)).catch(() => {});
    } catch {
      toast.error('등록에 실패했습니다');
    }
  };

  // 이력서 업로드
  const handleResumeSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setResumeFile(file);
  };

  // 일정 추가
  const handleAddSchedule = () => {
    if (!form.project_name || !form.start_date || !form.end_date) {
      toast.error('프로젝트명, 시작일, 종료일을 입력하세요');
      return;
    }
    setSchedules([...schedules, { ...form, id: `temp_${Date.now()}`, temp: true }]);
    setForm({ project_name: '', start_date: '', end_date: '', note: '' });
    setShowScheduleForm(false);
  };

  const handleRemoveSchedule = (idx: number) => {
    setSchedules(schedules.filter((_, i) => i !== idx));
  };

  // 전체 제출
  const handleSubmit = async () => {
    try {
      // 이력서 업로드
      if (resumeFile) {
        const formData = new FormData();
        formData.append('file', resumeFile);
        await api.post(`/api/portal/resume/${selectedId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // 일정 등록
      for (const s of schedules) {
        if (s.temp) {
          await api.post('/api/portal/schedules', {
            instructor_id: selectedId,
            instructor_name: name.trim(),
            project_name: s.project_name,
            start_date: s.start_date,
            end_date: s.end_date,
            note: s.note || null,
          });
        }
      }

      setStep('done');
    } catch {
      toast.error('제출에 실패했습니다');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src="/logo.jpg" alt="iCore" className="w-8 h-8 rounded-lg object-cover" />
          <div>
            <h1 className="text-sm font-bold text-gray-900">iCore 강사 포털</h1>
            <p className="text-[10px] text-gray-400">이력서 및 일정 관리</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-10 px-4">

        {/* Step 1: 랜딩 - 이름 입력 */}
        {step === 'landing' && (
          <div className="bg-white rounded-2xl p-10 shadow-sm text-center animate-fadeIn">
            <img src="/logo.jpg" alt="iCore" className="w-16 h-16 rounded-xl object-cover mx-auto mb-5 shadow" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">강사 포털</h2>
            <p className="text-sm text-gray-500 mb-8">이력서와 강의 일정을 등록해주세요</p>
            
            <input
              type="text"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              className="w-full max-w-xs mx-auto px-4 py-3 border border-gray-200 rounded-xl text-sm text-center outline-none focus:border-indigo-400 mb-4 block"
            />
            <button
              onClick={handleStart}
              disabled={!name.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              시작하기 <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2: 이력서 + 일정 업로드 */}
        {step === 'upload' && (
          <div className="space-y-5 animate-fadeIn">
            {/* 상단 인사 */}
            <div className="bg-white rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-indigo-600">{name.charAt(0)}</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">{name} 님</p>
              </div>
              <button onClick={() => { setStep('landing'); setSelectedId(''); setResumeFile(null); setSchedules([]); }}
                className="text-[11px] text-gray-400 hover:text-gray-600">처음으로</button>
            </div>

            {/* 이력서 업로드 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={16} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-gray-800">이력서 업로드</h3>
              </div>
              {resumeFile ? (
                <div className="flex items-center justify-between bg-indigo-50 rounded-lg px-4 py-3">
                  <span className="text-xs text-indigo-700 font-medium truncate">{resumeFile.name}</span>
                  <button onClick={() => setResumeFile(null)} className="text-indigo-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors">
                  <Upload size={18} className="text-gray-400" />
                  <span className="text-xs text-gray-500">파일 선택 (PDF, DOCX, HWP)</span>
                  <input type="file" accept=".pdf,.docx,.hwp,.xlsx" onChange={handleResumeSelect} className="hidden" />
                </label>
              )}
            </div>

            {/* 일정 관리 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-500" />
                  <h3 className="text-sm font-semibold text-gray-800">현재 강의 일정</h3>
                </div>
                <button onClick={() => setShowScheduleForm(!showScheduleForm)}
                  className="text-[11px] text-indigo-600 font-medium hover:text-indigo-800">
                  {showScheduleForm ? '취소' : '+ 추가'}
                </button>
              </div>

              {showScheduleForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-3 space-y-2.5">
                  <input type="text" placeholder="프로젝트/강의명" value={form.project_name}
                    onChange={(e) => setForm({...form, project_name: e.target.value})}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={form.start_date}
                      onChange={(e) => setForm({...form, start_date: e.target.value})}
                      className="text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
                    <input type="date" value={form.end_date}
                      onChange={(e) => setForm({...form, end_date: e.target.value})}
                      className="text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
                  </div>
                  <input type="text" placeholder="비고 (선택)" value={form.note}
                    onChange={(e) => setForm({...form, note: e.target.value})}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
                  <button onClick={handleAddSchedule}
                    className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                    추가
                  </button>
                </div>
              )}

              {schedules.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">등록된 일정이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {schedules.map((s, idx) => (
                    <div key={s.id || idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                      <div>
                        <p className="text-xs font-medium text-gray-800">{s.project_name}</p>
                        <p className="text-[10px] text-gray-500">{s.start_date} ~ {s.end_date}</p>
                      </div>
                      <button onClick={() => handleRemoveSchedule(idx)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 제출 버튼 */}
            <button
              onClick={handleSubmit}
              className="w-full py-3.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-md transition-colors"
            >
              제출하기
            </button>
          </div>
        )}

        {/* Step 3: 완료 */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl p-10 shadow-sm text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">제출 완료</h2>
            <p className="text-sm text-gray-500 mb-6">
              이력서와 일정이 성공적으로 등록되었습니다.<br/>
              관리자가 매칭 시 참고합니다.
            </p>
            <button
              onClick={() => { setStep('landing'); setName(''); setSelectedId(''); setResumeFile(null); setSchedules([]); }}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200"
            >
              처음으로 돌아가기
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
