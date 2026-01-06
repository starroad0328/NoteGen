/**
 * 요약 노트 생성 화면
 * 필기 선택 → 스타일 선택 → 요약 생성
 */

import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { notesAPI, summaryAPI, Note, SummaryLimits } from '../services/api'

const SUMMARY_STYLES = [
  { key: 'basic', label: '기본 요약', desc: '핵심 개념 중심 정리', forAll: true },
  { key: 'keyword', label: '키워드', desc: '키워드 중심 암기용', forAll: false },
  { key: 'table', label: '표 형식', desc: '비교표/공식표 정리', forAll: false },
]

export default function SummaryScreen() {
  const router = useRouter()
  const { user, token } = useAuth()
  const { colors } = useTheme()

  const [notes, setNotes] = useState<Note[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [limits, setLimits] = useState<SummaryLimits | null>(null)
  const [selectedStyle, setSelectedStyle] = useState('basic')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    if (!token) {
      setLoading(false)
      return
    }

    try {
      // 노트 목록과 제한 정보 동시 조회
      const [notesData, limitsData] = await Promise.all([
        notesAPI.list(0, 50, token),
        summaryAPI.getLimits(token)
      ])

      // 완료된 노트만 필터링
      const completedNotes = notesData.filter(n => n.status === 'completed')
      setNotes(completedNotes)
      setLimits(limitsData)
    } catch (error) {
      console.error('데이터 조회 오류:', error)
      Alert.alert('오류', '데이터를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (noteId: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(noteId)) {
        newSet.delete(noteId)
      } else {
        // 최대 선택 수 체크
        if (limits && newSet.size >= limits.max_notes) {
          Alert.alert('선택 제한', `현재 플랜에서는 최대 ${limits.max_notes}개까지 선택할 수 있습니다.`)
          return prev
        }
        newSet.add(noteId)
      }
      return newSet
    })
  }

  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      Alert.alert('알림', '요약할 노트를 선택해주세요.')
      return
    }

    if (limits && !limits.is_unlimited && limits.remaining <= 0) {
      Alert.alert(
        '사용량 초과',
        `이번 달 요약 생성 한도(${limits.limit}회)를 모두 사용했습니다.`,
        [
          { text: '확인', style: 'cancel' },
          { text: '업그레이드', onPress: () => router.push('/upgrade') }
        ]
      )
      return
    }

    setGenerating(true)

    try {
      const noteIds = Array.from(selectedIds)
      const result = await summaryAPI.generate(token!, noteIds, selectedStyle)

      Alert.alert(
        '요약 생성 완료!',
        '요약 노트가 생성되어 보관함에 저장되었습니다.',
        [
          { text: '보관함으로', onPress: () => router.replace('/(tabs)/notes') },
          { text: '바로 보기', onPress: () => router.push(`/notes/${result.id}`) }
        ]
      )
    } catch (error: any) {
      console.error('요약 생성 오류:', error)
      const message = error?.response?.data?.detail || '요약 생성 중 오류가 발생했습니다.'
      Alert.alert('오류', typeof message === 'string' ? message : message.message || '오류 발생')
    } finally {
      setGenerating(false)
    }
  }

  const renderNoteItem = ({ item }: { item: Note }) => {
    const isSelected = selectedIds.has(item.id)

    return (
      <TouchableOpacity
        style={[
          styles.noteItem,
          { backgroundColor: colors.cardBg },
          isSelected && { borderColor: colors.primary, borderWidth: 2 }
        ]}
        onPress={() => toggleSelect(item.id)}
      >
        <View style={[
          styles.checkbox,
          { borderColor: isSelected ? colors.primary : colors.textLight },
          isSelected && { backgroundColor: colors.primary }
        ]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <View style={styles.noteInfo}>
          <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.noteDate, { color: colors.textLight }]}>
            {new Date(item.created_at).toLocaleDateString('ko-KR')}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  if (loading) {
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
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>로그인</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const isPro = user.plan === 'pro'

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.tabBarBorder }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.primary }]}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>요약 노트 생성</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* 사용량 정보 */}
      {limits && (
        <View style={[styles.usageBar, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.usageText, { color: colors.textLight }]}>
            {limits.is_unlimited
              ? '무제한 사용 가능'
              : `이번 달 ${limits.used}/${limits.limit}회 사용`
            }
          </Text>
          <Text style={[styles.maxNotes, { color: colors.textLight }]}>
            최대 {limits.max_notes}개 선택 가능
          </Text>
        </View>
      )}

      {/* 스타일 선택 */}
      <View style={styles.styleSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>요약 스타일</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleScroll}>
          {SUMMARY_STYLES.map((style) => {
            const isAvailable = style.forAll || isPro
            const isSelected = selectedStyle === style.key

            return (
              <TouchableOpacity
                key={style.key}
                style={[
                  styles.styleCard,
                  { backgroundColor: colors.cardBg },
                  isSelected && { borderColor: colors.primary, borderWidth: 2 },
                  !isAvailable && { opacity: 0.5 }
                ]}
                onPress={() => isAvailable && setSelectedStyle(style.key)}
                disabled={!isAvailable}
              >
                <Text style={[styles.styleLabel, { color: isSelected ? colors.primary : colors.text }]}>
                  {style.label}
                </Text>
                <Text style={[styles.styleDesc, { color: colors.textLight }]}>
                  {style.desc}
                </Text>
                {!style.forAll && !isPro && (
                  <View style={[styles.proBadge, { backgroundColor: '#8B5CF6' }]}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* 노트 선택 */}
      <View style={styles.notesSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          노트 선택 ({selectedIds.size}개 선택됨)
        </Text>

        {notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emoji}>📝</Text>
            <Text style={[styles.emptyText, { color: colors.textLight }]}>
              요약할 노트가 없습니다.{'\n'}먼저 필기를 정리해주세요.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notes}
            renderItem={renderNoteItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.notesList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* 생성 버튼 */}
      <View style={[styles.bottomBar, { backgroundColor: colors.cardBg, borderTopColor: colors.tabBarBorder }]}>
        <TouchableOpacity
          style={[
            styles.generateButton,
            { backgroundColor: selectedIds.size > 0 ? colors.primary : colors.textLight }
          ]}
          onPress={handleGenerate}
          disabled={selectedIds.size === 0 || generating}
        >
          {generating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.generateButtonText}>
              {selectedIds.size > 0 ? `${selectedIds.size}개 노트 요약하기` : '노트를 선택하세요'}
            </Text>
          )}
        </TouchableOpacity>
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
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  backText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  usageBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  usageText: {
    fontSize: 13,
  },
  maxNotes: {
    fontSize: 13,
  },
  styleSection: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  styleScroll: {
    paddingHorizontal: 12,
  },
  styleCard: {
    width: 120,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  styleLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  styleDesc: {
    fontSize: 11,
  },
  proBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
  },
  notesSection: {
    flex: 1,
    paddingTop: 16,
  },
  notesList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noteInfo: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  generateButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
