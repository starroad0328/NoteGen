/**
 * API Service
 * 백엔드 API 통신 서비스
 */

import axios from 'axios'
import type {
  Note,
  NoteListItem,
  ProcessResponse,
  UploadResponse,
  OrganizeMethod,
} from '@/types/note'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 필기 업로드 API
 */
export const uploadAPI = {
  /**
   * 이미지 파일 업로드
   */
  uploadImages: async (
    files: File[],
    organizeMethod: OrganizeMethod = OrganizeMethod.BASIC_SUMMARY
  ): Promise<UploadResponse> => {
    const formData = new FormData()

    files.forEach((file) => {
      formData.append('files', file)
    })
    formData.append('organize_method', organizeMethod)

    const response = await apiClient.post<UploadResponse>(
      '/api/upload/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )

    return response.data
  },
}

/**
 * 노트 처리 API
 */
export const processAPI = {
  /**
   * 노트 처리 시작
   */
  startProcess: async (noteId: number): Promise<ProcessResponse> => {
    const response = await apiClient.post<ProcessResponse>(
      `/api/process/${noteId}/process`
    )
    return response.data
  },

  /**
   * 처리 상태 확인
   */
  getStatus: async (noteId: number): Promise<ProcessResponse> => {
    const response = await apiClient.get<ProcessResponse>(
      `/api/process/${noteId}/status`
    )
    return response.data
  },
}

/**
 * 노트 관리 API
 */
export const notesAPI = {
  /**
   * 노트 목록 조회
   */
  list: async (skip: number = 0, limit: number = 20): Promise<NoteListItem[]> => {
    const response = await apiClient.get<NoteListItem[]>('/api/notes/', {
      params: { skip, limit },
    })
    return response.data
  },

  /**
   * 노트 상세 조회
   */
  get: async (noteId: number): Promise<Note> => {
    const response = await apiClient.get<Note>(`/api/notes/${noteId}`)
    return response.data
  },

  /**
   * 노트 삭제
   */
  delete: async (noteId: number): Promise<void> => {
    await apiClient.delete(`/api/notes/${noteId}`)
  },
}

export default apiClient
