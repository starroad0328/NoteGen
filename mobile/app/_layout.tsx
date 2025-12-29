import { Stack } from 'expo-router'
import { AuthProvider } from '../contexts/AuthContext'
import { ThemeProvider, useTheme } from '../contexts/ThemeContext'

function ThemedStack() {
  const { colors } = useTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="processing/[id]" />
      <Stack.Screen name="notes/[id]" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ThemedStack />
      </AuthProvider>
    </ThemeProvider>
  )
}
