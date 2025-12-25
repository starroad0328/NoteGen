/**
 * 코넬식 노트 타입 정의
 */

// 본문 블록 타입
export type MainBlockType = 'heading' | 'paragraph' | 'bullet' | 'important' | 'example';

// 본문 블록 인터페이스
export interface HeadingBlock {
  type: 'heading';
  level: 2 | 3;
  content: string;
}

export interface ParagraphBlock {
  type: 'paragraph';
  content: string;
}

export interface BulletBlock {
  type: 'bullet';
  items: string[];
}

export interface ImportantBlock {
  type: 'important';
  content: string;
}

export interface ExampleBlock {
  type: 'example';
  content: string;
}

export type MainBlock = HeadingBlock | ParagraphBlock | BulletBlock | ImportantBlock | ExampleBlock;

// 코넬식 노트 JSON 구조
export interface CornellNoteData {
  title: string;
  cues: string[];
  main: MainBlock[];
  summary: string;
}

// 컴포넌트 Props
export interface CornellCanvasProps {
  data: CornellNoteData;
  onCuePress?: (cueIndex: number) => void;
  onZoomChange?: (scale: number) => void;
}

export interface HeaderBlockProps {
  title: string;
  date?: string;
  subject?: string;
}

export interface CueColumnProps {
  cues: string[];
  onCuePress?: (index: number) => void;
  activeCueIndex?: number;
}

export interface MainContentBlockProps {
  blocks: MainBlock[];
  scrollRef?: React.RefObject<any>;
}

export interface SummaryBlockProps {
  summary: string;
}

// 레거시 마커 형식 파싱용
export interface LegacyCornellData {
  title: string;
  keywords: string[];
  notes: string;
  summary: string;
}

// 유틸리티: JSON인지 레거시 마커 형식인지 판별
export function isCornellJson(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return parsed.title && parsed.cues && parsed.main && parsed.summary;
  } catch {
    return false;
  }
}

// 유틸리티: 레거시 마커 형식 파싱
export function parseLegacyCornell(content: string): LegacyCornellData | null {
  if (!content.includes('===TITLE===')) {
    return null;
  }

  const sections: Record<string, string> = {};
  const markers = ['TITLE', 'KEYWORDS', 'NOTES', 'SUMMARY'];

  let currentMarker = '';
  const lines = content.split('\n');

  for (const line of lines) {
    const markerMatch = line.match(/^===(\w+)===$/);
    if (markerMatch && markers.includes(markerMatch[1])) {
      currentMarker = markerMatch[1].toLowerCase();
      sections[currentMarker] = '';
    } else if (currentMarker) {
      sections[currentMarker] += (sections[currentMarker] ? '\n' : '') + line;
    }
  }

  return {
    title: sections.title?.trim() || '',
    keywords: sections.keywords?.split('\n').filter(k => k.trim().startsWith('-')).map(k => k.replace(/^-\s*/, '').trim()) || [],
    notes: sections.notes?.trim() || '',
    summary: sections.summary?.trim() || ''
  };
}

// 유틸리티: 레거시 형식을 새 JSON 형식으로 변환
export function convertLegacyToJson(legacy: LegacyCornellData): CornellNoteData {
  // 노트 내용을 간단히 paragraph로 변환
  const mainBlocks: MainBlock[] = [];

  const lines = legacy.notes.split('\n').filter(l => l.trim());
  for (const line of lines) {
    if (line.startsWith('## ')) {
      mainBlocks.push({ type: 'heading', level: 2, content: line.replace('## ', '') });
    } else if (line.startsWith('### ')) {
      mainBlocks.push({ type: 'heading', level: 3, content: line.replace('### ', '') });
    } else if (line.startsWith('- ')) {
      // 연속된 bullet 항목 수집
      const lastBlock = mainBlocks[mainBlocks.length - 1];
      if (lastBlock?.type === 'bullet') {
        lastBlock.items.push(line.replace('- ', ''));
      } else {
        mainBlocks.push({ type: 'bullet', items: [line.replace('- ', '')] });
      }
    } else {
      mainBlocks.push({ type: 'paragraph', content: line });
    }
  }

  return {
    title: legacy.title,
    cues: legacy.keywords,
    main: mainBlocks,
    summary: legacy.summary
  };
}
