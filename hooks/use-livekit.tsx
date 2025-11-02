"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, Track, AudioTrack } from "livekit-client"

/**
 * useLiveKit Hook
 * 
 * Provides LiveKit voice room functionality with video recording capabilities.
 * 
 * Recording Features:
 * - Manual start/stop recording via user controls
 * - Requires screen/tab sharing for video recording
 * - Captures screen/tab video with system audio
 * - Captures local microphone audio (voice input)
 * - Captures all remote participant audio
 * - Automatically downloads video recording as .webm or .mp4 file on stop
 * - Shows recording duration in real-time
 * 
 * Usage:
 * - Call startRecording() when user clicks record button (prompts for screen share)
 * - Call stopRecording() when user clicks stop button
 * - Recording state and duration are exposed via isRecording and recordingDuration
 * 
 * Important: User must select screen/tab to share when recording starts
 */

interface LiveKitUser {
  id: string
  name: string
  isSpeaking: boolean
  audioLevel: number
  isMuted: boolean
}

export function useLiveKit(roomName: string, participantName: string, isAdmin: boolean = false) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [users, setUsers] = useState<LiveKitUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)

  const roomRef = useRef<Room | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const recordingMicRef = useRef<MediaStream | null>(null)
  const recordingAudioContextRef = useRef<AudioContext | null>(null)
  const recordingGainNodesRef = useRef<Map<string, GainNode>>(new Map())

  // Initialize audio analysis for voice detection
  const initializeAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // Use 48kHz for better recording quality
          channelCount: 1,
        } as MediaTrackConstraints,
      })

      localStreamRef.current = stream

      // Create audio context for voice activity detection
      audioContextRef.current = new AudioContext({ sampleRate: 48000 })
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
        
        // Subscribe to all audio tracks from the new participant
        participant.audioTrackPublications.forEach((publication) => {
          if (publication.trackSid && !publication.isSubscribed) {
            publication.setSubscribed(true)
            console.log(`Subscribing to new participant ${participant.identity} audio track`)
          }
        })
        
        // Listen for new tracks from this participant
        participant.on('trackSubscribed', (track: Track, publication: any) => {
          if (track.kind === Track.Kind.Audio) {
            const audioTrack = track as AudioTrack
            if (audioTrack.mediaStreamTrack) {
              audioTrack.mediaStreamTrack.enabled = true
              console.log(`New audio track enabled from ${participant.identity}`)
            }
          }
        })
        
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
          
          // Ensure the track is enabled
          if (audioTrack.mediaStreamTrack) {
            audioTrack.mediaStreamTrack.enabled = true
            console.log(`Audio track enabled for ${participant.identity}:`, {
              enabled: audioTrack.mediaStreamTrack.enabled,
              readyState: audioTrack.mediaStreamTrack.readyState,
              label: audioTrack.mediaStreamTrack.label,
            })
          }
          
          const stream = new MediaStream([audioTrack.mediaStreamTrack])
          
          // Ensure all tracks in the stream are enabled
          stream.getAudioTracks().forEach(track => {
            track.enabled = true
            console.log(`Stream audio track enabled: ${track.label}`)
          })
          
          setRemoteStreams((prev) => {
            const next = new Map(prev)
            next.set(participant.identity, stream)
            console.log(`Added remote stream for ${participant.identity}, total streams: ${next.size}`)
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

      // Listen for data messages (mute commands from admin)
      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant: any, kind: any, topic: string | undefined) => {
        if (topic === 'mute-command' && payload.length > 0) {
          const shouldMute = payload[0] === 1
          console.log(`Received mute command: ${shouldMute ? 'mute' : 'unmute'}`)
          // Apply mute locally
          if (room.localParticipant) {
            room.localParticipant.setMicrophoneEnabled(!shouldMute)
            setIsMuted(shouldMute)
          }
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

      // Ensure we subscribe to all existing remote participants' audio tracks
      room.remoteParticipants.forEach((participant) => {
        participant.audioTrackPublications.forEach((publication) => {
          if (publication.isSubscribed && publication.track) {
            // Track is already subscribed, ensure it's enabled
            const track = publication.track as AudioTrack
            if (track.mediaStreamTrack) {
              track.mediaStreamTrack.enabled = true
              console.log(`Enabled existing audio track from ${participant.identity}`)
            }
          } else if (!publication.isSubscribed && publication.trackSid) {
            // Subscribe to the track (if it exists but not subscribed)
            publication.setSubscribed(true)
            console.log(`Subscribing to audio track from ${participant.identity}`)
          }
        })
      })

    } catch (err) {
      console.error("Failed to join LiveKit room:", err)
      setError("Failed to connect to room")
    }
    }, [roomName, participantName, isAdmin, initializeAudioAnalysis])

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
        isAdmin,
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
    console.log('toggleMute called, roomRef:', !!roomRef.current, 'localParticipant:', !!roomRef.current?.localParticipant)
    if (roomRef.current?.localParticipant) {
      try {
        // Toggle microphone mute state
        const audioTrackPublications = roomRef.current.localParticipant.audioTrackPublications
        console.log('Audio track publications:', audioTrackPublications.size)
        if (audioTrackPublications.size > 0) {
          const audioTrack = Array.from(audioTrackPublications.values())[0]
          const newMutedState = !audioTrack.isMuted
          console.log('Current muted state:', audioTrack.isMuted, 'New state:', newMutedState)
          
          // Use the local participant's setMicrophoneEnabled method
          await roomRef.current.localParticipant.setMicrophoneEnabled(!newMutedState)
          setIsMuted(newMutedState)
          console.log(`Room microphone ${newMutedState ? 'muted' : 'unmuted'} (affects both room and recording)`)
        } else {
          console.warn('No audio track found to mute/unmute')
        }
      } catch (error) {
        console.error('Error toggling mute:', error)
      }
    } else {
      console.warn('No room or local participant available for mute toggle - toggling UI state only')
      // Fallback: just toggle the UI state when room is disconnected
      setIsMuted(prev => !prev)
    }
  }, [])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      if (!roomRef.current) {
        throw new Error("Not connected to room")
      }

      // Collect all tracks (video + audio) for recording
      const videoTracks: MediaStreamTrack[] = []
      const audioTracks: MediaStreamTrack[] = []

      // Request screen/tab sharing with audio
      // Note: Browser security requires user to manually select the tab
      try {
        // Try to get screen/window/tab sharing
        screenStreamRef.current = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } as MediaTrackConstraints,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            suppressLocalAudioPlayback: false,
            systemAudio: "include" // Request system/tab audio
          } as MediaTrackConstraints
        })

        // Add screen video track
        const screenVideoTracks = screenStreamRef.current.getVideoTracks()
        if (screenVideoTracks.length > 0) {
          videoTracks.push(...screenVideoTracks)
          console.log("Added screen video track:", screenVideoTracks[0].label)
        }

        // Add screen audio track
        const screenAudioTracks = screenStreamRef.current.getAudioTracks()
        if (screenAudioTracks.length > 0) {
          audioTracks.push(...screenAudioTracks)
          console.log("Added screen audio track:", screenAudioTracks[0].label)
        }
      } catch (screenErr) {
        console.error("Failed to get screen/video stream:", screenErr)
        throw new Error("Screen sharing is required to record video. Please select the current tab and enable 'Share tab audio' when prompted.")
      }

      // Add local microphone track (voice input)
      // Use the existing room microphone to prevent room disconnection
      if (localStreamRef.current) {
        const micAudioTracks = localStreamRef.current.getAudioTracks()
        if (micAudioTracks.length > 0) {
          audioTracks.push(...micAudioTracks)
          recordingMicRef.current = localStreamRef.current
          console.log("Added room microphone for recording (prevents room disconnection)")
        }
      }

      // Add all remote participant audio tracks
      remoteStreams.forEach((stream) => {
        const remoteAudioTracks = stream.getAudioTracks()
        audioTracks.push(...remoteAudioTracks)
        console.log(`Added ${remoteAudioTracks.length} remote audio track(s)`)
      })

      if (videoTracks.length === 0) {
        throw new Error("No video track available to record")
      }

      // Warn if no audio tracks, but don't fail - might still want to record video
      if (audioTracks.length === 0) {
        console.warn("No audio tracks available - recording video only")
      } else {
        console.log(`Total audio tracks to record: ${audioTracks.length}`)
      }

      console.log(`Recording ${videoTracks.length} video track(s) and ${audioTracks.length} audio track(s)`)
      
      // Log audio track details
      audioTracks.forEach((track, index) => {
        console.log(`  Audio track ${index + 1}: kind=${track.kind}, label=${track.label}, enabled=${track.enabled}, muted=${track.muted}`)
      })

      // Create an audio context to mix all audio tracks together
      const audioContext = new AudioContext({ sampleRate: 48000 })
      recordingAudioContextRef.current = audioContext
      const destination = audioContext.createMediaStreamDestination()
      
      // Connect all audio tracks to the destination (mixer)
      audioTracks.forEach((track, index) => {
        const source = audioContext.createMediaStreamSource(new MediaStream([track]))
        const gainNode = audioContext.createGain()
        gainNode.gain.value = 1.0 // Full volume for each track
        source.connect(gainNode)
        gainNode.connect(destination)
        
        // Note: Recording microphone is independent from room mute, so no need to store gain nodes for mute control
        
        console.log(`Connected audio track ${index + 1} to mixer`)
      })
      
      // Combine video tracks with mixed audio
      const recordingStream = new MediaStream([...videoTracks, ...destination.stream.getAudioTracks()])
      
      console.log("Recording stream created with tracks:", recordingStream.getTracks().map(t => `${t.kind}:${t.label}`))
      console.log(`Final audio tracks in recording: ${recordingStream.getAudioTracks().length}`)

             // Create MediaRecorder with video MIME types (prioritize MP4)
       const mimeTypes = [
         'video/mp4',
         'video/webm;codecs=vp9,opus',
         'video/webm;codecs=vp8,opus',
         'video/webm'
       ]

       let selectedMimeType = ''
       for (const mimeType of mimeTypes) {
         if (MediaRecorder.isTypeSupported(mimeType)) {
           selectedMimeType = mimeType
           console.log(`Using MIME type: ${mimeType}`)
           break
         }
       }

       if (!selectedMimeType) {
         throw new Error("No supported video recording format found")
       }

       const mediaRecorder = new MediaRecorder(recordingStream, {
         mimeType: selectedMimeType,
         videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
         audioBitsPerSecond: 128000   // 128 kbps for audio
       })

      recordingChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        try {
          // Create a blob from all chunks
          const blob = new Blob(recordingChunksRef.current, { type: selectedMimeType })
          
          // Create download link
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const extension = selectedMimeType.includes('mp4') ? 'mp4' : 'webm'
          a.download = `recording-${roomName}-${timestamp}.${extension}`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)

          console.log("Video recording saved:", a.download)
          setError(null)

          // Stop screen share tracks
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
            screenStreamRef.current = null
          }
        } catch (err) {
          console.error("Failed to save recording:", err)
          setError("Failed to save recording")
        } finally {
          recordingChunksRef.current = []
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event)
        setError("Recording error occurred")
      }

      mediaRecorderRef.current = mediaRecorder

      // Start recording
      mediaRecorder.start(1000) // Collect data every second
      setIsRecording(true)
      setRecordingDuration(0)

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1)
      }, 1000)

      console.log("Recording started with format:", selectedMimeType)
    } catch (err) {
      console.error("Failed to start recording:", err)
      setError("Failed to start recording: " + (err as Error).message)
    }
  }, [roomName, remoteStreams])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      
      // Stop recording stream tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
      }

      // Stop screen share tracks if any
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
        screenStreamRef.current = null
      }

      // Don't stop the room microphone - it's shared with recording
      // Just clear the reference
      recordingMicRef.current = null

      // Clean up recording audio context
      if (recordingAudioContextRef.current) {
        recordingAudioContextRef.current.close()
        recordingAudioContextRef.current = null
      }
      recordingGainNodesRef.current.clear()

      mediaRecorderRef.current = null
      setIsRecording(false)

      // Stop timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }

      console.log("Recording stopped")
    }
  }, [isRecording])

  // Mute remote participant (admin only)
  const muteRemoteParticipant = useCallback(async (roomCode: string, targetUserId: number, adminUserId: number, muted: boolean) => {
    try {
      // Update database
      const response = await fetch(`/api/rooms/${roomCode}/members/${targetUserId}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminUserId,
          muted,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to mute participant')
      }

      // Send LiveKit data message to notify participant
      if (roomRef.current && isAdmin) {
        // Try to find participant by identity (could be user ID string or username)
        const remoteParticipant = Array.from(roomRef.current.remoteParticipants.values())
          .find(p => {
            // Check if identity matches user ID (as string or number)
            return p.identity === String(targetUserId) || 
                   p.identity === targetUserId.toString() ||
                   p.name === String(targetUserId)
          })
        
        if (remoteParticipant) {
          // Use data channel to send mute command
          // Note: LiveKit doesn't support direct remote muting, so we notify via data
          const data = new Uint8Array([muted ? 1 : 0])
          roomRef.current.localParticipant.publishData(data, {
            topic: 'mute-command',
            destinationIdentities: [remoteParticipant.identity],
          })
        } else {
          // Broadcast to all participants if we can't find the specific one
          // They'll check their DB status anyway
          console.log(`Could not find participant ${targetUserId} to send mute command, but DB updated`)
        }
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to mute remote participant:', error)
      throw error
    }
  }, [isAdmin])

  // Leave room
  const leaveRoom = useCallback(async () => {
    // Stop recording if active
    if (isRecording) {
      stopRecording()
    }

    if (roomRef.current) {
      console.log('Disconnecting from room...')
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
  }, [isRecording, stopRecording])

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
    isRecording,
    recordingDuration,
    joinRoom,
    leaveRoom,
    toggleMute,
    startRecording,
    stopRecording,
    muteRemoteParticipant,
    room: roomRef.current,
  }
}
