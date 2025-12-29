/**
 * In-App Purchase Service
 * Google Play 인앱결제 처리
 *
 * 참고: Expo Go에서는 네이티브 모듈(react-native-iap)이 작동하지 않으므로
 * 개발 빌드(EAS Build) 시에만 실제 IAP가 활성화됩니다.
 * 현재는 mock 구현을 사용합니다.
 */

import { Platform, Alert } from 'react-native'
import Constants from 'expo-constants'

// Google Play 상품 ID
export const PRODUCT_IDS = {
  BASIC_MONTHLY: 'notioclass_basic_monthly',
  BASIC_YEARLY: 'notioclass_basic_yearly',
  PRO_MONTHLY: 'notioclass_pro_monthly',
  PRO_YEARLY: 'notioclass_pro_yearly',
}

// 구독 상품 ID 목록
export const SUBSCRIPTION_SKUS = [
  PRODUCT_IDS.BASIC_MONTHLY,
  PRODUCT_IDS.BASIC_YEARLY,
  PRODUCT_IDS.PRO_MONTHLY,
  PRODUCT_IDS.PRO_YEARLY,
]

// 상품 정보 타입
export interface ProductInfo {
  productId: string
  title: string
  description: string
  price: string
  localizedPrice: string
  currency: string
}

// Expo Go 여부 확인
const isExpoGo = Constants.appOwnership === 'expo'

// Mock 상품 데이터 (개발용)
const MOCK_PRODUCTS: ProductInfo[] = [
  {
    productId: PRODUCT_IDS.BASIC_MONTHLY,
    title: 'Basic 월간',
    description: '매월 20회 정리 가능',
    price: '4900',
    localizedPrice: '₩4,900',
    currency: 'KRW',
  },
  {
    productId: PRODUCT_IDS.BASIC_YEARLY,
    title: 'Basic 연간',
    description: '매월 20회 정리 가능 (2개월 무료)',
    price: '49000',
    localizedPrice: '₩49,000',
    currency: 'KRW',
  },
  {
    productId: PRODUCT_IDS.PRO_MONTHLY,
    title: 'Pro 월간',
    description: '무제한 정리',
    price: '9900',
    localizedPrice: '₩9,900',
    currency: 'KRW',
  },
  {
    productId: PRODUCT_IDS.PRO_YEARLY,
    title: 'Pro 연간',
    description: '무제한 정리 (2개월 무료)',
    price: '99000',
    localizedPrice: '₩99,000',
    currency: 'KRW',
  },
]

// IAP 서비스 클래스
class IAPService {
  private initialized = false

  /**
   * IAP 초기화
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true

    if (isExpoGo) {
      console.log('[IAP] Expo Go에서 실행 중 - Mock 모드 사용')
      this.initialized = true
      return true
    }

    // 개발 빌드에서만 실제 IAP 초기화
    try {
      if (Platform.OS !== 'android') {
        console.log('[IAP] iOS는 아직 지원되지 않습니다.')
        return false
      }

      // 실제 IAP 초기화는 개발 빌드에서 구현
      // const RNIap = require('react-native-iap')
      // await RNIap.initConnection()

      this.initialized = true
      console.log('[IAP] 초기화 완료')
      return true
    } catch (error) {
      console.error('[IAP] 초기화 실패:', error)
      return false
    }
  }

  /**
   * 연결 종료
   */
  async endConnection(): Promise<void> {
    this.initialized = false
  }

  /**
   * 구독 상품 목록 조회
   */
  async getSubscriptions(): Promise<ProductInfo[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (isExpoGo) {
      // Mock 데이터 반환
      return MOCK_PRODUCTS
    }

    // 실제 IAP에서 상품 조회 (개발 빌드용)
    return MOCK_PRODUCTS
  }

  /**
   * 구독 구매
   */
  async purchaseSubscription(
    productId: string,
    token: string,
    onSuccess: (plan: string) => void,
    onError: (error: string) => void
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (isExpoGo) {
      // Mock 구매 - 개발용 테스트
      Alert.alert(
        '개발 모드',
        '실제 결제는 앱 빌드 후 사용 가능합니다.\n\n테스트로 구매 성공 처리하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '테스트 구매',
            onPress: () => {
              const plan = productId.includes('pro') ? 'pro' : 'basic'
              onSuccess(plan)
            },
          },
        ]
      )
      return
    }

    // 실제 IAP 구매 (개발 빌드용)
    onError('개발 빌드가 필요합니다.')
  }

  /**
   * 구매 복원
   */
  async restorePurchases(token: string): Promise<{ restored: boolean; plan: string }> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (isExpoGo) {
      // Mock - 복원할 구매 없음
      return { restored: false, plan: 'free' }
    }

    return { restored: false, plan: 'free' }
  }

  /**
   * 현재 구독 상태 확인
   */
  async checkSubscriptionStatus(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize()
    }

    if (isExpoGo) {
      return false
    }

    return false
  }
}

// 싱글톤 인스턴스
export const iapService = new IAPService()
