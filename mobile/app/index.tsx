import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../contexts/AuthContext'

export default function HomeScreen() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>📝</Text>
        <Text style={styles.title}>NoteGen</Text>
        <Text style={styles.subtitle}>로딩 중...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* 사용자 정보 / 로그인 버튼 */}
      <View style={styles.userSection}>
        {user ? (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {user.grade_display || user.name || user.email}
            </Text>
            <TouchableOpacity onPress={logout}>
              <Text style={styles.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.loginText}>로그인</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 로고 */}
      <Text style={styles.logo}>📝</Text>
      <Text style={styles.title}>NoteGen</Text>

      {/* 서브타이틀 */}
      <Text style={styles.subtitle}>
        AI가 필기를 자동으로 정리해드립니다
      </Text>

      {/* 학년 정보 표시 */}
      {user?.grade_display && (
        <View style={styles.gradeBadge}>
          <Text style={styles.gradeBadgeText}>
            {user.grade_display} 교육과정 맞춤 정리
          </Text>
        </View>
      )}

      {/* 설명 */}
      <Text style={styles.description}>
        손으로 쓴 필기를 촬영하거나 업로드하면{'\n'}
        AI가 깔끔한 디지털 노트로 자동 정리합니다
      </Text>

      {/* 시작 버튼 */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push('/upload')}
      >
        <Text style={styles.startButtonText}>🚀 시작하기</Text>
      </TouchableOpacity>

      {/* 기능 소개 */}
      <View style={styles.features}>
        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>📸</Text>
          <Text style={styles.featureTitle}>간편한 업로드</Text>
          <Text style={styles.featureDesc}>
            사진 촬영 또는{'\n'}갤러리에서 선택
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>🤖</Text>
          <Text style={styles.featureTitle}>AI 자동 정리</Text>
          <Text style={styles.featureDesc}>
            2가지 정리 방식{'\n'}중요도 자동 표시
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>💾</Text>
          <Text style={styles.featureTitle}>자동 저장</Text>
          <Text style={styles.featureDesc}>
            정리된 노트{'\n'}안전하게 보관
          </Text>
        </View>
      </View>

      {/* 버전 */}
      <Text style={styles.version}>v1.0.0-MVP | {user ? user.plan : 'Free'} Version</Text>
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
  userSection: {
    position: 'absolute',
    top: 50,
    right: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  logoutText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  loginText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  gradeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  gradeBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  logo: {
    fontSize: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 20,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  features: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 40,
  },
  featureCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  version: {
    fontSize: 12,
    color: '#AAA',
  },
})
