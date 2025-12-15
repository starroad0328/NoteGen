import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NoteGen - AI 필기 정리',
  description: '손으로 쓴 필기를 AI가 자동으로 깔끔한 디지털 노트로 정리해주는 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
