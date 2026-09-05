'use client'
import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function OnboardingModal({ userId }: { userId: string }) {
  const [show, setShow] = useState(false)
  const [formData, setFormData] = useState({ college: '', course: '', year: '', skills: '' })
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function checkProfile() {
      const { data } = await supabase.from('profiles').select('college, course').eq('id', userId).single();
      // If essential fields are missing, show the modal
      if (!data?.college || !data?.course) {
        setShow(true);
      }
    }
    checkProfile();
  }, [userId, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('profiles').update(formData).eq('id', userId);
    setShow(false); // Hide modal and let them see the dashboard
    window.location.reload();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Welcome to Productivholic!</h2>
        <p className="text-gray-600 mb-6">Let's set up your academic profile before you start.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="College / University" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, college: e.target.value})} />
          <input required placeholder="Course Name (e.g., B.Tech CSE)" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, course: e.target.value})} />
          <input required placeholder="Year (e.g., 3rd Year)" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, year: e.target.value})} />
          <input required placeholder="Current Skills (e.g., HTML, Python)" className="w-full border p-2 rounded" onChange={e => setFormData({...formData, skills: e.target.value})} />
          
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-bold hover:bg-blue-700">Save Profile</button>
        </form>
      </div>
    </div>
  )
}