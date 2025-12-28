/**
 * 기존 노트 형식을 통합 NoteData로 변환
 */

import {
  NoteData,
  NoteBlock,
  TitleBlock,
  HeadingBlock,
  ParagraphBlock,
  BulletBlock,
  KeywordBlock,
  SummaryBlock,
  ImportantBlock,
  ExampleBlock,
  // 오답노트
  ProblemBlock,
  SolutionBlock,
  WrongPointBlock,
  ConceptBlock,
  // 단어장
  VocabularyBlock,
} from './types';

// 코넬식 JSON 데이터 타입 (기존 형식)
interface CornellNoteData {
  title: string;
  cues: string[];
  main: Array<{
    type: string;
    content?: string;
    level?: number;
    items?: string[];
  }>;
  summary: string;
}

/**
 * 코넬식 JSON을 통합 NoteData로 변환
 */
export function convertCornellToNoteData(
  cornell: CornellNoteData,
  metadata?: NoteData['metadata']
): NoteData {
  const blocks: NoteBlock[] = [];

  // 제목
  blocks.push({
    type: 'title',
    content: cornell.title,
  } as TitleBlock);

  // 키워드 (cues) - 상단에 배치
  if (cornell.cues && cornell.cues.length > 0) {
    blocks.push({
      type: 'keyword',
      keywords: cornell.cues,
      style: 'chips',
    } as KeywordBlock);
  }

  // 본문 블록 변환
  for (const block of cornell.main) {
    switch (block.type) {
      case 'heading':
        blocks.push({
          type: 'heading',
          level: (block.level || 2) as 1 | 2 | 3,
          content: block.content || '',
        } as HeadingBlock);
        break;

      case 'paragraph':
        blocks.push({
          type: 'paragraph',
          content: block.content || '',
        } as ParagraphBlock);
        break;

      case 'bullet':
        blocks.push({
          type: 'bullet',
          items: block.items || [],
        } as BulletBlock);
        break;

      case 'important':
        blocks.push({
          type: 'important',
          content: block.content || '',
        } as ImportantBlock);
        break;

      case 'example':
        blocks.push({
          type: 'example',
          content: block.content || '',
        } as ExampleBlock);
        break;

      default:
        // 알 수 없는 타입은 paragraph로 처리
        if (block.content) {
          blocks.push({
            type: 'paragraph',
            content: block.content,
          } as ParagraphBlock);
        }
    }
  }

  // 요약 - 하단에 배치
  if (cornell.summary) {
    blocks.push({
      type: 'summary',
      content: cornell.summary,
    } as SummaryBlock);
  }

  return {
    title: cornell.title,
    blocks,
    metadata,
  };
}

// 오답노트 섹션 타입
type WrongAnswerSection = 'problem' | 'myAnswer' | 'wrongAnswer' | 'wrongReason' | 'solution' | 'formula' | 'caution' | 'concept' | null;

// 오답노트 섹션 패턴 감지
function detectWrongAnswerSection(line: string): { section: WrongAnswerSection; content: string } {
  const trimmed = line.trim();

  // **문제**: 또는 문제: 패턴
  if (/^\*\*문제[^*]*\*\*[:\s]*/i.test(trimmed) || /^문제[:\s]+/i.test(trimmed)) {
    const content = trimmed.replace(/^\*\*문제[^*]*\*\*[:\s]*/, '').replace(/^문제[:\s]+/, '').trim();
    return { section: 'problem', content };
  }

  // **내 풀이**, **내가 쓴 답** 패턴
  if (/^\*\*내\s*풀이[^*]*\*\*[:\s]*/i.test(trimmed) || /^\*\*내가\s*쓴\s*답[^*]*\*\*[:\s]*/i.test(trimmed)) {
    const content = trimmed.replace(/^\*\*내\s*풀이[^*]*\*\*[:\s]*/, '').replace(/^\*\*내가\s*쓴\s*답[^*]*\*\*[:\s]*/, '').trim();
    return { section: 'myAnswer', content };
  }

  // **오답**: (틀린 답 자체)
  if (/^\*\*오답\*\*[:\s]*/i.test(trimmed)) {
    const content = trimmed.replace(/^\*\*오답\*\*[:\s]*/, '').trim();
    return { section: 'wrongAnswer', content };
  }

  // **틀린 이유**, **틀린 포인트** 패턴
  if (/^\*\*틀린[^*]*\*\*[:\s]*/i.test(trimmed)) {
    const content = trimmed.replace(/^\*\*틀린[^*]*\*\*[:\s]*/, '').trim();
    return { section: 'wrongReason', content };
  }

  // **정답**, **올바른 풀이**, **올바른 접근** 패턴
  if (/^\*\*정답[^*]*\*\*[:\s]*/i.test(trimmed) || /^\*\*올바른[^*]*\*\*[:\s]*/i.test(trimmed)) {
    const content = trimmed.replace(/^\*\*정답[^*]*\*\*[:\s]*/, '').replace(/^\*\*올바른[^*]*\*\*[:\s]*/, '').trim();
    return { section: 'solution', content };
  }

  // **핵심 공식**, **관련 공식** 패턴
  if (/^\*\*핵심\s*공식[^*]*\*\*[:\s]*/i.test(trimmed) || /^\*\*관련\s*공식[^*]*\*\*[:\s]*/i.test(trimmed)) {
    const content = trimmed.replace(/^\*\*핵심\s*공식[^*]*\*\*[:\s]*/, '').replace(/^\*\*관련\s*공식[^*]*\*\*[:\s]*/, '').trim();
    return { section: 'formula', content };
  }

  // **주의점**, **주의사항** 패턴
  if (/^\*\*주의[^*]*\*\*[:\s]*/i.test(trimmed)) {
    const content = trimmed.replace(/^\*\*주의[^*]*\*\*[:\s]*/, '').trim();
    return { section: 'caution', content };
  }

  // **관련 개념**, **핵심 개념** 패턴
  if (/^\*\*관련\s*개념[^*]*\*\*[:\s]*/i.test(trimmed) || /^\*\*핵심\s*개념[^*]*\*\*[:\s]*/i.test(trimmed)) {
    const content = trimmed.replace(/^\*\*관련\s*개념[^*]*\*\*[:\s]*/, '').replace(/^\*\*핵심\s*개념[^*]*\*\*[:\s]*/, '').trim();
    return { section: 'concept', content };
  }

  return { section: null, content: trimmed };
}

// 오답노트 마크다운인지 감지
function isWrongAnswerMarkdown(markdown: string): boolean {
  const patterns = [
    /\*\*문제[^*]*\*\*/,
    /\*\*내\s*풀이[^*]*\*\*/,
    /\*\*오답[^*]*\*\*/,
    /\*\*정답[^*]*\*\*/,
    /\*\*틀린[^*]*\*\*/,
  ];
  return patterns.some(pattern => pattern.test(markdown));
}

/**
 * 오답노트 마크다운을 NoteData로 변환
 */
function convertWrongAnswerMarkdownToNoteData(
  markdown: string,
  title: string,
  metadata?: NoteData['metadata']
): NoteData {
  const blocks: NoteBlock[] = [];
  const lines = markdown.split('\n');

  let mainTitle = title;
  let currentSection: WrongAnswerSection = null;
  let sectionContent: string[] = [];

  // 섹션 데이터 수집
  const sections: Record<string, string[]> = {
    problem: [],
    myAnswer: [],
    wrongAnswer: [],
    wrongReason: [],
    solution: [],
    formula: [],
    caution: [],
    concept: [],
  };

  const flushSection = () => {
    if (currentSection && sectionContent.length > 0) {
      sections[currentSection].push(...sectionContent);
      sectionContent = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (sectionContent.length > 0) {
        sectionContent.push(''); // 빈 줄 유지
      }
      continue;
    }

    // H1 제목
    if (trimmed.startsWith('# ')) {
      flushSection();
      mainTitle = trimmed.replace('# ', '');
      blocks.push({
        type: 'title',
        content: mainTitle,
      } as TitleBlock);
      currentSection = null;
      continue;
    }

    // 섹션 감지
    const detected = detectWrongAnswerSection(trimmed);
    if (detected.section) {
      flushSection();
      currentSection = detected.section;
      if (detected.content) {
        sectionContent.push(detected.content);
      }
      continue;
    }

    // 현재 섹션에 내용 추가
    if (currentSection) {
      // 번호 매기기 패턴 (1. 2. 3.) 처리
      const numberedMatch = trimmed.match(/^(\d+)\.\s*(.+)/);
      if (numberedMatch) {
        sectionContent.push(numberedMatch[2]);
      } else {
        sectionContent.push(trimmed);
      }
    } else {
      // 섹션 외부 내용은 paragraph로
      blocks.push({
        type: 'paragraph',
        content: trimmed,
      } as ParagraphBlock);
    }
  }

  flushSection();

  // 제목이 없으면 추가
  if (blocks.length === 0 || blocks[0].type !== 'title') {
    blocks.unshift({
      type: 'title',
      content: mainTitle,
    } as TitleBlock);
  }

  // 문제 블록 추가
  if (sections.problem.length > 0) {
    blocks.push({
      type: 'problem',
      content: sections.problem.filter(s => s).join('\n'),
    } as ProblemBlock);
  }

  // 내 풀이 블록
  if (sections.myAnswer.length > 0) {
    blocks.push({
      type: 'wrongPoint',
      myAnswer: sections.myAnswer.filter(s => s).join('\n'),
      reason: '',
      correction: '',
    } as WrongPointBlock);
  }

  // 오답 (틀린 답)
  if (sections.wrongAnswer.length > 0) {
    blocks.push({
      type: 'tip',
      content: sections.wrongAnswer.filter(s => s).join('\n'),
      variant: 'warning',
    } as any);
  }

  // 정답 블록
  if (sections.solution.length > 0) {
    blocks.push({
      type: 'solution',
      answer: sections.solution.filter(s => s).join('\n'),
    } as SolutionBlock);
  }

  // 틀린 이유 블록
  if (sections.wrongReason.length > 0) {
    blocks.push({
      type: 'wrongPoint',
      reason: sections.wrongReason.filter(s => s).join('\n'),
      correction: '',
    } as WrongPointBlock);
  }

  // 핵심 공식 블록
  if (sections.formula.length > 0) {
    blocks.push({
      type: 'formula',
      content: sections.formula.filter(s => s).join('\n'),
    } as any);
  }

  // 주의점 블록
  if (sections.caution.length > 0) {
    blocks.push({
      type: 'tip',
      content: sections.caution.filter(s => s).join('\n'),
      variant: 'warning',
    } as any);
  }

  // 관련 개념 블록
  if (sections.concept.length > 0) {
    blocks.push({
      type: 'concept',
      title: '관련 개념',
      content: sections.concept.filter(s => s).join('\n'),
    } as ConceptBlock);
  }

  return {
    title: mainTitle,
    blocks,
    metadata,
  };
}

/**
 * 마크다운을 통합 NoteData로 변환
 */
export function convertMarkdownToNoteData(
  markdown: string,
  title: string,
  metadata?: NoteData['metadata']
): NoteData {
  // 오답노트 패턴 감지
  if (metadata?.organizeMethod === 'wrong_answer' || isWrongAnswerMarkdown(markdown)) {
    return convertWrongAnswerMarkdownToNoteData(markdown, title, metadata);
  }

  const blocks: NoteBlock[] = [];
  const lines = markdown.split('\n');

  let currentBulletItems: string[] = [];
  let mainTitle = title;

  const flushBulletList = () => {
    if (currentBulletItems.length > 0) {
      blocks.push({
        type: 'bullet',
        items: [...currentBulletItems],
      } as BulletBlock);
      currentBulletItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushBulletList();
      continue;
    }

    // H1 제목
    if (trimmed.startsWith('# ')) {
      flushBulletList();
      const content = trimmed.replace('# ', '');
      if (blocks.length === 0) {
        mainTitle = content;
        blocks.push({
          type: 'title',
          content,
        } as TitleBlock);
      } else {
        blocks.push({
          type: 'heading',
          level: 1,
          content,
        } as HeadingBlock);
      }
      continue;
    }

    // H2 소제목
    if (trimmed.startsWith('## ')) {
      flushBulletList();
      blocks.push({
        type: 'heading',
        level: 2,
        content: trimmed.replace('## ', ''),
      } as HeadingBlock);
      continue;
    }

    // H3 소제목
    if (trimmed.startsWith('### ')) {
      flushBulletList();
      blocks.push({
        type: 'heading',
        level: 3,
        content: trimmed.replace('### ', ''),
      } as HeadingBlock);
      continue;
    }

    // 글머리표
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
      const content = trimmed.replace(/^[-•*]\s+/, '');
      currentBulletItems.push(content);
      continue;
    }

    // 중요 표시 (⭐, 🔸 등)
    if (trimmed.includes('⭐') || trimmed.includes('🔸') || trimmed.includes('📌')) {
      flushBulletList();
      blocks.push({
        type: 'important',
        content: trimmed.replace(/[⭐🔸📌]/g, '').trim(),
      } as ImportantBlock);
      continue;
    }

    // 요약 섹션
    if (trimmed.toLowerCase().includes('요약') && trimmed.includes(':')) {
      flushBulletList();
      const summaryContent = trimmed.split(':').slice(1).join(':').trim();
      if (summaryContent) {
        blocks.push({
          type: 'summary',
          content: summaryContent,
        } as SummaryBlock);
      }
      continue;
    }

    // **요약** 패턴
    if (trimmed.startsWith('**요약**') || trimmed.startsWith('**📌')) {
      flushBulletList();
      const match = trimmed.match(/\*\*[^*]+\*\*[:\s]*(.+)/);
      if (match) {
        blocks.push({
          type: 'summary',
          content: match[1].trim(),
        } as SummaryBlock);
      }
      continue;
    }

    // 일반 문단
    flushBulletList();

    // 테이블 행 스킵 (|로 시작하고 끝나는 경우)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      continue;
    }

    // 테이블 구분선 스킵
    if (trimmed.match(/^\|[-:\s|]+\|$/)) {
      continue;
    }

    // 구분선
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'divider' });
      continue;
    }

    // 볼드 텍스트를 포함한 문단
    blocks.push({
      type: 'paragraph',
      content: trimmed,
    } as ParagraphBlock);
  }

  flushBulletList();

  // 제목이 없으면 추가
  if (blocks.length === 0 || blocks[0].type !== 'title') {
    blocks.unshift({
      type: 'title',
      content: mainTitle,
    } as TitleBlock);
  }

  return {
    title: mainTitle,
    blocks,
    metadata,
  };
}

/**
 * JSON인지 확인하고 적절한 변환 함수 호출
 */
export function convertToNoteData(
  content: string,
  title: string,
  metadata?: NoteData['metadata']
): NoteData {
  // JSON 형식 확인
  try {
    const parsed = JSON.parse(content);
    if (parsed.title && parsed.cues && parsed.main && parsed.summary) {
      return convertCornellToNoteData(parsed, metadata);
    }
  } catch {
    // JSON이 아니면 마크다운으로 처리
  }

  return convertMarkdownToNoteData(content, title, metadata);
}
