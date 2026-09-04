'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CreatePrivateRoom() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleCreateRoom = () => {
    setLoading(true)
    // Generates a random 10-character string (e.g., "x8k2p9m4q1")
    const randomRoomId = Math.random().toString(36).substring(2, 12)
    router.push(`/rooms/${randomRoomId}`)
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-start">
      <h3 className="text-lg font-bold text-gray-900 mb-1">Create a Private Room</h3>
      <p className="text-sm text-gray-500 mb-4">
        Generate a secure, unguessable link to study with your friends.
      </p>
      <button
        onClick={handleCreateRoom}
        disabled={loading}
        className="px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-800 transition text-sm disabled:opacity-75"
      >
        {loading ? 'Creating...' : '+ New Private Room'}
      </button>
    </div>
  )
}