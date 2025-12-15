import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { notesAPI, Note } from '../../services/api'

export default function NotesListScreen() {
  const router = useRouter()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchNotes()
  }, [])

  const fetchNotes = async () => {
    try {
      const data = await notesAPI.list()
      setNotes(data)
    } catch (error) {
      console.error('노트 목록 조회 오류:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchNotes()
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

  const renderNoteItem = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={styles.noteCard}
      onPress={() => router.push(`/notes/${item.id}`)}
    >
      <Text style={styles.noteIcon}>📄</Text>
      <View style={styles.noteContent}>
        <Text style={styles.noteTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.noteDate}>
          {new Date(item.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
        {getStatusBadge(item.status)}
      </View>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emoji}>📚</Text>
        <Text style={styles.loadingText}>노트 목록을 불러오는 중...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>← 홈으로</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>내 노트</Text>
        </View>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => router.push('/upload')}
        >
          <Text style={styles.newButtonText}>+ 새 노트</Text>
        </TouchableOpacity>
      </View>

      {/* 노트 목록 */}
      {notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emoji}>📝</Text>
          <Text style={styles.emptyTitle}>아직 생성된 노트가 없습니다</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/upload')}
          >
            <Text style={styles.createButtonText}>첫 노트 만들기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}
    </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backText: {
    color: '#3B82F6',
    fontSize: 14,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C2C2C',
  },
  newButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  newButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noteIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  noteDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
})
