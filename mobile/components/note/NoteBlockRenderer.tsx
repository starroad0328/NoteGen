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
      <View style={styles.problemHeader}>
        <Text style={styles.problemIcon}>📝</Text>
        <Text style={styles.problemLabel}>
          {block.number ? `문제 ${block.number}` : '문제'}
        </Text>
        {block.source && (
          <Text style={styles.problemSource}>{block.source}</Text>
        )}
      </View>
      <Text style={styles.problemContent}>{block.content}</Text>
    </View>
  );
}

// 풀이/정답 블록
function SolutionBlockView({ block }: { block: SolutionBlock }) {
  return (
    <View style={styles.solutionContainer}>
      <View style={styles.solutionHeader}>
        <Text style={styles.solutionIcon}>✅</Text>
        <Text style={styles.solutionLabel}>정답</Text>
      </View>
      <Text style={styles.solutionAnswer}>{block.answer}</Text>

      {block.steps && block.steps.length > 0 && (
        <View style={styles.solutionSteps}>
          <Text style={styles.stepsLabel}>풀이 과정</Text>
          {block.steps.map((step, i) => (
            <View key={i} style={styles.stepItem}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      {block.explanation && (
        <Text style={styles.solutionExplanation}>{block.explanation}</Text>
      )}
    </View>
  );
}

// 틀린 포인트 블록
function WrongPointBlockView({ block }: { block: WrongPointBlock }) {
  return (
    <View style={styles.wrongPointContainer}>
      <View style={styles.wrongPointHeader}>
        <Text style={styles.wrongPointIcon}>❌</Text>
        <Text style={styles.wrongPointLabel}>틀린 포인트</Text>
      </View>

      {block.myAnswer && (
        <View style={styles.myAnswerBox}>
          <Text style={styles.myAnswerLabel}>내가 쓴 답</Text>
          <Text style={styles.myAnswerText}>{block.myAnswer}</Text>
        </View>
      )}

      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>틀린 이유</Text>
        <Text style={styles.reasonText}>{block.reason}</Text>
      </View>

      <View style={styles.correctionBox}>
        <Text style={styles.correctionLabel}>올바른 접근</Text>
        <Text style={styles.correctionText}>{block.correction}</Text>
      </View>
    </View>
  );
}

// 관련 개념 블록
function ConceptBlockView({ block }: { block: ConceptBlock }) {
  return (
    <View style={styles.conceptContainer}>
      <View style={styles.conceptHeader}>
        <Text style={styles.conceptIcon}>💡</Text>
        <Text style={styles.conceptTitle}>{block.title}</Text>
      </View>
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

  // 문제
  problemContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  problemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  problemIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  problemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    flex: 1,
  },
  problemSource: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  problemContent: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 26,
  },

  // 풀이/정답
  solutionContainer: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  solutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  solutionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  solutionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  solutionAnswer: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 12,
  },
  solutionSteps: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
  },
  stepsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 10,
    overflow: 'hidden',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#065F46',
    lineHeight: 22,
  },
  solutionExplanation: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 22,
    marginTop: 8,
  },

  // 틀린 포인트
  wrongPointContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  wrongPointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  wrongPointIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  wrongPointLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },
  myAnswerBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  myAnswerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  myAnswerText: {
    fontSize: 14,
    color: '#991B1B',
    textDecorationLine: 'line-through',
  },
  reasonBox: {
    marginBottom: 10,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 22,
  },
  correctionBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  correctionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  correctionText: {
    fontSize: 14,
    color: '#065F46',
    lineHeight: 22,
  },

  // 관련 개념
  conceptContainer: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  conceptIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  conceptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4338CA',
  },
  conceptContent: {
    fontSize: 15,
    color: '#3730A3',
    lineHeight: 24,
  },
  relatedFormulas: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#C7D2FE',
  },
  formulasLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6366F1',
    marginBottom: 6,
  },
  relatedFormula: {
    fontSize: 14,
    color: '#4338CA',
    fontFamily: 'monospace',
    marginBottom: 4,
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
