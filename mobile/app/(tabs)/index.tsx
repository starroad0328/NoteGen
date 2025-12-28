/**
 * 홈 탭
 * 최근 정리 + 다음 행동 CTA
 */

import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { notesAPI, authAPI, Note, UsageInfo } from '../../services/api'

export default function HomeTab() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()
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
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    )
  }

  // 비로그인 상태
  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.heroEmoji}>📝</Text>
        <Text style={styles.heroTitle}>NotioClass</Text>
        <Text style={styles.heroSubtitle}>Upload your notes. Study with them.</Text>

        <View style={styles.featureList}>
          <Text style={styles.featureItem}>사진 찍으면 자동 정리</Text>
          <Text style={styles.featureItem}>코넬식, 오답노트, 단어장</Text>
          <Text style={styles.featureItem}>시험 대비 문제 자동 생성</Text>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>시작하기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.registerLink} onPress={() => router.push('/register')}>
          <Text style={styles.registerLinkText}>계정이 없으신가요? 회원가입</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>안녕하세요, {user.name || '학생'}님</Text>
            {user.grade_display && (
              <Text style={styles.gradeText}>{user.grade_display}</Text>
            )}
          </View>
          {usage && !usage.is_unlimited && (
            <View style={[styles.usagePill, usage.remaining <= 3 && styles.usagePillWarning]}>
              <Text style={styles.usagePillText}>{usage.remaining}회 남음</Text>
            </View>
          )}
        </View>

        {/* 메인 CTA */}
        <TouchableOpacity
          style={styles.mainCTA}
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
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/notes')}
          >
            <Text style={styles.quickActionIcon}>📚</Text>
            <Text style={styles.quickActionText}>내 노트</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/practice')}
          >
            <Text style={styles.quickActionIcon}>🧠</Text>
            <Text style={styles.quickActionText}>문제 풀기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push('/(tabs)/my')}
          >
            <Text style={styles.quickActionIcon}>💎</Text>
            <Text style={styles.quickActionText}>내 플랜</Text>
          </TouchableOpacity>
        </View>

        {/* 최근 정리 */}
        {recentNotes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>최근 정리</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/notes')}>
                <Text style={styles.sectionMore}>전체보기</Text>
              </TouchableOpacity>
            </View>
            {recentNotes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={styles.noteCard}
                onPress={() => router.push(`/notes/${note.id}`)}
              >
                <View style={styles.noteInfo}>
                  <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                  <Text style={styles.noteDate}>
                    {new Date(note.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
                <Text style={styles.noteArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 빈 상태 */}
        {recentNotes.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📝</Text>
            <Text style={styles.emptyTitle}>아직 정리한 노트가 없어요</Text>
            <Text style={styles.emptyDesc}>첫 필기를 정리해보세요!</Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

// NotioClass 브랜드 컬러
const COLORS = {
  background: '#FDF6E3',      // 따뜻한 크림색
  primary: '#C4956A',         // 갈색 메인
  primaryDark: '#A67B5B',     // 진한 갈색
  accent: '#E8B866',          // 골드/오렌지
  text: '#5D4E37',            // 갈색 텍스트
  textLight: '#8B7355',       // 연한 갈색
  cardBg: '#FFFEF8',          // 카드 배경
  white: '#FFFFFF',
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.textLight,
  },

  // 비로그인 히어로
  heroEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 32,
  },
  featureList: {
    marginBottom: 32,
  },
  featureItem: {
    fontSize: 15,
    color: COLORS.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.primary,
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
    color: COLORS.text,
  },
  gradeText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  usagePill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  usagePillWarning: {
    backgroundColor: COLORS.accent,
  },
  usagePillText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  // 메인 CTA
  mainCTA: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primaryDark,
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
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  quickActionText: {
    fontSize: 13,
    color: COLORS.text,
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
    color: COLORS.text,
  },
  sectionMore: {
    fontSize: 14,
    color: COLORS.primary,
  },

  // 노트 카드
  noteCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  noteInfo: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  noteDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  noteArrow: {
    fontSize: 20,
    color: COLORS.primary,
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
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textLight,
  },
})
