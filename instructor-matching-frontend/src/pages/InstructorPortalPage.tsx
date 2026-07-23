import { useState, useEffect } from 'react';
import { Calendar, Upload, Trash2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:8700', timeout: 30000 });

export default function InstructorPortalPage() {
  const [instructors, setInstructors] = useState<{id: string; name: string}[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [form, setForm] = useState({ project_name: '', start_date: '', end_date: '', note: '' });

  // 강사 목록 로드
  useEffect(() => {
    api.get('/api/portal/instructors').then(r => setInstructors(r.data)).catch(() => {});
  }, []);

  // 선택된 강사의 일정 로드
  useEffect(() => {
    if (selectedId) {
      api.get(`/api/portal/schedules/${selectedId}`).then(r => setSchedules(r.data)).catch(() => {});
    }
  }, [selectedId]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const found = instructors.find(i => i.id === id);
    setSelectedName(found?.name || '');
  };

  const handleAddSchedule = async () => {
    if (!form.project_name || !form.start_date || !form.end_date) {
      toast.error('프로젝트명, 시작일, 종료일을 입력하세요');
      return;
    }
    try {
      await api.post('/api/portal/schedules', {
        instructor_id: selectedId,
        instructor_name: selectedName,
        project_name: form.project_name,
        start_date: form.start_date,
        end_date: form.end_date,
        note: form.note || null,
      });
      toast.success('일정 등록 완료');
      setForm({ project_name: '', start_date: '', end_date: '', note: '' });
      setShowScheduleForm(false);
      // reload
      const r = await api.get(`/api/portal/schedules/${selectedId}`);
      setSchedules(r.data);
    } catch { toast.error('등록 실패'); }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await api.delete(`/api/portal/schedules/${scheduleId}`);
      toast.success('삭제 완료');
      setSchedules(schedules.filter(s => s.id !== scheduleId));
    } catch { toast.error('삭제 실패'); }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/api/portal/resume/${selectedId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('이력서 업로드 완료');
    } catch { toast.error('업로드 실패'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img src="/logo.jpg" alt="iCore" className="w-8 h-8 rounded-lg object-cover" />
          <div>
            <h1 className="text-sm font-bold text-gray-900">iCore 강사 포털</h1>
            <p className="text-[10px] text-gray-400">이력서 업로드 및 일정 관리</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-8 px-4">
        {/* Step 1: 강사 선택 */}
        {!selectedId ? (
          <div className="bg-white rounded-xl p-8 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">본인 이름을 선택하세요</h2>
            <p className="text-xs text-gray-500 mb-6">이력서 업로드 및 강의 일정을 등록할 수 있습니다</p>
            <select
              onChange={(e) => handleSelect(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400"
              defaultValue=""
            >
              <option value="" disabled>강사를 선택하세요...</option>
              {instructors.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 선택된 강사 헤더 */}
            <div className="bg-white rounded-xl p-5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-indigo-600">{selectedName.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{selectedName}</p>
                  <p className="text-[10px] text-gray-400">강사 포털</p>
                </div>
              </div>
              <button onClick={() => { setSelectedId(''); setSelectedName(''); }}
                className="text-xs text-gray-400 hover:text-gray-600">
                다른 강사 선택
              </button>
            </div>

            {/* 이력서 업로드 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <FileText size={16} className="text-indigo-500" />
                <h3 className="text-sm font-semibold text-gray-800">이력서 업로드</h3>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">최신 이력서를 업로드하면 관리자가 매칭 시 참고합니다</p>
              <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                <Upload size={16} className="text-gray-400" />
                <span className="text-xs text-gray-500">파일 선택 (PDF, DOCX, HWP)</span>
                <input type="file" accept=".pdf,.docx,.hwp,.xlsx" onChange={handleResumeUpload} className="hidden" />
              </label>
            </div>

            {/* 일정 관리 */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-500" />
                  <h3 className="text-sm font-semibold text-gray-800">강의 일정</h3>
                </div>
                <button onClick={() => setShowScheduleForm(!showScheduleForm)}
                  className="text-[11px] text-indigo-600 font-medium hover:text-indigo-800">
                  {showScheduleForm ? '취소' : '+ 일정 추가'}
                </button>
              </div>

              {showScheduleForm && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2.5">
                  <input type="text" placeholder="프로젝트/강의명" value={form.project_name}
                    onChange={(e) => setForm({...form, project_name: e.target.value})}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 block">시작일</label>
                      <input type="date" value={form.start_date}
                        onChange={(e) => setForm({...form, start_date: e.target.value})}
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 mb-1 block">종료일</label>
                      <input type="date" value={form.end_date}
                        onChange={(e) => setForm({...form, end_date: e.target.value})}
                        className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
                    </div>
                  </div>
                  <input type="text" placeholder="비고 (선택)" value={form.note}
                    onChange={(e) => setForm({...form, note: e.target.value})}
                    className="w-full text-sm px-3 py-2.5 rounded-lg border border-gray-200 outline-none focus:border-indigo-400" />
                  <button onClick={handleAddSchedule}
                    className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
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
                      <div key={s.id} className={`rounded-lg p-3 border ${isActive ? 'border-blue-100 bg-blue-50/30' : 'border-gray-100'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-800">{s.project_name}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{s.start_date} ~ {s.end_date}</p>
                            {s.note && <p className="text-[9px] text-gray-400 mt-0.5">{s.note}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            {isActive && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">진행중</span>}
                            <button onClick={() => handleDeleteSchedule(s.id)} className="text-gray-400 hover:text-red-500">
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
          </div>
        )}
      </main>
    </div>
  );
}
