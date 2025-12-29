/**
 * Theme Context
 * 테마 색상 관리 (흰색/다크모드/갈색/살구색)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

// 테마 타입
export type ThemeType = 'white' | 'dark' | 'brown' | 'apricot'

// 테마별 색상 정의
export interface ThemeColors {
  background: string
  primary: string
  primaryDark: string
  accent: string
  text: string
  textLight: string
  cardBg: string
  white: string
  tabBar: string
  tabBarBorder: string
}

// 공통 텍스트 색상 (갈색 계열 고정)
const TEXT_COLORS = {
  text: '#5D4E37',
  textLight: '#8B7355',
}

// 4가지 테마 정의 (배경색만 변경, 텍스트 색상은 갈색 고정)
export const THEMES: Record<ThemeType, ThemeColors> = {
  white: {
    background: '#F8F9FA',
    primary: '#C4956A',
    primaryDark: '#A67B5B',
    accent: '#E8B866',
    ...TEXT_COLORS,
    cardBg: '#FFFFFF',
    white: '#FFFFFF',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E5E7EB',
  },
  dark: {
    background: '#2C2C2C',
    primary: '#C4956A',
    primaryDark: '#A67B5B',
    accent: '#E8B866',
    ...TEXT_COLORS,
    cardBg: '#3A3A3A',
    white: '#FFFFFF',
    tabBar: '#3A3A3A',
    tabBarBorder: '#4A4A4A',
  },
  brown: {
    background: '#FDF6E3',
    primary: '#C4956A',
    primaryDark: '#A67B5B',
    accent: '#E8B866',
    ...TEXT_COLORS,
    cardBg: '#FFFEF8',
    white: '#FFFFFF',
    tabBar: '#FFFEF8',
    tabBarBorder: '#E8DFD0',
  },
  apricot: {
    background: '#FFF5EE',
    primary: '#C4956A',
    primaryDark: '#A67B5B',
    accent: '#E8B866',
    ...TEXT_COLORS,
    cardBg: '#FFFAF7',
    white: '#FFFFFF',
    tabBar: '#FFFAF7',
    tabBarBorder: '#FFE4D6',
  },
}

// 테마 이름 (한글)
export const THEME_NAMES: Record<ThemeType, string> = {
  white: '흰색',
  dark: '다크모드',
  brown: '갈색',
  apricot: '살구색',
}

interface ThemeContextType {
  theme: ThemeType
  colors: ThemeColors
  setTheme: (theme: ThemeType) => Promise<void>
  loading: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_KEY = 'notioclass_theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeType>('brown') // 기본값: 갈색
  const [loading, setLoading] = useState(true)

  // 앱 시작 시 저장된 테마 불러오기
  useEffect(() => {
    loadStoredTheme()
  }, [])

  const loadStoredTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_KEY)
      if (storedTheme && storedTheme in THEMES) {
        setThemeState(storedTheme as ThemeType)
      }
    } catch (error) {
      console.log('저장된 테마 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const setTheme = async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem(THEME_KEY, newTheme)
      setThemeState(newTheme)
    } catch (error) {
      console.error('테마 저장 실패:', error)
    }
  }

  const colors = THEMES[theme]

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        setTheme,
        loading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
