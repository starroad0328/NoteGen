/**
 * 보관함 탭 - 노트 목록
 */

import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, Image, Dimensions, Modal, TextInput, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { notesAPI, Note, API_BASE_URL } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_MARGIN = 8
const NUM_COLUMNS = 2
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_MARGIN * (NUM_COLUMNS - 1)) / NUM_COLUMNS

export default function NotesTab() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()
  const { colors } = useTheme()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')

  const SUBJECT_FILTERS = [
    { key: 'all', label: '전체' },
    { key: 'math', label: '수학' },
    { key: 'korean', label: '국어' },
    { key: 'english', label: '영어' },
  ]

  // 탭 포커스 시 새로고침 (삭제 중이 아닐 때만)
  useFocusEffect(
    useCallback(() => {
      if (user && !isDeleting) {
        fetchNotes()
      }
    }, [user, isDeleting, selectedSubject])
  )

  const fetchNotes = async () => {
    try {
      const data = await notesAPI.list(0, 20, token, selectedSubject)
      setNotes(data)
    } catch (error) {
      console.error('노트 목록 조회 오류:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleSubjectChange = (subject: string) => {
    setSelectedSubject(subject)
    setLoading(true)
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchNotes()
  }

  const handleDelete = (noteId: number, noteTitle: string) => {
    Alert.alert(
      '노트 삭제',
      `"${noteTitle}"을(를) 삭제하시겠습니까?\n삭제된 노트는 복구할 수 없습니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true)
            // 즉시 로컬에서 제거 (빠른 피드백)
            setNotes(prev => prev.filter(n => n.id !== noteId))
            try {
              await notesAPI.delete(noteId, token)
            } catch (error: any) {
              console.error('삭제 오류:', error)
              Alert.alert('오류', error.message || '삭제 중 오류가 발생했습니다.')
              // 실패 시 다시 가져오기
              fetchNotes()
            } finally {
              setIsDeleting(false)
            }
          }
        }
      ]
    )
  }

  const handleEditTitle = (note: Note) => {
    setEditingNote(note)
    setNewTitle(note.title)
    setEditModalVisible(true)
  }

  const handleSaveTitle = async () => {
    if (!editingNote || !newTitle.trim()) return

    const trimmedTitle = newTitle.trim()
    if (trimmedTitle === editingNote.title) {
      setEditModalVisible(false)
      return
    }

    try {
      await notesAPI.updateTitle(editingNote.id, trimmedTitle, token)
      // 로컬 상태 업데이트
      setNotes(prev => prev.map(n =>
        n.id === editingNote.id ? { ...n, title: trimmedTitle } : n
      ))
      setEditModalVisible(false)
    } catch (error: any) {
      console.error('제목 변경 오류:', error)
      Alert.alert('오류', error.message || '제목 변경 중 오류가 발생했습니다.')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      uploading: { text: '업로드 중', color: '#D1D5DB' },
      ocr_processing: { text: 'OCR 처리 중', color: '#BFDBFE' },
      ai_organizing: { text: 'AI 정리 중', color: '#DDD6FE' },
      completed: { text: '완료', color: '#BBF7D0' },
      failed: { text: '실패', color: '#FECACA' },
    }
    const badge = badges[status] || { text: '알 수 없음', color: '#D1D5DB' }
    return (
      <View style={[styles.badge, { backgroundColor: badge.color }]}>
        <Text style={styles.badgeText}>{badge.text}</Text>
      </View>
    )
  }

  const renderNoteItem = ({ item, index }: { item: Note; index: number }) => {
    const thumbnailUrl = item.thumbnail_url ? `${API_BASE_URL}${item.thumbnail_url}` : null

    return (
      <TouchableOpacity
        style={[
          styles.noteCard,
          { marginRight: index % NUM_COLUMNS === 0 ? CARD_MARGIN : 0, backgroundColor: colors.cardBg }
        ]}
        onPress={() => router.push(`/notes/${item.id}`)}
        onLongPress={() => handleEditTitle(item)}
        delayLongPress={500}
      >
        {/* 썸네일 */}
        <View style={styles.thumbnailContainer}>
          {thumbnailUrl ? (
            <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderThumbnail}>
              <Text style={styles.placeholderIcon}>📄</Text>
            </View>
          )}
          {/* 삭제 버튼 */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id, item.title)}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* 정보 */}
        <View style={styles.noteInfo}>
          <Text style={[styles.noteTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.noteDate, { color: colors.textLight }]}>
            {new Date(item.created_at).toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          {getStatusBadge(item.status)}
        </View>
      </TouchableOpacity>
    )
  }

  if (authLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textLight }]}>로딩 중...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>📚</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>로그인이 필요합니다</Text>
        <Text style={[styles.emptyDesc, { color: colors.textLight }]}>노트를 저장하고 관리하려면 로그인하세요</Text>
        <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>로그인</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>📚</Text>
        <Text style={[styles.loadingText, { color: colors.textLight }]}>노트 목록을 불러오는 중...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.tabBarBorder }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>보관함</Text>
        <Text style={[styles.headerCount, { color: colors.textLight }]}>{notes.length}개의 노트</Text>
      </View>

      {/* 과목 필터 탭 */}
      <View style={[styles.filterContainer, { backgroundColor: colors.cardBg }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {SUBJECT_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                selectedSubject === filter.key && { backgroundColor: colors.primary }
              ]}
              onPress={() => handleSubjectChange(filter.key)}
            >
              <Text style={[
                styles.filterTabText,
                { color: selectedSubject === filter.key ? '#fff' : colors.textLight }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 노트 목록 */}
      {notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emoji}>📝</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>아직 생성된 노트가 없습니다</Text>
          <Text style={[styles.emptyDesc, { color: colors.textLight }]}>필기 정리 탭에서 첫 노트를 만들어보세요</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* 제목 변경 모달 */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>제목 변경</Text>
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.tabBarBorder }]}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="새 제목을 입력하세요"
              placeholderTextColor={colors.textLight}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveTitle}
              >
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerCount: {
    fontSize: 14,
    marginTop: 4,
  },
  filterContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  row: {
    justifyContent: 'flex-start',
    marginBottom: CARD_MARGIN,
  },
  noteCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnailContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    backgroundColor: 'rgba(0,0,0,0.05)',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  placeholderIcon: {
    fontSize: 40,
  },
  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  noteInfo: {
    padding: 10,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  noteDate: {
    fontSize: 11,
    marginBottom: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  loginButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {},
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
