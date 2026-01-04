/**
 * 정리법샵 화면
 * 정리법 템플릿 목록 및 구독
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { templatesAPI, OrganizeTemplate, TemplateDetailResponse } from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  pro: 'Pro',
}

const PLAN_COLORS: Record<string, string> = {
  free: '#22C55E',
  basic: '#3B82F6',
  pro: '#F59E0B',
}

const SUBJECT_NAMES: Record<string, string> = {
  all: '전체',
  math: '수학',
  english: '영어',
  korean: '국어',
  science: '과학',
  social: '사회',
  history: '역사',
}

export default function TemplatesScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const { user, token } = useAuth()

  const [templates, setTemplates] = useState<OrganizeTemplate[]>([])
  const [subscribedIds, setSubscribedIds] = useState<Set<number>>(new Set())
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular')

  // 모달 상태
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetailResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [selectedSubject, sortBy, token])
  )

  const loadData = async () => {
    setLoading(true)
    try {
      const subject = selectedSubject === 'all' ? undefined : selectedSubject
      const [templatesResult, subscribedResult, likedResult] = await Promise.all([
        templatesAPI.list(subject, undefined, sortBy),
        token ? templatesAPI.getSubscribed(token) : Promise.resolve({ templates: [], total: 0 }),
        token ? templatesAPI.getLikedIds(token) : Promise.resolve({ liked_ids: [] })
      ])
      setTemplates(templatesResult.templates)
      setSubscribedIds(new Set(subscribedResult.templates.map(t => t.id)))
      setLikedIds(new Set(likedResult.liked_ids))
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const openTemplateDetail = async (template: OrganizeTemplate) => {
    setLoadingDetail(true)
    setModalVisible(true)
    try {
      const detail = await templatesAPI.get(template.id)
      setSelectedTemplate(detail)
    } catch (error) {
      console.error('Failed to load template detail:', error)
      Alert.alert('오류', '정리법 상세 정보를 불러오지 못했습니다.')
      setModalVisible(false)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleLike = async (template: OrganizeTemplate) => {
    if (!token) {
      Alert.alert('로그인 필요', '좋아요를 누르려면 로그인이 필요합니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/login') }
      ])
      return
    }

    try {
      const isLiked = likedIds.has(template.id)
      if (isLiked) {
        const result = await templatesAPI.unlike(token, template.id)
        setLikedIds(prev => {
          const next = new Set(prev)
          next.delete(template.id)
          return next
        })
        // 템플릿 목록에서 좋아요 수 업데이트
        setTemplates(prev => prev.map(t =>
          t.id === template.id ? { ...t, like_count: result.like_count } : t
        ))
        if (selectedTemplate?.id === template.id) {
          setSelectedTemplate(prev => prev ? { ...prev, like_count: result.like_count } : prev)
        }
      } else {
        const result = await templatesAPI.like(token, template.id)
        setLikedIds(prev => new Set(prev).add(template.id))
        setTemplates(prev => prev.map(t =>
          t.id === template.id ? { ...t, like_count: result.like_count } : t
        ))
        if (selectedTemplate?.id === template.id) {
          setSelectedTemplate(prev => prev ? { ...prev, like_count: result.like_count } : prev)
        }
      }
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.detail || '처리 중 오류가 발생했습니다.')
    }
  }

  const canUseTemplate = (template: OrganizeTemplate) => {
    const userPlan = user?.plan || 'free'
    const planOrder = ['free', 'basic', 'pro']
    const userPlanIndex = planOrder.indexOf(userPlan)
    const requiredPlanIndex = planOrder.indexOf(template.required_plan)
    return requiredPlanIndex <= userPlanIndex
  }

  const handleSubscribe = async (template: OrganizeTemplate) => {
    if (!token) {
      Alert.alert('로그인 필요', '정리법을 구독하려면 로그인이 필요합니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/login') }
      ])
      return
    }

    if (!canUseTemplate(template)) {
      Alert.alert('플랜 업그레이드 필요', `이 정리법은 ${PLAN_LABELS[template.required_plan]} 플랜이 필요합니다.`, [
        { text: '취소', style: 'cancel' },
        { text: '플랜 보기', onPress: () => router.push('/(tabs)/my') }
      ])
      return
    }

    try {
      const isSubscribed = subscribedIds.has(template.id)
      if (isSubscribed) {
        await templatesAPI.unsubscribe(token, template.id)
        setSubscribedIds(prev => {
          const next = new Set(prev)
          next.delete(template.id)
          return next
        })
      } else {
        await templatesAPI.subscribe(token, template.id)
        setSubscribedIds(prev => new Set(prev).add(template.id))
      }
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.detail || '처리 중 오류가 발생했습니다.')
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.cardBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.text }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>정리법샵</Text>
        <View style={styles.headerRight} />
      </View>

      {/* 필터 */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectFilter}>
          {Object.entries(SUBJECT_NAMES).map(([key, name]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterChip,
                { borderColor: colors.tabBarBorder },
                selectedSubject === key && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setSelectedSubject(key)}
            >
              <Text style={[
                styles.filterChipText,
                { color: colors.text },
                selectedSubject === key && { color: 'white' }
              ]}>
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'popular' && { backgroundColor: colors.primary }]}
            onPress={() => setSortBy('popular')}
          >
            <Text style={[styles.sortText, { color: colors.textLight }, sortBy === 'popular' && { color: 'white' }]}>인기순</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'newest' && { backgroundColor: colors.primary }]}
            onPress={() => setSortBy('newest')}
          >
            <Text style={[styles.sortText, { color: colors.textLight }, sortBy === 'newest' && { color: 'white' }]}>최신순</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 템플릿 목록 */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView style={styles.list}>
          {templates.map((template) => {
            const isSubscribed = subscribedIds.has(template.id)
            const isLiked = likedIds.has(template.id)
            const canUse = canUseTemplate(template)

            return (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.tabBarBorder },
                  isSubscribed && { borderColor: colors.primary, borderWidth: 2 }
                ]}
                onPress={() => openTemplateDetail(template)}
                activeOpacity={0.7}
              >
                <View style={styles.templateHeader}>
                  <Text style={styles.templateIcon}>{template.icon}</Text>
                  <View style={styles.templateInfo}>
                    <Text style={[styles.templateName, { color: colors.text }]}>{template.name}</Text>
                    {template.subject && (
                      <Text style={[styles.templateSubject, { color: colors.textLight }]}>
                        {SUBJECT_NAMES[template.subject] || template.subject}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.planBadge, { backgroundColor: PLAN_COLORS[template.required_plan] }]}>
                    <Text style={styles.planBadgeText}>{PLAN_LABELS[template.required_plan]}</Text>
                  </View>
                </View>
                {template.description && (
                  <Text style={[styles.templateDesc, { color: colors.textLight }]} numberOfLines={2}>
                    {template.description}
                  </Text>
                )}
                <View style={styles.templateFooter}>
                  <View style={styles.statsRow}>
                    <Text style={[styles.usageCount, { color: colors.textLight }]}>
                      {template.usage_count}회 사용
                    </Text>
                    <TouchableOpacity
                      style={styles.likeButton}
                      onPress={() => handleLike(template)}
                    >
                      <Text style={styles.likeIcon}>{isLiked ? '❤️' : '🤍'}</Text>
                      <Text style={[styles.likeCount, { color: colors.textLight }]}>{template.like_count}</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.subscribeButton,
                      isSubscribed
                        ? { backgroundColor: colors.textLight }
                        : canUse
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.textLight }
                    ]}
                    onPress={() => handleSubscribe(template)}
                  >
                    <Text style={styles.subscribeButtonText}>
                      {isSubscribed ? '구독 중' : canUse ? '구독' : '잠금'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      {/* 상세 모달 */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            {/* 모달 헤더 */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.tabBarBorder }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
                <Text style={[styles.modalCloseText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>정리법 상세</Text>
              <View style={styles.modalCloseButton} />
            </View>

            {loadingDetail ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.modalLoader} />
            ) : selectedTemplate ? (
              <ScrollView style={styles.modalBody}>
                {/* 아이콘 & 이름 */}
                <View style={styles.modalTemplateHeader}>
                  <Text style={styles.modalTemplateIcon}>{selectedTemplate.icon}</Text>
                  <View style={styles.modalTemplateInfo}>
                    <Text style={[styles.modalTemplateName, { color: colors.text }]}>{selectedTemplate.name}</Text>
                    <View style={styles.modalBadgeRow}>
                      <View style={[styles.planBadge, { backgroundColor: PLAN_COLORS[selectedTemplate.required_plan] }]}>
                        <Text style={styles.planBadgeText}>{PLAN_LABELS[selectedTemplate.required_plan]}</Text>
                      </View>
                      {selectedTemplate.subject && (
                        <Text style={[styles.modalSubject, { color: colors.textLight }]}>
                          {SUBJECT_NAMES[selectedTemplate.subject] || selectedTemplate.subject}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* 통계 & 좋아요 */}
                <View style={[styles.modalStats, { backgroundColor: colors.cardBg }]}>
                  <View style={styles.modalStatItem}>
                    <Text style={styles.modalStatIcon}>📊</Text>
                    <Text style={[styles.modalStatText, { color: colors.text }]}>{selectedTemplate.usage_count}회 사용</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.modalStatItem}
                    onPress={() => handleLike(selectedTemplate)}
                  >
                    <Text style={styles.modalStatIcon}>{likedIds.has(selectedTemplate.id) ? '❤️' : '🤍'}</Text>
                    <Text style={[styles.modalStatText, { color: colors.text }]}>{selectedTemplate.like_count}개</Text>
                  </TouchableOpacity>
                </View>

                {/* 설명 */}
                {selectedTemplate.description && (
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: colors.text }]}>설명</Text>
                    <Text style={[styles.modalSectionContent, { color: colors.textLight }]}>
                      {selectedTemplate.description}
                    </Text>
                  </View>
                )}

                {/* 프롬프트 */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>프롬프트</Text>
                  <View style={[styles.promptBox, { backgroundColor: colors.cardBg }]}>
                    <Text style={[styles.promptText, { color: colors.text }]}>
                      {selectedTemplate.prompt}
                    </Text>
                  </View>
                </View>

                {/* 구독 버튼 */}
                <TouchableOpacity
                  style={[
                    styles.modalSubscribeButton,
                    subscribedIds.has(selectedTemplate.id)
                      ? { backgroundColor: colors.textLight }
                      : canUseTemplate(selectedTemplate)
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: colors.textLight }
                  ]}
                  onPress={() => handleSubscribe(selectedTemplate)}
                >
                  <Text style={styles.modalSubscribeButtonText}>
                    {subscribedIds.has(selectedTemplate.id)
                      ? '구독 해제'
                      : canUseTemplate(selectedTemplate)
                        ? '이 정리법 구독하기'
                        : `${PLAN_LABELS[selectedTemplate.required_plan]} 플랜 필요`}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  subjectFilter: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  sortText: {
    fontSize: 13,
  },
  loader: {
    marginTop: 40,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  templateCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
  },
  templateSubject: {
    fontSize: 12,
    marginTop: 2,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  templateDesc: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  templateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usageCount: {
    fontSize: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeIcon: {
    fontSize: 14,
  },
  likeCount: {
    fontSize: 12,
  },
  subscribeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  subscribeButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },

  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalLoader: {
    marginTop: 60,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  modalTemplateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTemplateIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  modalTemplateInfo: {
    flex: 1,
  },
  modalTemplateName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalSubject: {
    fontSize: 13,
  },
  modalStats: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalStatIcon: {
    fontSize: 18,
  },
  modalStatText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  promptBox: {
    borderRadius: 12,
    padding: 16,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  modalSubscribeButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  modalSubscribeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
})
