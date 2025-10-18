"use client"

import { useState } from 'react'
import { useLiveKit } from '@/hooks/use-livekit'

interface LiveKitAudioRoomProps {
  roomName: string
  participantName: string
}

export default function LiveKitAudioRoom({ roomName, participantName }: LiveKitAudioRoomProps) {
  const [isJoined, setIsJoined] = useState(false)
  const {
    isConnected,
    isMuted,
    audioLevel,
    users,
    error,
    remoteStreams,
    joinRoom,
    leaveRoom,
    toggleMute,
  } = useLiveKit(roomName, participantName)

  const handleJoin = async () => {
    try {
      await joinRoom()
      setIsJoined(true)
    } catch (err) {
      console.error('Failed to join room:', err)
    }
  }

  const handleLeave = async () => {
    try {
      await leaveRoom()
      setIsJoined(false)
    } catch (err) {
      console.error('Failed to leave room:', err)
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">LiveKit Audio Room</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600">Room: {roomName}</p>
        <p className="text-sm text-gray-600">Participant: {participantName}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </p>
        <p className="text-sm text-gray-600">
          Audio Level: {Math.round(audioLevel)}
        </p>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Participants ({users.length})</h3>
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded mb-1">
            <span className="text-sm">{user.name}</span>
            <div className="flex items-center space-x-2">
              {user.isSpeaking && <span className="text-green-500">🎤</span>}
              {user.isMuted && <span className="text-red-500">🔇</span>}
              <span className="text-xs text-gray-500">Level: {Math.round(user.audioLevel)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        {!isJoined ? (
          <button
            onClick={handleJoin}
            className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Join Room
          </button>
        ) : (
          <>
            <button
              onClick={toggleMute}
              className={`flex-1 font-bold py-2 px-4 rounded ${
                isMuted 
                  ? 'bg-red-500 hover:bg-red-700 text-white' 
                  : 'bg-green-500 hover:bg-green-700 text-white'
              }`}
            >
              {isMuted ? '🔇 Unmute' : '🎤 Mute'}
            </button>
            <button
              onClick={handleLeave}
              className="flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Leave Room
            </button>
          </>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Remote Streams ({remoteStreams.size})</h3>
        {Array.from(remoteStreams.entries()).map(([participantId, stream]) => (
          <div key={participantId} className="p-2 bg-blue-50 rounded mb-1">
            <p className="text-sm">Participant: {participantId}</p>
            <p className="text-xs text-gray-500">
              Audio tracks: {stream.getAudioTracks().length}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
