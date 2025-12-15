import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import Markdown from 'react-native-markdown-display'
import { notesAPI, Note } from '../../services/api'

export default function NoteScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const noteId = parseInt(id as string)

  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNote()
  }, [])

  const fetchNote = async () => {
    try {
      const data = await notesAPI.get(noteId)
      setNote(data)
    } catch (error) {
      console.error('노트 조회 오류:', error)
      Alert.alert('오류', '노트를 불러올 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    Alert.alert(
      '삭제 확인',
      '이 노트를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await notesAPI.delete(noteId)
              router.replace('/notes')
            } catch (error) {
              Alert.alert('오류', '삭제 중 오류가 발생했습니다.')
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emoji}>📝</Text>
        <Text style={styles.loadingText}>노트를 불러오는 중...</Text>
      </View>
    )
  }

  if (!note) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emoji}>❌</Text>
        <Text style={styles.errorText}>노트를 찾을 수 없습니다</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>뒤로 가기</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← 목록</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {note.title}
        </Text>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      {/* 노트 내용 */}
      <ScrollView style={styles.content}>
        <View style={styles.notePage}>
          {note.organized_content ? (
            <Markdown
              style={{
                body: styles.markdown,
                heading1: styles.h1,
                heading2: styles.h2,
                listItem: styles.listItem,
                table: styles.table,
                tableHeader: styles.tableHeader,
                tableRow: styles.tableRow,
              }}
            >
              {note.organized_content}
            </Markdown>
          ) : (
            <Text style={styles.emptyText}>정리된 내용이 없습니다.</Text>
          )}
        </View>

        {/* 노트 정보 */}
        <View style={styles.info}>
          <Text style={styles.infoText}>
            생성일: {new Date(note.created_at).toLocaleString('ko-KR')}
          </Text>
          <Text style={styles.infoText}>정리 방식: {note.organize_method}</Text>
        </View>
      </ScrollView>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: 50,
  },
  backText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  deleteText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  notePage: {
    backgroundColor: 'white',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  markdown: {
    fontSize: 16,
    lineHeight: 28,
    color: '#2C2C2C',
  },
  h1: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2C2C2C',
  },
  h2: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
    color: '#2C2C2C',
  },
  listItem: {
    marginVertical: 4,
    fontSize: 16,
    lineHeight: 24,
  },
  table: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginVertical: 16,
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
    padding: 12,
  },
  tableRow: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  info: {
    padding: 16,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
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
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginVertical: 40,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
