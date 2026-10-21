import { router } from 'expo-router'
import { AuthForm } from '@/components/AuthForm'
import { supabase } from '@/lib/supabase'

export default function SignUpScreen() {
  return (
    <AuthForm
      title="Create account"
      submitLabel="Sign up"
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerHref="/(auth)/sign-in"
      onSubmit={async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) return error.message
        if (!data.session) return 'Check your email to confirm your account, then sign in.'
        router.replace('/')
        return null
      }}
    />
  )
}
