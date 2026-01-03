/**
 * PRO 탭
 * 취약점 분석 + 맞춤 문제 추천
 */

import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { weakConceptsAPI, WeakConceptsOverview, conceptCardsAPI, ConceptCard } from '../../services/api'

// 과목명 한글 변환
const SUBJECT_NAMES: Record<string, string> = {
  math: '수학',
  korean: '국어',
  english: '영어',
  science: '과학',
  social: '사회',
  history: '역사',
  other: '기타',
}

export default function ProTab() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()
  const { colors } = useTheme()
  const [weakOverview, setWeakOverview] = useState<WeakConceptsOverview | null>(null)
  const [conceptCards, setConceptCards] = useState<ConceptCard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      // 취약점 개요 조회
      const overview = await weakConceptsAPI.getOverview(token)
      setWeakOverview(overview)

      // Concept Card 조회
      const cards = await conceptCardsAPI.getUserCards(token, undefined, 20)
      setConceptCards(cards)
    } catch (error) {
      console.error('PRO 데이터 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [token])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [token])

  const isPro = user?.plan === 'pro'
  const isBasic = user?.plan === 'basic'

  if (authLoading || loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textLight }]}>로딩 중...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>⭐</Text>
        <Text style={[styles.title, { color: colors.text }]}>로그인이 필요합니다</Text>
        <Text style={[styles.subtitle, { color: colors.textLight }]}>PRO 기능을 사용하려면 로그인하세요</Text>
        <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>로그인</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>PRO</Text>
            {isPro && (
              <View style={[styles.proBadge, { backgroundColor: '#8B5CF6' }]}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            )}
          </View>
          <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>
            {isPro ? '맞춤 학습으로 실력을 키워요' : 'PRO로 업그레이드하고 맞춤 학습을 시작하세요'}
          </Text>
        </View>

        {/* Free 사용자: 업그레이드 배너 */}
        {!isPro && (
          <TouchableOpacity
            style={[styles.upgradeCard, { backgroundColor: '#8B5CF6' }]}
            onPress={() => router.push('/upgrade')}
          >
            <View style={styles.upgradeContent}>
              <Text style={styles.upgradeEmoji}>⭐</Text>
              <View style={styles.upgradeText}>
                <Text style={styles.upgradeTitle}>PRO로 업그레이드</Text>
                <Text style={styles.upgradeDesc}>취약점 분석, 맞춤 문제, 무제한 정리</Text>
              </View>
            </View>
            <Text style={styles.upgradeArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* 취약점 분석 섹션 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>내 취약점 분석</Text>
            {!isPro && (
              <View style={[styles.lockBadge, { backgroundColor: colors.textLight }]}>
                <Text style={styles.lockBadgeText}>PRO</Text>
              </View>
            )}
          </View>

          {isPro && weakOverview && weakOverview.total_weak_concepts > 0 ? (
            <>
              {/* 취약 과목 요약 */}
              <View style={[styles.statsCard, { backgroundColor: colors.cardBg }]}>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: colors.primary }]}>
                      {weakOverview.total_weak_concepts}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textLight }]}>취약 개념</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: '#EF4444' }]}>
                      {weakOverview.total_errors}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textLight }]}>총 오답</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: colors.text }]}>
                      {weakOverview.subjects.length}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textLight }]}>과목</Text>
                  </View>
                </View>
              </View>

              {/* 과목별 취약점 */}
              {weakOverview.subjects.map((subj, idx) => (
                <View key={idx} style={[styles.weakCard, { backgroundColor: colors.cardBg }]}>
                  <View style={styles.weakHeader}>
                    <Text style={[styles.weakSubject, { color: colors.text }]}>
                      {subj.subject_name}
                    </Text>
                    <Text style={[styles.weakCount, { color: '#EF4444' }]}>
                      {subj.total_errors}회 오답
                    </Text>
                  </View>
                  {subj.top_concept && (
                    <Text style={[styles.weakConcept, { color: colors.textLight }]}>
                      주요 취약점: {subj.top_concept}
                    </Text>
                  )}
                </View>
              ))}
            </>
          ) : isPro ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg }]}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                아직 분석할 데이터가 없어요{'\n'}
                오답노트를 정리하면 취약점이 분석됩니다
              </Text>
            </View>
          ) : (
            <View style={[styles.lockedCard, { backgroundColor: colors.cardBg }]}>
              <Text style={styles.lockedEmoji}>🔒</Text>
              <Text style={[styles.lockedText, { color: colors.textLight }]}>
                PRO 플랜에서 취약점 분석을 확인할 수 있어요
              </Text>
            </View>
          )}
        </View>

        {/* 개념 카드 섹션 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>내 개념 카드</Text>
          <Text style={[styles.sectionDesc, { color: colors.textLight }]}>
            정리한 노트에서 추출된 핵심 개념
          </Text>

          {conceptCards.length > 0 ? (
            conceptCards.slice(0, 5).map((card) => (
              <View key={card.id} style={[styles.conceptCard, { backgroundColor: colors.cardBg }]}>
                <View style={styles.conceptHeader}>
                  <View style={[styles.conceptTypeBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.conceptTypeText, { color: colors.primary }]}>
                      {card.card_type}
                    </Text>
                  </View>
                  <Text style={[styles.conceptSubject, { color: colors.textLight }]}>
                    {SUBJECT_NAMES[card.subject || 'other']}
                  </Text>
                </View>
                <Text style={[styles.conceptTitle, { color: colors.text }]}>{card.title}</Text>
                {card.unit_name && (
                  <Text style={[styles.conceptUnit, { color: colors.textLight }]}>
                    {card.unit_name}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.cardBg }]}>
              <Text style={styles.emptyEmoji}>📝</Text>
              <Text style={[styles.emptyText, { color: colors.textLight }]}>
                아직 개념 카드가 없어요{'\n'}
                노트를 정리하면 자동으로 생성됩니다
              </Text>
            </View>
          )}
        </View>

        {/* 맞춤 문제 섹션 (PRO 전용) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>맞춤 문제</Text>
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          </View>

          <View style={[styles.comingSoonCard, { backgroundColor: colors.cardBg, borderColor: colors.tabBarBorder }]}>
            <Text style={styles.comingSoonEmoji}>🎯</Text>
            <Text style={[styles.comingSoonTitle, { color: colors.text }]}>곧 출시됩니다!</Text>
            <Text style={[styles.comingSoonDesc, { color: colors.textLight }]}>
              개념 카드 기반으로 AI가 맞춤 문제를 생성해요{'\n'}
              취약점에 맞는 문제로 효과적으로 학습하세요
            </Text>
          </View>
        </View>

        {/* PRO 기능 미리보기 */}
        {!isPro && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>PRO 기능</Text>

            <View style={[styles.featureCard, { backgroundColor: colors.cardBg }]}>
              <Text style={styles.featureEmoji}>📊</Text>
              <View style={styles.featureInfo}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>취약점 분석</Text>
                <Text style={[styles.featureDesc, { color: colors.textLight }]}>
                  오답 패턴을 분석해 약점을 파악
                </Text>
              </View>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.cardBg }]}>
              <Text style={styles.featureEmoji}>🎯</Text>
              <View style={styles.featureInfo}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>맞춤 문제 추천</Text>
                <Text style={[styles.featureDesc, { color: colors.textLight }]}>
                  취약 개념 기반 AI 문제 생성
                </Text>
              </View>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.cardBg }]}>
              <Text style={styles.featureEmoji}>♾️</Text>
              <View style={styles.featureInfo}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>무제한 정리</Text>
                <Text style={[styles.featureDesc, { color: colors.textLight }]}>
                  월간 사용량 제한 없이 무제한 사용
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.upgradeButton, { backgroundColor: '#8B5CF6' }]}
              onPress={() => router.push('/upgrade')}
            >
              <Text style={styles.upgradeButtonText}>PRO 시작하기</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
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
    padding: 40,
  },
  content: {
    padding: 20,
  },
  loadingText: {
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
    paddingTop: 40,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  proBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },

  // 업그레이드 카드
  upgradeCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  upgradeContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upgradeEmoji: {
    fontSize: 28,
  },
  upgradeText: {
    flex: 1,
  },
  upgradeTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  upgradeDesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  upgradeArrow: {
    color: 'white',
    fontSize: 20,
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
  },
  sectionDesc: {
    fontSize: 13,
    marginBottom: 12,
  },
  lockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },

  // 통계 카드
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    height: 30,
    backgroundColor: '#E5E7EB',
  },

  // 취약점 카드
  weakCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  weakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weakSubject: {
    fontSize: 15,
    fontWeight: '600',
  },
  weakCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  weakConcept: {
    fontSize: 13,
    marginTop: 6,
  },

  // 개념 카드
  conceptCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  conceptTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conceptTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  conceptSubject: {
    fontSize: 12,
  },
  conceptTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  conceptUnit: {
    fontSize: 12,
    marginTop: 4,
  },

  // 빈 상태
  emptyCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // 잠금 상태
  lockedCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  lockedEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  lockedText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Coming Soon
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  comingSoonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  comingSoonCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  comingSoonEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  comingSoonDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // 기능 카드
  featureCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  featureDesc: {
    fontSize: 12,
    marginTop: 2,
  },

  // 업그레이드 버튼
  upgradeButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
})
