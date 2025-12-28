/**
 * In-App Purchase Service
 * Google Play 인앱결제 처리
 */

import { Platform } from 'react-native'
import * as RNIap from 'react-native-iap'
import { paymentAPI } from './api'

// Google Play 상품 ID
export const PRODUCT_IDS = {
  BASIC_MONTHLY: 'notegen_basic_monthly',
  BASIC_YEARLY: 'notegen_basic_yearly',
  PRO_MONTHLY: 'notegen_pro_monthly',
  PRO_YEARLY: 'notegen_pro_yearly',
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

// IAP 서비스 클래스
class IAPService {
  private initialized = false
  private purchaseUpdateSubscription: any = null
  private purchaseErrorSubscription: any = null

  /**
   * IAP 초기화
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true

    try {
      // Android만 지원 (iOS는 추후 추가)
      if (Platform.OS !== 'android') {
        console.log('[IAP] iOS는 아직 지원되지 않습니다.')
        return false
      }

      await RNIap.initConnection()
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
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove()
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove()
    }
    await RNIap.endConnection()
    this.initialized = false
  }

  /**
   * 구독 상품 목록 조회
   */
  async getSubscriptions(): Promise<ProductInfo[]> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const subscriptions = await RNIap.getSubscriptions({ skus: SUBSCRIPTION_SKUS })

      return subscriptions.map((sub) => ({
        productId: sub.productId,
        title: sub.title,
        description: sub.description,
        price: sub.price || '0',
        localizedPrice: sub.localizedPrice || sub.price || '0',
        currency: sub.currency || 'KRW',
      }))
    } catch (error) {
      console.error('[IAP] 상품 조회 실패:', error)
      return []
    }
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

    try {
      // 구매 리스너 설정
      this.purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
        async (purchase) => {
          console.log('[IAP] 구매 업데이트:', purchase)

          const receipt = purchase.transactionReceipt
          if (receipt) {
            try {
              // 백엔드에서 구매 검증
              const result = await paymentAPI.verifyPurchase(
                token,
                purchase.purchaseToken || receipt,
                purchase.productId
              )

              if (result.success) {
                // 구매 확인 (Google Play에 알림)
                await RNIap.finishTransaction({ purchase, isConsumable: false })
                onSuccess(result.new_plan || 'basic')
              } else {
                onError(result.message)
              }
            } catch (error: any) {
              console.error('[IAP] 검증 실패:', error)
              onError(error.message || '결제 검증에 실패했습니다.')
            }
          }
        }
      )

      this.purchaseErrorSubscription = RNIap.purchaseErrorListener((error) => {
        console.error('[IAP] 구매 에러:', error)
        if (error.code !== 'E_USER_CANCELLED') {
          onError(error.message || '결제 중 오류가 발생했습니다.')
        }
      })

      // 구독 구매 시작
      await RNIap.requestSubscription({
        sku: productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      })
    } catch (error: any) {
      console.error('[IAP] 구매 시작 실패:', error)
      onError(error.message || '결제를 시작할 수 없습니다.')
    }
  }

  /**
   * 구매 복원
   */
  async restorePurchases(token: string): Promise<{ restored: boolean; plan: string }> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      // Google Play에서 구매 내역 조회
      const purchases = await RNIap.getAvailablePurchases()
      console.log('[IAP] 구매 내역:', purchases)

      if (purchases.length > 0) {
        // 가장 최근 구독 검증
        const latestPurchase = purchases[purchases.length - 1]
        const result = await paymentAPI.verifyPurchase(
          token,
          latestPurchase.purchaseToken || latestPurchase.transactionReceipt,
          latestPurchase.productId
        )

        if (result.success) {
          return { restored: true, plan: result.new_plan || 'basic' }
        }
      }

      // 서버에서 복원 시도
      return await paymentAPI.restorePurchases(token)
    } catch (error) {
      console.error('[IAP] 복원 실패:', error)
      return { restored: false, plan: 'free' }
    }
  }

  /**
   * 현재 구독 상태 확인
   */
  async checkSubscriptionStatus(): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize()
    }

    try {
      const purchases = await RNIap.getAvailablePurchases()
      return purchases.some((p) => SUBSCRIPTION_SKUS.includes(p.productId))
    } catch (error) {
      console.error('[IAP] 구독 상태 확인 실패:', error)
      return false
    }
  }
}

// 싱글톤 인스턴스
export const iapService = new IAPService()
