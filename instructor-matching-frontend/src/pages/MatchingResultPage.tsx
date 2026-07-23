import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { matchingApi } from '../api/matching';
import { instructorsApi } from '../api/instructors';
import type { MatchScore, Instructor } from '../types';

export default function MatchingResultPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<MatchScore | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<Instructor | null>(null);
  const [candidates, setCandidates] = useState<Set<string>>(new Set());
  const [finalSelected, setFinalSelected] = useState<string | null>(null);

  const { data: result, isLoading } = useQuery({
    queryKey: ['matching-result', id],
    queryFn: () => matchingApi.get(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (result?.candidates) {
      const cands = result.candidates;
      setCandidates(new Set(cands));
      const finalItem = cands.find((c: string) => c.startsWith('final_'));
      if (finalItem) setFinalSelected(finalItem.replace('final_', ''));
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
      // 추가로 한번 더 추가해서 candidates=2로 만들어 구분 (final 마킹)
      // 실제로는 "final:" 접두사로 구분
      await matchingApi.addCandidate(id, `final_${instructorId}`);
      setCandidates(new Set([instructorId, `final_${instructorId}`]));
      setFinalSelected(instructorId);
      toast.success('강사 선정 완료!');
      queryClient.invalidateQueries({ queryKey: ['history'] });
    } catch { toast.error('저장 실패'); }
  };

  if (isLoading) return <div className="py-8 text-center text-sm text-gray-400">로딩 중...</div>;
  if (!result) return <div className="py-8 text-center text-sm text-gray-400">결과 없음</div>;

  const top20 = result.results.slice(0, 20);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <p className="text-lg font-bold text-gray-900">매칭 결과</p>
        <p className="text-xs text-gray-500 mt-0.5">
          상위 20명 추천
          {finalSelected && <span className="text-green-600 ml-2">· 강사 선정 완료</span>}
          {!finalSelected && candidates.size > 0 && <span className="text-indigo-600 ml-2">· {candidates.size}명 후보 선정</span>}
        </p>
      </div>
      <div className="flex gap-4" style={{ height: 'calc(100vh - 160px)' }}>
        {/* 목록 */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-y-auto">
            {top20.map((s, idx) => (
              <button key={s.instructor_id} onClick={() => setSelected(s)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  selected?.instructor_id === s.instructor_id ? 'bg-blue-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5 font-mono">{idx + 1}</span>
                  <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-indigo-700">{s.instructor_name.charAt(0)}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{s.instructor_name}</span>
                  {finalSelected === s.instructor_id && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">선정</span>}
                  {candidates.has(s.instructor_id) && finalSelected !== s.instructor_id && <CheckCircle size={13} className="text-amber-500" />}
                </div>
                <Score value={s.total_score} />
              </button>
            ))}
          </div>

        {/* 상세 패널 */}
        <div className="w-96 bg-white border border-gray-200 rounded-lg overflow-y-auto">
          {selected ? (
            <div className="p-5 space-y-4">
              {/* 상단 요약 */}
              <div className="text-center pb-3 border-b border-gray-100">
                <p className="text-lg font-bold text-gray-900">{selected.instructor_name}</p>
              </div>

              {/* 연락처 */}
              {selectedInstructor && (selectedInstructor.contact || selectedInstructor.email) && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                  {selectedInstructor.contact && (
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-700">{selectedInstructor.contact}</span>
                    </div>
                  )}
                  {selectedInstructor.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-700">{selectedInstructor.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 점수 */}
              <div className="space-y-2">
                <Bar label="키워드 매칭" score={selected.keyword_score} max={40} />
                <Bar label="자격 매칭" score={selected.qualification_score} max={30} />
                <Bar label="경력 매칭" score={selected.experience_score} max={30} />
              </div>

              {/* AI 추천 분석 */}
              <AiReasonSection matchingId={id!} instructorId={selected.instructor_id} key={selected.instructor_id} />

              {/* 버튼 */}
              <div className="border-t border-gray-100 pt-4 space-y-2">
                {!candidates.has(selected.instructor_id) && (
                  <button onClick={() => handleCandidate(selected.instructor_id)}
                    className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700">
                    후보 선정
                  </button>
                )}
                {candidates.has(selected.instructor_id) && finalSelected !== selected.instructor_id && (
                  <>
                    <button onClick={() => handleFinalSelect(selected.instructor_id)}
                      className="w-full py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700">
                      강사 선정
                    </button>
                    <button onClick={() => handleCandidate(selected.instructor_id)}
                      className="w-full py-2 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200">
                      후보 해제
                    </button>
                  </>
                )}
                {finalSelected === selected.instructor_id && (
                  <div className="text-center py-2">
                    <span className="text-sm font-bold text-green-700">✓ 최종 강사 선정됨</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5">
              <p className="text-xs text-gray-400 text-center py-8">강사를 선택하면<br/>상세 분석이 표시됩니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchAnalysis({ score }: { score: MatchScore }) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  if (score.keyword_score >= 28) strengths.push('과업 관련 키워드 높은 일치율');
  else if (score.keyword_score >= 16) strengths.push('과업 관련 키워드 일부 일치');
  else weaknesses.push('과업 관련 키워드 일치율 낮음');
  if (score.qualification_score >= 21) strengths.push('자격 요건 충족');
  else if (score.qualification_score >= 10) weaknesses.push('자격 요건 일부 미충족');
  else weaknesses.push('자격 요건 미충족');
  if (score.experience_score >= 21) strengths.push('충분한 경력 보유');
  else if (score.experience_score >= 10) weaknesses.push('경력 다소 부족');
  else weaknesses.push('경력 부족');
  if (score.total_score >= 70) strengths.push('종합 적합도 우수');
  return (
    <div className="space-y-2">
      {strengths.length > 0 && (
        <div className="bg-green-50 rounded-lg p-2.5">
          <p className="text-[10px] text-green-700 font-bold mb-1">✓ 강점</p>
          {strengths.map((s, i) => <p key={i} className="text-[11px] text-green-800">• {s}</p>)}
        </div>
      )}
      {weaknesses.length > 0 && (
        <div className="bg-red-50 rounded-lg p-2.5">
          <p className="text-[10px] text-red-600 font-bold mb-1">✗ 약점</p>
          {weaknesses.map((w, i) => <p key={i} className="text-[11px] text-red-700">• {w}</p>)}
        </div>
      )}
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
    <div className="border-t border-gray-100 pt-3 space-y-2">
      <p className="text-[11px] font-semibold text-gray-700">🤖 AI 추천 분석</p>
      {data ? (
        <div className="space-y-2">
          {data.strengths && data.strengths.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-emerald-700 mb-1">강점</p>
              {data.strengths.map((s, i) => <p key={i} className="text-[11px] text-emerald-800">• {s}</p>)}
            </div>
          )}
          {data.weaknesses && data.weaknesses.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-orange-600 mb-1">약점</p>
              {data.weaknesses.map((w, i) => <p key={i} className="text-[11px] text-orange-700">• {w}</p>)}
            </div>
          )}
          {data.summary && (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-slate-600 mb-1">종합</p>
              <p className="text-[11px] text-slate-700">{data.summary}</p>
            </div>
          )}
        </div>
      ) : (
        <button onClick={handleGenerate} disabled={loading}
          className="w-full py-2 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-100 disabled:opacity-50">
          {loading ? 'AI 분석 중...' : 'AI 추천 이유 생성'}
        </button>
      )}
    </div>
  );
}

function Score({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-green-50 text-green-700' : value >= 40 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700';
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${color}`}>{value}</span>;
}

function Bar({ label, score, max }: { label: string; score: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-0.5">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-700 font-medium">{score}점</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full">
        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(score / max) * 100}%` }} />
      </div>
    </div>
  );
}
