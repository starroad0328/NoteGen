/**
 * 문제 탭
 * 노트 선택 → 문제 생성 → 풀이 흐름
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
  Modal,
  Alert,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { questionsAPI, notesAPI, Question, QuestionStats, Note } from '../../services/api'

export default function QuestionsTab() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user, token, loading: authLoading } = useAuth()
  const { colors } = useTheme()

  const [questions, setQuestions] = useState<Question[]>([])
  const [stats, setStats] = useState<QuestionStats | null>(null)
  const [historyNotes, setHistoryNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 문제를 노트별로 그룹화
  interface NoteQuestionGroup {
    noteId: number
    noteTitle: string
    questionCount: number
    latestDate: string
  }

  const groupedByNote = (): NoteQuestionGroup[] => {
    const groups: Record<number, NoteQuestionGroup> = {}

    for (const q of questions) {
      if (!groups[q.note_id]) {
        // 노트 제목 찾기
        const note = historyNotes.find(n => n.id === q.note_id)
        groups[q.note_id] = {
          noteId: q.note_id,
          noteTitle: note?.title || `노트 #${q.note_id}`,
          questionCount: 0,
          latestDate: q.created_at,
        }
      }
      groups[q.note_id].questionCount++
      if (q.created_at > groups[q.note_id].latestDate) {
        groups[q.note_id].latestDate = q.created_at
      }
    }

    return Object.values(groups).sort((a, b) =>
      new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    )
  }

  const fetchData = async () => {
    if (!token) return
    try {
      const [questionsData, statsData, notesResponse] = await Promise.all([
        questionsAPI.getAll(token, undefined, 0, 50),
        questionsAPI.getStats(token).catch(() => null),
        notesAPI.list(0, 100, token),
      ])
      setQuestions(questionsData.questions)
      setStats(statsData)

      // notesAPI.list 반환값 처리 (배열 또는 {notes: []} 형태)
      const notesArray = Array.isArray(notesResponse)
        ? notesResponse
        : (notesResponse as any).notes || []

      // 역사 과목 노트만 필터링
      // - detected_subject가 history이거나
      // - 제목에 '역사'가 포함되어 있거나
      const historyOnly = notesArray.filter((n: Note) =>
        n.detected_subject === 'history' ||
        (n as any).subject === 'history' ||
        n.title?.includes('역사')
      )
      setHistoryNotes(historyOnly)
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

  const handleDeleteAll = async () => {
    if (!token) return

    Alert.alert(
      '전체 삭제',
      '생성된 모든 문제를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              const result = await questionsAPI.deleteAll(token)
              Alert.alert('완료', result.message)
              fetchData()
            } catch (error: any) {
              console.error('문제 삭제 실패:', error)
              Alert.alert('오류', '문제 삭제 중 오류가 발생했습니다.')
            } finally {
              setDeleting(false)
            }
          }
        }
      ]
    )
  }

  const handleGenerateQuestions = async (noteId: number) => {
    if (!token) return

    setSelectedNoteId(noteId)
    setGenerating(true)
    setShowNoteModal(false)

    try {
      const result = await questionsAPI.generate(token, noteId, 5)

      if (result.question_count > 0) {
        // 듀오링고 스타일: 생성 완료 후 바로 문제 풀이 화면으로 이동
        setGenerating(false)
        setSelectedNoteId(null)
        router.push(`/questions/${noteId}`)
      } else {
        Alert.alert('알림', '문제를 생성하지 못했습니다. 노트 내용을 확인해주세요.')
        setGenerating(false)
        setSelectedNoteId(null)
      }
    } catch (error: any) {
      console.error('문제 생성 실패:', error)
      Alert.alert('오류', error?.message || '문제 생성 중 오류가 발생했습니다.')
      setGenerating(false)
      setSelectedNoteId(null)
    }
  }

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>문제</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textLight }]}>
                  역사 과목 문제 풀이
                </Text>
              </View>
              {questions.length > 0 && (
                <TouchableOpacity
                  style={[styles.deleteButton, { borderColor: '#EF4444' }]}
                  onPress={handleDeleteAll}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <Text style={styles.deleteButtonText}>전체 삭제</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
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

          {/* 새 문제 생성 버튼 */}
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowNoteModal(true)}
            disabled={generating}
          >
            {generating ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.generateButtonText}>문제 생성 중...</Text>
              </>
            ) : (
              <>
                <Text style={styles.generateIcon}>✨</Text>
                <Text style={styles.generateButtonText}>새 문제 생성</Text>
              </>
            )}
          </TouchableOpacity>

          {/* 역사 노트 없음 안내 */}
          {historyNotes.length === 0 && (
            <View style={[styles.infoCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
              <Text style={[styles.infoTitle, { color: colors.primary }]}>역사 노트가 필요해요</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>
                역사 과목 노트를 먼저 정리해주세요.{'\n'}
                정리된 역사 노트에서 문제를 생성할 수 있습니다.
              </Text>
            </View>
          )}

          {/* 전체 문제 목록 - 노트별 그룹화 */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>내 문제</Text>

            {groupedByNote().length > 0 ? (
              groupedByNote().map((group) => (
                <TouchableOpacity
                  key={group.noteId}
                  style={[styles.questionCard, { backgroundColor: colors.cardBg }]}
                  onPress={() => router.push(`/questions/${group.noteId}`)}
                >
                  <View style={styles.groupHeader}>
                    <Text style={[styles.groupTitle, { color: colors.text }]} numberOfLines={1}>
                      {group.noteTitle}
                    </Text>
                    <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.countText}>{group.questionCount}</Text>
                    </View>
                  </View>
                  <View style={styles.questionMeta}>
                    <Text style={[styles.groupSubtitle, { color: colors.textLight }]}>
                      {group.questionCount}개의 문제
                    </Text>
                    <Text style={[styles.dateText, { color: colors.textLight }]}>
                      {new Date(group.latestDate).toLocaleDateString('ko-KR')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.cardBg }]}>
                <Text style={styles.emptyEmoji}>📭</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>아직 문제가 없어요</Text>
                <Text style={[styles.emptyDesc, { color: colors.textLight }]}>
                  위의 '새 문제 생성' 버튼을 눌러{'\n'}역사 노트에서 문제를 만들어보세요!
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* 노트 선택 모달 */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>노트 선택</Text>
              <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                <Text style={[styles.modalClose, { color: colors.textLight }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textLight }]}>
              문제를 생성할 역사 노트를 선택하세요
            </Text>

            <ScrollView style={styles.notesList}>
              {historyNotes.length > 0 ? (
                historyNotes.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.noteItem, { backgroundColor: colors.cardBg }]}
                    onPress={() => handleGenerateQuestions(note.id)}
                  >
                    <View style={styles.noteInfo}>
                      <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={1}>
                        {note.title}
                      </Text>
                      <Text style={[styles.noteDate, { color: colors.textLight }]}>
                        {new Date(note.created_at).toLocaleDateString('ko-KR')}
                      </Text>
                    </View>
                    <Text style={[styles.noteArrow, { color: colors.textLight }]}>→</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noNotesContainer}>
                  <Text style={styles.noNotesEmoji}>📚</Text>
                  <Text style={[styles.noNotesText, { color: colors.textLight }]}>
                    역사 과목 노트가 없습니다.{'\n'}먼저 역사 노트를 정리해주세요.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },

  // 통계 카드
  statsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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

  // 생성 버튼
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  generateIcon: {
    fontSize: 18,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // 섹션
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },

  // 문제 카드
  questionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  groupSubtitle: {
    fontSize: 13,
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
    marginBottom: 20,
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

  // 모달
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 24,
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  notesList: {
    maxHeight: 400,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  noteInfo: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 12,
  },
  noteArrow: {
    fontSize: 18,
    marginLeft: 12,
  },
  noNotesContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noNotesEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  noNotesText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
})
