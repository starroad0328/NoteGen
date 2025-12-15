import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFEF8' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="upload" />
      <Stack.Screen name="processing/[id]" />
      <Stack.Screen name="notes/index" />
      <Stack.Screen name="notes/[id]" />
    </Stack>
  )
}
