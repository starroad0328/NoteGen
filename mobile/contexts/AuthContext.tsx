/**
 * Auth Context
 * 인증 상태 관리
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import * as SecureStore from 'expo-secure-store'
import { authAPI, User } from '../services/api'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (
    email: string,
    password: string,
    name?: string,
    schoolLevel?: string,
    grade?: number
  ) => Promise<void>
  logout: () => Promise<void>
  updateUser: (data: { name?: string; school_level?: string; grade?: number }) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_KEY = 'notegen_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 앱 시작 시 저장된 토큰 확인
  useEffect(() => {
    loadStoredAuth()
  }, [])

  const loadStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync(TOKEN_KEY)
      if (storedToken) {
        // 토큰으로 사용자 정보 가져오기
        const userData = await authAPI.getMe(storedToken)
        setToken(storedToken)
        setUser(userData)
      }
    } catch (error) {
      console.log('저장된 인증 정보 로드 실패:', error)
      // 토큰이 유효하지 않으면 삭제
      await SecureStore.deleteItemAsync(TOKEN_KEY)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password)
    const newToken = response.access_token

    // 토큰 저장
    await SecureStore.setItemAsync(TOKEN_KEY, newToken)
    setToken(newToken)

    // 사용자 정보 가져오기
    const userData = await authAPI.getMe(newToken)
    setUser(userData)
  }

  const register = async (
    email: string,
    password: string,
    name?: string,
    schoolLevel?: string,
    grade?: number
  ) => {
    const response = await authAPI.register(email, password, name, schoolLevel, grade)
    const newToken = response.access_token

    // 토큰 저장
    await SecureStore.setItemAsync(TOKEN_KEY, newToken)
    setToken(newToken)

    // 사용자 정보 가져오기
    const userData = await authAPI.getMe(newToken)
    setUser(userData)
  }

  const logout = async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const updateUser = async (data: { name?: string; school_level?: string; grade?: number }) => {
    if (!token) throw new Error('Not authenticated')
    const updatedUser = await authAPI.updateMe(token, data)
    setUser(updatedUser)
  }

  const refreshUser = async () => {
    if (!token) return
    try {
      const userData = await authAPI.getMe(token)
      setUser(userData)
    } catch (error) {
      console.error('사용자 정보 새로고침 실패:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
