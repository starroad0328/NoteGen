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

/**
 * 마크다운을 통합 NoteData로 변환
 */
export function convertMarkdownToNoteData(
  markdown: string,
  title: string,
  metadata?: NoteData['metadata']
): NoteData {
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
