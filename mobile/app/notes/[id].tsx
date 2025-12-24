import { useEffect, useState, useRef } from 'react'
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
import Markdown from 'react-native-markdown-display'
import * as Clipboard from 'expo-clipboard'
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view'
import { notesAPI, Note } from '../../services/api'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
// 캔버스 크기 (A4 비율 기반, 큰 도화지)
const CANVAS_WIDTH = SCREEN_WIDTH * 2
const CANVAS_HEIGHT = SCREEN_HEIGHT * 2.5
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75

// 섹션 타입별 스타일
const SECTION_STYLES: Record<string, { color: string; icon: string }> = {
  '핵심': { color: '#EF4444', icon: '🔑' },
  '요약': { color: '#F59E0B', icon: '📌' },
  '개념': { color: '#3B82F6', icon: '💡' },
  '정의': { color: '#3B82F6', icon: '📖' },
  '설명': { color: '#10B981', icon: '📝' },
  '예시': { color: '#8B5CF6', icon: '✏️' },
  '공식': { color: '#EC4899', icon: '📐' },
  '시험': { color: '#F97316', icon: '🎯' },
  '포인트': { color: '#F97316', icon: '🎯' },
  '주의': { color: '#EF4444', icon: '⚠️' },
  'default': { color: '#6B7280', icon: '📄' },
}

function getSectionStyle(title: string) {
  for (const [keyword, style] of Object.entries(SECTION_STYLES)) {
    if (keyword !== 'default' && title.includes(keyword)) {
      return style
    }
  }
  return SECTION_STYLES['default']
}

// 마크다운을 섹션별로 파싱
function parseMarkdownSections(content: string) {
  const lines = content.split('\n')
  const sections: { title: string; content: string; level: number; startLine: number }[] = []

  let currentSection: { title: string; content: string; level: number; startLine: number } | null = null
  let headerContent = ''
  let lineNumber = 0

  for (const line of lines) {
    const h1Match = line.match(/^# (.+)$/)
    const h2Match = line.match(/^## (.+)$/)

    if (h1Match) {
      if (currentSection) sections.push(currentSection)
      else if (headerContent.trim()) {
        sections.push({ title: '개요', content: headerContent.trim(), level: 0, startLine: 0 })
      }
      currentSection = { title: h1Match[1], content: '', level: 1, startLine: lineNumber }
    } else if (h2Match) {
      if (currentSection) sections.push(currentSection)
      else if (headerContent.trim()) {
        sections.push({ title: '개요', content: headerContent.trim(), level: 0, startLine: 0 })
      }
      currentSection = { title: h2Match[1], content: '', level: 2, startLine: lineNumber }
    } else {
      if (currentSection) {
        currentSection.content += line + '\n'
      } else {
        headerContent += line + '\n'
      }
    }
    lineNumber++
  }

  if (currentSection) sections.push(currentSection)
  else if (headerContent.trim()) {
    sections.push({ title: '개요', content: headerContent.trim(), level: 0, startLine: 0 })
  }

  return sections
}

export default function NoteScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const noteId = parseInt(id as string)

  const [note, setNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<{ title: string; content: string; level: number; startLine: number }[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current
  const contentScrollRef = useRef<ScrollView>(null)
  const sectionRefs = useRef<Record<number, number>>({})

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

  const scrollToSection = (index: number) => {
    const yOffset = sectionRefs.current[index] || 0
    contentScrollRef.current?.scrollTo({ y: yOffset, animated: true })
    closeDrawer()
  }

  useEffect(() => {
    fetchNote()
  }, [])

  useEffect(() => {
    if (note?.organized_content) {
      const parsed = parseMarkdownSections(note.organized_content)
      setSections(parsed)
    }
  }, [note])

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

      {/* 목차 힌트 - 코넬식이 아닐 때만 */}
      {note.organize_method !== 'cornell' && (
        <TouchableOpacity style={styles.swipeHint} onPress={openDrawer}>
          <Text style={styles.swipeHintText}>☰ 탭해서 목차 보기</Text>
        </TouchableOpacity>
      )}

      {/* 코넬식 노트 레이아웃 - 캔버스 스타일 */}
      {note.organize_method === 'cornell' ? (() => {
        // 파싱 로직 - 새 형식 또는 기존 형식
        const content = note.organized_content || ''
        const isNewFormat = content.includes('===KEYWORDS===') || content.includes('===NOTES===')

        let keywords = ''
        let notes = ''
        let summary = ''
        let title = note.title

        if (isNewFormat) {
          // 새 형식: ===MARKER=== 사용
          const titleMatch = content.match(/===TITLE===\s*([\s\S]*?)(?====|$)/)
          if (titleMatch) title = titleMatch[1].trim()
          keywords = content.match(/===KEYWORDS===\s*([\s\S]*?)(?====|$)/)?.[1]?.trim() || ''
          notes = content.match(/===NOTES===\s*([\s\S]*?)(?====|$)/)?.[1]?.trim() || ''
          summary = content.match(/===SUMMARY===\s*([\s\S]*?)(?====|$)/)?.[1]?.trim() || ''
        } else {
          // 기존 형식: 노트 영역에 전체 내용 표시
          notes = content

          // 키워드: 헤딩(#, ##)에서 추출
          const headings = content.match(/^#{1,2}\s+(.+)$/gm)
          if (headings) {
            keywords = headings
              .map(h => h.replace(/^#+\s*/, '').trim())
              .map(k => `• ${k}`)
              .join('\n')
          }

          // 요약: 마지막 문단 또는 **요약** 섹션
          const summaryMatch = content.match(/(?:\*\*요약\*\*|##?\s*요약)[:\s]*([\s\S]*?)$/i)
          if (summaryMatch) {
            summary = summaryMatch[1].trim()
          }
        }

        return (
          <View style={cornellStyles.zoomContainer}>
            <ReactNativeZoomableView
              maxZoom={2.5}
              minZoom={0.4}
              initialZoom={0.5}
              bindToBorders={true}
              contentWidth={CANVAS_WIDTH}
              contentHeight={CANVAS_HEIGHT}
              panBoundaryPadding={50}
              style={cornellStyles.zoomView}
            >
              {/* 종이 전체가 노트 */}
              <View style={[cornellStyles.paper, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT }]}>
                {/* 줄 노트 라인 */}
                {[...Array(100)].map((_, i) => (
                  <View key={`line${i}`} style={[cornellStyles.noteLine, { top: 80 + i * 32 }]} />
                ))}

                {/* 제목 */}
                <View style={cornellStyles.titleRow}>
                  <Text style={cornellStyles.titleText}>{title}</Text>
                </View>

                {/* 키워드 영역 (왼쪽 여백) */}
                <View style={cornellStyles.keywordMargin}>
                  <Text style={cornellStyles.marginLabel}>키워드</Text>
                  <Text style={cornellStyles.keywordText}>{keywords}</Text>
                </View>

                {/* 메인 노트 내용 */}
                <View style={cornellStyles.noteContent}>
                  <Markdown style={cornellMarkdownStyles}>{notes}</Markdown>
                </View>

                {/* 요약 (하단) */}
                <View style={cornellStyles.summaryRow}>
                  <Text style={cornellStyles.marginLabel}>요약</Text>
                  <Text style={cornellStyles.summaryText}>{summary}</Text>
                </View>
              </View>
            </ReactNativeZoomableView>

            {/* 줌 안내 */}
            <View style={cornellStyles.zoomHint}>
              <Text style={cornellStyles.zoomHintText}>🔍 핀치로 확대/축소</Text>
            </View>
          </View>
        )
      })() : (
        /* 기본 레이아웃 */
        <ScrollView
          ref={contentScrollRef}
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((section, index) => {
            const style = getSectionStyle(section.title)
            return (
              <View
                key={index}
                style={styles.section}
                onLayout={(e) => {
                  sectionRefs.current[index] = e.nativeEvent.layout.y
                }}
              >
                <View style={[styles.sectionHeader, { borderLeftColor: style.color }]}>
                  <Text style={styles.sectionIcon}>{style.icon}</Text>
                  <Text style={[styles.sectionTitle, { color: style.color }]}>
                    {section.title}
                  </Text>
                </View>
                <View style={styles.sectionContent}>
                  <Markdown style={markdownStyles}>
                    {section.content.trim()}
                  </Markdown>
                </View>
              </View>
            )
          })}

          {/* 노트 정보 */}
          <View style={styles.info}>
            <Text style={styles.infoText}>
              생성일: {new Date(note.created_at).toLocaleString('ko-KR')}
            </Text>
            <Text style={styles.infoText}>정리 방식: {note.organize_method}</Text>
          </View>
        </ScrollView>
      )}

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
          {sections.map((section, index) => {
            const style = getSectionStyle(section.title)
            return (
              <TouchableOpacity
                key={index}
                style={[styles.drawerItem, { borderLeftColor: style.color }]}
                onPress={() => scrollToSection(index)}
              >
                <Text style={styles.drawerIcon}>{style.icon}</Text>
                <Text style={styles.drawerItemText} numberOfLines={2}>
                  {section.title}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </Animated.View>
    </View>
  )
}

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
  },
  heading3: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#1F2937',
  },
  bullet_list: {
    marginVertical: 8,
  },
  ordered_list: {
    marginVertical: 8,
  },
  list_item: {
    marginVertical: 4,
  },
  strong: {
    fontWeight: '700',
    color: '#1F2937',
  },
  em: {
    fontStyle: 'italic',
  },
  code_inline: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 14,
  },
  fence: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginVertical: 12,
    overflow: 'hidden',
  },
  thead: {
    backgroundColor: '#F9FAFB',
  },
  th: {
    padding: 10,
    fontWeight: '600',
  },
  td: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
})

// 코넬식 노트 스타일 - 종이 한 장
const cornellStyles = StyleSheet.create({
  zoomContainer: {
    flex: 1,
    backgroundColor: '#9CA3AF',
  },
  zoomView: {
    flex: 1,
  },
  paper: {
    backgroundColor: '#FFFEF8',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  noteLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#BFDBFE',
  },
  titleRow: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  titleText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E3A8A',
    textAlign: 'center',
  },
  keywordMargin: {
    position: 'absolute',
    left: 0,
    top: 80,
    width: '22%',
    borderRightWidth: 2,
    borderRightColor: '#EF4444',
    paddingHorizontal: 12,
    paddingTop: 8,
    zIndex: 10,
  },
  marginLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  keywordText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#1F2937',
  },
  noteContent: {
    marginLeft: '23%',
    paddingTop: 80,
    paddingHorizontal: 20,
    paddingBottom: 250,
    zIndex: 5,
  },
  summaryRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 2,
    borderTopColor: '#3B82F6',
    backgroundColor: 'rgba(239, 246, 255, 0.95)',
    padding: 16,
    minHeight: 120,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#374151',
    marginTop: 4,
  },
  zoomHint: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  zoomHintText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
})

const cornellMarkdownStyles = StyleSheet.create({
  body: {
    fontSize: 18,
    lineHeight: 30,
    color: '#374151',
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    color: '#1F2937',
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#1F2937',
  },
  bullet_list: {
    marginVertical: 8,
  },
  list_item: {
    marginVertical: 4,
  },
  strong: {
    fontWeight: '700',
    color: '#1F2937',
  },
  table: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginVertical: 12,
  },
  th: {
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
  },
  td: {
    padding: 12,
    fontSize: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
})

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
  swipeHint: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  swipeHintText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderLeftWidth: 4,
    backgroundColor: '#FAFAFA',
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  sectionContent: {
    padding: 16,
  },
  info: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  drawerItemText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
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
