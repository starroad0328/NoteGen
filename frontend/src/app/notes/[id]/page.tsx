'use client'

import { useEffect, useState } from 'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { notesAPI } from '@/services/api'
import type { Note } from '@/types/note'

export default function NotePage() {
  const params = useParams()
  const router = useRouter()
  const noteId = parseInt(params.id as string)

  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const data = await notesAPI.get(noteId)
        setNote(data)
      } catch (err: any) {
        console.error('노트 조회 오류:', err)
        setError('노트를 불러올 수 없습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchNote()
  }, [noteId])

  const handleDelete = async () => {
    if (!confirm('이 노트를 삭제하시겠습니까?')) return

    try {
      await notesAPI.delete(noteId)
      router.push('/notes')
    } catch (err) {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <p className="text-gray-600">노트를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-8">
        <div className="max-w-md bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-4">오류</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/notes"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            노트 목록으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/notes"
              className="text-gray-600 hover:text-gray-900"
            >
              ← 목록
            </Link>
            <h1 className="text-xl font-semibold">{note.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700 px-4 py-2"
            >
              🗑️ 삭제
            </button>
          </div>
        </div>
      </div>

      {/* 노트 내용 */}
      <div className="max-w-4xl mx-auto py-8">
        <div className="note-page bg-white rounded-lg shadow-lg">
          {note.organized_content ? (
            <div className="prose prose-lg max-w-none">
              <ReactMarkdown
                components={{
                  // 커스텀 렌더링
                  h1: ({ children }) => (
                    <h1 className="note-title">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-semibold mt-8 mb-4">
                      {children}
                    </h2>
                  ),
                  ul: ({ children }) => (
                    <ul className="space-y-2 my-4">{children}</ul>
                  ),
                  li: ({ children }) => {
                    const text = children?.toString() || ''
                    // ⭐ 표시가 있으면 노란 형광펜
                    if (text.includes('⭐')) {
                      return (
                        <li className="highlight-yellow ml-4">{children}</li>
                      )
                    }
                    // 🔸 표시가 있으면 분홍 형광펜
                    if (text.includes('🔸')) {
                      return (
                        <li className="highlight-pink ml-4">{children}</li>
                      )
                    }
                    return <li className="ml-4">{children}</li>
                  },
                  table: ({ children }) => (
                    <table className="w-full border-collapse my-6">
                      {children}
                    </table>
                  ),
                  th: ({ children }) => (
                    <th className="border border-gray-300 bg-gray-50 px-4 py-2 text-left">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="border border-gray-300 px-4 py-2">
                      {children}
                    </td>
                  ),
                }}
              >
                {note.organized_content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <p>정리된 내용이 없습니다.</p>
            </div>
          )}
        </div>

        {/* 노트 정보 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            생성일: {new Date(note.created_at).toLocaleString('ko-KR')}
          </p>
          <p>정리 방식: {note.organize_method}</p>
        </div>
      </div>
    </div>
  )
}
