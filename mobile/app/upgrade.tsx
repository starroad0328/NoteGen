/**
 * 플랜 업그레이드 화면
 */

import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../contexts/AuthContext'
import { authAPI, PlansResponse } from '../services/api'
import { iapService, PRODUCT_IDS, ProductInfo } from '../services/iap'

type BillingPeriod = 'monthly' | 'yearly'

export default function UpgradeScreen() {
  const router = useRouter()
  const { user, token, refreshUser } = useAuth()
  const [plansData, setPlansData] = useState<PlansResponse | null>(null)
  const [products, setProducts] = useState<ProductInfo[]>([])
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro'>('basic')
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly')
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)

  useEffect(() => {
    loadData()
    return () => {
      iapService.endConnection()
    }
  }, [])

  const loadData = async () => {
    try {
      // 플랜 정보 조회
      if (token) {
        const plans = await authAPI.getPlans(token)
        setPlansData(plans)
      }

      // IAP 상품 조회
      await iapService.initialize()
      const iapProducts = await iapService.getSubscriptions()
      setProducts(iapProducts)
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProductId = (): string => {
    if (selectedPlan === 'basic') {
      return billingPeriod === 'monthly'
        ? PRODUCT_IDS.BASIC_MONTHLY
        : PRODUCT_IDS.BASIC_YEARLY
    }
    return billingPeriod === 'monthly'
      ? PRODUCT_IDS.PRO_MONTHLY
      : PRODUCT_IDS.PRO_YEARLY
  }

  const getPrice = (): string => {
    const productId = getProductId()
    const product = products.find((p) => p.productId === productId)
    if (product) {
      return product.localizedPrice
    }
    // 기본 가격 표시
    const prices: Record<string, string> = {
      [PRODUCT_IDS.BASIC_MONTHLY]: '6,990원/월',
      [PRODUCT_IDS.BASIC_YEARLY]: '69,900원/년',
      [PRODUCT_IDS.PRO_MONTHLY]: '14,900원/월',
      [PRODUCT_IDS.PRO_YEARLY]: '149,000원/년',
    }
    return prices[productId] || ''
  }

  const handlePurchase = async () => {
    if (!token) {
      Alert.alert('로그인 필요', '결제하려면 로그인이 필요합니다.')
      return
    }

    setPurchasing(true)
    const productId = getProductId()

    try {
      await iapService.purchaseSubscription(
        productId,
        token,
        async (plan) => {
          // 성공
          setPurchasing(false)
          await refreshUser()
          Alert.alert(
            '구독 완료',
            `${plan.toUpperCase()} 플랜이 활성화되었습니다!`,
            [{ text: '확인', onPress: () => router.back() }]
          )
        },
        (error) => {
          // 실패
          setPurchasing(false)
          Alert.alert('결제 실패', error)
        }
      )
    } catch (error: any) {
      setPurchasing(false)
      Alert.alert('오류', error.message || '결제 처리 중 오류가 발생했습니다.')
    }
  }

  const handleRestore = async () => {
    if (!token) {
      Alert.alert('로그인 필요', '구매 복원하려면 로그인이 필요합니다.')
      return
    }

    setLoading(true)
    try {
      const result = await iapService.restorePurchases(token)
      if (result.restored) {
        await refreshUser()
        Alert.alert('복원 완료', `${result.plan.toUpperCase()} 플랜이 복원되었습니다.`)
      } else {
        Alert.alert('복원 실패', '복원할 구매 내역이 없습니다.')
      }
    } catch (error) {
      Alert.alert('오류', '구매 복원 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'} 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.title}>플랜 업그레이드</Text>
        </View>

        {/* 현재 플랜 */}
        {plansData && (
          <View style={styles.currentPlanCard}>
            <Text style={styles.currentPlanLabel}>현재 플랜</Text>
            <Text style={styles.currentPlanName}>
              {plansData.current_plan.toUpperCase()}
            </Text>
          </View>
        )}

        {/* 결제 주기 선택 */}
        <View style={styles.periodToggle}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              billingPeriod === 'monthly' && styles.periodButtonActive,
            ]}
            onPress={() => setBillingPeriod('monthly')}
          >
            <Text
              style={[
                styles.periodButtonText,
                billingPeriod === 'monthly' && styles.periodButtonTextActive,
              ]}
            >
              월간
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              billingPeriod === 'yearly' && styles.periodButtonActive,
            ]}
            onPress={() => setBillingPeriod('yearly')}
          >
            <Text
              style={[
                styles.periodButtonText,
                billingPeriod === 'yearly' && styles.periodButtonTextActive,
              ]}
            >
              연간 (17% 할인)
            </Text>
          </TouchableOpacity>
        </View>

        {/* 플랜 카드 */}
        <View style={styles.plansContainer}>
          {/* Basic 플랜 */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'basic' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('basic')}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Basic</Text>
              <Text style={styles.planPrice}>
                {billingPeriod === 'monthly' ? '6,990원/월' : '69,900원/년'}
              </Text>
            </View>
            <View style={styles.planFeatures}>
              <Text style={styles.feature}>월 100회 정리</Text>
              <Text style={styles.feature}>GPT-5 mini 모델</Text>
              <Text style={styles.feature}>단어 추출 + 예문 생성</Text>
              <Text style={styles.feature}>비교표 생성</Text>
            </View>
            {selectedPlan === 'basic' && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>선택됨</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Pro 플랜 */}
          <TouchableOpacity
            style={[
              styles.planCard,
              styles.planCardPro,
              selectedPlan === 'pro' && styles.planCardSelected,
            ]}
            onPress={() => setSelectedPlan('pro')}
          >
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>인기</Text>
            </View>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>Pro</Text>
              <Text style={styles.planPrice}>
                {billingPeriod === 'monthly' ? '14,900원/월' : '149,000원/년'}
              </Text>
            </View>
            <View style={styles.planFeatures}>
              <Text style={styles.feature}>무제한 정리</Text>
              <Text style={styles.feature}>GPT-5.2 모델 (최고급)</Text>
              <Text style={styles.feature}>시험형 문제 생성 (20개)</Text>
              <Text style={styles.feature}>출제자 관점 분석</Text>
              <Text style={styles.feature}>압축 노트 생성</Text>
            </View>
            {selectedPlan === 'pro' && (
              <View style={styles.selectedBadge}>
                <Text style={styles.selectedBadgeText}>선택됨</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* 구매 버튼 */}
        <TouchableOpacity
          style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              {getPrice()} 구독하기
            </Text>
          )}
        </TouchableOpacity>

        {/* 구매 복원 */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreButtonText}>구매 복원</Text>
        </TouchableOpacity>

        {/* 안내 문구 */}
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            구독은 Google Play를 통해 자동 갱신됩니다.{'\n'}
            언제든지 Google Play 설정에서 구독을 취소할 수 있습니다.
          </Text>
        </View>
      </View>
    </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  currentPlanCard: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentPlanLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  currentPlanName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#1F2937',
    fontWeight: '600',
  },
  plansContainer: {
    gap: 16,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  planCardPro: {
    borderColor: '#8B5CF6',
  },
  planCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
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
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3B82F6',
  },
  planFeatures: {
    gap: 8,
  },
  feature: {
    fontSize: 14,
    color: '#4B5563',
    paddingLeft: 16,
  },
  selectedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  purchaseButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
  notice: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 40,
  },
  noticeText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
})
