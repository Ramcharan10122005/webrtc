"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, Track, AudioTrack } from "livekit-client"

interface LiveKitUser {
  id: string
  name: string
  isSpeaking: boolean
  audioLevel: number
  isMuted: boolean
}

export function useLiveKit(roomName: string, participantName: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [users, setUsers] = useState<LiveKitUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())

  const roomRef = useRef<Room | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()

  // Initialize audio analysis for voice detection
  const initializeAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        } as MediaTrackConstraints,
      })

      localStreamRef.current = stream

      // Create audio context for voice activity detection
      audioContextRef.current = new AudioContext({ sampleRate: 16000 })
      const source = audioContextRef.current.createMediaStreamSource(stream)
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      source.connect(analyserRef.current)

      // Start audio level monitoring
      const monitorAudioLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)

          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
          setAudioLevel(average)

          animationFrameRef.current = requestAnimationFrame(monitorAudioLevel)
        }
      }

      monitorAudioLevel()
    } catch (err) {
      setError("Failed to access microphone")
      console.error("Audio initialization error:", err)
    }
  }, [])

  // Join LiveKit room
  const joinRoom = useCallback(async () => {
    try {
      await initializeAudioAnalysis()

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        publishDefaults: {
          audioPreset: {
            maxBitrate: 16000,
            priority: 'high',
          },
        },
      })

      roomRef.current = room

      // Set up event listeners
      room.on(RoomEvent.Connected, () => {
        console.log("Connected to LiveKit room")
        setIsConnected(true)
        setError(null)
        
        // Initialize mute state
        const audioTrackPublications = room.localParticipant.audioTrackPublications
        if (audioTrackPublications.size > 0) {
          const audioTrack = Array.from(audioTrackPublications.values())[0]
          setIsMuted(audioTrack.isMuted)
        }
      })

      room.on(RoomEvent.Disconnected, () => {
        console.log("Disconnected from LiveKit room")
        setIsConnected(false)
      })

      room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log(`Participant connected: ${participant.identity}`)
        updateUsers()
      })

      room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log(`Participant disconnected: ${participant.identity}`)
        setRemoteStreams((prev) => {
          const next = new Map(prev)
          next.delete(participant.identity)
          return next
        })
        updateUsers()
      })

      room.on(RoomEvent.TrackSubscribed, (track: Track, publication: any, participant: RemoteParticipant) => {
        console.log(`Track subscribed: ${track.kind} from ${participant.identity}`)
        
        if (track.kind === Track.Kind.Audio) {
          const audioTrack = track as AudioTrack
          const stream = new MediaStream([audioTrack.mediaStreamTrack])
          
          setRemoteStreams((prev) => {
            const next = new Map(prev)
            next.set(participant.identity, stream)
            return next
          })
        }
      })

      room.on(RoomEvent.TrackUnsubscribed, (track: Track, publication: any, participant: RemoteParticipant) => {
        console.log(`Track unsubscribed: ${track.kind} from ${participant.identity}`)
        
        if (track.kind === Track.Kind.Audio) {
          setRemoteStreams((prev) => {
            const next = new Map(prev)
            next.delete(participant.identity)
            return next
          })
        }
      })

      // Listen for local participant mute state changes
      room.on(RoomEvent.TrackMuted, (publication: any, participant: any) => {
        if (publication.kind === Track.Kind.Audio && participant === room.localParticipant) {
          setIsMuted(true)
          console.log('Local microphone muted')
        }
      })

      room.on(RoomEvent.TrackUnmuted, (publication: any, participant: any) => {
        if (publication.kind === Track.Kind.Audio && participant === room.localParticipant) {
          setIsMuted(false)
          console.log('Local microphone unmuted')
        }
      })

      // Connect to LiveKit room
      const token = await getLiveKitToken(roomName, participantName)
      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://webrtc-fllhyq2h.livekit.cloud", token)

      // Enable microphone
      if (localStreamRef.current) {
        await room.localParticipant.setMicrophoneEnabled(true)
        console.log("Microphone enabled")
      }

    } catch (err) {
      console.error("Failed to join LiveKit room:", err)
      setError("Failed to connect to room")
    }
  }, [roomName, participantName, initializeAudioAnalysis])

  // Get LiveKit token (you'll need to implement this on your backend)
  const getLiveKitToken = async (roomName: string, participantName: string): Promise<string> => {
    // For now, we'll use a simple token generation
    // In production, you should generate tokens on your backend
    const response = await fetch('/api/livekit-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomName,
        participantName,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to get LiveKit token')
    }

    const { token } = await response.json()
    return token
  }

  // Update users list
  const updateUsers = useCallback(() => {
    if (!roomRef.current) return

    const participants = roomRef.current.remoteParticipants
    const usersList: LiveKitUser[] = []

    participants.forEach((participant) => {
      // Check if participant has audio tracks and their mute status
      const audioTracks = participant.audioTrackPublications
      const isMuted = audioTracks.size > 0 ? Array.from(audioTracks.values())[0].isMuted : true
      
      usersList.push({
        id: participant.identity,
        name: participant.name || participant.identity,
        isSpeaking: participant.isSpeaking,
        audioLevel: participant.audioLevel || 0,
        isMuted: isMuted,
      })
    })

    setUsers(usersList)
  }, [])

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (roomRef.current?.localParticipant) {
      try {
        // Toggle microphone mute state
        const audioTrackPublications = roomRef.current.localParticipant.audioTrackPublications
        if (audioTrackPublications.size > 0) {
          const audioTrack = Array.from(audioTrackPublications.values())[0]
          const newMutedState = !audioTrack.isMuted
          
          // Use the local participant's setMicrophoneEnabled method
          await roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState)
          setIsMuted(newMutedState)
          console.log(`Microphone ${newMutedState ? 'muted' : 'unmuted'}`)
        } else {
          console.warn('No audio track found to mute/unmute')
        }
      } catch (error) {
        console.error('Error toggling mute:', error)
      }
    }
  }, [])

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect()
      roomRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    setRemoteStreams(new Map())
    setIsConnected(false)
    setAudioLevel(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom()
    }
  }, [leaveRoom])

  return {
    isConnected,
    isMuted,
    audioLevel,
    users,
    error,
    remoteStreams,
    joinRoom,
    leaveRoom,
    toggleMute,
  }
}
