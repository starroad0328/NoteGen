'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { notesAPI } from '@/services/api'
import type { NoteListItem } from '@/types/note'
import { ProcessStatus } from '@/types/note'

export default function NotesListPage() {
  const [notes, setNotes] = useState<NoteListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const data = await notesAPI.list()
      setNotes(data)
    } catch (err) {
      console.error('노트 목록 조회 오류:', err)
      setError('노트 목록을 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: ProcessStatus) => {
    const badges = {
      [ProcessStatus.UPLOADING]: { text: '업로드 중', color: 'bg-gray-200 text-gray-700' },
      [ProcessStatus.OCR_PROCESSING]: { text: 'OCR 처리 중', color: 'bg-blue-200 text-blue-700' },
      [ProcessStatus.AI_ORGANIZING]: { text: 'AI 정리 중', color: 'bg-purple-200 text-purple-700' },
      [ProcessStatus.COMPLETED]: { text: '완료', color: 'bg-green-200 text-green-700' },
      [ProcessStatus.FAILED]: { text: '실패', color: 'bg-red-200 text-red-700' },
    }

    const badge = badges[status] || { text: '알 수 없음', color: 'bg-gray-200' }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-gray-600">노트 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-blue-500 hover:underline mb-2 block">
              ← 홈으로
            </Link>
            <h1 className="text-4xl font-bold">내 노트</h1>
          </div>

          <Link
            href="/upload"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            + 새 노트
          </Link>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* 노트 목록 */}
        {notes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-xl text-gray-600 mb-6">
              아직 생성된 노트가 없습니다
            </p>
            <Link
              href="/upload"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold"
            >
              첫 노트 만들기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 block"
              >
                {/* 노트 아이콘 */}
                <div className="text-4xl mb-3">📄</div>

                {/* 제목 */}
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                  {note.title}
                </h3>

                {/* 날짜 */}
                <p className="text-sm text-gray-500 mb-3">
                  {new Date(note.created_at).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>

                {/* 상태 */}
                {getStatusBadge(note.status)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
