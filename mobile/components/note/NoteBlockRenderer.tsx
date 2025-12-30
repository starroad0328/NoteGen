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
  SimpleSectionBlock,
  // 오답노트
  ProblemBlock,
  SolutionBlock,
  WrongPointBlock,
  ConceptBlock,
  // 단어장
  VocabularyBlock,
} from './types';
import { ThemeColors } from '../../contexts/ThemeContext';

interface BlockRendererProps {
  block: NoteBlock;
  index: number;
  colors?: ThemeColors;
}

export function NoteBlockRenderer({ block, index, colors }: BlockRendererProps) {
  switch (block.type) {
    case 'title':
      return <TitleBlockView block={block} colors={colors} />;
    case 'heading':
      return <HeadingBlockView block={block} colors={colors} />;
    case 'paragraph':
      return <ParagraphBlockView block={block} colors={colors} />;
    case 'bullet':
      return <BulletBlockView block={block} colors={colors} />;
    case 'numbered':
      return <NumberedBlockView block={block} colors={colors} />;
    case 'keyword':
      return <KeywordBlockView block={block} colors={colors} />;
    case 'summary':
      return <SummaryBlockView block={block} colors={colors} />;
    case 'important':
      return <ImportantBlockView block={block} />;
    case 'example':
      return <ExampleBlockView block={block} colors={colors} />;
    case 'formula':
      return <FormulaBlockView block={block} colors={colors} />;
    case 'definition':
      return <DefinitionBlockView block={block} colors={colors} />;
    case 'tip':
      return <TipBlockView block={block} />;
    case 'divider':
      return <View style={[styles.divider, colors && { backgroundColor: colors.tabBarBorder }]} />;
    case 'simpleSection':
      return <SimpleSectionBlockView block={block} colors={colors} />;
    // 오답노트
    case 'problem':
      return <ProblemBlockView block={block} colors={colors} />;
    case 'solution':
      return <SolutionBlockView block={block} colors={colors} />;
    case 'wrongPoint':
      return <WrongPointBlockView block={block} colors={colors} />;
    case 'concept':
      return <ConceptBlockView block={block} colors={colors} />;
    // 단어장
    case 'vocabulary':
      return <VocabularyBlockView block={block} colors={colors} />;
    default:
      return null;
  }
}

// 제목 블록
function TitleBlockView({ block, colors }: { block: TitleBlock; colors?: ThemeColors }) {
  return (
    <View style={[styles.titleContainer, colors && { borderBottomColor: colors.tabBarBorder }]}>
      <Text style={[styles.title, colors && { color: colors.text }]}>{block.content}</Text>
      {block.subtitle && (
        <Text style={[styles.subtitle, colors && { color: colors.textLight }]}>{block.subtitle}</Text>
      )}
    </View>
  );
}

// 소제목 블록
function HeadingBlockView({ block, colors }: { block: HeadingBlock; colors?: ThemeColors }) {
  const headingStyles = [
    styles.heading1,
    styles.heading2,
    styles.heading3,
  ];
  return (
    <Text style={[styles.headingBase, headingStyles[block.level - 1], colors && { color: colors.text, borderBottomColor: colors.tabBarBorder }]}>
      {block.content}
    </Text>
  );
}

// 본문 블록
function ParagraphBlockView({ block, colors }: { block: ParagraphBlock; colors?: ThemeColors }) {
  return <Text style={[styles.paragraph, colors && { color: colors.text }]}>{block.content}</Text>;
}

// 글머리표 블록
function BulletBlockView({ block, colors }: { block: BulletBlock; colors?: ThemeColors }) {
  return (
    <View style={styles.listContainer}>
      {block.items.map((item, i) => (
        <View key={i} style={styles.bulletItem}>
          <Text style={[styles.bulletDot, colors && { color: colors.textLight }]}>•</Text>
          <Text style={[styles.listText, colors && { color: colors.text }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// 번호 목록 블록
function NumberedBlockView({ block, colors }: { block: NumberedBlock; colors?: ThemeColors }) {
  return (
    <View style={styles.listContainer}>
      {block.items.map((item, i) => (
        <View key={i} style={styles.numberedItem}>
          <Text style={[styles.numberText, colors && { color: colors.textLight }]}>{i + 1}.</Text>
          <Text style={[styles.listText, colors && { color: colors.text }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// 키워드 블록 (코넬식 cues 대체)
function KeywordBlockView({ block, colors }: { block: KeywordBlock; colors?: ThemeColors }) {
  const style = block.style || 'chips';

  if (style === 'chips') {
    return (
      <View style={[styles.keywordChipsContainer, colors && { backgroundColor: colors.background }]}>
        {block.keywords.map((keyword, i) => (
          <View key={i} style={[styles.keywordChip, colors && { backgroundColor: colors.primary }]}>
            <Text style={styles.keywordChipText}>{keyword}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (style === 'list') {
    return (
      <View style={[styles.keywordListContainer, colors && { backgroundColor: colors.background }]}>
        <Text style={[styles.keywordLabel, colors && { color: colors.primary }]}>핵심 키워드</Text>
        {block.keywords.map((keyword, i) => (
          <View key={i} style={styles.keywordListItem}>
            <View style={[styles.keywordDot, colors && { backgroundColor: colors.primary }]} />
            <Text style={[styles.keywordListText, colors && { color: colors.text }]}>{keyword}</Text>
          </View>
        ))}
      </View>
    );
  }

  // inline
  return (
    <Text style={[styles.keywordInline, colors && { color: colors.text }]}>
      <Text style={[styles.keywordLabel, colors && { color: colors.primary }]}>키워드: </Text>
      {block.keywords.join(' · ')}
    </Text>
  );
}

// 요약 블록
function SummaryBlockView({ block, colors }: { block: SummaryBlock; colors?: ThemeColors }) {
  return (
    <View style={[styles.summaryContainer, colors && { backgroundColor: colors.background, borderColor: colors.accent }]}>
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryIcon}>📌</Text>
        <Text style={[styles.summaryLabel, colors && { color: colors.primaryDark }]}>요약</Text>
      </View>
      <Text style={[styles.summaryText, colors && { color: colors.text }]}>{block.content}</Text>
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
function ExampleBlockView({ block, colors }: { block: ExampleBlock; colors?: ThemeColors }) {
  return (
    <View style={[styles.exampleContainer, colors && { backgroundColor: colors.background, borderLeftColor: colors.primary }]}>
      <Text style={[styles.exampleLabel, colors && { color: colors.primaryDark }]}>{block.label || '예시'}</Text>
      <Text style={[styles.exampleText, colors && { color: colors.text }]}>{block.content}</Text>
    </View>
  );
}

// 공식 블록
function FormulaBlockView({ block, colors }: { block: FormulaBlock; colors?: ThemeColors }) {
  return (
    <View style={[styles.formulaContainer, colors && { backgroundColor: colors.background }]}>
      <Text style={[styles.formulaContent, colors && { color: colors.primaryDark }]}>{block.content}</Text>
      {block.description && (
        <Text style={[styles.formulaDescription, colors && { color: colors.textLight }]}>{block.description}</Text>
      )}
    </View>
  );
}

// 정의 블록
function DefinitionBlockView({ block, colors }: { block: DefinitionBlock; colors?: ThemeColors }) {
  return (
    <View style={[styles.definitionContainer, colors && { backgroundColor: colors.background, borderLeftColor: colors.primary }]}>
      <Text style={[styles.definitionTerm, colors && { color: colors.primaryDark }]}>{block.term}</Text>
      <Text style={[styles.definitionText, colors && { color: colors.text }]}>{block.definition}</Text>
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
// 단순 섹션 블록 (오답노트용)
// ============================================

function SimpleSectionBlockView({ block, colors }: { block: SimpleSectionBlock; colors?: ThemeColors }) {
  return (
    <View style={styles.simpleSectionContainer}>
      <Text style={[styles.sectionLabel, colors && { color: colors.text }]}>{block.label}</Text>
      <Text style={[styles.simpleSectionContent, colors && { color: colors.text }]}>{block.content}</Text>
      <View style={[styles.sectionDivider, colors && { backgroundColor: colors.tabBarBorder }]} />
    </View>
  );
}

// ============================================
// 오답노트용 블록
// ============================================

// 문제 블록
function ProblemBlockView({ block, colors }: { block: ProblemBlock; colors?: ThemeColors }) {
  return (
    <View style={styles.problemContainer}>
      <Text style={[styles.sectionLabel, colors && { color: colors.text }]}>
        {block.number ? `문제 ${block.number}` : '문제'}
        {block.source && <Text style={[styles.problemSource, colors && { color: colors.textLight }]}> ({block.source})</Text>}
      </Text>
      <Text style={[styles.problemContent, colors && { color: colors.text }]}>{block.content}</Text>
      <View style={[styles.sectionDivider, colors && { backgroundColor: colors.tabBarBorder }]} />
    </View>
  );
}

// 풀이/정답 블록
function SolutionBlockView({ block, colors }: { block: SolutionBlock; colors?: ThemeColors }) {
  return (
    <View style={styles.solutionContainer}>
      <Text style={[styles.sectionLabel, colors && { color: colors.text }]}>정답</Text>
      <Text style={[styles.solutionAnswer, colors && { color: colors.text }]}>{block.answer}</Text>

      {block.steps && block.steps.length > 0 && (
        <View style={styles.stepsContainer}>
          <Text style={[styles.subSectionLabel, colors && { color: colors.text }]}>풀이 과정</Text>
          {block.steps.map((step, i) => (
            <View key={i} style={styles.stepItem}>
              <Text style={[styles.stepNumber, colors && { color: colors.textLight }]}>{i + 1}.</Text>
              <Text style={[styles.stepText, colors && { color: colors.text }]}>{step}</Text>
            </View>
          ))}
        </View>
      )}

      {block.explanation && (
        <Text style={[styles.solutionExplanation, colors && { color: colors.text }]}>{block.explanation}</Text>
      )}
      <View style={[styles.sectionDivider, colors && { backgroundColor: colors.tabBarBorder }]} />
    </View>
  );
}

// 틀린 포인트 블록
function WrongPointBlockView({ block, colors }: { block: WrongPointBlock; colors?: ThemeColors }) {
  return (
    <View style={styles.wrongPointContainer}>
      {/* 내가 쓴 답 */}
      {block.myAnswer && (
        <View style={styles.wrongSection}>
          <Text style={[styles.sectionLabel, colors && { color: colors.text }]}>내가 쓴 답</Text>
          <Text style={[styles.myAnswerText, colors && { color: colors.text }]}>{block.myAnswer}</Text>
          <View style={[styles.sectionDivider, colors && { backgroundColor: colors.tabBarBorder }]} />
        </View>
      )}

      {/* 틀린 이유 */}
      {block.reason && (
        <View style={styles.wrongSection}>
          <Text style={[styles.sectionLabel, colors && { color: colors.text }]}>틀린 이유</Text>
          <Text style={[styles.reasonText, colors && { color: colors.text }]}>{block.reason}</Text>
          <View style={[styles.sectionDivider, colors && { backgroundColor: colors.tabBarBorder }]} />
        </View>
      )}

      {/* 올바른 접근 */}
      {block.correction && (
        <View style={styles.wrongSection}>
          <Text style={[styles.sectionLabel, colors && { color: colors.text }]}>올바른 접근</Text>
          <Text style={[styles.correctionText, colors && { color: colors.text }]}>{block.correction}</Text>
          <View style={[styles.sectionDivider, colors && { backgroundColor: colors.tabBarBorder }]} />
        </View>
      )}
    </View>
  );
}

// 관련 개념 블록
function ConceptBlockView({ block, colors }: { block: ConceptBlock; colors?: ThemeColors }) {
  return (
    <View style={styles.conceptContainer}>
      <Text style={[styles.sectionLabel, colors && { color: colors.text }]}>관련 개념</Text>
      <Text style={[styles.conceptTitle, colors && { color: colors.text }]}>{block.title}</Text>
      <Text style={[styles.conceptContent, colors && { color: colors.text }]}>{block.content}</Text>

      {block.relatedFormulas && block.relatedFormulas.length > 0 && (
        <View style={styles.relatedFormulas}>
          <Text style={[styles.subSectionLabel, colors && { color: colors.text }]}>관련 공식</Text>
          {block.relatedFormulas.map((formula, i) => (
            <Text key={i} style={[styles.relatedFormula, colors && { color: colors.text }]}>{formula}</Text>
          ))}
        </View>
      )}
      <View style={[styles.sectionDivider, colors && { backgroundColor: colors.tabBarBorder }]} />
    </View>
  );
}

// ============================================
// 단어장용 블록
// ============================================

// 단어 블록
function VocabularyBlockView({ block, colors }: { block: VocabularyBlock; colors?: ThemeColors }) {
  return (
    <View style={[styles.vocabContainer, colors && { backgroundColor: colors.cardBg, borderColor: colors.tabBarBorder }]}>
      <View style={styles.vocabHeader}>
        <Text style={[styles.vocabWord, colors && { color: colors.text }]}>{block.word}</Text>
        {block.pronunciation && (
          <Text style={[styles.vocabPronunciation, colors && { color: colors.textLight }]}>[{block.pronunciation}]</Text>
        )}
        {block.partOfSpeech && (
          <View style={[styles.posBadge, colors && { backgroundColor: colors.background }]}>
            <Text style={[styles.posText, colors && { color: colors.primary }]}>{block.partOfSpeech}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.vocabMeaning, colors && { color: colors.text }]}>{block.meaning}</Text>

      {block.exampleSentence && (
        <View style={[styles.vocabExample, colors && { backgroundColor: colors.background }]}>
          <Text style={[styles.exampleSentence, colors && { color: colors.text }]}>{block.exampleSentence}</Text>
          {block.exampleTranslation && (
            <Text style={[styles.exampleTranslation, colors && { color: colors.textLight }]}>{block.exampleTranslation}</Text>
          )}
        </View>
      )}

      {(block.synonyms?.length || block.antonyms?.length) && (
        <View style={[styles.vocabRelated, colors && { borderTopColor: colors.tabBarBorder }]}>
          {block.synonyms && block.synonyms.length > 0 && (
            <Text style={styles.synonyms}>
              <Text style={[styles.relatedLabel, colors && { color: colors.textLight }]}>유의어: </Text>
              {block.synonyms.join(', ')}
            </Text>
          )}
          {block.antonyms && block.antonyms.length > 0 && (
            <Text style={styles.antonyms}>
              <Text style={[styles.relatedLabel, colors && { color: colors.textLight }]}>반의어: </Text>
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
  // 단순 섹션 스타일
  // ============================================

  simpleSectionContainer: {
    marginVertical: 8,
  },
  simpleSectionContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },

  // ============================================
  // 오답노트 스타일
  // ============================================

  // 공통 섹션 라벨 (굵은 큰 글씨)
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  subSectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 20,
    marginBottom: 8,
  },

  // 문제 블록
  problemContainer: {
    marginVertical: 8,
  },
  problemSource: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },
  problemContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },

  // 풀이/정답 블록
  solutionContainer: {
    marginVertical: 8,
  },
  solutionAnswer: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },
  stepsContainer: {
    marginTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8,
    minWidth: 24,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  solutionExplanation: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    marginTop: 12,
  },

  // 틀린 포인트 블록
  wrongPointContainer: {
    marginVertical: 8,
  },
  wrongSection: {
    marginBottom: 4,
  },
  myAnswerText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },
  reasonText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },
  correctionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 26,
  },

  // 관련 개념 블록
  conceptContainer: {
    marginVertical: 8,
  },
  conceptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  conceptContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  relatedFormulas: {
    marginTop: 12,
  },
  relatedFormula: {
    fontSize: 15,
    color: '#374151',
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
