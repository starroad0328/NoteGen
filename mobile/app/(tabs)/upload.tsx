/**
 * 필기 정리 탭 (메인 + 업로드)
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { uploadAPI, authAPI, templatesAPI, UsageInfo, OrganizeTemplate, AIMode } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

export default function HomeTab() {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const { colors } = useTheme()
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [organizeMethod, setOrganizeMethod] = useState<string>('basic_summary')
  const [uploading, setUploading] = useState(false)
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const [subscribedTemplates, setSubscribedTemplates] = useState<OrganizeTemplate[]>([])
  const [aiMode, setAiMode] = useState<AIMode>('fast')

  // 기본 정리법 (항상 표시)
  const defaultMethods = [
    { id: 'basic_summary', icon: '📋', name: '기본 요약 정리', desc: '핵심 내용을 간결하게 정리' },
    { id: 'cornell', icon: '📐', name: '코넬식 정리', desc: '키워드 + 본문 + 요약 구조' },
    { id: 'vocab', icon: '📚', name: '단어장', desc: '단어 + 뜻 + 예문 표 정리' },
  ]

  // 탭 포커스될 때마다 사용량 및 구독 정리법 새로고침
  useFocusEffect(
    useCallback(() => {
      if (token) {
        authAPI.getUsage(token).then(setUsage).catch(console.error)
        // 구독한 정리법 불러오기
        templatesAPI.getSubscribed(token)
          .then(result => setSubscribedTemplates(result.templates))
          .catch(console.error)
        // AI 모드 불러오기
        authAPI.getAIMode(token)
          .then(result => setAiMode(result.ai_mode))
          .catch(console.error)
      }
    }, [token])
  )

  // AI 모드 변경
  const handleAIModeChange = async (mode: AIMode) => {
    if (!token) return
    setAiMode(mode)
    try {
      await authAPI.updateAIMode(token, mode)
    } catch (error) {
      console.error('AI 모드 변경 실패:', error)
    }
  }

  const takePhoto = async () => {
    if (!user) {
      Alert.alert('로그인 필요', '필기 정리 기능을 사용하려면 로그인이 필요합니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/login') }
      ])
      return
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) { Alert.alert('권한 필요', '카메라 사용 권한이 필요합니다.'); return }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
    if (!result.canceled && result.assets) {
      if (images.length >= 3) { Alert.alert('제한', '최대 3개까지'); return }
      setImages([...images, ...result.assets])
    }
  }

  const pickImage = async () => {
    if (!user) {
      Alert.alert('로그인 필요', '필기 정리 기능을 사용하려면 로그인이 필요합니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/login') }
      ])
      return
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) { Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 3 - images.length
    })
    if (!result.canceled && result.assets) { setImages([...images, ...result.assets]) }
  }

  const removeImage = (index: number) => { setImages(images.filter((_, i) => i !== index)) }

  const handleUpload = async () => {
    if (images.length === 0) { Alert.alert('알림', '이미지를 선택해주세요.'); return }
    if (!user || !token) {
      Alert.alert('로그인 필요', '필기 정리 기능을 사용하려면 로그인이 필요합니다.')
      return
    }
    setUploading(true)
    try {
      const imageData = images.map((image, index) => ({ uri: image.uri, type: 'image/jpeg', name: 'image_' + index + '.jpg' }))
      const uploadResult = await uploadAPI.uploadImages(imageData, organizeMethod, token)
      setImages([]) // 업로드 후 초기화
      router.push('/processing/' + uploadResult.id)
    } catch (error: any) {
      // 사용량 초과 에러 (429)
      if (error.response?.status === 429) {
        const detail = error.response?.data?.detail
        Alert.alert(
          '이번 달 사용량을 모두 사용했어요',
          'Basic 플랜으로 업그레이드하면\n월 100회까지 사용할 수 있어요!',
          [
            { text: '다음에', style: 'cancel' },
            { text: '플랜 보기', onPress: () => router.push('/(tabs)/my') }
          ]
        )
        // 사용량 새로고침
        if (token) {
          authAPI.getUsage(token).then(setUsage).catch(console.error)
        }
      } else {
        const errorMessage = typeof error.response?.data?.detail === 'string'
          ? error.response.data.detail
          : error.message || '업로드 중 오류가 발생했습니다.'
        Alert.alert('오류', errorMessage)
      }
    } finally { setUploading(false) }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textLight }]}>로딩 중...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.logo}>📝</Text>
          <Text style={[styles.title, { color: colors.text }]}>필기 정리</Text>
          <View style={styles.badgeRow}>
            {user?.grade_display && (
              <View style={[styles.gradeBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.gradeBadgeText}>{user.grade_display}</Text>
              </View>
            )}
            {usage && !usage.is_unlimited && (
              <TouchableOpacity
                style={[styles.usageBadge, { backgroundColor: colors.primary }, usage.remaining === 0 && { backgroundColor: colors.accent }]}
                onPress={() => router.push('/(tabs)/plan')}
              >
                <Text style={styles.usageBadgeText}>
                  {usage.used}/{usage.limit}회
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!user && (
          <TouchableOpacity style={[styles.loginBanner, { backgroundColor: colors.primary }]} onPress={() => router.push('/login')}>
            <Text style={styles.loginBannerText}>로그인하고 필기 정리 시작하기</Text>
          </TouchableOpacity>
        )}

        {/* 이미지 선택 */}
        <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>이미지 선택</Text>
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
              <Text style={styles.imageButtonIcon}>📸</Text>
              <Text style={[styles.imageButtonText, { color: colors.text }]}>사진 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.imageButtonIcon}>🖼️</Text>
              <Text style={[styles.imageButtonText, { color: colors.text }]}>갤러리</Text>
            </TouchableOpacity>
          </View>

          {images.length > 0 && (
            <View style={styles.imageList}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageItem}>
                  <Image source={{ uri: image.uri }} style={styles.thumbnail} />
                  <TouchableOpacity onPress={() => removeImage(index)} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>X</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <Text style={[styles.hint, { color: colors.textLight }]}>최대 3개 ({images.length}/3)</Text>
        </View>

        {/* 정리 방식 */}
        <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>정리 방식</Text>
            <TouchableOpacity onPress={() => router.push('/templates')}>
              <Text style={[styles.moreLink, { color: colors.primary }]}>더보기</Text>
            </TouchableOpacity>
          </View>

          {/* 기본 정리법 */}
          {defaultMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodCard, { borderColor: colors.tabBarBorder }, organizeMethod === method.id && { borderColor: colors.primary, backgroundColor: colors.cardBg }]}
              onPress={() => setOrganizeMethod(method.id)}
            >
              <Text style={styles.methodIcon}>{method.icon}</Text>
              <View style={styles.methodInfo}>
                <Text style={[styles.methodTitle, { color: colors.text }]}>{method.name}</Text>
                <Text style={[styles.methodDesc, { color: colors.textLight }]}>{method.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* 구독한 정리법 */}
          {subscribedTemplates.length > 0 && (
            <>
              <Text style={[styles.subsectionTitle, { color: colors.textLight }]}>구독한 정리법</Text>
              {subscribedTemplates.map((template) => (
                <TouchableOpacity
                  key={`template_${template.id}`}
                  style={[styles.methodCard, { borderColor: colors.tabBarBorder }, organizeMethod === `template_${template.id}` && { borderColor: colors.primary, backgroundColor: colors.cardBg }]}
                  onPress={() => setOrganizeMethod(`template_${template.id}`)}
                >
                  <Text style={styles.methodIcon}>{template.icon}</Text>
                  <View style={styles.methodInfo}>
                    <Text style={[styles.methodTitle, { color: colors.text }]}>{template.name}</Text>
                    {template.description && (
                      <Text style={[styles.methodDesc, { color: colors.textLight }]}>{template.description}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </View>

        {/* AI 모드 선택 */}
        {user && (
          <View style={[styles.section, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>AI 모드</Text>
            <View style={styles.aiModeRow}>
              <TouchableOpacity
                style={[
                  styles.aiModeButton,
                  { borderColor: colors.tabBarBorder },
                  aiMode === 'fast' && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                ]}
                onPress={() => handleAIModeChange('fast')}
              >
                <Text style={[styles.aiModeIcon]}>⚡</Text>
                <Text style={[styles.aiModeLabel, { color: colors.text }]}>빠른 모드</Text>
                <Text style={[styles.aiModeTime, { color: colors.textLight }]}>~70초</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.aiModeButton,
                  { borderColor: colors.tabBarBorder },
                  aiMode === 'quality' && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
                ]}
                onPress={() => handleAIModeChange('quality')}
              >
                <Text style={[styles.aiModeIcon]}>✨</Text>
                <Text style={[styles.aiModeLabel, { color: colors.text }]}>품질 모드</Text>
                <Text style={[styles.aiModeTime, { color: colors.textLight }]}>~110초</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 정리 시작 버튼 */}
        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: colors.primary, shadowColor: colors.primaryDark }, (uploading || images.length === 0) && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading || images.length === 0}
        >
          <Text style={styles.uploadButtonText}>
            {uploading ? '정리 중...' : '정리 시작하기'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  usageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  usageBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loginBanner: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginBannerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  moreLink: {
    fontSize: 14,
    fontWeight: '500',
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 8,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  imageButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  imageButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  imageItem: {
    position: 'relative',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    marginTop: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  methodIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  methodDesc: {
    fontSize: 12,
  },
  uploadButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  uploadButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  // AI 모드 선택
  aiModeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  aiModeButton: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  aiModeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  aiModeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  aiModeTime: {
    fontSize: 12,
    marginTop: 2,
  },
})
