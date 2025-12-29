/**
 * MY 탭
 * 프로필 + 플랜 + 설정 + 테마 선택
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { authAPI, PlansResponse } from '../../services/api'

export default function MyTab() {
  const router = useRouter()
  const { user, token, loading: authLoading, logout } = useAuth()
  const { colors } = useTheme()
  const [plansData, setPlansData] = useState<PlansResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchPlans = async () => {
    if (!token) {
      setLoading(false)
      return
    }
    try {
      const data = await authAPI.getPlans(token)
      setPlansData(data)
    } catch (error) {
      console.error('플랜 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [token])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchPlans()
    setRefreshing(false)
  }, [token])

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout }
    ])
  }

  const handleUpgrade = () => {
    router.push('/upgrade')
  }

  if (authLoading || loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textLight }]}>로딩 중...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>👤</Text>
        <Text style={[styles.title, { color: colors.text }]}>로그인이 필요합니다</Text>
        <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>로그인</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const usage = plansData?.usage
  const usagePercent = usage && !usage.is_unlimited
    ? Math.min((usage.used / usage.limit) * 100, 100)
    : 0

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>MY</Text>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: colors.cardBg }]}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* 프로필 카드 */}
        <View style={[styles.profileCard, { backgroundColor: colors.cardBg }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{user.name || '이름 미설정'}</Text>
            <Text style={[styles.profileEmail, { color: colors.textLight }]}>{user.email}</Text>
            {user.grade_display && (
              <View style={[styles.gradeBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.gradeBadgeText}>{user.grade_display}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push('/profile-edit')}>
            <Text style={[styles.editText, { color: colors.primary }]}>편집</Text>
          </TouchableOpacity>
        </View>

        {/* 사용량 카드 */}
        <View style={[styles.usageCard, { backgroundColor: colors.cardBg }]}>
          <View style={styles.usageHeader}>
            <Text style={[styles.usageTitle, { color: colors.text }]}>이번 달 사용량</Text>
            <View style={[styles.planBadge, getPlanBadgeStyle(plansData?.current_plan, colors)]}>
              <Text style={styles.planBadgeText}>
                {plansData?.current_plan?.toUpperCase() || 'FREE'}
              </Text>
            </View>
          </View>

          {usage?.is_unlimited ? (
            <View style={styles.unlimitedContainer}>
              <Text style={[styles.unlimitedText, { color: colors.primary }]}>무제한</Text>
              <Text style={[styles.usageCount, { color: colors.textLight }]}>{usage.used}회 사용</Text>
            </View>
          ) : (
            <>
              <View style={styles.usageNumbers}>
                <Text style={[styles.usageUsed, { color: colors.text }]}>{usage?.used || 0}</Text>
                <Text style={[styles.usageSlash, { color: colors.textLight }]}>/</Text>
                <Text style={[styles.usageLimit, { color: colors.textLight }]}>{usage?.limit || 10}회</Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: colors.tabBarBorder }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${usagePercent}%`, backgroundColor: colors.primary },
                    usagePercent >= 80 && { backgroundColor: colors.accent },
                    usagePercent >= 100 && styles.progressBarDanger,
                  ]}
                />
              </View>
              <Text style={[styles.usageRemaining, { color: colors.textLight }]}>
                {usage?.remaining === 0 ? '이번 달 사용량 소진' : `${usage?.remaining || 10}회 남음`}
              </Text>
            </>
          )}
        </View>

        {/* 플랜 업그레이드 */}
        {plansData?.current_plan === 'free' && (
          <TouchableOpacity style={[styles.upgradeCard, { backgroundColor: colors.cardBg, borderColor: colors.tabBarBorder }]} onPress={handleUpgrade}>
            <View style={styles.upgradeInfo}>
              <Text style={[styles.upgradeTitle, { color: colors.primaryDark }]}>Basic으로 업그레이드</Text>
              <Text style={[styles.upgradeDesc, { color: colors.primary }]}>월 100회 + GPT-5 모델</Text>
            </View>
            <Text style={[styles.upgradePrice, { color: colors.primaryDark }]}>6,990/월</Text>
          </TouchableOpacity>
        )}

        {/* 로그아웃 */}
        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.cardBg }]} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textLight }]}>NotioClass v1.0.0</Text>
      </View>
    </ScrollView>
  )
}

function getPlanBadgeStyle(plan?: string, colors?: any) {
  switch (plan) {
    case 'pro': return { backgroundColor: '#8B5CF6' }
    case 'basic': return { backgroundColor: colors?.primary || '#C4956A' }
    default: return { backgroundColor: colors?.accent || '#E8B866' }
  }
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 22,
  },
  loadingText: {
    fontSize: 16,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    marginBottom: 24,
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

  // 프로필 카드
  profileCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    marginBottom: 6,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  gradeBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  editText: {
    fontSize: 14,
  },

  // 사용량 카드
  usageCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  planBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  usageNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  usageUsed: {
    fontSize: 32,
    fontWeight: '700',
  },
  usageSlash: {
    fontSize: 20,
    marginHorizontal: 4,
  },
  usageLimit: {
    fontSize: 16,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressBarDanger: {
    backgroundColor: '#EF4444',
  },
  usageRemaining: {
    fontSize: 13,
  },
  unlimitedContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  unlimitedText: {
    fontSize: 28,
    fontWeight: '700',
  },
  usageCount: {
    fontSize: 13,
    marginTop: 4,
  },

  // 업그레이드 카드
  upgradeCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  upgradeInfo: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  upgradeDesc: {
    fontSize: 13,
  },
  upgradePrice: {
    fontSize: 16,
    fontWeight: '700',
  },

  // 로그아웃
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 24,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 40,
  },
})
