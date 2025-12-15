'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadAPI, processAPI } from '@/services/api'
import { OrganizeMethod } from '@/types/note'

export default function UploadPage() {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [organizeMethod, setOrganizeMethod] = useState<OrganizeMethod>(
    OrganizeMethod.BASIC_SUMMARY
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])

    if (selectedFiles.length > 3) {
      setError('최대 3개까지 업로드 가능합니다.')
      return
    }

    // 이미지 파일만 필터링
    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith('image/')
    )

    if (imageFiles.length !== selectedFiles.length) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }

    setFiles(imageFiles)
    setError('')
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('파일을 선택해주세요.')
      return
    }

    setUploading(true)
    setError('')

    try {
      // 1. 파일 업로드
      const uploadResult = await uploadAPI.uploadImages(files, organizeMethod)
      console.log('업로드 완료:', uploadResult)

      // 2. 처리 시작
      await processAPI.startProcess(uploadResult.id)
      console.log('처리 시작')

      // 3. 처리 페이지로 이동
      router.push(`/processing/${uploadResult.id}`)
    } catch (err: any) {
      console.error('업로드 오류:', err)
      setError(err.response?.data?.detail || '업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <Link href="/" className="text-blue-500 hover:underline">
            ← 홈으로
          </Link>
          <h1 className="text-4xl font-bold mt-4 mb-2">필기 업로드</h1>
          <p className="text-gray-600">
            손으로 쓴 필기를 업로드하고 정리 방식을 선택하세요
          </p>
        </div>

        {/* 업로드 영역 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-4">📸 이미지 선택</h2>

          <div className="upload-area mb-4">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
              disabled={uploading}
            />
            <label
              htmlFor="file-input"
              className="cursor-pointer block"
            >
              <div className="text-6xl mb-4">📁</div>
              <p className="text-lg font-semibold mb-2">
                클릭하여 파일 선택
              </p>
              <p className="text-sm text-gray-500">
                JPG, PNG 파일 | 최대 3개
              </p>
            </label>
          </div>

          {/* 선택된 파일 목록 */}
          {files.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">선택된 파일:</h3>
              <ul className="space-y-2">
                {files.map((file, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded"
                  >
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 정리 방식 선택 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-semibold mb-4">📋 정리 방식 선택</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 기본 요약 */}
            <div
              onClick={() => setOrganizeMethod(OrganizeMethod.BASIC_SUMMARY)}
              className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                organizeMethod === OrganizeMethod.BASIC_SUMMARY
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  checked={organizeMethod === OrganizeMethod.BASIC_SUMMARY}
                  onChange={() => setOrganizeMethod(OrganizeMethod.BASIC_SUMMARY)}
                  className="mr-2"
                />
                <h3 className="text-lg font-semibold">기본 요약 정리</h3>
              </div>
              <p className="text-sm text-gray-600">
                제목, 소제목, 글머리표로 간단하게 정리
              </p>
            </div>

            {/* 코넬식 */}
            <div
              onClick={() => setOrganizeMethod(OrganizeMethod.CORNELL)}
              className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                organizeMethod === OrganizeMethod.CORNELL
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center mb-2">
                <input
                  type="radio"
                  checked={organizeMethod === OrganizeMethod.CORNELL}
                  onChange={() => setOrganizeMethod(OrganizeMethod.CORNELL)}
                  className="mr-2"
                />
                <h3 className="text-lg font-semibold">코넬식 정리</h3>
              </div>
              <p className="text-sm text-gray-600">
                키워드 + 설명 + 요약 형식으로 시험 대비 정리
              </p>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* 업로드 버튼 */}
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className={`w-full py-4 rounded-lg text-white font-semibold text-lg transition-colors ${
            uploading || files.length === 0
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {uploading ? '업로드 중...' : '📝 정리 시작하기'}
        </button>
      </div>
    </div>
  )
}
