"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface WebRTCUser {
  id: string
  name: string
  stream?: MediaStream
  isSpeaking: boolean
  audioLevel: number
}

export function useWebRTC(roomId: string, userId: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [users, setUsers] = useState<WebRTCUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())

  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number>()
  const wsRef = useRef<WebSocket | null>(null)
  const clientIdRef = useRef<string>(typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

  // Initialize audio context and analyzer for voice detection
  const initializeAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
          volume: 1.0,
        } as MediaTrackConstraints,
      })

      localStreamRef.current = stream

      // Create audio context for voice activity detection (match WebRTC sample rate)
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

  // Create/Get a peer connection for a given peer id
  const ensurePeerConnection = useCallback((peerId: string) => {
    let pc = peerConnectionsRef.current.get(peerId)
    if (pc) return pc
    
    // Start with STUN-only servers for better performance
    const stunOnlyServers = [
      { urls: ["stun:stun.l.google.com:19302"] },
      { urls: ["stun:stun1.l.google.com:19302"] },
      { urls: ["stun:stun2.l.google.com:19302"] }
    ]
    
    // TURN servers as fallback
    const turnServers = [
      { 
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject"
      },
      { 
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject", 
        credential: "openrelayproject"
      },
      { 
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject"
      }
    ]
    
    pc = new RTCPeerConnection({ 
      iceServers: stunOnlyServers,
      iceCandidatePoolSize: 10
    })
    // Attach local tracks
    const local = localStreamRef.current
    if (local) {
      for (const track of local.getAudioTracks()) {
        pc.addTrack(track, local)
      }
    }
    // Ensure we are prepared to receive remote audio
    try {
      pc.addTransceiver("audio", { direction: "recvonly" })
    } catch {}
    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current) {
        wsRef.current.send(
          JSON.stringify({ type: "ice-candidate", candidate: e.candidate, to: peerId, roomId })
        )
      }
    }
    pc.ontrack = (e) => {
      const [stream] = e.streams
      setRemoteStreams((prev) => {
        const next = new Map(prev)
        next.set(peerId, stream)
        return next
      })
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        // If STUN-only connection fails, try with TURN servers
        console.log(`Connection failed for ${peerId}, retrying with TURN servers...`)
        pc.close()
        peerConnectionsRef.current.delete(peerId)
        
        // Retry with TURN servers after a short delay
        setTimeout(() => {
          const retryPc = new RTCPeerConnection({ 
            iceServers: [...stunOnlyServers, ...turnServers],
            iceCandidatePoolSize: 10
          })
          
          // Re-attach local tracks
          const local = localStreamRef.current
          if (local) {
            for (const track of local.getAudioTracks()) {
              retryPc.addTrack(track, local)
            }
          }
          
          // Re-setup event handlers
          retryPc.onicecandidate = (e) => {
            if (e.candidate && wsRef.current) {
              wsRef.current.send(
                JSON.stringify({ type: "ice-candidate", candidate: e.candidate, to: peerId, roomId })
              )
            }
          }
          retryPc.ontrack = (e) => {
            const [stream] = e.streams
            setRemoteStreams((prev) => {
              const next = new Map(prev)
              next.set(peerId, stream)
              return next
            })
          }
          retryPc.onconnectionstatechange = () => {
            if (retryPc.connectionState === "failed" || retryPc.connectionState === "closed" || retryPc.connectionState === "disconnected") {
              setRemoteStreams((prev) => {
                const next = new Map(prev)
                next.delete(peerId)
                return next
              })
              peerConnectionsRef.current.delete(peerId)
            }
          }
          
          peerConnectionsRef.current.set(peerId, retryPc)
        }, 1000)
        
        return
      }
      
      if (pc.connectionState === "closed" || pc.connectionState === "disconnected") {
        setRemoteStreams((prev) => {
          const next = new Map(prev)
          next.delete(peerId)
          return next
        })
        peerConnectionsRef.current.delete(peerId)
      }
    }
    peerConnectionsRef.current.set(peerId, pc)
    return pc
  }, [roomId])

  const handleSignal = useCallback(async (msg: any) => {
    const from = msg.from || msg.clientId
    const selfId = clientIdRef.current
    if (!from || from === selfId) return

    if (msg.type === "peer-joined") {
      // New peer, we initiate offer
      const pc = ensurePeerConnection(from)
      const offer = await pc.createOffer({ 
        offerToReceiveAudio: true
      })
      await pc.setLocalDescription(offer)
      wsRef.current?.send(JSON.stringify({ type: "offer", sdp: offer, to: from, roomId }))
      return
    }

    if (msg.type === "offer" && msg.to === selfId) {
      const pc = ensurePeerConnection(from)
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      wsRef.current?.send(JSON.stringify({ type: "answer", sdp: answer, to: from, roomId }))
      return
    }

    if (msg.type === "answer" && msg.to === selfId) {
      const pc = ensurePeerConnection(from)
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
      return
    }

    if (msg.type === "ice-candidate" && msg.to === selfId && msg.candidate) {
      const pc = ensurePeerConnection(from)
      try {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
      } catch {}
      return
    }

    if (msg.type === "peer-left") {
      const pc = peerConnectionsRef.current.get(from)
      pc?.close()
      peerConnectionsRef.current.delete(from)
      setRemoteStreams((prev) => {
        const next = new Map(prev)
        next.delete(from)
        return next
      })
    }
  }, [ensurePeerConnection, roomId])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [])

  const joinRoom = useCallback(async () => {
    await initializeAudioAnalysis()
    // Use deployed signaling server on production, local on development
    const signalUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://webrtc1-btng.onrender.com'  // Your deployed Render signaling server
      : `ws://localhost:${process.env.NEXT_PUBLIC_SIGNAL_PORT || 3001}`
    const ws = new WebSocket(signalUrl)
    wsRef.current = ws
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", roomId, clientId: clientIdRef.current }))
      setIsConnected(true)
    }
    ws.onmessage = (ev) => {
      try {
        handleSignal(JSON.parse(ev.data))
      } catch {}
    }
    ws.onerror = (e) => {
      console.error("WebSocket error", e)
      setError("Signaling connection failed")
      setIsConnected(false)
    }
    ws.onclose = () => {
      wsRef.current = null
      setIsConnected(false)
    }
  }, [initializeAudioAnalysis, handleSignal, roomId])

  const leaveRoom = useCallback(() => {
    // Clean up streams and connections
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    peerConnectionsRef.current.forEach((pc) => pc.close())
    peerConnectionsRef.current.clear()
    setRemoteStreams(new Map())
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ type: "leave", roomId, clientId: clientIdRef.current })) } catch {}
      try { wsRef.current.close() } catch {}
      wsRef.current = null
    }

    setIsConnected(false)
    setAudioLevel(0)
  }, [])

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
