import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '@/config/firebase'
import { authAPI, resetLogoutFlag } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import toast from 'react-hot-toast'
import { Loader2, AlertCircle } from 'lucide-react'
import { AppLogo } from '@/components/ui/AppLogo'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState<string | null>(null)

  // Reset logout flag and check for auth messages on mount
  useEffect(() => {
    resetLogoutFlag()

    const message = sessionStorage.getItem('auth_message')
    if (message) {
      setAuthMessage(message)
      sessionStorage.removeItem('auth_message')
    }
  }, [])

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      
      const response = await authAPI.googleLogin({
        id_token: idToken,
        device_uuid: generateDeviceUUID(),
        fingerprint_hash: generateDeviceFingerprint(),
        platform: 'WEB',
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

    } catch (error: any) {
      console.error('Login error:', error)
      
      // Ignore COOP warning
      if (error.message?.includes('Cross-Origin-Opener-Policy')) {
        return
      }
      
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in cancelled')
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error)
      } else {
        toast.error('Failed to sign in')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <AppLogo size="lg" showTagline />
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Session expiry message */}
          {authMessage && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800">{authMessage}</p>
              </div>
            </div>
          )}

          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Welcome Back
          </h2>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function generateDeviceUUID(): string {
  return localStorage.getItem('device_uuid') || 
    (() => {
      const uuid = crypto.randomUUID()
      localStorage.setItem('device_uuid', uuid)
      return uuid
    })()
}

function generateDeviceFingerprint(): string {
  const data = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width + 'x' + screen.height,
  ].join('|')
  
  return btoa(data)
}