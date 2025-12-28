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
  | 'divider'    // 구분선
  // 오답노트용
  | 'problem'    // 문제
  | 'solution'   // 풀이/정답
  | 'wrongPoint' // 틀린 포인트
  | 'concept'    // 관련 개념
  // 단어장용
  | 'vocabulary'; // 단어

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

// 단순 섹션 블록 (오답노트용 - 라벨 + 내용 + 구분선)
export interface SimpleSectionBlock extends BaseBlock {
  type: 'simpleSection';
  label: string;
  content: string;
}

// ============================================
// 오답노트용 블록
// ============================================

// 문제 블록
export interface ProblemBlock extends BaseBlock {
  type: 'problem';
  number?: number;           // 문제 번호
  content: string;           // 문제 내용
  source?: string;           // 출처 (교재명, 페이지 등)
}

// 풀이/정답 블록
export interface SolutionBlock extends BaseBlock {
  type: 'solution';
  answer: string;            // 정답
  explanation?: string;      // 풀이 과정
  steps?: string[];          // 단계별 풀이
}

// 틀린 포인트 블록
export interface WrongPointBlock extends BaseBlock {
  type: 'wrongPoint';
  myAnswer?: string;         // 내가 쓴 답
  reason: string;            // 틀린 이유
  correction: string;        // 올바른 접근법
}

// 관련 개념 블록
export interface ConceptBlock extends BaseBlock {
  type: 'concept';
  title: string;             // 개념명
  content: string;           // 개념 설명
  relatedFormulas?: string[]; // 관련 공식
}

// ============================================
// 단어장용 블록
// ============================================

// 단어 블록
export interface VocabularyBlock extends BaseBlock {
  type: 'vocabulary';
  word: string;              // 단어
  meaning: string;           // 뜻
  pronunciation?: string;    // 발음
  partOfSpeech?: string;     // 품사
  exampleSentence?: string;  // 예문
  exampleTranslation?: string; // 예문 번역
  synonyms?: string[];       // 동의어
  antonyms?: string[];       // 반의어
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
  | DividerBlock
  | SimpleSectionBlock
  // 오답노트
  | ProblemBlock
  | SolutionBlock
  | WrongPointBlock
  | ConceptBlock
  // 단어장
  | VocabularyBlock;

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
