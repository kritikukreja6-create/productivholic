'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function EditProfile({ userId }: { userId: string }) {
  const [college, setCollege] = useState('')
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      // Creates a unique file name so users don't overwrite each other's photos
      const filePath = `${userId}-${Math.random()}.${fileExt}`

      // 1. Upload to the 'avatars' storage bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Get the public URL to display the image
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)
      
    } catch (error) {
      alert('Error uploading avatar!')
      console.error(error)
    } finally {
      setUploading(false)
    }
  }

  const saveProfile = async () => {
    // 3. Save the text and the image URL to the database
    const { error } = await supabase
      .from('profiles')
      .update({ college: college, avatar_url: avatarUrl })
      .eq('id', userId)

    if (error) {
      alert('Error saving profile!')
    } else {
      alert('Profile updated successfully!')
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-md">
      <h2 className="text-xl font-bold mb-4 text-gray-900">Edit Profile</h2>

      <div className="space-y-4">
        {/* Avatar Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
          {avatarUrl && (
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="w-24 h-24 rounded-full object-cover mb-4 border-2 border-gray-100 shadow-sm" 
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
          />
        </div>

        {/* College Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">College / University</label>
          <input
            type="text"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
            placeholder="e.g., GTBIT"
            className="w-full p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white outline-none"
          />
        </div>

        <button
          onClick={saveProfile}
          disabled={uploading}
          className="w-full bg-gray-900 text-white p-2.5 rounded-lg font-semibold hover:bg-gray-800 transition disabled:opacity-75 mt-2"
        >
          {uploading ? 'Uploading...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}