/**
 * 문제 풀이 화면
 * 노트별 생성된 문제 풀이
 */

import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { questionsAPI, Question, QuestionSubmitResult } from '../../services/api'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

export default function QuestionSolveScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { noteId } = useLocalSearchParams()
  const noteIdNum = parseInt(noteId as string)
  const { colors } = useTheme()
  const { token } = useAuth()

  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<QuestionSubmitResult | null>(null)
  const [noteTitle, setNoteTitle] = useState('')

  // 현재 문제
  const currentQuestion = questions[currentIndex]

  // 완료 상태
  const isCompleted = currentIndex >= questions.length && questions.length > 0

  useEffect(() => {
    if (token) fetchQuestions()
  }, [token])

  const fetchQuestions = async () => {
    if (!token) return
    try {
      const data = await questionsAPI.getByNote(token, noteIdNum)
      setQuestions(data.questions)
      setNoteTitle(data.note_title)
    } catch (error) {
      console.error('문제 조회 오류:', error)
      Alert.alert('오류', '문제를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAnswer = (index: number) => {
    if (result) return // 이미 제출한 경우 선택 불가
    setSelectedAnswer(index)
  }

  const handleSubmit = async () => {
    if (selectedAnswer === null || !currentQuestion || !token) return

    setSubmitting(true)
    try {
      const submitResult = await questionsAPI.submit(token, currentQuestion.id, selectedAnswer)
      setResult(submitResult)
    } catch (error) {
      console.error('답안 제출 오류:', error)
      Alert.alert('오류', '답안 제출 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    setSelectedAnswer(null)
    setResult(null)
    setCurrentIndex(prev => prev + 1)
  }

  const getChoiceStyle = (index: number) => {
    const baseStyle = [styles.choice, { backgroundColor: colors.cardBg, borderColor: colors.tabBarBorder }]

    if (result) {
      // 결과 표시 모드
      if (index === result.correct_answer) {
        return [...baseStyle, styles.correctChoice]
      }
      if (index === selectedAnswer && !result.is_correct) {
        return [...baseStyle, styles.wrongChoice]
      }
    } else if (index === selectedAnswer) {
      // 선택 모드
      return [...baseStyle, styles.selectedChoice, { borderColor: colors.primary }]
    }

    return baseStyle
  }

  const getChoiceTextStyle = (index: number) => {
    const baseStyle = [styles.choiceText, { color: colors.text }]

    if (result) {
      if (index === result.correct_answer) {
        return [...baseStyle, styles.correctChoiceText]
      }
      if (index === selectedAnswer && !result.is_correct) {
        return [...baseStyle, styles.wrongChoiceText]
      }
    } else if (index === selectedAnswer) {
      return [...baseStyle, { color: colors.primary }]
    }

    return baseStyle
  }

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textLight }]}>문제 불러오는 중...</Text>
      </View>
    )
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>📭</Text>
        <Text style={[styles.emptyText, { color: colors.textLight }]}>
          아직 생성된 문제가 없습니다.
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (isCompleted) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={[styles.completedTitle, { color: colors.text }]}>문제 풀이 완료!</Text>
        <Text style={[styles.completedSubtitle, { color: colors.textLight }]}>
          모든 문제를 풀었습니다.
        </Text>
        <View style={styles.completedButtons}>
          <TouchableOpacity
            style={[styles.completedButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.completedButtonText}>노트로 돌아가기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.completedButton, styles.secondaryButton, { borderColor: colors.primary }]}
            onPress={() => router.replace('/(tabs)/questions')}
          >
            <Text style={[styles.completedButtonText, { color: colors.primary }]}>문제 목록 보기</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[
        styles.header,
        {
          backgroundColor: colors.cardBg,
          borderBottomColor: colors.tabBarBorder,
          paddingTop: Math.max(insets.top, 20) + 10,
        }
      ]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.primary }]}>← 닫기</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {noteTitle}
        </Text>
        <Text style={[styles.progress, { color: colors.textLight }]}>
          {currentIndex + 1} / {questions.length}
        </Text>
      </View>

      {/* 진행 바 */}
      <View style={[styles.progressBar, { backgroundColor: colors.tabBarBorder }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            },
          ]}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* 문제 텍스트 */}
        <View style={[styles.questionCard, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.questionLabel, { color: colors.primary }]}>
            Q{currentIndex + 1}.
          </Text>
          <Text style={[styles.questionText, { color: colors.text }]}>
            {currentQuestion?.question_text}
          </Text>
        </View>

        {/* 선택지 */}
        <View style={styles.choices}>
          {currentQuestion?.choices.map((choice, index) => (
            <TouchableOpacity
              key={index}
              style={getChoiceStyle(index)}
              onPress={() => handleSelectAnswer(index)}
              disabled={!!result}
            >
              <View style={styles.choiceIndex}>
                <Text style={[styles.choiceIndexText, { color: colors.textLight }]}>
                  {index + 1}
                </Text>
              </View>
              <Text style={getChoiceTextStyle(index)}>{choice}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 결과 표시 */}
        {result && (
          <View style={[
            styles.resultCard,
            result.is_correct ? styles.correctResult : styles.wrongResult
          ]}>
            <Text style={styles.resultIcon}>
              {result.is_correct ? '✅' : '❌'}
            </Text>
            <Text style={[
              styles.resultTitle,
              { color: result.is_correct ? '#059669' : '#DC2626' }
            ]}>
              {result.is_correct ? '정답입니다!' : '틀렸습니다'}
            </Text>
            <Text style={[styles.solutionText, { color: colors.text }]}>
              {result.solution}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* 하단 버튼 */}
      <View style={[
        styles.footer,
        {
          backgroundColor: colors.cardBg,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: Math.max(insets.bottom, 12) + 8,
        }
      ]}>
        {!result ? (
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              selectedAnswer === null && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={selectedAnswer === null || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>제출하기</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            <Text style={styles.submitButtonText}>
              {currentIndex < questions.length - 1 ? '다음 문제' : '완료'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backText: {
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
    textAlign: 'center',
  },
  progress: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
  },
  progressFill: {
    height: '100%',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  questionCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 28,
  },
  choices: {
    gap: 12,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  selectedChoice: {
    borderWidth: 2,
  },
  correctChoice: {
    backgroundColor: '#D1FAE5',
    borderColor: '#059669',
  },
  wrongChoice: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  choiceIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  choiceIndexText: {
    fontSize: 14,
    fontWeight: '600',
  },
  choiceText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  correctChoiceText: {
    color: '#059669',
    fontWeight: '600',
  },
  wrongChoiceText: {
    color: '#DC2626',
  },
  resultCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  correctResult: {
    backgroundColor: '#D1FAE5',
  },
  wrongResult: {
    backgroundColor: '#FEE2E2',
  },
  resultIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  solutionText: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  completedButtons: {
    gap: 12,
    width: '100%',
    paddingHorizontal: 20,
  },
  completedButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  completedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
