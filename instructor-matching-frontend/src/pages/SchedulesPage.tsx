import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { instructorsApi } from '../api/instructors';
import { schedulesApi } from '../api/schedules';

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const [instructorId, setInstructorId] = useState('');
  const [form, setForm] = useState({ project_name: '', start_date: '', end_date: '', note: '' });
  const { data: instructors } = useQuery({ queryKey: ['instructors', 'schedules'], queryFn: () => instructorsApi.list(undefined, 0, 200) });
  const { data: schedules = [] } = useQuery({ queryKey: ['schedules'], queryFn: () => schedulesApi.list() });
  const selected = useMemo(() => instructors?.data.find((item) => item.id === instructorId), [instructors, instructorId]);

  const create = async () => {
    if (!selected || !form.project_name || !form.start_date || !form.end_date) return toast.error('강사, 프로젝트명, 기간을 입력하세요.');
    try {
      await schedulesApi.create({ instructor_id: selected.id, instructor_name: selected.name, ...form, note: form.note || null });
      setForm({ project_name: '', start_date: '', end_date: '', note: '' });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('일정이 등록되었습니다.');
    } catch (error: any) { toast.error(error.response?.data?.detail || '일정 등록에 실패했습니다.'); }
  };

  return <div className="max-w-4xl py-4"><div className="flex items-center gap-2 mb-5"><CalendarDays size={19} className="text-indigo-600" /><h1 className="text-lg font-bold text-gray-900">강사 일정 관리</h1></div>
    <section className="rounded-xl border border-gray-100 bg-white p-5"><div className="grid gap-2 md:grid-cols-2"><select value={instructorId} onChange={(event) => setInstructorId(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="">강사를 선택하세요</option>{instructors?.data.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}</select><input value={form.project_name} onChange={(event) => setForm({ ...form, project_name: event.target.value })} placeholder="프로젝트 또는 강의명" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" /><input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" /><input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" /><input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="비고 (선택)" className="md:col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm" /></div><button onClick={create} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">일정 등록</button></section>
    <section className="mt-5 rounded-xl border border-gray-100 bg-white overflow-hidden"><div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold">등록된 일정</div>{schedules.length === 0 ? <p className="p-8 text-center text-sm text-gray-400">등록된 일정이 없습니다.</p> : <div className="divide-y divide-gray-100">{schedules.map((schedule) => <div key={schedule.id} className="flex items-center justify-between gap-4 px-5 py-3"><div><p className="text-sm font-medium text-gray-800">{schedule.instructor_name} · {schedule.project_name}</p><p className="text-xs text-gray-500">{schedule.start_date} ~ {schedule.end_date}{schedule.note ? ` · ${schedule.note}` : ''}</p></div><button onClick={async () => { await schedulesApi.delete(schedule.id); queryClient.invalidateQueries({ queryKey: ['schedules'] }); }} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button></div>)}</div>}</section>
  </div>;
}
