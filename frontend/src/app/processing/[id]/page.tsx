'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { processAPI } from '@/services/api'
import { ProcessStatus } from '@/types/note'

export default function ProcessingPage() {
  const router = useRouter()
  const params = useParams()
  const noteId = parseInt(params.id as string)

  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.UPLOADING)
  const [message, setMessage] = useState('처리 중...')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        const result = await processAPI.getStatus(noteId)
        setStatus(result.status)
        setMessage(result.message)

        // 완료 시 노트 페이지로 이동
        if (result.status === ProcessStatus.COMPLETED) {
          clearInterval(interval)
          setTimeout(() => {
            router.push(`/notes/${noteId}`)
          }, 1000)
        }

        // 실패 시 에러 표시
        if (result.status === ProcessStatus.FAILED) {
          clearInterval(interval)
          setError(result.error_message || '처리 중 오류가 발생했습니다.')
        }
      } catch (err: any) {
        console.error('상태 확인 오류:', err)
        setError('상태 확인 중 오류가 발생했습니다.')
        clearInterval(interval)
      }
    }

    // 초기 확인
    checkStatus()

    // 2초마다 상태 확인
    interval = setInterval(checkStatus, 2000)

    return () => {
      clearInterval(interval)
    }
  }, [noteId, router])

  const getStatusEmoji = () => {
    switch (status) {
      case ProcessStatus.UPLOADING:
        return '📤'
      case ProcessStatus.OCR_PROCESSING:
        return '🔍'
      case ProcessStatus.AI_ORGANIZING:
        return '🤖'
      case ProcessStatus.COMPLETED:
        return '✅'
      case ProcessStatus.FAILED:
        return '❌'
      default:
        return '⏳'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case ProcessStatus.UPLOADING:
        return '업로드 중'
      case ProcessStatus.OCR_PROCESSING:
        return 'OCR 처리 중'
      case ProcessStatus.AI_ORGANIZING:
        return 'AI 정리 중'
      case ProcessStatus.COMPLETED:
        return '완료!'
      case ProcessStatus.FAILED:
        return '실패'
      default:
        return '처리 중'
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* 상태 애니메이션 */}
        <div className="text-8xl mb-6 animate-pulse">{getStatusEmoji()}</div>

        {/* 상태 텍스트 */}
        <h2 className="text-2xl font-bold mb-4">{getStatusText()}</h2>
        <p className="text-gray-600 mb-6">{message}</p>

        {/* 진행 바 */}
        {!error && status !== ProcessStatus.COMPLETED && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{
                width:
                  status === ProcessStatus.UPLOADING
                    ? '25%'
                    : status === ProcessStatus.OCR_PROCESSING
                    ? '50%'
                    : status === ProcessStatus.AI_ORGANIZING
                    ? '75%'
                    : '100%',
              }}
            />
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
            <p className="font-semibold mb-2">오류 발생</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* 완료 시 자동 이동 안내 */}
        {status === ProcessStatus.COMPLETED && (
          <p className="text-sm text-gray-500">잠시 후 노트 페이지로 이동합니다...</p>
        )}

        {/* 실패 시 재시도 버튼 */}
        {status === ProcessStatus.FAILED && (
          <button
            onClick={() => router.push('/upload')}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            다시 시도하기
          </button>
        )}
      </div>
    </div>
  )
}
