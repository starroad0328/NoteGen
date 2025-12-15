import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { uploadAPI, processAPI } from '../services/api'

export default function UploadScreen() {
  const router = useRouter()
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [organizeMethod, setOrganizeMethod] = useState<'basic_summary' | 'cornell'>('basic_summary')
  const [uploading, setUploading] = useState(false)

  // 카메라 촬영
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('권한 필요', '카메라 사용 권한이 필요합니다.')
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    })

    if (!result.canceled && result.assets) {
      if (images.length >= 3) {
        Alert.alert('제한', '최대 3개까지 업로드 가능합니다.')
        return
      }
      setImages([...images, ...result.assets])
    }
  }

  // 갤러리에서 선택
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 3 - images.length,
    })

    if (!result.canceled && result.assets) {
      setImages([...images, ...result.assets])
    }
  }

  // 이미지 삭제
  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  // 업로드 및 처리
  const handleUpload = async () => {
    if (images.length === 0) {
      Alert.alert('알림', '이미지를 선택해주세요.')
      return
    }

    setUploading(true)

    try {
      // 이미지 파일 변환
      const files = await Promise.all(
        images.map(async (image) => {
          const response = await fetch(image.uri)
          const blob = await response.blob()
          return new File([blob], `image_${Date.now()}.jpg`, { type: 'image/jpeg' })
        })
      )

      // 업로드
      const uploadResult = await uploadAPI.uploadImages(files, organizeMethod)

      // 처리 시작
      await processAPI.startProcess(uploadResult.id)

      // 처리 화면으로 이동
      router.push(`/processing/${uploadResult.id}`)
    } catch (error: any) {
      console.error('업로드 오류:', error)
      Alert.alert('오류', error.response?.data?.detail || '업로드 중 오류가 발생했습니다.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* 헤더 */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>

        <Text style={styles.title}>필기 업로드</Text>
        <Text style={styles.subtitle}>
          손으로 쓴 필기를 업로드하고 정리 방식을 선택하세요
        </Text>

        {/* 이미지 선택 버튼 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 이미지 선택</Text>

          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
              <Text style={styles.imageButtonIcon}>📷</Text>
              <Text style={styles.imageButtonText}>사진 촬영</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Text style={styles.imageButtonIcon}>📁</Text>
              <Text style={styles.imageButtonText}>갤러리</Text>
            </TouchableOpacity>
          </View>

          {/* 선택된 이미지 */}
          {images.length > 0 && (
            <View style={styles.imageList}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageItem}>
                  <Image source={{ uri: image.uri }} style={styles.thumbnail} />
                  <TouchableOpacity
                    onPress={() => removeImage(index)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.hint}>최대 3개까지 선택 가능 ({images.length}/3)</Text>
        </View>

        {/* 정리 방식 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 정리 방식 선택</Text>

          <TouchableOpacity
            style={[
              styles.methodCard,
              organizeMethod === 'basic_summary' && styles.methodCardSelected,
            ]}
            onPress={() => setOrganizeMethod('basic_summary')}
          >
            <View style={styles.methodHeader}>
              <View
                style={[
                  styles.radio,
                  organizeMethod === 'basic_summary' && styles.radioSelected,
                ]}
              />
              <Text style={styles.methodTitle}>기본 요약 정리</Text>
            </View>
            <Text style={styles.methodDesc}>
              제목, 소제목, 글머리표로 간단하게 정리
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodCard,
              organizeMethod === 'cornell' && styles.methodCardSelected,
            ]}
            onPress={() => setOrganizeMethod('cornell')}
          >
            <View style={styles.methodHeader}>
              <View
                style={[
                  styles.radio,
                  organizeMethod === 'cornell' && styles.radioSelected,
                ]}
              />
              <Text style={styles.methodTitle}>코넬식 정리</Text>
            </View>
            <Text style={styles.methodDesc}>
              키워드 + 설명 + 요약 형식으로 시험 대비 정리
            </Text>
          </TouchableOpacity>
        </View>

        {/* 업로드 버튼 */}
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (uploading || images.length === 0) && styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={uploading || images.length === 0}
        >
          <Text style={styles.uploadButtonText}>
            {uploading ? '업로드 중...' : '📝 정리 시작하기'}
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
  },
  backButton: {
    marginTop: 40,
    marginBottom: 20,
  },
  backText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
    color: '#2C2C2C',
  },
  imageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  imageItem: {
    position: 'relative',
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'red',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 8,
  },
  methodCard: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  methodCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  methodDesc: {
    fontSize: 14,
    color: '#666',
    marginLeft: 32,
  },
  uploadButton: {
    backgroundColor: '#3B82F6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    color: '#AAA',
    textAlign: 'center',
    marginTop: 20,
  },
})
