'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/') // Redirects back to login/home
    router.refresh()
  }

  return (
    <button 
      onClick={handleLogout} 
      className="text-sm font-semibold text-gray-500 hover:text-red-600 transition px-3 py-1 border border-transparent hover:border-red-100 hover:bg-red-50 rounded"
    >
      Logout
    </button>
  )
}