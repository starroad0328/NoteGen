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

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) { Alert.alert('권한 필요', '카메라 사용 권한이 필요합니다.'); return }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false })
    if (!result.canceled && result.assets) {
      if (images.length >= 3) { Alert.alert('제한', '최대 3개까지'); return }
      setImages([...images, ...result.assets])
    }
  }

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) { Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, quality: 0.8, selectionLimit: 3 - images.length })
    if (!result.canceled && result.assets) { setImages([...images, ...result.assets]) }
  }

  const removeImage = (index: number) => { setImages(images.filter((_, i) => i !== index)) }

  const handleUpload = async () => {
    if (images.length === 0) { Alert.alert('알림', '이미지를 선택해주세요.'); return }
    setUploading(true)
    try {
      const imageData = images.map((image, index) => ({ uri: image.uri, type: 'image/jpeg', name: 'image_' + index + '.jpg' }))
      const uploadResult = await uploadAPI.uploadImages(imageData, organizeMethod)
      await processAPI.startProcess(uploadResult.id)
      router.push('/processing/' + uploadResult.id)
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.detail || '업로드 중 오류가 발생했습니다.')
    } finally { setUploading(false) }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>뒤로</Text></TouchableOpacity>
        <Text style={styles.title}>필기 업로드</Text>
        <Text style={styles.subtitle}>손으로 쓴 필기를 업로드하고 정리 방식을 선택하세요</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이미지 선택</Text>
          <View style={styles.imageButtons}>
            <TouchableOpacity style={styles.imageButton} onPress={takePhoto}><Text>사진 촬영</Text></TouchableOpacity>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}><Text>갤러리</Text></TouchableOpacity>
          </View>
          {images.length > 0 && (<View style={styles.imageList}>{images.map((image, index) => (<View key={index} style={styles.imageItem}><Image source={{ uri: image.uri }} style={styles.thumbnail} /><TouchableOpacity onPress={() => removeImage(index)} style={styles.removeButton}><Text style={styles.removeButtonText}>X</Text></TouchableOpacity></View>))}</View>)}
          <Text style={styles.hint}>최대 3개 ({images.length}/3)</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>정리 방식</Text>
          <TouchableOpacity style={[styles.methodCard, organizeMethod === 'basic_summary' && styles.methodCardSelected]} onPress={() => setOrganizeMethod('basic_summary')}><Text style={styles.methodTitle}>기본 요약 정리</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.methodCard, organizeMethod === 'cornell' && styles.methodCardSelected]} onPress={() => setOrganizeMethod('cornell')}><Text style={styles.methodTitle}>코넬식 정리</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.uploadButton, (uploading || images.length === 0) && styles.uploadButtonDisabled]} onPress={handleUpload} disabled={uploading || images.length === 0}><Text style={styles.uploadButtonText}>{uploading ? '업로드 중...' : '정리 시작하기'}</Text></TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFEF8' },
  content: { padding: 20 },
  backButton: { marginTop: 40, marginBottom: 20 },
  backText: { color: '#3B82F6', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  section: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  imageButtons: { flexDirection: 'row', gap: 12 },
  imageButton: { flex: 1, backgroundColor: '#F3F4F6', padding: 16, borderRadius: 8, alignItems: 'center' },
  imageList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  imageItem: { position: 'relative' },
  thumbnail: { width: 80, height: 80, borderRadius: 8 },
  removeButton: { position: 'absolute', top: -6, right: -6, backgroundColor: 'red', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  removeButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  hint: { fontSize: 12, color: '#888', marginTop: 8 },
  methodCard: { borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 8 },
  methodCardSelected: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  methodTitle: { fontSize: 14, fontWeight: '600' },
  uploadButton: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 8, alignItems: 'center' },
  uploadButtonDisabled: { backgroundColor: '#D1D5DB' },
  uploadButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
})
