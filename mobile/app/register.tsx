import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../contexts/AuthContext'

type SchoolLevel = 'middle' | 'high' | null

export default function RegisterScreen() {
  const router = useRouter()
  const { register } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [schoolLevel, setSchoolLevel] = useState<SchoolLevel>(null)
  const [grade, setGrade] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    // 유효성 검사
    if (!email.trim() || !password.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.')
      return
    }

    if (password !== passwordConfirm) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.')
      return
    }

    if (password.length < 6) {
      Alert.alert('입력 오류', '비밀번호는 6자 이상이어야 합니다.')
      return
    }

    if (!name.trim()) {
      Alert.alert('입력 오류', '이름을 입력해주세요.')
      return
    }

    if (!schoolLevel || !grade) {
      Alert.alert('입력 오류', '학년을 선택해주세요.')
      return
    }

    setLoading(true)
    try {
      await register(
        email.trim(),
        password,
        name.trim(),
        schoolLevel,
        grade
      )
      router.replace('/')
    } catch (error: any) {
      const message = error?.response?.data?.detail || '회원가입에 실패했습니다.'
      Alert.alert('회원가입 실패', message)
    } finally {
      setLoading(false)
    }
  }

  const GradeButton = ({ value, label }: { value: number; label: string }) => (
    <TouchableOpacity
      style={[styles.gradeButton, grade === value && styles.gradeButtonActive]}
      onPress={() => setGrade(value)}
    >
      <Text style={[styles.gradeButtonText, grade === value && styles.gradeButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  )

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.title}>회원가입</Text>
          <Text style={styles.subtitle}>NoteGen 계정을 만들어보세요</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>이메일 *</Text>
            <TextInput
              style={styles.input}
              placeholder="이메일을 입력하세요"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호 *</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>비밀번호 확인 *</Text>
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 다시 입력하세요"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>이름 *</Text>
            <TextInput
              style={styles.input}
              placeholder="이름을 입력하세요"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* 학년 선택 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>학년 선택 *</Text>
            <Text style={styles.hint}>학년에 맞는 교육과정으로 정리해드려요</Text>

            <View style={styles.schoolLevelRow}>
              <TouchableOpacity
                style={[
                  styles.schoolLevelButton,
                  schoolLevel === 'middle' && styles.schoolLevelButtonActive,
                ]}
                onPress={() => {
                  setSchoolLevel('middle')
                  setGrade(null)
                }}
              >
                <Text
                  style={[
                    styles.schoolLevelText,
                    schoolLevel === 'middle' && styles.schoolLevelTextActive,
                  ]}
                >
                  중학생
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.schoolLevelButton,
                  schoolLevel === 'high' && styles.schoolLevelButtonActive,
                ]}
                onPress={() => {
                  setSchoolLevel('high')
                  setGrade(null)
                }}
              >
                <Text
                  style={[
                    styles.schoolLevelText,
                    schoolLevel === 'high' && styles.schoolLevelTextActive,
                  ]}
                >
                  고등학생
                </Text>
              </TouchableOpacity>
            </View>

            {schoolLevel && (
              <View style={styles.gradeRow}>
                <GradeButton value={1} label="1학년" />
                <GradeButton value={2} label="2학년" />
                <GradeButton value={3} label="3학년" />
              </View>
            )}

            {schoolLevel && grade && (
              <View style={styles.selectedGrade}>
                <Text style={styles.selectedGradeText}>
                  선택: {schoolLevel === 'middle' ? '중' : '고'}{grade}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>회원가입</Text>
            )}
          </TouchableOpacity>

          <View style={styles.linkContainer}>
            <Text style={styles.linkText}>이미 계정이 있으신가요? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.link}>로그인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEF8',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  schoolLevelRow: {
    flexDirection: 'row',
    gap: 12,
  },
  schoolLevelButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  schoolLevelButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  schoolLevelText: {
    fontSize: 16,
    color: '#333',
  },
  schoolLevelTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  gradeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  gradeButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  gradeButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  gradeButtonText: {
    fontSize: 14,
    color: '#333',
  },
  gradeButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  selectedGrade: {
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedGradeText: {
    color: '#10B981',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  linkText: {
    color: '#666',
  },
  link: {
    color: '#3B82F6',
    fontWeight: '600',
  },
})
