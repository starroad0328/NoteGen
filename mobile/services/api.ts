/**
 * API Service for Mobile
 * 백엔드 API 통신 서비스
 */

import axios from 'axios'

// Railway 클라우드 서버
const PROD_API_URL = 'https://notegen-production.up.railway.app'
// 개발 환경: LAN IP (로컬 테스트용)
const DEV_API_URL = 'http://192.168.55.96:8000'

// 프로덕션 서버 사용 (Railway)
const API_URL = PROD_API_URL

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
  detected_note_type?: string
  organize_method?: string
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

    // 업로드는 이미지 전송 때문에 timeout을 120초로 늘림
    // axios 인스턴스 대신 직접 fetch 사용 (React Native FormData 호환성)
    const fetchHeaders: Record<string, string> = {}
    if (token) {
      fetchHeaders['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_URL}/api/upload/`, {
      method: 'POST',
      headers: fetchHeaders,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `Upload failed: ${response.status}`)
    }

    const data = await response.json()
    return data
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

  reprocess: async (noteId: number): Promise<ProcessResponse> => {
    const response = await apiClient.post(`/api/process/${noteId}/reprocess`)
    return response.data
  },

  confirmType: async (noteId: number, convertToErrorNote: boolean): Promise<ProcessResponse> => {
    const response = await apiClient.post(`/api/process/${noteId}/confirm-type`, null, {
      params: { convert_to_error_note: convertToErrorNote }
    })
    return response.data
  },
}

/**
 * 노트 관리 API
 */
export const notesAPI = {
  list: async (skip: number = 0, limit: number = 20, token?: string | null, subject?: string, search?: string): Promise<Note[]> => {
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const params: Record<string, any> = { skip, limit }
    if (subject && subject !== 'all') {
      params.subject = subject
    }
    if (search && search.trim()) {
      params.search = search.trim()
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

  convertToErrorNote: async (noteId: number, token?: string | null): Promise<{ message: string; note_id: number }> => {
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const response = await apiClient.post(`/api/notes/${noteId}/convert-to-error-note`, {}, { headers })
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

/**
 * 취약 개념 API (Pro 전용)
 */
export interface WeakConcept {
  id: number
  subject: string
  unit?: string
  concept: string
  error_reason?: string
  error_count: number
  first_error_at: string
  last_error_at: string
  last_note_id?: number
  last_note_title?: string
}

export interface SubjectSummary {
  subject: string
  subject_name: string
  total_concepts: number
  total_errors: number
  top_concept?: string
}

export interface WeakConceptsOverview {
  total_weak_concepts: number
  total_errors: number
  subjects: SubjectSummary[]
  recent_concepts: WeakConcept[]
}

export const weakConceptsAPI = {
  getOverview: async (token: string): Promise<WeakConceptsOverview> => {
    const response = await apiClient.get('/api/weak-concepts/overview', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  getList: async (token: string, subject?: string): Promise<WeakConcept[]> => {
    const params: Record<string, any> = {}
    if (subject) params.subject = subject
    const response = await apiClient.get('/api/weak-concepts/', {
      params,
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },

  delete: async (token: string, conceptId: number): Promise<void> => {
    await apiClient.delete(`/api/weak-concepts/${conceptId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}

/**
 * Concept Card API (문제 생성용)
 */
export interface ConceptCard {
  id: number
  note_id: number
  card_type: string
  title: string
  subject?: string
  unit_id?: string
  unit_name?: string
  content: Record<string, any>
  common_mistakes?: string[]
  evidence_spans?: string[]
  created_at: string
}

export const conceptCardsAPI = {
  // 노트별 Concept Card 조회
  getByNote: async (noteId: number): Promise<ConceptCard[]> => {
    const response = await apiClient.get(`/api/notes/${noteId}/concept-cards`)
    return response.data
  },

  // 사용자 전체 Concept Card 조회
  getUserCards: async (token: string, subject?: string, limit: number = 50): Promise<ConceptCard[]> => {
    const params: Record<string, any> = { limit }
    if (subject) params.subject = subject
    const response = await apiClient.get('/api/notes/user/concept-cards', {
      params,
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.data
  },
}

/**
 * 정리법 템플릿 API
 */
export interface OrganizeTemplate {
  id: number
  name: string
  description?: string
  icon: string
  output_structure: string
  required_plan: string
  subject?: string
  is_system: boolean
  usage_count: number
  like_count: number
  created_at: string
}

export interface TemplateDetailResponse extends OrganizeTemplate {
  prompt: string
  system_message: string
}

export interface TemplateListResponse {
  templates: OrganizeTemplate[]
  total: number
}

export const templatesAPI = {
  list: async (subject?: string, plan?: string, sort: string = 'popular'): Promise<TemplateListResponse> => {
    const params: Record<string, any> = { sort }
    if (subject) params.subject = subject
    if (plan) params.plan = plan
    const response = await apiClient.get('/api/templates', { params })
    return response.data
  },

  get: async (templateId: number): Promise<TemplateDetailResponse> => {
    const response = await apiClient.get(`/api/templates/${templateId}`)
    return response.data
  },

  use: async (templateId: number): Promise<{ message: string; usage_count: number }> => {
    const response = await apiClient.post(`/api/templates/${templateId}/use`)
    return response.data
  },

  // 구독한 정리법 목록
  getSubscribed: async (token: string): Promise<TemplateListResponse> => {
    const response = await apiClient.get('/api/templates/subscribed/list', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  },

  // 정리법 구독
  subscribe: async (token: string, templateId: number): Promise<{ message: string; subscribed: boolean }> => {
    const response = await apiClient.post(`/api/templates/${templateId}/subscribe`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  },

  // 정리법 구독 해제
  unsubscribe: async (token: string, templateId: number): Promise<{ message: string; subscribed: boolean }> => {
    const response = await apiClient.delete(`/api/templates/${templateId}/subscribe`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  },

  // 좋아요
  like: async (token: string, templateId: number): Promise<{ message: string; liked: boolean; like_count: number }> => {
    const response = await apiClient.post(`/api/templates/${templateId}/like`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  },

  // 좋아요 취소
  unlike: async (token: string, templateId: number): Promise<{ message: string; liked: boolean; like_count: number }> => {
    const response = await apiClient.delete(`/api/templates/${templateId}/like`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  },

  // 좋아요한 정리법 ID 목록
  getLikedIds: async (token: string): Promise<{ liked_ids: number[] }> => {
    const response = await apiClient.get('/api/templates/liked/list', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  },
}

/**
 * 요약 노트 API
 */
export interface SummaryLimits {
  used: number
  limit: number
  remaining: number
  is_unlimited: boolean
  max_notes: number
  available_styles: string[]
}

export interface SummaryResponse {
  id: number
  title: string
  content: string
  source_note_ids: number[]
  style: string
}

export const summaryAPI = {
  // 요약 생성 제한 조회
  getLimits: async (token: string): Promise<SummaryLimits> => {
    const response = await apiClient.get('/api/summary/limits', {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  },

  // 요약 노트 생성
  generate: async (
    token: string,
    noteIds: number[],
    style: string = 'basic',
    title?: string
  ): Promise<SummaryResponse> => {
    const response = await apiClient.post('/api/summary/generate', {
      note_ids: noteIds,
      style,
      title
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return response.data
  },
}

export default apiClient
