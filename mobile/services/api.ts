/**
 * API Service for Mobile
 * 백엔드 API 통신 서비스
 */

import axios from 'axios'

// 개발 환경: LAN IP로 통일
const DEV_API_URL = 'http://192.168.55.96:8000'
const API_URL = DEV_API_URL

// 외부에서 사용할 수 있도록 export
export const API_BASE_URL = API_URL

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
  thumbnail_url?: string
  image_urls?: string[]  // 원본 이미지 URL 목록
  detected_subject?: string  // AI 감지 과목
  detected_note_type?: string  // AI 감지 노트 타입
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

export interface UsageInfo {
  used: number
  limit: number
  remaining: number
  is_unlimited: boolean
}

export interface PlanInfo {
  id: string
  name: string
  price: number
  price_display: string
  monthly_limit: number
  features: string[]
  is_current: boolean
}

export interface PlansResponse {
  current_plan: string
  usage: UsageInfo
  plans: PlanInfo[]
}

export interface SubscriptionInfo {
  id: number
  plan: string
  status: string
  provider: string
  current_period_start: string
  current_period_end: string
  cancelled_at?: string
  is_active: boolean
}

export interface VerifyPurchaseResponse {
  success: boolean
  message: string
  subscription?: SubscriptionInfo
  new_plan?: string
}

export interface PaymentHistory {
  id: number
  amount: number
  currency: string
  plan: string
  status: string
  created_at: string
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
  list: async (skip: number = 0, limit: number = 20, token?: string | null, subject?: string): Promise<Note[]> => {
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const params: Record<string, any> = { skip, limit }
    if (subject && subject !== 'all') {
      params.subject = subject
    }
    const response = await apiClient.get('/api/notes/', {
      params,
      headers,
    })
    return response.data
  },

  get: async (noteId: number): Promise<Note> => {
    const response = await apiClient.get(`/api/notes/${noteId}`)
    return response.data
  },

  delete: async (noteId: number, token?: string | null): Promise<void> => {
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    await apiClient.delete(`/api/notes/${noteId}`, { headers })
  },

  updateTitle: async (noteId: number, title: string, token?: string | null): Promise<{ message: string; note_id: number; title: string }> => {
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const response = await apiClient.patch(`/api/notes/${noteId}`, { title }, { headers })
    return response.data
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

  getUsage: async (token: string): Promise<UsageInfo> => {
    const response = await apiClient.get('/api/auth/usage', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  getPlans: async (token: string): Promise<PlansResponse> => {
    const response = await apiClient.get('/api/auth/plans', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },
}

/**
 * 결제 API
 */
export const paymentAPI = {
  verifyPurchase: async (
    token: string,
    purchaseToken: string,
    productId: string
  ): Promise<VerifyPurchaseResponse> => {
    const response = await apiClient.post(
      '/api/payment/verify-purchase',
      {
        purchase_token: purchaseToken,
        product_id: productId,
        package_name: 'com.notegen.app',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    return response.data
  },

  getSubscription: async (token: string): Promise<SubscriptionInfo | null> => {
    const response = await apiClient.get('/api/payment/subscription', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  cancelSubscription: async (token: string): Promise<{ message: string; expires_at: string }> => {
    const response = await apiClient.post(
      '/api/payment/subscription/cancel',
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    return response.data
  },

  getHistory: async (token: string, limit: number = 20): Promise<PaymentHistory[]> => {
    const response = await apiClient.get('/api/payment/history', {
      params: { limit },
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  restorePurchases: async (token: string): Promise<{ restored: boolean; plan: string; message: string }> => {
    const response = await apiClient.post(
      '/api/payment/restore',
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    return response.data
  },
}

export default apiClient
