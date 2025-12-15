import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { processAPI } from '../../services/api'

export default function ProcessingScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams()
  const noteId = parseInt(id as string)

  const [status, setStatus] = useState('uploading')
  const [message, setMessage] = useState('처리 중...')
  const [progress, setProgress] = useState(25)

  useEffect(() => {
    let interval: NodeJS.Timeout

    const checkStatus = async () => {
      try {
        const result = await processAPI.getStatus(noteId)
        setStatus(result.status)
        setMessage(result.message)

        // 진행률 업데이트
        const progressMap: Record<string, number> = {
          uploading: 25,
          ocr_processing: 50,
          ai_organizing: 75,
          completed: 100,
        }
        setProgress(progressMap[result.status] || 25)

        // 완료 시 노트 페이지로 이동
        if (result.status === 'completed') {
          clearInterval(interval)
          setTimeout(() => {
            router.replace(`/notes/${noteId}`)
          }, 1000)
        }

        // 실패 시 중단
        if (result.status === 'failed') {
          clearInterval(interval)
        }
      } catch (err) {
        console.error('상태 확인 오류:', err)
        clearInterval(interval)
      }
    }

    checkStatus()
    interval = setInterval(checkStatus, 2000)

    return () => clearInterval(interval)
  }, [noteId])

  const getStatusEmoji = () => {
    switch (status) {
      case 'uploading':
        return '📤'
      case 'ocr_processing':
        return '🔍'
      case 'ai_organizing':
        return '🤖'
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      default:
        return '⏳'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return '업로드 중'
      case 'ocr_processing':
        return 'OCR 처리 중'
      case 'ai_organizing':
        return 'AI 정리 중'
      case 'completed':
        return '완료!'
      case 'failed':
        return '실패'
      default:
        return '처리 중'
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* 상태 아이콘 */}
        <Text style={styles.emoji}>{getStatusEmoji()}</Text>

        {/* 상태 텍스트 */}
        <Text style={styles.statusText}>{getStatusText()}</Text>
        <Text style={styles.message}>{message}</Text>

        {/* 로딩 인디케이터 */}
        {status !== 'completed' && status !== 'failed' && (
          <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
        )}

        {/* 진행 바 */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {/* 완료 안내 */}
        {status === 'completed' && (
          <Text style={styles.completeText}>잠시 후 노트 페이지로 이동합니다...</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEF8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  loader: {
    marginBottom: 24,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  completeText: {
    fontSize: 12,
    color: '#888',
    marginTop: 16,
  },
})
