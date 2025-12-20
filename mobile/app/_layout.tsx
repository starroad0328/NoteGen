import { Stack } from 'expo-router'
import { AuthProvider } from '../contexts/AuthContext'

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFEF8' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="upload" />
        <Stack.Screen name="processing/[id]" />
        <Stack.Screen name="notes/index" />
        <Stack.Screen name="notes/[id]" />
      </Stack>
    </AuthProvider>
  )
}
