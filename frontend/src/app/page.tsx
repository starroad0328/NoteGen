import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-cream p-8">
      <div className="max-w-2xl text-center">
        {/* 로고 */}
        <h1 className="text-6xl font-bold mb-4 text-charcoal">
          📝 NoteGen
        </h1>

        {/* 서브타이틀 */}
        <p className="text-2xl mb-8 text-gray-600">
          AI가 필기를 자동으로 정리해드립니다
        </p>

        {/* 설명 */}
        <p className="text-lg mb-12 text-gray-500 leading-relaxed">
          손으로 쓴 필기를 촬영하거나 업로드하면<br />
          AI가 깔끔한 디지털 노트로 자동 정리합니다
        </p>

        {/* 시작 버튼 */}
        <Link
          href="/upload"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold
                     px-12 py-4 rounded-lg text-lg transition-colors shadow-lg"
        >
          🚀 시작하기
        </Link>

        {/* 기능 소개 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="text-4xl mb-3">📸</div>
            <h3 className="font-semibold mb-2">간편한 업로드</h3>
            <p className="text-sm text-gray-600">
              사진 촬영 또는<br />갤러리에서 선택
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-semibold mb-2">AI 자동 정리</h3>
            <p className="text-sm text-gray-600">
              2가지 정리 방식<br />중요도 자동 표시
            </p>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <div className="text-4xl mb-3">💾</div>
            <h3 className="font-semibold mb-2">자동 저장</h3>
            <p className="text-sm text-gray-600">
              정리된 노트<br />안전하게 보관
            </p>
          </div>
        </div>

        {/* 버전 정보 */}
        <p className="mt-12 text-sm text-gray-400">
          v1.0.0-MVP | Free Version
        </p>
      </div>
    </main>
  )
}
