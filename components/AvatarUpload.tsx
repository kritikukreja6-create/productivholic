'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function AvatarUpload({ 
  userId, 
  username, 
  initialAvatarUrl 
}: { 
  userId: string; 
  username: string; 
  initialAvatarUrl: string | null;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}-${Math.random()}.${fileExt}`;

      // 1. Upload the image to the 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get the public URL for the newly uploaded image
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const newAvatarUrl = data.publicUrl;

      // 3. Update the profiles table with the new URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: newAvatarUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update the UI immediately and refresh the server data
      setAvatarUrl(newAvatarUrl);
      router.refresh();
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(error.message || 'Error uploading image.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <label className={`cursor-pointer relative group ${uploading ? 'opacity-50' : ''}`}>
      <div className="w-28 h-28 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-5xl font-black border-4 border-white shadow-md overflow-hidden ring-2 ring-blue-100 transition-all">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          username.charAt(0).toUpperCase()
        )}
      </div>
      
      <input 
        type="file" 
        className="hidden" 
        accept="image/*" 
        onChange={handleUpload}
        disabled={uploading}
      />
      
      <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-white text-sm font-semibold">
          {uploading ? 'Uploading...' : 'Upload Pic'}
        </span>
      </div>
    </label>
  );
}