/**
 * 문제 탭
 * 전체 문제 목록 및 취약점 기반 추천
 */

import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { questionsAPI, Question, QuestionStats, WeakPracticeResponse } from '../../services/api'

export default function QuestionsTab() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, token, loading: authLoading } = useAuth()
  const { colors } = useTheme()

  const [questions, setQuestions] = useState<Question[]>([])
  const [stats, setStats] = useState<QuestionStats | null>(null)
  const [weakPractice, setWeakPractice] = useState<WeakPracticeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!token) return
    try {
      const [questionsData, statsData, weakData] = await Promise.all([
        questionsAPI.getAll(token, undefined, 0, 50),
        questionsAPI.getStats(token),
        questionsAPI.getWeakPractice(token, 5),
      ])
      setQuestions(questionsData.questions)
      setStats(statsData)
      setWeakPractice(weakData)
    } catch (error) {
      console.error('문제 데이터 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (user && token) {
        fetchData()
      } else {
        setLoading(false)
      }
    }, [user, token])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [token])

  if (authLoading || loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textLight }]}>로딩 중...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>📝</Text>
        <Text style={[styles.title, { color: colors.text }]}>로그인이 필요합니다</Text>
        <Text style={[styles.subtitle, { color: colors.textLight }]}>
          문제 풀이 기능을 사용하려면 로그인하세요
        </Text>
        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>로그인</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>문제</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>
            역사 과목 문제 풀이
          </Text>
        </View>

        {/* 통계 카드 */}
        {stats && stats.total_questions > 0 && (
          <View style={[styles.statsCard, { backgroundColor: colors.cardBg }]}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.primary }]}>
                  {stats.total_questions}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>총 문제</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.tabBarBorder }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  {stats.total_attempts}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>풀이 횟수</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.tabBarBorder }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: '#10B981' }]}>
                  {stats.accuracy}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.textLight }]}>정답률</Text>
              </View>
            </View>
          </View>
        )}

        {/* 취약점 기반 추천 */}
        {weakPractice && weakPractice.questions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>맞춤 추천 문제</Text>
              <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.badgeText}>취약점</Text>
              </View>
            </View>
            {weakPractice.message && (
              <Text style={[styles.sectionDesc, { color: colors.textLight }]}>
                {weakPractice.message}
              </Text>
            )}

            {weakPractice.questions.slice(0, 3).map((q) => (
              <TouchableOpacity
                key={q.id}
                style={[styles.questionCard, { backgroundColor: colors.cardBg }]}
                onPress={() => router.push(`/questions/${q.note_id}`)}
              >
                <Text style={[styles.questionText, { color: colors.text }]} numberOfLines={2}>
                  {q.question_text}
                </Text>
                <View style={styles.questionMeta}>
                  {q.cognitive_level && (
                    <View style={[styles.levelBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.levelText, { color: colors.primary }]}>
                        {getCognitiveLevelLabel(q.cognitive_level)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 전체 문제 목록 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>최근 생성된 문제</Text>

          {questions.length > 0 ? (
            questions.slice(0, 10).map((q) => (
              <TouchableOpacity
                key={q.id}
                style={[styles.questionCard, { backgroundColor: colors.cardBg }]}
                onPress={() => router.push(`/questions/${q.note_id}`)}
              >
                <Text style={[styles.questionText, { color: colors.text }]} numberOfLines={2}>
                  {q.question_text}
                </Text>
                <View style={styles.questionMeta}>
                  {q.cognitive_level && (
                    <View style={[styles.levelBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.levelText, { color: colors.primary }]}>
                        {getCognitiveLevelLabel(q.cognitive_level)}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.dateText, { color: colors.textLight }]}>
                    {new Date(q.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg }]}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>아직 문제가 없어요</Text>
              <Text style={[styles.emptyDesc, { color: colors.textLight }]}>
                역사 노트에서 문제를 생성해보세요!{'\n'}
                노트 상세 화면의 📝 버튼을 눌러주세요
              </Text>
            </View>
          )}
        </View>

        {/* 안내 */}
        <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>문제 생성 방법</Text>
          <Text style={[styles.infoText, { color: colors.text }]}>
            1. 역사 과목 노트를 정리합니다{'\n'}
            2. 노트 상세 화면에서 📝 버튼을 누릅니다{'\n'}
            3. AI가 개념 카드 기반으로 문제를 생성합니다
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

function getCognitiveLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    recall: '회상',
    sequence: '순서',
    cause_effect: '인과',
    compare: '비교',
  }
  return labels[level] || level
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  content: {
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  loginButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // 헤더
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
  },

  // 통계 카드
  statsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },

  // 섹션
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 12,
    marginTop: -8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },

  // 문제 카드
  questionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  questionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
  },

  // 빈 상태
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },

  // 안내 카드
  infoCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 22,
  },
})
