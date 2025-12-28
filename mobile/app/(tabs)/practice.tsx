/**
 * 문제풀이 탭
 * 시험 대비 / 자동 생성 문제
 */

import { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { notesAPI, Note } from '../../services/api'

export default function PracticeTab() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchNotes = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const data = await notesAPI.list(0, 20, token)
      setNotes(data.filter(n => n.status === 'completed'))
    } catch (error) {
      console.error('노트 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchNotes()
    }, [token])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchNotes()
    setRefreshing(false)
  }, [token])

  if (authLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emoji}>🧠</Text>
        <Text style={styles.title}>로그인이 필요합니다</Text>
        <Text style={styles.subtitle}>문제 풀이를 시작하려면 로그인하세요</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>로그인</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>문제 풀기</Text>
          <Text style={styles.headerSubtitle}>정리한 노트로 복습해요</Text>
        </View>

        {/* Coming Soon 배너 */}
        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonEmoji}>🚀</Text>
          <Text style={styles.comingSoonTitle}>곧 출시됩니다!</Text>
          <Text style={styles.comingSoonDesc}>
            AI가 자동으로 문제를 만들어드려요{'\n'}
            노트를 정리하면 문제가 생성됩니다
          </Text>
        </View>

        {/* 기능 미리보기 */}
        <Text style={styles.sectionTitle}>예정된 기능</Text>

        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureEmoji}>📝</Text>
          </View>
          <View style={styles.featureInfo}>
            <Text style={styles.featureTitle}>빈칸 채우기</Text>
            <Text style={styles.featureDesc}>핵심 개념을 빈칸으로 복습</Text>
          </View>
          <View style={styles.featureBadge}>
            <Text style={styles.featureBadgeText}>FREE</Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureEmoji}>✅</Text>
          </View>
          <View style={styles.featureInfo}>
            <Text style={styles.featureTitle}>O/X 퀴즈</Text>
            <Text style={styles.featureDesc}>빠르게 개념 확인</Text>
          </View>
          <View style={styles.featureBadge}>
            <Text style={styles.featureBadgeText}>FREE</Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureEmoji}>📊</Text>
          </View>
          <View style={styles.featureInfo}>
            <Text style={styles.featureTitle}>오답노트 자동 생성</Text>
            <Text style={styles.featureDesc}>틀린 문제만 모아서 복습</Text>
          </View>
          <View style={[styles.featureBadge, styles.featureBadgePro]}>
            <Text style={styles.featureBadgeText}>PRO</Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.featureIcon}>
            <Text style={styles.featureEmoji}>🎯</Text>
          </View>
          <View style={styles.featureInfo}>
            <Text style={styles.featureTitle}>출제 예상 문제</Text>
            <Text style={styles.featureDesc}>시험에 나올 것 같은 문제</Text>
          </View>
          <View style={[styles.featureBadge, styles.featureBadgePro]}>
            <Text style={styles.featureBadgeText}>PRO</Text>
          </View>
        </View>

        {/* 노트 기반 문제 */}
        {notes.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>내 노트</Text>
            <Text style={styles.sectionDesc}>노트를 선택하면 문제가 생성됩니다</Text>

            {notes.slice(0, 5).map((note) => (
              <TouchableOpacity
                key={note.id}
                style={styles.noteItem}
                onPress={() => router.push(`/notes/${note.id}`)}
              >
                <View style={styles.noteInfo}>
                  <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                  <Text style={styles.noteDate}>
                    {new Date(note.created_at).toLocaleDateString('ko-KR')}
                  </Text>
                </View>
                <View style={styles.notePracticeBtn}>
                  <Text style={styles.notePracticeBtnText}>보기</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEF8',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#FFFEF8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  content: {
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#3B82F6',
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
  },

  // Coming Soon
  comingSoonCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  comingSoonEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0369A1',
    marginBottom: 8,
  },
  comingSoonDesc: {
    fontSize: 14,
    color: '#0284C7',
    textAlign: 'center',
    lineHeight: 20,
  },

  // 섹션
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#888',
    marginBottom: 12,
  },

  // 기능 카드
  featureCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#888',
  },
  featureBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featureBadgePro: {
    backgroundColor: '#8B5CF6',
  },
  featureBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },

  // 노트 아이템
  noteItem: {
    backgroundColor: 'white',
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
    color: '#999',
  },
  notePracticeBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  notePracticeBtnText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '600',
  },
})
