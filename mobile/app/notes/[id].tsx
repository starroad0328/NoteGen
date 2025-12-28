/**
 * 노트 상세 화면
 * 통합 단일 컬럼 UI - 모든 정리 방식에서 동일한 레이아웃 사용
 */

import { useEffect, useState, useRef, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import * as Clipboard from 'expo-clipboard'
import { notesAPI, Note } from '../../services/api'
import { NoteRenderer, convertToNoteData, NoteData } from '../../components/note'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75

export default function NoteScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const noteId = parseInt(id as string)

  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current
  const contentScrollRef = useRef<ScrollView>(null)

  // 노트 데이터를 통합 형식으로 변환
  const noteData = useMemo((): NoteData | null => {
    if (!note?.organized_content) return null

    return convertToNoteData(
      note.organized_content,
      note.title,
      {
        subject: note.detected_subject,
        date: new Date(note.created_at).toLocaleDateString('ko-KR'),
        organizeMethod: note.organize_method,
      }
    )
  }, [note])

  // 목차용 헤딩 추출
  const tocItems = useMemo(() => {
    if (!noteData) return []
    return noteData.blocks
      .filter(block => block.type === 'heading' || block.type === 'title')
      .map((block, index) => ({
        index,
        title: block.type === 'title' ? (block as any).content : (block as any).content,
        level: block.type === 'title' ? 0 : ((block as any).level || 2),
      }))
  }, [noteData])

  const openDrawer = () => {
    setDrawerOpen(true)
    Animated.spring(drawerAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start()
  }

  const closeDrawer = () => {
    Animated.spring(drawerAnim, {
      toValue: -DRAWER_WIDTH,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start(() => setDrawerOpen(false))
  }

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

  const handleCopy = async () => {
    if (note?.organized_content) {
      await Clipboard.setStringAsync(note.organized_content)
      Alert.alert('복사 완료', '정리된 내용이 클립보드에 복사되었습니다.')
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
              router.replace('/(tabs)/notes')
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
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
            <Text style={styles.buttonIcon}>☰</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCopy} style={styles.headerButton}>
            <Text style={styles.buttonIcon}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
            <Text style={styles.buttonIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 정리 방식 태그 */}
      <View style={styles.tagBar}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {getMethodLabel(note.organize_method)}
          </Text>
        </View>
        {note.detected_subject && (
          <View style={[styles.tag, styles.subjectTag]}>
            <Text style={styles.tagText}>{note.detected_subject}</Text>
          </View>
        )}
      </View>

      {/* 통합 노트 렌더러 */}
      {noteData && (
        <NoteRenderer
          data={noteData}
          scrollRef={contentScrollRef}
        />
      )}

      {/* 노트 정보 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {new Date(note.created_at).toLocaleString('ko-KR')}
        </Text>
      </View>

      {/* 드로어 오버레이 */}
      {drawerOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeDrawer}
        />
      )}

      {/* 드로어 (목차) */}
      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: drawerAnim }] }
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>📑 목차</Text>
          <TouchableOpacity onPress={closeDrawer}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.drawerContent}>
          {tocItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.drawerItem,
                { paddingLeft: 16 + item.level * 12 }
              ]}
              onPress={() => {
                // TODO: 해당 섹션으로 스크롤
                closeDrawer()
              }}
            >
              <Text style={[
                styles.drawerItemText,
                item.level === 0 && styles.drawerItemTitle
              ]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  )
}

function getMethodLabel(method?: string): string {
  const labels: Record<string, string> = {
    'summary': '기본 정리',
    'cornell': '코넬식',
    'wrong_answer': '오답노트',
    'vocabulary': '단어장',
  }
  return labels[method || ''] || '정리'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#FAFAF8',
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
    marginHorizontal: 12,
    color: '#1F2937',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 6,
  },
  buttonIcon: {
    fontSize: 18,
  },
  tagBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tag: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  subjectTag: {
    backgroundColor: '#10B981',
  },
  tagText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: 'white',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    fontSize: 20,
    color: '#6B7280',
    padding: 4,
  },
  drawerContent: {
    flex: 1,
  },
  drawerItem: {
    paddingVertical: 14,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerItemText: {
    fontSize: 15,
    color: '#374151',
  },
  drawerItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
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
