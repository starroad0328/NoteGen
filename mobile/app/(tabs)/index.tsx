/**
 * 홈 탭
 * 최근 정리 + 다음 행동 CTA
 */

import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { notesAPI, authAPI, Note, UsageInfo } from '../../services/api'

export default function HomeTab() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()
  const { colors } = useTheme()
  const [recentNotes, setRecentNotes] = useState<Note[]>([])
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const [notes, usageData] = await Promise.all([
        notesAPI.list(0, 3, token),
        authAPI.getUsage(token)
      ])
      setRecentNotes(notes.filter(n => n.status === 'completed'))
      setUsage(usageData)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
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

  if (authLoading || loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textLight }]}>로딩 중...</Text>
      </View>
    )
  }

  // 비로그인 상태
  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.heroEmoji}>📝</Text>
        <Text style={[styles.heroTitle, { color: colors.text }]}>NotioClass</Text>
        <Text style={[styles.heroSubtitle, { color: colors.textLight }]}>Upload your notes. Study with them.</Text>

        <View style={styles.featureList}>
          <Text style={[styles.featureItem, { color: colors.textLight }]}>사진 찍으면 자동 정리</Text>
          <Text style={[styles.featureItem, { color: colors.textLight }]}>코넬식, 오답노트, 단어장</Text>
          <Text style={[styles.featureItem, { color: colors.textLight }]}>시험 대비 문제 자동 생성</Text>
        </View>

        <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>시작하기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.registerLink} onPress={() => router.push('/register')}>
          <Text style={[styles.registerLinkText, { color: colors.primary }]}>계정이 없으신가요? 회원가입</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>안녕하세요, {user.name || '학생'}님</Text>
            {user.grade_display && (
              <Text style={[styles.gradeText, { color: colors.primary }]}>{user.grade_display}</Text>
            )}
          </View>
          {usage && (
            <View style={[
              styles.usagePill,
              { backgroundColor: usage.is_unlimited ? '#8B5CF6' : colors.primary },
              !usage.is_unlimited && usage.remaining <= 3 && { backgroundColor: colors.accent }
            ]}>
              <Text style={styles.usagePillText}>
                {usage.is_unlimited ? '무제한' : `${usage.remaining}회 남음`}
              </Text>
            </View>
          )}
        </View>

        {/* 메인 CTA */}
        <TouchableOpacity
          style={[styles.mainCTA, { backgroundColor: colors.primary, shadowColor: colors.primaryDark }]}
          onPress={() => router.push('/(tabs)/upload')}
        >
          <Text style={styles.mainCTAIcon}>📸</Text>
          <View style={styles.mainCTAText}>
            <Text style={styles.mainCTATitle}>필기 정리하기</Text>
            <Text style={styles.mainCTADesc}>사진 찍고 AI로 정리받기</Text>
          </View>
          <Text style={styles.mainCTAArrow}>›</Text>
        </TouchableOpacity>

        {/* 빠른 액션 */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.cardBg }]}
            onPress={() => router.push('/(tabs)/notes')}
          >
            <Text style={styles.quickActionIcon}>📚</Text>
            <Text style={[styles.quickActionText, { color: colors.text }]}>내 노트</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.cardBg }]}
            onPress={() => router.push('/templates')}
          >
            <Text style={styles.quickActionIcon}>🛒</Text>
            <Text style={[styles.quickActionText, { color: colors.text }]}>정리법샵</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { backgroundColor: colors.cardBg }]}
            onPress={() => router.push('/(tabs)/questions')}
          >
            <Text style={styles.quickActionIcon}>📝</Text>
            <Text style={[styles.quickActionText, { color: colors.text }]}>문제 풀기</Text>
          </TouchableOpacity>
        </View>

        {/* 최근 정리 */}
        {recentNotes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>최근 정리</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/notes')}>
                <Text style={[styles.sectionMore, { color: colors.primary }]}>전체보기</Text>
              </TouchableOpacity>
            </View>
            {recentNotes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={[styles.noteCard, { backgroundColor: colors.cardBg }]}
                onPress={() => router.push(`/notes/${note.id}`)}
              >
                <View style={styles.noteInfo}>
                  <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>{note.title}</Text>
                  <Text style={[styles.noteDate, { color: colors.textLight }]}>
                    {new Date(note.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
                <Text style={[styles.noteArrow, { color: colors.primary }]}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 빈 상태 */}
        {recentNotes.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>아직 정리한 노트가 없어요</Text>
            <Text style={[styles.emptyDesc, { color: colors.textLight }]}>첫 필기를 정리해보세요!</Text>
          </View>
        )}
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
    paddingTop: 60,
  },
  loadingText: {
    fontSize: 16,
  },

  // 비로그인 히어로
  heroEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  featureList: {
    marginBottom: 32,
  },
  featureItem: {
    fontSize: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  loginButton: {
    paddingHorizontal: 64,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  registerLink: {
    padding: 8,
  },
  registerLinkText: {
    fontSize: 14,
  },

  // 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  usagePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  usagePillText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  // 메인 CTA
  mainCTA: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  mainCTAIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  mainCTAText: {
    flex: 1,
  },
  mainCTATitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  mainCTADesc: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  mainCTAArrow: {
    color: 'white',
    fontSize: 28,
    fontWeight: '300',
  },

  // 빠른 액션
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // 섹션
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionMore: {
    fontSize: 14,
  },

  // 노트 카드
  noteCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteInfo: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  noteDate: {
    fontSize: 12,
  },
  noteArrow: {
    fontSize: 20,
  },

  // 빈 상태
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 14,
  },
})
