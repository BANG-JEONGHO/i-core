import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { CalendarDays, FileUp, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { portalApi } from '../api/schedules';
import type { Schedule } from '../api/schedules';

export default function InstructorPortalPage() {
  const [name, setName] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [resume, setResume] = useState<File | null>(null);
  const [form, setForm] = useState({ project_name: '', start_date: '', end_date: '', note: '' });
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (!name.trim()) return toast.error('이름을 입력하세요.');
    setLoading(true);
    try {
      const registered = await portalApi.register(name.trim());
      setInstructorId(registered.instructor_id);
      setName(registered.name);
      setSchedules(await portalApi.schedules(registered.instructor_id));
      toast.success(registered.is_new ? '강사 정보가 등록되었습니다.' : '기존 강사 정보를 불러왔습니다.');
    } catch {
      toast.error('강사 정보를 불러오지 못했습니다.');
    } finally { setLoading(false); }
  };

  const addSchedule = async () => {
    if (!form.project_name || !form.start_date || !form.end_date) return toast.error('프로젝트명과 기간을 입력하세요.');
    try {
      const schedule = await portalApi.addSchedule({ instructor_id: instructorId, instructor_name: name, ...form, note: form.note || null });
      setSchedules((items) => [schedule, ...items]);
      setForm({ project_name: '', start_date: '', end_date: '', note: '' });
    } catch (error: any) { toast.error(error.response?.data?.detail || '일정 등록에 실패했습니다.'); }
  };

  const submitResume = async () => {
    if (!resume) return toast.error('이력서 파일을 선택하세요.');
    setLoading(true);
    try { await portalApi.uploadResume(instructorId, resume); toast.success('이력서가 제출되었습니다.'); setResume(null); }
    catch { toast.error('이력서 제출에 실패했습니다.'); }
    finally { setLoading(false); }
  };

  const chooseResume = (event: ChangeEvent<HTMLInputElement>) => setResume(event.target.files?.[0] || null);

  if (!instructorId) {
    return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4"><section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-gray-100"><h1 className="text-xl font-bold text-gray-900">강사 포털</h1><p className="mt-2 text-sm text-gray-500">이력서와 현재 강의 일정을 제출할 수 있습니다.</p><input value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && start()} placeholder="이름" className="mt-6 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" /><button onClick={start} disabled={loading} className="mt-3 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white disabled:opacity-50">시작하기</button></section></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8"><section className="mx-auto max-w-2xl space-y-5"><header><h1 className="text-xl font-bold text-gray-900">{name} 님의 강사 포털</h1><p className="text-sm text-gray-500">입력한 일정은 매칭 시 참고됩니다.</p></header>
      <article className="rounded-xl border border-gray-100 bg-white p-5"><div className="flex items-center gap-2"><FileUp size={17} className="text-indigo-600" /><h2 className="text-sm font-semibold">이력서 제출</h2></div><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input type="file" accept=".pdf,.docx,.hwp,.xlsx" onChange={chooseResume} className="block w-full text-xs" /><button onClick={submitResume} disabled={loading || !resume} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">업로드</button></div>{resume && <p className="mt-2 text-xs text-gray-500">선택됨: {resume.name}</p>}</article>
      <article className="rounded-xl border border-gray-100 bg-white p-5"><div className="flex items-center gap-2"><CalendarDays size={17} className="text-indigo-600" /><h2 className="text-sm font-semibold">현재 강의 일정</h2></div><div className="mt-4 grid gap-2 md:grid-cols-2"><input value={form.project_name} onChange={(event) => setForm({ ...form, project_name: event.target.value })} placeholder="프로젝트 또는 강의명" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" /><input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="비고 (선택)" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" /><input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" /><input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div><button onClick={addSchedule} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white"><Plus size={14} />일정 추가</button><div className="mt-4 space-y-2">{schedules.length === 0 && <p className="py-4 text-center text-xs text-gray-400">등록된 일정이 없습니다.</p>}{schedules.map((schedule) => <div key={schedule.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3"><div><p className="text-sm font-medium text-gray-800">{schedule.project_name}</p><p className="text-xs text-gray-500">{schedule.start_date} ~ {schedule.end_date}</p>{schedule.note && <p className="text-xs text-gray-400">{schedule.note}</p>}</div><button onClick={async () => { await portalApi.deleteSchedule(schedule.id); setSchedules((items) => items.filter((item) => item.id !== schedule.id)); }} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button></div>)}</div></article>
    </section></main>
  );
}
