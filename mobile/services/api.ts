/**
 * API Service for Mobile
 * 백엔드 API 통신 서비스
 */

import axios from 'axios'

// 개발 환경에서는 localhost를 실제 IP로 변경 필요
// Android 에뮬레이터: 10.0.2.2
// iOS 시뮬레이터: localhost
const API_URL = 'http://localhost:8000'  // 실제 서버 IP로 변경

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Note {
  id: number
  title: string
  created_at: string
  organize_method: string
  status: string
  organized_content?: string
  error_message?: string
}

export interface ProcessResponse {
  note_id: number
  status: string
  message: string
  organized_content?: string
  error_message?: string
}

/**
 * 필기 업로드 API
 */
export const uploadAPI = {
  uploadImages: async (files: File[], organizeMethod: string) => {
    const formData = new FormData()

    files.forEach((file) => {
      formData.append('files', file as any)
    })
    formData.append('organize_method', organizeMethod)

    const response = await apiClient.post('/api/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data
  },
}

/**
 * 노트 처리 API
 */
export const processAPI = {
  startProcess: async (noteId: number): Promise<ProcessResponse> => {
    const response = await apiClient.post(`/api/process/${noteId}/process`)
    return response.data
  },

  getStatus: async (noteId: number): Promise<ProcessResponse> => {
    const response = await apiClient.get(`/api/process/${noteId}/status`)
    return response.data
  },
}

/**
 * 노트 관리 API
 */
export const notesAPI = {
  list: async (skip: number = 0, limit: number = 20): Promise<Note[]> => {
    const response = await apiClient.get('/api/notes/', {
      params: { skip, limit },
    })
    return response.data
  },

  get: async (noteId: number): Promise<Note> => {
    const response = await apiClient.get(`/api/notes/${noteId}`)
    return response.data
  },

  delete: async (noteId: number): Promise<void> => {
    await apiClient.delete(`/api/notes/${noteId}`)
  },
}

export default apiClient
