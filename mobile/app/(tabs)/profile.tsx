/**
 * 프로필 탭
 */

import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../contexts/AuthContext'

const SCHOOL_LEVELS = [
  { value: 'middle', label: '중학교' },
  { value: 'high', label: '고등학교' },
]

const GRADES = [1, 2, 3]

export default function ProfileTab() {
  const router = useRouter()
  const { user, loading, logout, updateUser } = useAuth()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [schoolLevel, setSchoolLevel] = useState<string>('')
  const [grade, setGrade] = useState<number>(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setSchoolLevel(user.school_level || 'middle')
      setGrade(user.grade || 1)
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateUser({
        name: name || undefined,
        school_level: schoolLevel,
        grade: grade,
      })
      setEditing(false)
      Alert.alert('저장 완료', '프로필이 업데이트되었습니다.')
    } catch (error: any) {
      Alert.alert('오류', error.message || '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            await logout()
          }
        }
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    )
  }

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emoji}>👤</Text>
        <Text style={styles.title}>로그인이 필요합니다</Text>
        <Text style={styles.subtitle}>프로필을 확인하려면 로그인하세요</Text>
        <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/login')}>
          <Text style={styles.loginButtonText}>로그인</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.registerButton} onPress={() => router.push('/register')}>
          <Text style={styles.registerButtonText}>회원가입</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>프로필</Text>
          {!editing ? (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editText}>편집</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setEditing(false)}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 프로필 아이콘 */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.gradeDisplay}>{user.grade_display || '학년 미설정'}</Text>
        </View>

        {/* 계정 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 정보</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>이메일</Text>
            <Text style={styles.fieldValue}>{user.email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>이름</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="이름을 입력하세요"
              />
            ) : (
              <Text style={styles.fieldValue}>{user.name || '미설정'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>요금제</Text>
            <View style={styles.planBadge}>
              <Text style={styles.planText}>{user.plan === 'free' ? 'Free' : 'Premium'}</Text>
            </View>
          </View>
        </View>

        {/* 학년 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>학년 설정</Text>
          <Text style={styles.sectionDesc}>학년에 맞는 교육과정으로 필기가 정리됩니다</Text>

          {editing ? (
            <>
              <Text style={styles.fieldLabel}>학교</Text>
              <View style={styles.optionRow}>
                {SCHOOL_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level.value}
                    style={[
                      styles.optionButton,
                      schoolLevel === level.value && styles.optionButtonSelected
                    ]}
                    onPress={() => setSchoolLevel(level.value)}
                  >
                    <Text style={[
                      styles.optionText,
                      schoolLevel === level.value && styles.optionTextSelected
                    ]}>
                      {level.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>학년</Text>
              <View style={styles.optionRow}>
                {GRADES.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.optionButton,
                      grade === g && styles.optionButtonSelected
                    ]}
                    onPress={() => setGrade(g)}
                  >
                    <Text style={[
                      styles.optionText,
                      grade === g && styles.optionTextSelected
                    ]}>
                      {g}학년
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>현재 학년</Text>
              <Text style={styles.fieldValue}>{user.grade_display || '미설정'}</Text>
            </View>
          )}
        </View>

        {/* 저장 버튼 */}
        {editing && (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? '저장 중...' : '변경사항 저장'}
            </Text>
          </TouchableOpacity>
        )}

        {/* 로그아웃 */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>로그아웃</Text>
        </TouchableOpacity>

        {/* 버전 */}
        <Text style={styles.version}>NoteGen v1.0.0-MVP</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEF8',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#FFFEF8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  editText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelText: {
    color: '#EF4444',
    fontSize: 16,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 48,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  registerButton: {
    paddingHorizontal: 48,
    paddingVertical: 14,
  },
  registerButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  gradeDisplay: {
    fontSize: 16,
    color: '#10B981',
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: '#888',
    marginBottom: 16,
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fieldLabel: {
    fontSize: 14,
    color: '#666',
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    padding: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    marginLeft: 16,
  },
  planBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  optionButtonSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
  },
  optionTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 24,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    color: '#AAA',
    fontSize: 12,
    marginBottom: 40,
  },
})
