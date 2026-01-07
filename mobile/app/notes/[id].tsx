/**
 * 노트 상세 화면
 * 스와이프로 정리 내용 ↔ 원본 사진 전환
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
  Dimensions,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { notesAPI, questionsAPI, Note, API_BASE_URL } from '../../services/api'
import { NoteRenderer, convertToNoteData, NoteData } from '../../components/note'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75

type PageType = 'note' | 'image'
interface PageItem {
  type: PageType
  imageUrl?: string
  imageIndex?: number
}

export default function NoteScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams()
  const noteId = parseInt(id as string)
  const { colors } = useTheme()
  const { token } = useAuth()

  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [generatingQuestions, setGeneratingQuestions] = useState(false)

  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current
  const contentScrollRef = useRef<ScrollView>(null)
  const horizontalScrollRef = useRef<FlatList>(null)

  // 페이지 데이터: [노트, 이미지1, 이미지2, ...]
  const pages = useMemo((): PageItem[] => {
    const items: PageItem[] = [{ type: 'note' }]
    if (note?.image_urls) {
      note.image_urls.forEach((url, index) => {
        // 상대 경로를 전체 URL로 변환
        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`
        items.push({ type: 'image', imageUrl: fullUrl, imageIndex: index })
      })
    }
    return items
  }, [note])

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
      console.log('[NoteScreen] 노트 데이터:', JSON.stringify(data, null, 2))
      console.log('[NoteScreen] image_urls:', data.image_urls)
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

  const handleGenerateQuestions = async () => {
    if (!note) return

    // 역사 과목인지 확인
    if (note.detected_subject !== 'history') {
      Alert.alert(
        '지원하지 않는 과목',
        '현재 역사 과목만 문제 생성을 지원합니다.'
      )
      return
    }

    setGeneratingQuestions(true)
    try {
      const result = await questionsAPI.generate(token!, noteId, 5)

      if (result.question_count > 0) {
        Alert.alert(
          '문제 생성 완료',
          `${result.question_count}개의 문제가 생성되었습니다.`,
          [
            {
              text: '문제 풀기',
              onPress: () => router.push(`/questions/${noteId}`),
            },
            { text: '나중에', style: 'cancel' },
          ]
        )
      } else {
        Alert.alert('알림', '생성할 문제가 없습니다. 노트에 개념 카드가 있는지 확인해주세요.')
      }
    } catch (error: any) {
      console.error('문제 생성 오류:', error)
      const message = error?.message || '문제 생성 중 오류가 발생했습니다.'
      Alert.alert('오류', message)
    } finally {
      setGeneratingQuestions(false)
    }
  }

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const page = Math.round(offsetX / SCREEN_WIDTH)
    if (page !== currentPage) {
      setCurrentPage(page)
    }
  }

  const renderPage = ({ item, index }: { item: PageItem; index: number }) => {
    if (item.type === 'note') {
      return (
        <View style={styles.pageContainer}>
          {/* 정리 방식 태그 */}
          <View style={[styles.tagBar, { backgroundColor: colors.background, borderBottomColor: colors.tabBarBorder }]}>
            <View style={[styles.tag, { backgroundColor: colors.primary }]}>
              <Text style={styles.tagText}>
                {getMethodLabel(note?.organize_method)}
              </Text>
            </View>
            {note?.detected_subject && (
              <View style={[styles.tag, styles.subjectTag, { backgroundColor: colors.accent }]}>
                <Text style={[styles.tagText, { color: colors.text }]}>{note.detected_subject}</Text>
              </View>
            )}
            {note?.image_urls && note.image_urls.length > 0 && (
              <Text style={[styles.swipeHint, { color: colors.textLight }]}>
                스와이프하여 원본 사진 보기
              </Text>
            )}
          </View>

          {/* 통합 노트 렌더러 */}
          {noteData && (
            <NoteRenderer
              data={noteData}
              scrollRef={contentScrollRef}
              colors={colors}
            />
          )}
        </View>
      )
    } else {
      // 이미지 페이지
      return (
        <View style={[styles.pageContainer, styles.imagePageContainer, { backgroundColor: colors.background }]}>
          <View style={styles.imageHeader}>
            <Text style={[styles.imageTitle, { color: colors.text }]}>
              원본 사진 {(item.imageIndex || 0) + 1} / {note?.image_urls?.length || 0}
            </Text>
            <Text style={[styles.swipeHintRight, { color: colors.textLight }]}>
              스와이프하여 돌아가기 →
            </Text>
          </View>
          <ScrollView
            style={styles.imageScrollView}
            contentContainerStyle={styles.imageScrollContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
            showsVerticalScrollIndicator={false}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </ScrollView>
        </View>
      )
    }
  }

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>📝</Text>
        <Text style={[styles.loadingText, { color: colors.textLight }]}>노트를 불러오는 중...</Text>
      </View>
    )
  }

  if (!note) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>❌</Text>
        <Text style={[styles.errorText, { color: colors.textLight }]}>노트를 찾을 수 없습니다</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.buttonText}>뒤로 가기</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.tabBarBorder }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: colors.primary }]}>← 목록</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {note.title}
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={openDrawer} style={styles.headerButton}>
            <Text style={styles.buttonIcon}>☰</Text>
          </TouchableOpacity>
          {note.detected_subject === 'history' && (
            <TouchableOpacity
              onPress={handleGenerateQuestions}
              style={styles.headerButton}
              disabled={generatingQuestions}
            >
              {generatingQuestions ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.buttonIcon}>📝</Text>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleCopy} style={styles.headerButton}>
            <Text style={styles.buttonIcon}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
            <Text style={styles.buttonIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 페이지 인디케이터 */}
      {pages.length > 1 && (
        <View style={[styles.pageIndicator, { backgroundColor: colors.cardBg }]}>
          {pages.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                horizontalScrollRef.current?.scrollToIndex({ index, animated: true })
                setCurrentPage(index)
              }}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentPage
                      ? colors.primary
                      : colors.tabBarBorder,
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 가로 스와이프 컨테이너 */}
      <FlatList
        ref={horizontalScrollRef}
        data={pages}
        renderItem={renderPage}
        keyExtractor={(_, index) => `page-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.horizontalScroll}
      />

      {/* 노트 정보 */}
      <View style={[
        styles.footer,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: Math.max(insets.bottom, 12) + 8,
        }
      ]}>
        <Text style={[styles.footerText, { color: colors.textLight }]}>
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
          { transform: [{ translateX: drawerAnim }], backgroundColor: colors.cardBg }
        ]}
      >
        <View style={[styles.drawerHeader, { backgroundColor: colors.background, borderBottomColor: colors.tabBarBorder }]}>
          <Text style={[styles.drawerTitle, { color: colors.text }]}>📑 목차</Text>
          <TouchableOpacity onPress={closeDrawer}>
            <Text style={[styles.closeButton, { color: colors.textLight }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.drawerContent}>
          {tocItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.drawerItem,
                { paddingLeft: 16 + item.level * 12, borderBottomColor: colors.tabBarBorder }
              ]}
              onPress={() => {
                // TODO: 해당 섹션으로 스크롤
                closeDrawer()
              }}
            >
              <Text style={[
                styles.drawerItemText,
                { color: colors.text },
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
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  horizontalScroll: {
    flex: 1,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  imagePageContainer: {
    justifyContent: 'flex-start',
  },
  tagBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
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
  swipeHint: {
    fontSize: 11,
    marginLeft: 'auto',
  },
  swipeHintRight: {
    fontSize: 12,
  },
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  imageTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  imageScrollView: {
    flex: 1,
  },
  imageScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT - 250,
    borderRadius: 8,
  },
  footer: {
    paddingHorizontal: 12,
    paddingTop: 12,
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
