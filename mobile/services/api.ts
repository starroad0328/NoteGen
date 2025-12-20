/**
 * API Service for Mobile
 * 백엔드 API 통신 서비스
 */

import axios from 'axios'

// 개발 환경: LAN IP로 통일
const DEV_API_URL = 'http://192.168.55.96:8000'
const API_URL = DEV_API_URL

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

export interface User {
  id: number
  email: string
  name?: string
  school_level?: string
  grade?: number
  grade_display: string
  plan: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
}

export interface ProcessResponse {
  note_id: number
  status: string
  message: string
  organized_content?: string
  error_message?: string
}

// React Native 이미지 타입
interface ImageFile {
  uri: string
  type: string
  name: string
}

/**
 * 필기 업로드 API
 */
export const uploadAPI = {
  uploadImages: async (images: ImageFile[], organizeMethod: string, token?: string | null) => {
    const formData = new FormData()

    images.forEach((image) => {
      formData.append('files', {
        uri: image.uri,
        type: image.type,
        name: image.name,
      } as any)
    })
    formData.append('organize_method', organizeMethod)

    const headers: Record<string, string> = {
      'Content-Type': 'multipart/form-data',
    }

    // 로그인한 경우 토큰 추가
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await apiClient.post('/api/upload/', formData, {
      headers,
    })

    return response.data
  },
}

/**
 * 노트 처리 API
 */
export const processAPI = {
  startProcess: async (noteId: number): Promise<ProcessResponse> => {
    console.log('[processAPI] 시작, noteId:', noteId)
    console.log('[processAPI] URL:', `${API_URL}/api/process/${noteId}/process`)
    try {
      const response = await apiClient.post(`/api/process/${noteId}/process`)
      console.log('[processAPI] 응답:', response.data)
      return response.data
    } catch (error: any) {
      console.error('[processAPI] axios message:', error?.message)
      console.error('[processAPI] axios code:', error?.code)
      console.error('[processAPI] axios config url:', error?.config?.baseURL, error?.config?.url)
      console.error('[processAPI] axios response:', error?.response?.status, error?.response?.data)
      console.error('[processAPI] axios request:', error?.request ? '요청은 갔음' : '요청 안 감')
      throw error
    }
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

/**
 * 인증 API
 */
export const authAPI = {
  register: async (
    email: string,
    password: string,
    name?: string,
    schoolLevel?: string,
    grade?: number
  ): Promise<AuthResponse> => {
    const response = await apiClient.post('/api/auth/register', {
      email,
      password,
      name,
      school_level: schoolLevel,
      grade,
    })
    return response.data
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
    })
    return response.data
  },

  getMe: async (token: string): Promise<User> => {
    const response = await apiClient.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  updateMe: async (
    token: string,
    data: { name?: string; school_level?: string; grade?: number }
  ): Promise<User> => {
    const response = await apiClient.put('/api/auth/me', data, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },
}

export default apiClient
