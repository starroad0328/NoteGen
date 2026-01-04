/**
 * 정리법샵 화면
 * 정리법 템플릿 목록 및 선택
 */

import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { templatesAPI, OrganizeTemplate } from '../services/api'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

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
  const params = useLocalSearchParams()
  const { colors } = useTheme()
  const { user } = useAuth()

  const [templates, setTemplates] = useState<OrganizeTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popular' | 'newest'>('popular')

  // 현재 선택된 템플릿 ID (업로드에서 넘어온 경우)
  const currentTemplateId = params.current ? parseInt(params.current as string) : null

  useEffect(() => {
    loadTemplates()
  }, [selectedSubject, sortBy])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const subject = selectedSubject === 'all' ? undefined : selectedSubject
      const result = await templatesAPI.list(subject, undefined, sortBy)
      setTemplates(result.templates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectTemplate = (template: OrganizeTemplate) => {
    // 플랜 체크
    const userPlan = user?.plan || 'free'
    const planOrder = ['free', 'basic', 'pro']
    const userPlanIndex = planOrder.indexOf(userPlan)
    const requiredPlanIndex = planOrder.indexOf(template.required_plan)

    if (requiredPlanIndex > userPlanIndex) {
      // 플랜 부족
      router.push('/(tabs)/my')
      return
    }

    // 선택하고 돌아가기
    router.back()
    // 선택한 템플릿 정보를 전달하기 위해 params 사용
    router.setParams({ selectedTemplateId: template.id.toString() })
  }

  const canUseTemplate = (template: OrganizeTemplate) => {
    const userPlan = user?.plan || 'free'
    const planOrder = ['free', 'basic', 'pro']
    const userPlanIndex = planOrder.indexOf(userPlan)
    const requiredPlanIndex = planOrder.indexOf(template.required_plan)
    return requiredPlanIndex <= userPlanIndex
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={[styles.header, { backgroundColor: colors.cardBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>정리법 선택</Text>
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
            <Text style={[styles.sortText, sortBy === 'popular' && { color: 'white' }]}>인기순</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'newest' && { backgroundColor: colors.primary }]}
            onPress={() => setSortBy('newest')}
          >
            <Text style={[styles.sortText, sortBy === 'newest' && { color: 'white' }]}>최신순</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 템플릿 목록 */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView style={styles.list}>
          {templates.map((template) => {
            const isSelected = template.id === currentTemplateId
            const canUse = canUseTemplate(template)

            return (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.tabBarBorder },
                  isSelected && { borderColor: colors.primary, borderWidth: 2 },
                  !canUse && styles.templateCardDisabled
                ]}
                onPress={() => selectTemplate(template)}
                disabled={!canUse}
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
                  <Text style={[styles.templateDesc, { color: colors.textLight }]}>
                    {template.description}
                  </Text>
                )}
                <View style={styles.templateFooter}>
                  <Text style={[styles.usageCount, { color: colors.textLight }]}>
                    {template.usage_count}회 사용됨
                  </Text>
                  {isSelected && (
                    <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.selectedBadgeText}>현재 선택</Text>
                    </View>
                  )}
                  {!canUse && (
                    <Text style={[styles.upgradeText, { color: colors.accent }]}>
                      {PLAN_LABELS[template.required_plan]} 필요
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
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
  templateCardDisabled: {
    opacity: 0.5,
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
    marginTop: 12,
  },
  usageCount: {
    fontSize: 12,
    flex: 1,
  },
  selectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  upgradeText: {
    fontSize: 12,
    fontWeight: '600',
  },
})
