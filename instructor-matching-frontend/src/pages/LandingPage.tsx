import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-100 rounded-full opacity-30 blur-3xl" />
      </div>

      {/* 상단 네비게이션 */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="iCore" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-sm font-bold text-gray-800">iCore</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-5 py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          로그인
        </button>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-8">
        <div className="text-center max-w-lg">
          <div className="inline-flex items-center justify-center mb-6">
            <img src="/logo.jpg" alt="iCore" className="w-24 h-24 rounded-2xl object-cover shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            AI 기반 강사 매칭 플랫폼
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-8">
            나라장터 과업지시서를 업로드하면<br/>
            AI가 자동으로 분석하여 최적의 강사를 매칭합니다
          </p>

          {/* 특징 카드 그리드 (간격 gap-4 -> gap-5로 살짝 여유있게 조정) */}
          <div className="grid grid-cols-3 gap-5 mb-10">
            <FeatureCard emoji="📄" title="문서 파싱" desc="HWP·PDF·DOCX 자동 분석" />
            <FeatureCard emoji="🤖" title="AI 매칭" desc="Gemini 기반 최적 매칭" />
            <FeatureCard emoji="👥" title="강사 관리" desc="108명 이력서 DB" />
          </div>

          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
          >
            시작하기
          </button>
        </div>
      </main>

      {/* 하단 */}
      <footer className="relative z-10 text-center py-5">
        <p className="text-[10px] text-gray-400">iCore Education & Consultancy</p>
      </footer>
    </div>
  );
}

function FeatureCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    /* 
      [수정 포인트]
      - h-32 : 세로 높이를 128px로 일정하게 고정
      - flex flex-col items-center justify-center : 카드 내부 내용들을 완전한 중앙 정렬
      - shadow-sm hover:shadow transition-all : 살짝 입체감을 줘서 완성도 상승
    */
    <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/90 h-32 flex flex-col items-center justify-center text-center shadow-sm hover:shadow transition-all">
      <div className="text-2xl mb-1.5">{emoji}</div>
      <p className="text-xs font-bold text-gray-800 mb-1">{title}</p>
      <p className="text-[11px] text-gray-500 leading-snug break-keep">{desc}</p>
    </div>
  );
}