# Expo Opinionated Rules

## Setup

Always use Expo SDK latest + Expo Router. Don't use React Navigation manually — Expo Router wraps it with file-based routing.

```bash
# New project in Turborepo
npx create-expo-app@latest apps/mobile --template blank-typescript

# Key packages
npx expo install expo-router nativewind tailwindcss
npx expo install @clerk/expo
npx expo install @tanstack/react-query
```

## Root Layout

```typescript
// app/_layout.tsx
import { ClerkProvider, useAuth } from '@clerk/expo'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'

const queryClient = new QueryClient()

function AuthGuard() {
  const { isSignedIn, isLoaded } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!isSignedIn && !inAuthGroup) router.replace('/(auth)/sign-in')
    if (isSignedIn && inAuthGroup) router.replace('/(tabs)')
  }, [isSignedIn, isLoaded])

  return <Slot />
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <QueryClientProvider client={queryClient}>
        <AuthGuard />
      </QueryClientProvider>
    </ClerkProvider>
  )
}
```

## Navigation Structure

```
app/
  _layout.tsx             ← Root layout (providers + auth guard)
  (auth)/
    _layout.tsx           ← Auth stack layout
    sign-in.tsx
    sign-up.tsx
  (tabs)/
    _layout.tsx           ← Tab bar layout
    index.tsx             ← Home tab
    profile.tsx           ← Profile tab
    [feature]/
      index.tsx           ← Feature list screen
      [id].tsx            ← Feature detail screen
```

## NativeWind Styling

```typescript
// tailwind.config.js (in apps/mobile)
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
}

// babel.config.js — add NativeWind preset
module.exports = { presets: ['babel-preset-expo', 'nativewind/babel'] }
```

```typescript
// Good — NativeWind className
<View className="flex-1 bg-white p-4">
  <Text className="text-2xl font-bold text-gray-900">Hello</Text>
  <TouchableOpacity className="bg-blue-600 rounded-lg p-3 mt-4">
    <Text className="text-white text-center font-semibold">Submit</Text>
  </TouchableOpacity>
</View>
```

## Auth — Clerk Expo

```typescript
// (auth)/sign-in.tsx
import { useSignIn } from '@clerk/expo'
import { useState } from 'react'

export default function SignIn() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const onSignIn = async () => {
    if (!isLoaded) return
    const result = await signIn.create({ identifier: email, password })
    if (result.status === 'complete') {
      await setActive({ session: result.createdSessionId })
    }
  }

  return (
    <View className="flex-1 justify-center p-6">
      <TextInput
        className="border border-gray-300 rounded-lg p-3 mb-4"
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        autoCapitalize="none"
      />
      <TextInput
        className="border border-gray-300 rounded-lg p-3 mb-4"
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      <TouchableOpacity onPress={onSignIn} className="bg-blue-600 rounded-lg p-4">
        <Text className="text-white text-center font-bold">Sign In</Text>
      </TouchableOpacity>
    </View>
  )
}
```

## API Calls — TanStack Query

```typescript
// lib/api.ts — typed API client
import { useAuth } from '@clerk/expo'

export function useApiClient() {
  const { getToken } = useAuth()
  
  return {
    get: async <T>(path: string): Promise<T> => {
      const token = await getToken()
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    post: async <T>(path: string, body: unknown): Promise<T> => {
      const token = await getToken()
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
  }
}

// hooks/use-posts.ts — feature-specific hook
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Post, CreatePostInput } from '@repo/types'

export function usePosts() {
  const api = useApiClient()
  return useQuery<Post[]>({
    queryKey: ['posts'],
    queryFn: () => api.get('/posts'),
  })
}

export function useCreatePost() {
  const api = useApiClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePostInput) => api.post<Post>('/posts', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  })
}
```

## Environment Variables

Expo env vars need `EXPO_PUBLIC_` prefix for client access:
```
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
EXPO_PUBLIC_API_URL=http://localhost:3001
```

## Shared Types (Turborepo)

```typescript
// Import types from shared package, not local definitions
import type { Post, CreatePostInput } from '@repo/types'

// This ensures mobile + web + API all use same type contracts
```

## Screen Patterns

Every list screen:
1. Loading state (ActivityIndicator or skeleton)
2. Error state (error message + retry button)
3. Empty state (message + CTA button)
4. Populated state (FlatList with pull-to-refresh)

```typescript
export default function PostsScreen() {
  const { data: posts, isLoading, error, refetch } = usePosts()

  if (isLoading) return <View className="flex-1 items-center justify-center"><ActivityIndicator /></View>
  if (error) return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-red-500 mb-4">Failed to load posts</Text>
      <TouchableOpacity onPress={() => refetch()} className="bg-blue-600 rounded-lg px-4 py-2">
        <Text className="text-white">Retry</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <FlatList
      data={posts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <PostCard post={item} />}
      onRefresh={refetch}
      refreshing={isLoading}
      ListEmptyComponent={<EmptyState message="No posts yet" cta="Create your first post" />}
      contentContainerClassName="p-4 gap-3"
    />
  )
}
```
