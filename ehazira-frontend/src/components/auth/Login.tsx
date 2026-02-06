import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup, GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { auth, googleProvider } from '@/config/firebase'
import { authAPI, resetLogoutFlag } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import { Loader2, AlertCircle } from 'lucide-react'
import { AppLogo } from '@/components/ui/AppLogo'
import { getDeviceUUID, getDeviceFingerprint, getPlatform } from '@/utils/native'

// Lazy-load native Google Auth (only available on mobile)
let GoogleAuth: any = null
let isNativePlatform = false

async function initNativeAuth() {
  try {
    const { Capacitor } = await import('@capacitor/core')
    isNativePlatform = Capacitor.isNativePlatform()
    if (isNativePlatform) {
      const mod = await import('@codetrix-studio/capacitor-google-auth')
      GoogleAuth = mod.GoogleAuth
      await GoogleAuth.initialize()
    }
  } catch {
    isNativePlatform = false
  }
}

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  useEffect(() => {
    resetLogoutFlag()
    initNativeAuth()

    const message = localStorage.getItem('auth_message')
    if (message) {
      setAuthMessage(message)
      localStorage.removeItem('auth_message')
    }
  }, [])

  const completeLogin = async (idToken: string) => {
    const [deviceUuid, fingerprintHash, platform] = await Promise.all([
      getDeviceUUID(),
      getDeviceFingerprint(),
      getPlatform(),
    ])

    const response = await authAPI.googleLogin({
      id_token: idToken,
      device_uuid: deviceUuid,
      fingerprint_hash: fingerprintHash,
      platform,
    })

    setAuth(
      response.access_token,
      response.refresh_token,
      response.user_info
    )

    toast.success(`Welcome ${response.user_info.name}!`)

    if (response.user_type === 'teacher') {
      navigate('/teacher')
    } else if (response.user_type === 'student') {
      navigate('/student')
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)

    try {
      if (isNativePlatform && GoogleAuth) {
        // Native Google Sign-In (mobile)
        const result = await GoogleAuth.signIn()
        console.log('Native sign-in result keys:', Object.keys(result))

        const idToken = result.authentication?.idToken || result.idToken
        console.log('ID token present:', !!idToken, 'type:', typeof idToken)

        if (!idToken || idToken === 'null') {
          throw new Error('No ID token received from Google Sign-In. Check serverClientId configuration.')
        }

        // Use the Google ID token to sign into Firebase
        console.log('Creating Firebase credential...')
        const credential = GoogleAuthProvider.credential(idToken)

        console.log('Signing into Firebase...')
        const firebaseResult = await signInWithCredential(auth, credential)
        console.log('Firebase sign-in success, getting ID token...')

        const firebaseIdToken = await firebaseResult.user.getIdToken()
        console.log('Firebase ID token obtained, calling backend...')

        await completeLogin(firebaseIdToken)
      } else {
        // Web: use Firebase popup
        const result = await signInWithPopup(auth, googleProvider)
        const idToken = await result.user.getIdToken()
        await completeLogin(idToken)
      }
    } catch (error: any) {
      console.error('Login error:', JSON.stringify({
        message: error.message,
        code: error.code,
        status: error.status,
        data: error.response?.data,
      }))

      if (error.message?.includes('Cross-Origin-Opener-Policy')) {
        return
      }

      if (error.code === 'auth/popup-closed-by-user' || error.message?.includes('canceled') || error.message?.includes('cancelled')) {
        toast.error('Sign-in cancelled')
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        // Show actual error details for debugging
        const errMsg = error.message || error.code || 'Unknown error'
        toast.error(`Sign-in failed: ${errMsg}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />

      {/* Floating orbs for depth */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-orange-400/20 dark:bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-300/10 dark:bg-amber-600/5 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo + Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-4">
            {/* Glow behind logo */}
            <div className="absolute inset-0 w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl blur-xl opacity-40 scale-110" />
            <img
              src="/logo.jpg"
              alt="Rta"
              className="relative w-16 h-16 rounded-2xl shadow-xl object-cover ring-2 ring-white/50 dark:ring-white/10"
            />
          </div>
          <span className="text-3xl font-heading font-bold tracking-tight bg-gradient-to-br from-amber-700 via-orange-600 to-amber-700 bg-clip-text text-transparent dark:from-amber-300 dark:via-orange-400 dark:to-amber-400">
            Ṛta
          </span>
          <span className="text-[11px] text-amber-800/60 dark:text-amber-400/50 font-medium tracking-[0.2em] uppercase mt-1">
            Real-time Attendance
          </span>
        </div>

        {/* Glass card */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-white/5 rounded-3xl shadow-2xl shadow-amber-900/5 dark:shadow-black/30 border border-white/60 dark:border-white/10 p-8">
          {/* Session expiry message */}
          {authMessage && (
            <div className="mb-6 p-3 bg-amber-100/80 dark:bg-amber-900/30 border border-amber-200/60 dark:border-amber-700/30 rounded-xl flex items-start gap-2.5 backdrop-blur-sm">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300">{authMessage}</p>
            </div>
          )}

          <h2 className="text-xl font-heading font-semibold text-slate-800 dark:text-white mb-1 text-center">
            Welcome Back
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-8">
            Sign in to mark or manage attendance
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-white/10 backdrop-blur-sm border border-slate-200/80 dark:border-white/10 rounded-2xl px-5 py-3.5 text-slate-700 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-white/15 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-400 dark:text-slate-600 mt-8">
          Secure attendance powered by GPS & OTP
        </p>
      </div>
    </div>
  )
}
