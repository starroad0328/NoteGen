/**
 * 필기 정리 탭 (메인 + 업로드)
 */

import { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { uploadAPI, authAPI, UsageInfo } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

export default function HomeTab() {
  const router = useRouter()
  const { user, token, loading } = useAuth()
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [organizeMethod, setOrganizeMethod] = useState<'basic_summary' | 'cornell' | 'error_note' | 'vocab'>('basic_summary')
  const [uploading, setUploading] = useState(false)
  const [usage, setUsage] = useState<UsageInfo | null>(null)

  // 탭 포커스될 때마다 사용량 새로고침
  useFocusEffect(
    useCallback(() => {
      if (token) {
        authAPI.getUsage(token).then(setUsage).catch(console.error)
      }
    }, [token])
  )

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
      <View style={styles.container}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.logo}>📝</Text>
          <Text style={styles.title}>필기 정리</Text>
          <View style={styles.badgeRow}>
            {user?.grade_display && (
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeBadgeText}>{user.grade_display}</Text>
              </View>
            )}
            {usage && !usage.is_unlimited && (
              <TouchableOpacity
                style={[styles.usageBadge, usage.remaining === 0 && styles.usageBadgeDanger]}
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
          <TouchableOpacity style={styles.loginBanner} onPress={() => router.push('/login')}>
            <Text style={styles.loginBannerText}>로그인하고 필기 정리 시작하기</Text>
          </TouchableOpacity>
        )}

        {/* 이미지 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이미지 선택</Text>
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
              <Text style={styles.imageButtonIcon}>📸</Text>
              <Text style={styles.imageButtonText}>사진 촬영</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.imageButtonIcon}>🖼️</Text>
              <Text style={styles.imageButtonText}>갤러리</Text>
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
          <Text style={styles.hint}>최대 3개 ({images.length}/3)</Text>
        </View>

        {/* 정리 방식 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>정리 방식</Text>
          <TouchableOpacity
            style={[styles.methodCard, organizeMethod === 'basic_summary' && styles.methodCardSelected]}
            onPress={() => setOrganizeMethod('basic_summary')}
          >
            <Text style={styles.methodIcon}>📋</Text>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>기본 요약 정리</Text>
              <Text style={styles.methodDesc}>핵심 내용을 간결하게 정리</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodCard, organizeMethod === 'cornell' && styles.methodCardSelected]}
            onPress={() => setOrganizeMethod('cornell')}
          >
            <Text style={styles.methodIcon}>📐</Text>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>코넬식 정리</Text>
              <Text style={styles.methodDesc}>키워드 + 본문 + 요약 구조</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodCard, organizeMethod === 'error_note' && styles.methodCardSelected]}
            onPress={() => setOrganizeMethod('error_note')}
          >
            <Text style={styles.methodIcon}>❌</Text>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>오답노트</Text>
              <Text style={styles.methodDesc}>문제 + 오답 + 정답 + 해설</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodCard, organizeMethod === 'vocab' && styles.methodCardSelected]}
            onPress={() => setOrganizeMethod('vocab')}
          >
            <Text style={styles.methodIcon}>📚</Text>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>단어장</Text>
              <Text style={styles.methodDesc}>단어 + 뜻 + 예문 표 정리</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 정리 시작 버튼 */}
        <TouchableOpacity
          style={[styles.uploadButton, (uploading || images.length === 0) && styles.uploadButtonDisabled]}
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
    backgroundColor: '#FFFEF8',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 100,
    color: '#666',
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
    color: '#2C2C2C',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  gradeBadge: {
    backgroundColor: '#10B981',
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
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  usageBadgeDanger: {
    backgroundColor: '#EF4444',
  },
  usageBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loginBanner: {
    backgroundColor: '#3B82F6',
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    color: '#333',
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
    color: '#888',
    marginTop: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  methodCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
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
    color: '#666',
  },
  uploadButton: {
    backgroundColor: '#3B82F6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  uploadButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
})
