/**
 * 통합 노트 블록 타입 정의
 * 모든 정리 방식(기본, 코넬식, 오답노트, 단어장)에서 공통 사용
 */

// 블록 타입
export type NoteBlockType =
  | 'title'      // 제목
  | 'heading'    // 소제목
  | 'paragraph'  // 본문
  | 'bullet'     // 글머리표
  | 'numbered'   // 번호 목록
  | 'keyword'    // 핵심 키워드 (코넬식 cues)
  | 'summary'    // 요약
  | 'important'  // 중요 강조
  | 'example'    // 예시
  | 'formula'    // 공식 (수학)
  | 'definition' // 정의
  | 'tip'        // 팁/주의
  | 'divider';   // 구분선

// 기본 블록 인터페이스
interface BaseBlock {
  id?: string;
}

// 제목 블록
export interface TitleBlock extends BaseBlock {
  type: 'title';
  content: string;
  subtitle?: string;
}

// 소제목 블록
export interface HeadingBlock extends BaseBlock {
  type: 'heading';
  level: 1 | 2 | 3;
  content: string;
}

// 본문 블록
export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph';
  content: string;
}

// 글머리표 블록
export interface BulletBlock extends BaseBlock {
  type: 'bullet';
  items: string[];
}

// 번호 목록 블록
export interface NumberedBlock extends BaseBlock {
  type: 'numbered';
  items: string[];
}

// 키워드 블록 (코넬식 cues 역할)
export interface KeywordBlock extends BaseBlock {
  type: 'keyword';
  keywords: string[];
  style?: 'inline' | 'chips' | 'list';
}

// 요약 블록
export interface SummaryBlock extends BaseBlock {
  type: 'summary';
  content: string;
}

// 중요 강조 블록
export interface ImportantBlock extends BaseBlock {
  type: 'important';
  content: string;
  level?: 'normal' | 'high' | 'critical';
}

// 예시 블록
export interface ExampleBlock extends BaseBlock {
  type: 'example';
  content: string;
  label?: string;
}

// 공식 블록
export interface FormulaBlock extends BaseBlock {
  type: 'formula';
  content: string;
  description?: string;
}

// 정의 블록
export interface DefinitionBlock extends BaseBlock {
  type: 'definition';
  term: string;
  definition: string;
}

// 팁/주의 블록
export interface TipBlock extends BaseBlock {
  type: 'tip';
  content: string;
  variant?: 'tip' | 'warning' | 'info';
}

// 구분선 블록
export interface DividerBlock extends BaseBlock {
  type: 'divider';
}

// 통합 블록 타입
export type NoteBlock =
  | TitleBlock
  | HeadingBlock
  | ParagraphBlock
  | BulletBlock
  | NumberedBlock
  | KeywordBlock
  | SummaryBlock
  | ImportantBlock
  | ExampleBlock
  | FormulaBlock
  | DefinitionBlock
  | TipBlock
  | DividerBlock;

// 노트 데이터 구조
export interface NoteData {
  title: string;
  blocks: NoteBlock[];
  metadata?: {
    subject?: string;
    date?: string;
    organizeMethod?: string;
  };
}

// 렌더러 Props
export interface NoteRendererProps {
  data: NoteData;
  onBlockPress?: (block: NoteBlock, index: number) => void;
}
