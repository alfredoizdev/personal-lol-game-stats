import { router } from 'expo-router'
import { AuthForm } from '@/components/AuthForm'
import { supabase } from '@/lib/supabase'

export default function SignInScreen() {
  return (
    <AuthForm
      title="Sign in"
      submitLabel="Sign in"
      footerText="No account yet?"
      footerLinkLabel="Create one"
      footerHref="/(auth)/sign-up"
      onSubmit={async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return error.message
        router.replace('/')
        return null
      }}
    />
  )
}
