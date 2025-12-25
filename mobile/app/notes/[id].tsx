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
import Markdown from 'react-native-markdown-display'
import * as Clipboard from 'expo-clipboard'
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view'
import { notesAPI, Note } from '../../services/api'
import {
  CornellCanvas,
  CornellNoteData,
  isCornellJson,
  parseLegacyCornell,
  convertLegacyToJson
} from '../../components/cornell'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
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

// 마크다운 테이블 형식 파싱 (기존 코넬식 노트용)
function parseMarkdownTable(content: string, title: string): CornellNoteData {
  const lines = content.split('\n')
  const cues: string[] = []
  const main: CornellNoteData['main'] = []
  let summaryText = ''

  for (const line of lines) {
    const trimmed = line.trim()

    // **요약**: 형식 추출
    if (trimmed.startsWith('**요약**') || trimmed.startsWith('**Summary**')) {
      const summaryMatch = trimmed.match(/\*\*요약\*\*[:\s]*(.+)/)
      if (summaryMatch) {
        summaryText = summaryMatch[1].trim()
      }
      continue
    }

    // 테이블 구분선 스킵
    if (trimmed.match(/^\|[-:\s|]+\|$/)) {
      continue
    }

    // 테이블 행 파싱
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim())
      if (cells.length >= 2 && cells[0]) {
        const keyword = cells[0]
        const description = cells[1] || ''

        // 헤더행 스킵
        if (keyword === '키워드' || keyword === '개념' || keyword === '질문' ||
            keyword === 'Keyword' || keyword === '핵심' || keyword.includes('---')) continue

        cues.push(keyword)
        main.push({ type: 'important', content: `${keyword}: ${description}` })
      }
      continue
    }

    // 제목
    if (trimmed.startsWith('## ')) {
      main.push({ type: 'heading', level: 2, content: trimmed.replace('## ', '') })
    } else if (trimmed.startsWith('# ')) {
      // 메인 제목은 스킵 (이미 title로 받음)
    }
  }

  return {
    title: title,
    cues: cues.length > 0 ? cues : ['내용 정리'],
    main: main.length > 0 ? main : [{ type: 'paragraph', content: content }],
    summary: summaryText || extractSummary(content)
  }
}

// 요약 추출 (마지막 문단 또는 **요약** 섹션)
function extractSummary(content: string): string {
  // **요약** 패턴 찾기
  const summaryMatch = content.match(/\*\*요약\*\*[:\s]*([\s\S]*?)(?:\n\n|$)/i)
  if (summaryMatch) {
    return summaryMatch[1].trim().split('\n')[0]
  }

  // ## 요약 섹션 찾기
  const sectionMatch = content.match(/##\s*요약[:\s]*([\s\S]*?)(?:\n##|$)/i)
  if (sectionMatch) {
    return sectionMatch[1].trim().split('\n')[0]
  }

  // 마지막 문단 반환
  const paragraphs = content.split('\n\n').filter(p => p.trim() && !p.startsWith('#') && !p.includes('|'))
  if (paragraphs.length > 0) {
    const last = paragraphs[paragraphs.length - 1].trim()
    if (last.length < 200) return last
  }

  return '핵심 내용을 정리한 노트입니다.'
}

// 코넬식 노트 렌더러 - JSON과 레거시 형식 모두 지원
function CornellNoteRenderer({
  content,
  title,
  date,
  subject
}: {
  content: string
  title: string
  date?: string
  subject?: string
}) {
  const cornellData = useMemo((): CornellNoteData | null => {
    // 1. JSON 형식 시도
    if (isCornellJson(content)) {
      try {
        return JSON.parse(content) as CornellNoteData
      } catch {
        // 파싱 실패시 다음 방법 시도
      }
    }

    // 2. 레거시 마커 형식 시도 (===TITLE===, ===KEYWORDS=== 등)
    const legacy = parseLegacyCornell(content)
    if (legacy) {
      return convertLegacyToJson(legacy)
    }

    // 3. 마크다운 테이블 형식 파싱 (| 키워드 | 설명 | 형태)
    if (content.includes('|') && content.includes('---')) {
      return parseMarkdownTable(content, title)
    }

    // 4. 일반 마크다운 → 간단 변환
    const lines = content.split('\n').filter(l => l.trim())
    const cues: string[] = []
    const main: CornellNoteData['main'] = []
    let summaryText = ''

    for (const line of lines) {
      if (line.startsWith('# ')) {
        // 제목은 스킵 (이미 title prop으로 받음)
      } else if (line.startsWith('## ')) {
        const heading = line.replace('## ', '')
        cues.push(heading)
        main.push({ type: 'heading', level: 2, content: heading })
      } else if (line.startsWith('### ')) {
        main.push({ type: 'heading', level: 3, content: line.replace('### ', '') })
      } else if (line.startsWith('- ')) {
        const lastBlock = main[main.length - 1]
        if (lastBlock?.type === 'bullet') {
          lastBlock.items.push(line.replace('- ', ''))
        } else {
          main.push({ type: 'bullet', items: [line.replace('- ', '')] })
        }
      } else if (line.includes('요약') && line.includes(':')) {
        summaryText = line.split(':').slice(1).join(':').trim()
      } else if (line.trim()) {
        main.push({ type: 'paragraph', content: line })
      }
    }

    return {
      title: title,
      cues: cues.length > 0 ? cues : ['내용 정리'],
      main: main.length > 0 ? main : [{ type: 'paragraph', content: content }],
      summary: summaryText || extractSummary(content)
    }
  }, [content, title])

  if (!cornellData) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>노트를 불러올 수 없습니다.</Text>
      </View>
    )
  }

  return (
    <CornellCanvas
      data={cornellData}
      date={date}
      subject={subject}
    />
  )
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

      {/* 코넬식 노트 레이아웃 - 새 캔버스 컴포넌트 */}
      {note.organize_method === 'cornell' ? (
        <CornellNoteRenderer
          content={note.organized_content || ''}
          title={note.title}
          date={new Date(note.created_at).toLocaleDateString('ko-KR')}
          subject={note.detected_subject}
        />
      ) : (
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
