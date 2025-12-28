/**
 * MY 탭
 * 프로필 + 플랜 + 설정 통합
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { authAPI, PlansResponse } from '../../services/api'

export default function MyTab() {
  const router = useRouter()
  const { user, token, loading: authLoading, logout } = useAuth()
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

  const handleUpgrade = (planId: string) => {
    Alert.alert('업그레이드', '결제 시스템은 준비 중입니다.\n곧 출시 예정이에요!', [{ text: '확인' }])
  }

  if (authLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emoji}>👤</Text>
        <Text style={styles.title}>로그인이 필요합니다</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
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
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MY</Text>
        </View>

        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user.name || '이름 미설정'}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            {user.grade_display && (
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeBadgeText}>{user.grade_display}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push('/profile-edit')}>
            <Text style={styles.editText}>편집</Text>
          </TouchableOpacity>
        </View>

        {/* 사용량 카드 */}
        <View style={styles.usageCard}>
          <View style={styles.usageHeader}>
            <Text style={styles.usageTitle}>이번 달 사용량</Text>
            <View style={[styles.planBadge, getPlanBadgeStyle(plansData?.current_plan)]}>
              <Text style={styles.planBadgeText}>
                {plansData?.current_plan?.toUpperCase() || 'FREE'}
              </Text>
            </View>
          </View>

          {usage?.is_unlimited ? (
            <View style={styles.unlimitedContainer}>
              <Text style={styles.unlimitedText}>무제한</Text>
              <Text style={styles.usageCount}>{usage.used}회 사용</Text>
            </View>
          ) : (
            <>
              <View style={styles.usageNumbers}>
                <Text style={styles.usageUsed}>{usage?.used || 0}</Text>
                <Text style={styles.usageSlash}>/</Text>
                <Text style={styles.usageLimit}>{usage?.limit || 10}회</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${usagePercent}%` },
                    usagePercent >= 80 && styles.progressBarWarning,
                    usagePercent >= 100 && styles.progressBarDanger,
                  ]}
                />
              </View>
              <Text style={styles.usageRemaining}>
                {usage?.remaining === 0 ? '이번 달 사용량 소진' : `${usage?.remaining || 10}회 남음`}
              </Text>
            </>
          )}
        </View>

        {/* 플랜 업그레이드 */}
        {plansData?.current_plan === 'free' && (
          <TouchableOpacity style={styles.upgradeCard} onPress={() => handleUpgrade('basic')}>
            <View style={styles.upgradeInfo}>
              <Text style={styles.upgradeTitle}>Basic으로 업그레이드</Text>
              <Text style={styles.upgradeDesc}>월 100회 + GPT-5 모델</Text>
            </View>
            <Text style={styles.upgradePrice}>6,990/월</Text>
          </TouchableOpacity>
        )}

        {/* 메뉴 */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>설정</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/profile-edit')}>
            <Text style={styles.menuIcon}>👤</Text>
            <Text style={styles.menuText}>프로필 수정</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => handleUpgrade('pro')}>
            <Text style={styles.menuIcon}>💎</Text>
            <Text style={styles.menuText}>플랜 관리</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>🔔</Text>
            <Text style={styles.menuText}>알림 설정</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>지원</Text>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>❓</Text>
            <Text style={styles.menuText}>도움말</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuIcon}>💬</Text>
            <Text style={styles.menuText}>피드백 보내기</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </TouchableOpacity>

        <Text style={styles.version}>NoteGen v1.0.0</Text>
      </View>
    </ScrollView>
  )
}

function getPlanBadgeStyle(plan?: string) {
  switch (plan) {
    case 'pro': return { backgroundColor: '#8B5CF6' }
    case 'basic': return { backgroundColor: '#3B82F6' }
    default: return { backgroundColor: '#10B981' }
  }
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
    padding: 40,
  },
  content: {
    padding: 20,
  },
  header: {
    paddingTop: 40,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    color: '#333',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#3B82F6',
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
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
    color: '#888',
    marginBottom: 6,
  },
  gradeBadge: {
    backgroundColor: '#10B981',
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
    color: '#3B82F6',
    fontSize: 14,
  },

  // 사용량 카드
  usageCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    color: '#999',
    marginHorizontal: 4,
  },
  usageLimit: {
    fontSize: 16,
    color: '#666',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressBarWarning: {
    backgroundColor: '#F59E0B',
  },
  progressBarDanger: {
    backgroundColor: '#EF4444',
  },
  usageRemaining: {
    fontSize: 13,
    color: '#666',
  },
  unlimitedContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  unlimitedText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  usageCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },

  // 업그레이드 카드
  upgradeCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  upgradeInfo: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4338CA',
    marginBottom: 2,
  },
  upgradeDesc: {
    fontSize: 13,
    color: '#6366F1',
  },
  upgradePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4338CA',
  },

  // 메뉴
  menuSection: {
    marginBottom: 24,
  },
  menuSectionTitle: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  menuItem: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  menuArrow: {
    fontSize: 18,
    color: '#CCC',
  },

  // 로그아웃
  logoutButton: {
    backgroundColor: 'white',
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
    color: '#AAA',
    fontSize: 12,
    marginBottom: 40,
  },
})
