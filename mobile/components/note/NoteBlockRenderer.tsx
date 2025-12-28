/**
 * 통합 노트 블록 렌더러
 * 단일 컬럼 연속 문서 형태로 모든 블록 타입 렌더링
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  NoteBlock,
  TitleBlock,
  HeadingBlock,
  ParagraphBlock,
  BulletBlock,
  NumberedBlock,
  KeywordBlock,
  SummaryBlock,
  ImportantBlock,
  ExampleBlock,
  FormulaBlock,
  DefinitionBlock,
  TipBlock,
  // 오답노트
  ProblemBlock,
  SolutionBlock,
  WrongPointBlock,
  ConceptBlock,
  // 단어장
  VocabularyBlock,
} from './types';

interface BlockRendererProps {
  block: NoteBlock;
  index: number;
}

export function NoteBlockRenderer({ block, index }: BlockRendererProps) {
  switch (block.type) {
    case 'title':
      return <TitleBlockView block={block} />;
    case 'heading':
      return <HeadingBlockView block={block} />;
    case 'paragraph':
      return <ParagraphBlockView block={block} />;
    case 'bullet':
      return <BulletBlockView block={block} />;
    case 'numbered':
      return <NumberedBlockView block={block} />;
    case 'keyword':
      return <KeywordBlockView block={block} />;
    case 'summary':
      return <SummaryBlockView block={block} />;
    case 'important':
      return <ImportantBlockView block={block} />;
    case 'example':
      return <ExampleBlockView block={block} />;
    case 'formula':
      return <FormulaBlockView block={block} />;
    case 'definition':
      return <DefinitionBlockView block={block} />;
    case 'tip':
      return <TipBlockView block={block} />;
    case 'divider':
      return <View style={styles.divider} />;
    // 오답노트
    case 'problem':
      return <ProblemBlockView block={block} />;
    case 'solution':
      return <SolutionBlockView block={block} />;
    case 'wrongPoint':
      return <WrongPointBlockView block={block} />;
    case 'concept':
      return <ConceptBlockView block={block} />;
    // 단어장
    case 'vocabulary':
      return <VocabularyBlockView block={block} />;
    default:
      return null;
  }
}

// 제목 블록
function TitleBlockView({ block }: { block: TitleBlock }) {
  return (
    <View style={styles.titleContainer}>
      <Text style={styles.title}>{block.content}</Text>
      {block.subtitle && (
        <Text style={styles.subtitle}>{block.subtitle}</Text>
      )}
    </View>
  );
}

// 소제목 블록
function HeadingBlockView({ block }: { block: HeadingBlock }) {
  const headingStyles = [
    styles.heading1,
    styles.heading2,
    styles.heading3,
  ];
  return (
    <Text style={[styles.headingBase, headingStyles[block.level - 1]]}>
      {block.content}
    </Text>
  );
}

// 본문 블록
function ParagraphBlockView({ block }: { block: ParagraphBlock }) {
  return <Text style={styles.paragraph}>{block.content}</Text>;
}

// 글머리표 블록
function BulletBlockView({ block }: { block: BulletBlock }) {
  return (
    <View style={styles.listContainer}>
      {block.items.map((item, i) => (
        <View key={i} style={styles.bulletItem}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// 번호 목록 블록
function NumberedBlockView({ block }: { block: NumberedBlock }) {
  return (
    <View style={styles.listContainer}>
      {block.items.map((item, i) => (
        <View key={i} style={styles.numberedItem}>
          <Text style={styles.numberText}>{i + 1}.</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// 키워드 블록 (코넬식 cues 대체)
function KeywordBlockView({ block }: { block: KeywordBlock }) {
  const style = block.style || 'chips';

  if (style === 'chips') {
    return (
      <View style={styles.keywordChipsContainer}>
        {block.keywords.map((keyword, i) => (
          <View key={i} style={styles.keywordChip}>
            <Text style={styles.keywordChipText}>{keyword}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (style === 'list') {
    return (
      <View style={styles.keywordListContainer}>
        <Text style={styles.keywordLabel}>핵심 키워드</Text>
        {block.keywords.map((keyword, i) => (
          <View key={i} style={styles.keywordListItem}>
            <View style={styles.keywordDot} />
            <Text style={styles.keywordListText}>{keyword}</Text>
          </View>
        ))}
      </View>
    );
  }

  // inline
  return (
    <Text style={styles.keywordInline}>
      <Text style={styles.keywordLabel}>키워드: </Text>
      {block.keywords.join(' · ')}
    </Text>
  );
}

// 요약 블록
function SummaryBlockView({ block }: { block: SummaryBlock }) {
  return (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryIcon}>📌</Text>
        <Text style={styles.summaryLabel}>요약</Text>
      </View>
      <Text style={styles.summaryText}>{block.content}</Text>
    </View>
  );
}

// 중요 강조 블록
function ImportantBlockView({ block }: { block: ImportantBlock }) {
  const level = block.level || 'normal';
  const levelStyles = {
    normal: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
    high: { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' },
    critical: { bg: '#FEE2E2', border: '#DC2626', text: '#7F1D1D' },
  };
  const colors = levelStyles[level];

  return (
    <View style={[styles.importantContainer, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}>
      <Text style={[styles.importantText, { color: colors.text }]}>
        {block.content}
      </Text>
    </View>
  );
}

// 예시 블록
function ExampleBlockView({ block }: { block: ExampleBlock }) {
  return (
    <View style={styles.exampleContainer}>
      <Text style={styles.exampleLabel}>{block.label || '예시'}</Text>
      <Text style={styles.exampleText}>{block.content}</Text>
    </View>
  );
}

// 공식 블록
function FormulaBlockView({ block }: { block: FormulaBlock }) {
  return (
    <View style={styles.formulaContainer}>
      <Text style={styles.formulaContent}>{block.content}</Text>
      {block.description && (
        <Text style={styles.formulaDescription}>{block.description}</Text>
      )}
    </View>
  );
}

// 정의 블록
function DefinitionBlockView({ block }: { block: DefinitionBlock }) {
  return (
    <View style={styles.definitionContainer}>
      <Text style={styles.definitionTerm}>{block.term}</Text>
      <Text style={styles.definitionText}>{block.definition}</Text>
    </View>
  );
}

// 팁/주의 블록
function TipBlockView({ block }: { block: TipBlock }) {
  const variant = block.variant || 'tip';
  const variantStyles = {
    tip: { bg: '#ECFDF5', border: '#10B981', icon: '💡', text: '#065F46' },
    warning: { bg: '#FEF3C7', border: '#F59E0B', icon: '⚠️', text: '#92400E' },
    info: { bg: '#EFF6FF', border: '#3B82F6', icon: 'ℹ️', text: '#1E40AF' },
  };
  const style = variantStyles[variant];

  return (
    <View style={[styles.tipContainer, { backgroundColor: style.bg, borderLeftColor: style.border }]}>
      <Text style={styles.tipIcon}>{style.icon}</Text>
      <Text style={[styles.tipText, { color: style.text }]}>{block.content}</Text>
    </View>
  );
}

// ============================================
// 오답노트용 블록
// ============================================

// 문제 블록
function ProblemBlockView({ block }: { block: ProblemBlock }) {
  return (
    <View style={styles.problemContainer}>
      {/* 섹션 헤더 바 */}
      <View style={styles.problemHeaderBar}>
        <Text style={styles.problemHeaderIcon}>📝</Text>
        <Text style={styles.problemHeaderText}>
          {block.number ? `문제 ${block.number}` : '문제'}
        </Text>
        {block.source && (
          <Text style={styles.problemSource}>({block.source})</Text>
        )}
      </View>
      {/* 문제 내용 */}
      <View style={styles.problemBody}>
        <Text style={styles.problemContent}>{block.content}</Text>
      </View>
    </View>
  );
}

// 풀이/정답 블록
function SolutionBlockView({ block }: { block: SolutionBlock }) {
  return (
    <View style={styles.solutionContainer}>
      {/* 정답 섹션 */}
      <View style={styles.solutionSection}>
        <View style={styles.solutionHeaderBar}>
          <Text style={styles.solutionHeaderIcon}>✅</Text>
          <Text style={styles.solutionHeaderText}>정답</Text>
        </View>
        <View style={styles.solutionBody}>
          <Text style={styles.solutionAnswer}>{block.answer}</Text>
        </View>
      </View>

      {/* 풀이 과정 섹션 */}
      {block.steps && block.steps.length > 0 && (
        <View style={styles.stepsSection}>
          <View style={styles.stepsHeaderBar}>
            <Text style={styles.stepsHeaderIcon}>📖</Text>
            <Text style={styles.stepsHeaderText}>풀이 과정</Text>
          </View>
          <View style={styles.stepsBody}>
            {block.steps.map((step, i) => (
              <View key={i} style={styles.stepItem}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 추가 설명 */}
      {block.explanation && (
        <View style={styles.explanationSection}>
          <Text style={styles.solutionExplanation}>{block.explanation}</Text>
        </View>
      )}
    </View>
  );
}

// 틀린 포인트 블록
function WrongPointBlockView({ block }: { block: WrongPointBlock }) {
  return (
    <View style={styles.wrongPointContainer}>
      {/* 내가 쓴 답 섹션 */}
      {block.myAnswer && (
        <View style={styles.myAnswerSection}>
          <View style={styles.myAnswerHeaderBar}>
            <Text style={styles.myAnswerHeaderIcon}>✏️</Text>
            <Text style={styles.myAnswerHeaderText}>내가 쓴 답</Text>
          </View>
          <View style={styles.myAnswerBody}>
            <Text style={styles.myAnswerText}>{block.myAnswer}</Text>
          </View>
        </View>
      )}

      {/* 틀린 이유 섹션 */}
      <View style={styles.reasonSection}>
        <View style={styles.reasonHeaderBar}>
          <Text style={styles.reasonHeaderIcon}>❌</Text>
          <Text style={styles.reasonHeaderText}>틀린 이유</Text>
        </View>
        <View style={styles.reasonBody}>
          <Text style={styles.reasonText}>{block.reason}</Text>
        </View>
      </View>

      {/* 올바른 접근 섹션 */}
      <View style={styles.correctionSection}>
        <View style={styles.correctionHeaderBar}>
          <Text style={styles.correctionHeaderIcon}>💡</Text>
          <Text style={styles.correctionHeaderText}>올바른 접근</Text>
        </View>
        <View style={styles.correctionBody}>
          <Text style={styles.correctionText}>{block.correction}</Text>
        </View>
      </View>
    </View>
  );
}

// 관련 개념 블록
function ConceptBlockView({ block }: { block: ConceptBlock }) {
  return (
    <View style={styles.conceptContainer}>
      {/* 개념 헤더 */}
      <View style={styles.conceptHeaderBar}>
        <Text style={styles.conceptHeaderIcon}>📚</Text>
        <Text style={styles.conceptHeaderText}>관련 개념</Text>
      </View>

      {/* 개념 본문 */}
      <View style={styles.conceptBody}>
        <Text style={styles.conceptTitle}>{block.title}</Text>
        <Text style={styles.conceptContent}>{block.content}</Text>

        {block.relatedFormulas && block.relatedFormulas.length > 0 && (
          <View style={styles.relatedFormulas}>
            <Text style={styles.formulasLabel}>관련 공식</Text>
            {block.relatedFormulas.map((formula, i) => (
              <Text key={i} style={styles.relatedFormula}>{formula}</Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================
// 단어장용 블록
// ============================================

// 단어 블록
function VocabularyBlockView({ block }: { block: VocabularyBlock }) {
  return (
    <View style={styles.vocabContainer}>
      <View style={styles.vocabHeader}>
        <Text style={styles.vocabWord}>{block.word}</Text>
        {block.pronunciation && (
          <Text style={styles.vocabPronunciation}>[{block.pronunciation}]</Text>
        )}
        {block.partOfSpeech && (
          <View style={styles.posBadge}>
            <Text style={styles.posText}>{block.partOfSpeech}</Text>
          </View>
        )}
      </View>

      <Text style={styles.vocabMeaning}>{block.meaning}</Text>

      {block.exampleSentence && (
        <View style={styles.vocabExample}>
          <Text style={styles.exampleSentence}>{block.exampleSentence}</Text>
          {block.exampleTranslation && (
            <Text style={styles.exampleTranslation}>{block.exampleTranslation}</Text>
          )}
        </View>
      )}

      {(block.synonyms?.length || block.antonyms?.length) && (
        <View style={styles.vocabRelated}>
          {block.synonyms && block.synonyms.length > 0 && (
            <Text style={styles.synonyms}>
              <Text style={styles.relatedLabel}>유의어: </Text>
              {block.synonyms.join(', ')}
            </Text>
          )}
          {block.antonyms && block.antonyms.length > 0 && (
            <Text style={styles.antonyms}>
              <Text style={styles.relatedLabel}>반의어: </Text>
              {block.antonyms.join(', ')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 제목
  titleContainer: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 6,
  },

  // 소제목
  headingBase: {
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
  },
  heading1: {
    fontSize: 24,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  heading2: {
    fontSize: 20,
    fontWeight: '600',
  },
  heading3: {
    fontSize: 17,
    fontWeight: '600',
    color: '#374151',
  },

  // 본문
  paragraph: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
    marginBottom: 12,
  },

  // 리스트 공통
  listContainer: {
    marginBottom: 12,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },

  // 글머리표
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 4,
  },
  bulletDot: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 10,
    lineHeight: 24,
  },

  // 번호 목록
  numberedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 4,
  },
  numberText: {
    fontSize: 15,
    color: '#6B7280',
    marginRight: 10,
    minWidth: 20,
    lineHeight: 24,
  },

  // 키워드 - 칩 스타일
  keywordChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  keywordChip: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  keywordChipText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  // 키워드 - 리스트 스타일
  keywordListContainer: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    padding: 14,
    marginVertical: 12,
  },
  keywordLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  keywordListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  keywordDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
    marginRight: 10,
  },
  keywordListText: {
    fontSize: 15,
    color: '#3730A3',
    fontWeight: '500',
  },

  // 키워드 - 인라인 스타일
  keywordInline: {
    fontSize: 14,
    color: '#4B5563',
    marginVertical: 8,
  },

  // 요약
  summaryContainer: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 15,
    color: '#92400E',
    lineHeight: 24,
    fontWeight: '500',
  },

  // 중요 강조
  importantContainer: {
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginVertical: 12,
  },
  importantText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 23,
  },

  // 예시
  exampleContainer: {
    backgroundColor: '#F3E8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginVertical: 12,
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6D28D9',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  exampleText: {
    fontSize: 14,
    color: '#5B21B6',
    lineHeight: 22,
  },

  // 공식
  formulaContainer: {
    backgroundColor: '#FDF2F8',
    borderRadius: 8,
    padding: 16,
    marginVertical: 12,
    alignItems: 'center',
  },
  formulaContent: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9D174D',
    fontFamily: 'monospace',
  },
  formulaDescription: {
    fontSize: 13,
    color: '#BE185D',
    marginTop: 8,
  },

  // 정의
  definitionContainer: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginVertical: 12,
  },
  definitionTerm: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 6,
  },
  definitionText: {
    fontSize: 15,
    color: '#15803D',
    lineHeight: 23,
  },

  // 팁
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginVertical: 12,
  },
  tipIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },

  // 구분선
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },

  // ============================================
  // 오답노트 스타일
  // ============================================

  // 문제 블록
  problemContainer: {
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  problemHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  problemHeaderIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  problemHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    flex: 1,
  },
  problemSource: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  problemBody: {
    backgroundColor: '#FEF2F2',
    padding: 16,
  },
  problemContent: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 26,
  },

  // 풀이/정답 블록
  solutionContainer: {
    marginVertical: 12,
  },
  solutionSection: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 10,
  },
  solutionHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  solutionHeaderIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  solutionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  solutionBody: {
    backgroundColor: '#ECFDF5',
    padding: 16,
  },
  solutionAnswer: {
    fontSize: 20,
    fontWeight: '700',
    color: '#065F46',
  },
  stepsSection: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginBottom: 10,
  },
  stepsHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  stepsHeaderIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  stepsHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  stepsBody: {
    backgroundColor: '#F0FDF4',
    padding: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#065F46',
    lineHeight: 24,
  },
  explanationSection: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  solutionExplanation: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 22,
    fontStyle: 'italic',
  },

  // 틀린 포인트 블록
  wrongPointContainer: {
    marginVertical: 12,
  },
  myAnswerSection: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: 10,
  },
  myAnswerHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  myAnswerHeaderIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  myAnswerHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  myAnswerBody: {
    backgroundColor: '#FEE2E2',
    padding: 16,
  },
  myAnswerText: {
    fontSize: 16,
    color: '#991B1B',
    textDecorationLine: 'line-through',
    textDecorationColor: '#DC2626',
  },
  reasonSection: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 10,
  },
  reasonHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  reasonHeaderIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  reasonHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  reasonBody: {
    backgroundColor: '#FEF3C7',
    padding: 16,
  },
  reasonText: {
    fontSize: 15,
    color: '#92400E',
    lineHeight: 24,
  },
  correctionSection: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  correctionHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  correctionHeaderIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  correctionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  correctionBody: {
    backgroundColor: '#ECFDF5',
    padding: 16,
  },
  correctionText: {
    fontSize: 15,
    color: '#065F46',
    lineHeight: 24,
  },

  // 관련 개념 블록
  conceptContainer: {
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  conceptHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  conceptHeaderIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  conceptHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  conceptBody: {
    backgroundColor: '#EEF2FF',
    padding: 16,
  },
  conceptTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 8,
  },
  conceptContent: {
    fontSize: 15,
    color: '#3730A3',
    lineHeight: 24,
  },
  relatedFormulas: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#C7D2FE',
  },
  formulasLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  relatedFormula: {
    fontSize: 15,
    color: '#4338CA',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },

  // ============================================
  // 단어장 스타일
  // ============================================

  vocabContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  vocabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  vocabWord: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginRight: 8,
  },
  vocabPronunciation: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  posBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  posText: {
    fontSize: 11,
    color: '#4338CA',
    fontWeight: '600',
  },
  vocabMeaning: {
    fontSize: 17,
    color: '#374151',
    lineHeight: 26,
    marginBottom: 12,
  },
  vocabExample: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  exampleSentence: {
    fontSize: 14,
    color: '#4B5563',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  exampleTranslation: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  vocabRelated: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  relatedLabel: {
    fontWeight: '600',
    color: '#6B7280',
  },
  synonyms: {
    fontSize: 13,
    color: '#059669',
    marginBottom: 4,
  },
  antonyms: {
    fontSize: 13,
    color: '#DC2626',
  },
});
