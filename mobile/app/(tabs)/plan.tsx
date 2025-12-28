/**
 * 플랜 탭
 * 사용량 및 요금제 관리
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'
import { authAPI, PlansResponse, PlanInfo } from '../../services/api'

export default function PlanTab() {
  const router = useRouter()
  const { user, token, loading: authLoading } = useAuth()

  const [plansData, setPlansData] = useState<PlansResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchPlans = async () => {
    if (!token) return
    try {
      const data = await authAPI.getPlans(token)
      setPlansData(data)
    } catch (error: any) {
      console.error('플랜 조회 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchPlans()
    } else {
      setLoading(false)
    }
  }, [token])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchPlans()
    setRefreshing(false)
  }, [token])

  const handleUpgrade = (planId: string) => {
    Alert.alert(
      '업그레이드',
      '결제 시스템은 준비 중입니다.\n곧 출시 예정이에요!',
      [{ text: '확인' }]
    )
  }

  if (authLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    )
  }

  if (!user || !token) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emoji}>💎</Text>
        <Text style={styles.title}>로그인이 필요합니다</Text>
        <Text style={styles.subtitle}>플랜 정보를 확인하려면 로그인하세요</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>로그인</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const usage = plansData?.usage
  const plans = plansData?.plans || []
  const usagePercent = usage && !usage.is_unlimited
    ? Math.min((usage.used / usage.limit) * 100, 100)
    : 0

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>플랜</Text>
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
                {usage?.remaining === 0
                  ? '이번 달 사용량을 모두 소진했어요'
                  : `${usage?.remaining || 10}회 남음`}
              </Text>
            </>
          )}
        </View>

        {/* 플랜 목록 */}
        <Text style={styles.sectionTitle}>요금제 비교</Text>

        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onUpgrade={() => handleUpgrade(plan.id)}
          />
        ))}

        {/* 하단 여백 */}
        <View style={{ height: 40 }} />
      </View>
    </ScrollView>
  )
}

function PlanCard({ plan, onUpgrade }: { plan: PlanInfo; onUpgrade: () => void }) {
  const isCurrentPlan = plan.is_current
  const isPro = plan.id === 'pro'

  return (
    <View style={[
      styles.planCard,
      isCurrentPlan && styles.planCardCurrent,
      isPro && styles.planCardPro,
    ]}>
      {isPro && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>BEST</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <Text style={[styles.planName, isPro && styles.planNamePro]}>
          {plan.name}
        </Text>
        <View style={styles.planPriceContainer}>
          {plan.price === 0 ? (
            <Text style={styles.planPrice}>무료</Text>
          ) : (
            <>
              <Text style={styles.planPrice}>{plan.price.toLocaleString()}</Text>
              <Text style={styles.planPriceUnit}>원/월</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.planFeatures}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>

      {isCurrentPlan ? (
        <View style={styles.currentPlanButton}>
          <Text style={styles.currentPlanButtonText}>현재 플랜</Text>
        </View>
      ) : (
        <TouchableOpacity style={[
          styles.upgradeButton,
          isPro && styles.upgradeButtonPro,
        ]} onPress={onUpgrade}>
          <Text style={[
            styles.upgradeButtonText,
            isPro && styles.upgradeButtonTextPro,
          ]}>
            {plan.price === 0 ? '다운그레이드' : '업그레이드'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function getPlanBadgeStyle(plan?: string) {
  switch (plan) {
    case 'pro':
      return { backgroundColor: '#8B5CF6' }
    case 'basic':
      return { backgroundColor: '#3B82F6' }
    default:
      return { backgroundColor: '#10B981' }
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
    marginBottom: 24,
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
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
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

  // 사용량 카드
  usageCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
    color: '#333',
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  usageNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  usageUsed: {
    fontSize: 36,
    fontWeight: '700',
    color: '#333',
  },
  usageSlash: {
    fontSize: 24,
    color: '#999',
    marginHorizontal: 4,
  },
  usageLimit: {
    fontSize: 18,
    color: '#666',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressBarWarning: {
    backgroundColor: '#F59E0B',
  },
  progressBarDanger: {
    backgroundColor: '#EF4444',
  },
  usageRemaining: {
    fontSize: 14,
    color: '#666',
  },
  unlimitedContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  unlimitedText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  usageCount: {
    fontSize: 14,
    color: '#666',
  },

  // 플랜 섹션
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },

  // 플랜 카드
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  planCardCurrent: {
    borderColor: '#3B82F6',
  },
  planCardPro: {
    borderColor: '#8B5CF6',
    backgroundColor: '#FAFAFF',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
  },
  planNamePro: {
    color: '#8B5CF6',
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  planPriceUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 2,
  },
  planFeatures: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureCheck: {
    fontSize: 14,
    color: '#10B981',
    marginRight: 8,
    fontWeight: '600',
  },
  featureText: {
    fontSize: 14,
    color: '#555',
  },
  currentPlanButton: {
    backgroundColor: '#F3F4F6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentPlanButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  upgradeButton: {
    backgroundColor: '#3B82F6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonPro: {
    backgroundColor: '#8B5CF6',
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  upgradeButtonTextPro: {
    color: 'white',
  },
})
