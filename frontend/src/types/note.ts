/**
 * Note Types
 * 노트 관련 타입 정의
 */

export enum OrganizeMethod {
  BASIC_SUMMARY = 'basic_summary',
  CORNELL = 'cornell',
}

export enum ProcessStatus {
  UPLOADING = 'uploading',
  OCR_PROCESSING = 'ocr_processing',
  AI_ORGANIZING = 'ai_organizing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Note {
  id: number
  title: string
  created_at: string
  organize_method: OrganizeMethod
  status: ProcessStatus
  organized_content?: string
  error_message?: string
}

export interface NoteListItem {
  id: number
  title: string
  created_at: string
  status: ProcessStatus
}

export interface ProcessResponse {
  note_id: number
  status: ProcessStatus
  message: string
  organized_content?: string
  error_message?: string
}

export interface UploadResponse {
  id: number
  title: string
  status: ProcessStatus
  organize_method: OrganizeMethod
  created_at: string
}
