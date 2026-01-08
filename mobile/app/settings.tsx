/**
 * 설정 화면
 * 앱 설정, 필기 정리 설정, 플랜 관리
 */

import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import * as SecureStore from 'expo-secure-store'
import { useTheme, ThemeType, THEMES, THEME_NAMES } from '../contexts/ThemeContext'
import { authAPI, AIMode } from '../services/api'

export default function SettingsScreen() {
  const router = useRouter()
  const { theme, colors, setTheme } = useTheme()
  const [aiMode, setAiMode] = useState<AIMode>('fast')
  const [loading, setLoading] = useState(false)
  const [userPlan, setUserPlan] = useState<string>('free')

  useEffect(() => {
    loadAIMode()
  }, [])

  const loadAIMode = async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token')
      if (token) {
        const user = await authAPI.getMe(token)
        setAiMode(user.ai_mode || 'fast')
        setUserPlan(user.plan)
      }
    } catch (error) {
      console.error('AI 모드 로드 실패:', error)
    }
  }

  const updateAIMode = async (mode: AIMode) => {
    if (loading) return
    setLoading(true)
    try {
      const token = await SecureStore.getItemAsync('auth_token')
      if (token) {
        await authAPI.updateAIMode(token, mode)
        setAiMode(mode)
      }
    } catch (error) {
      console.error('AI 모드 변경 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: colors.primary }]}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>설정</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* 앱 설정 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>앱 설정</Text>

          {/* 테마 */}
          <View style={styles.themeSelector}>
            {(Object.keys(THEMES) as ThemeType[]).map((themeKey) => (
              <TouchableOpacity
                key={themeKey}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: theme === themeKey ? colors.primary : colors.tabBarBorder
                  },
                  theme === themeKey && { borderWidth: 2 }
                ]}
                onPress={() => setTheme(themeKey)}
              >
                <View style={[styles.themeColor, { backgroundColor: THEMES[themeKey].background }]}>
                  <View style={[styles.themeColorInner, { backgroundColor: THEMES[themeKey].primary }]} />
                </View>
                <Text style={[styles.themeLabel, { color: colors.text }]}>{THEME_NAMES[themeKey]}</Text>
                {theme === themeKey && <Text style={[styles.themeCheck, { color: colors.primary }]}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.cardBg, marginTop: 16 }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>푸시 알림</Text>
            <Text style={[styles.menuValue, { color: colors.textLight }]}>켜짐</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>언어</Text>
            <Text style={[styles.menuValue, { color: colors.textLight }]}>한국어</Text>
          </TouchableOpacity>
        </View>

        {/* 필기 정리 설정 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>필기 정리 설정</Text>

          {/* AI 모드 선택 */}
          <View style={styles.aiModeContainer}>
            <Text style={[styles.aiModeTitle, { color: colors.text }]}>AI 정리 모드</Text>
            <View style={styles.aiModeSelector}>
              <TouchableOpacity
                style={[
                  styles.aiModeOption,
                  { backgroundColor: colors.cardBg, borderColor: colors.tabBarBorder },
                  aiMode === 'fast' && { borderColor: colors.primary, borderWidth: 2 }
                ]}
                onPress={() => updateAIMode('fast')}
                disabled={loading}
              >
                <View style={styles.aiModeHeader}>
                  <Text style={[styles.aiModeLabel, { color: colors.text }]}>빠른 모드</Text>
                  {aiMode === 'fast' && <Text style={[styles.aiModeCheck, { color: colors.primary }]}>✓</Text>}
                </View>
                <Text style={[styles.aiModeDesc, { color: colors.textLight }]}>~70초 / GPT-5-mini</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.aiModeOption,
                  { backgroundColor: colors.cardBg, borderColor: colors.tabBarBorder },
                  aiMode === 'quality' && { borderColor: colors.primary, borderWidth: 2 }
                ]}
                onPress={() => updateAIMode('quality')}
                disabled={loading}
              >
                <View style={styles.aiModeHeader}>
                  <Text style={[styles.aiModeLabel, { color: colors.text }]}>품질 모드</Text>
                  {aiMode === 'quality' && <Text style={[styles.aiModeCheck, { color: colors.primary }]}>✓</Text>}
                </View>
                <Text style={[styles.aiModeDesc, { color: colors.textLight }]}>
                  ~110초 / {userPlan === 'pro' ? 'GPT-5.2' : userPlan === 'basic' ? 'GPT-5' : 'GPT-5-mini'}
                </Text>
                {userPlan === 'free' && (
                  <View style={[styles.aiModeBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.aiModeBadgeText}>PRO에서 차이남</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            {loading && (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
            )}
          </View>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.cardBg, marginTop: 16 }]}
            onPress={() => router.push('/profile-edit')}
          >
            <Text style={[styles.menuText, { color: colors.text }]}>학년 정보 수정</Text>
            <Text style={[styles.menuArrow, { color: colors.textLight }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 플랜 관리 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>플랜 관리</Text>

          <TouchableOpacity
            style={[styles.menuItem, { backgroundColor: colors.cardBg }]}
            onPress={() => router.push('/upgrade')}
          >
            <Text style={[styles.menuText, { color: colors.text }]}>현재 플랜</Text>
            <Text style={[styles.menuValue, { color: colors.primary }]}>FREE</Text>
            <Text style={[styles.menuArrow, { color: colors.textLight }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>사용량 내역</Text>
            <Text style={[styles.menuArrow, { color: colors.textLight }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>결제 정보</Text>
            <Text style={[styles.menuArrow, { color: colors.textLight }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 기타 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>기타</Text>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>도움말</Text>
            <Text style={[styles.menuArrow, { color: colors.textLight }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>피드백 보내기</Text>
            <Text style={[styles.menuArrow, { color: colors.textLight }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>이용약관</Text>
            <Text style={[styles.menuArrow, { color: colors.textLight }]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>개인정보 처리방침</Text>
            <Text style={[styles.menuArrow, { color: colors.textLight }]}>›</Text>
          </TouchableOpacity>

          <View style={[styles.menuItem, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.menuText, { color: colors.text }]}>앱 버전</Text>
            <Text style={[styles.menuValue, { color: colors.textLight }]}>1.0.0</Text>
          </View>
        </View>
      </View>
    </ScrollView>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
  },

  // 테마 선택
  themeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeOption: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeColor: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  themeColorInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  themeLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  themeCheck: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  // 메뉴
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
  },
  menuValue: {
    fontSize: 14,
    marginRight: 4,
  },
  menuArrow: {
    fontSize: 18,
  },

  // AI 모드 선택
  aiModeContainer: {
    marginBottom: 8,
  },
  aiModeTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    marginLeft: 4,
  },
  aiModeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  aiModeOption: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  aiModeLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  aiModeCheck: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiModeDesc: {
    fontSize: 12,
  },
  aiModeBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  aiModeBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
})
