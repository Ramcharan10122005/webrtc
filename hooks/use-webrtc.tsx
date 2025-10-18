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
          sampleRate: 16000, // Lower sample rate for better mobile compatibility
          channelCount: 1,
          volume: 1.0,
          latency: 0.01, // Low latency for real-time communication
        } as MediaTrackConstraints,
      })

      localStreamRef.current = stream

      // Create audio context for voice activity detection (match WebRTC sample rate)
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

  // Create/Get a peer connection for a given peer id
  const ensurePeerConnection = useCallback((peerId: string, retryCount = 0) => {
    let pc = peerConnectionsRef.current.get(peerId)
    if (pc) return pc
    pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: ["stun:stun.l.google.com:19302"] },
        { urls: ["stun:stun1.l.google.com:19302"] },
        { urls: ["stun:stun2.l.google.com:19302"] },
        // Try multiple TURN server providers
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
        },
        // Alternative TURN servers
        {
          urls: "turn:relay.metered.ca:80",
          username: "openrelayproject",
          credential: "openrelayproject"
        },
        {
          urls: "turn:relay.metered.ca:443",
          username: "openrelayproject", 
          credential: "openrelayproject"
        },
        {
          urls: "turn:relay.metered.ca:443?transport=tcp",
          username: "openrelayproject",
          credential: "openrelayproject"
        },
        // Additional free TURN servers
        {
          urls: "turn:freeturn.tel:3478",
          username: "free",
          credential: "free"
        },
        {
          urls: "turn:freeturn.tel:3478?transport=tcp",
          username: "free",
          credential: "free"
        },
        // Additional free TURN servers
        {
          urls: "turn:turn.bistri.com:80",
          username: "homeo",
          credential: "homeo"
        },
        {
          urls: "turn:turn.anyfirewall.com:443?transport=tcp",
          username: "webrtc",
          credential: "webrtc"
        }
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceTransportPolicy: retryCount > 0 ? 'relay' : 'all' // Force TURN on retry
    })
    // Attach local tracks
    const local = localStreamRef.current
    if (local) {
      for (const track of local.getAudioTracks()) {
        // Clone the track to avoid issues with multiple connections
        const clonedTrack = track.clone()
        pc.addTrack(clonedTrack, local)
      }
    }
    
    // Ensure we are prepared to receive remote audio with proper configuration
    try {
      const transceiver = pc.addTransceiver("audio", { 
        direction: "recvonly",
        streams: []
      })
      console.log(`Added audio transceiver for ${peerId}`)
    } catch (error) {
      console.warn("Failed to add audio transceiver:", error)
    }
    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current) {
        console.log(`ICE candidate for ${peerId}:`, e.candidate.type, e.candidate.protocol, e.candidate.address)
        // Log TURN server usage
        if (e.candidate.type === 'relay') {
          console.log(`🎯 TURN relay candidate found for ${peerId}!`, e.candidate)
        }
        wsRef.current.send(
          JSON.stringify({ type: "ice-candidate", candidate: e.candidate, to: peerId, roomId })
        )
      } else if (e.candidate === null) {
        console.log(`ICE gathering complete for ${peerId}`)
        // Check if we got any relay candidates
        const hasRelayCandidates = Array.from(peerConnectionsRef.current.values()).some(pc => 
          pc.getStats().then(stats => {
            let hasRelay = false
            stats.forEach(report => {
              if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                if (report.remoteCandidateType === 'relay' || report.localCandidateType === 'relay') {
                  hasRelay = true
                }
              }
            })
            return hasRelay
          })
        )
        
        if (!hasRelayCandidates) {
          console.warn(`⚠️ No TURN relay candidates found for ${peerId}. Connection may fail between different networks.`)
        }
      }
    }
    
    pc.onicegatheringstatechange = () => {
      console.log(`ICE gathering state for ${peerId}:`, pc.iceGatheringState)
      
      // Set a timeout for ICE gathering
      if (pc.iceGatheringState === 'gathering') {
        setTimeout(() => {
          if (pc.iceGatheringState === 'gathering') {
            console.warn(`ICE gathering timeout for ${peerId}, forcing completion`)
            // Force ICE gathering to complete
            try {
              pc.restartIce()
            } catch (error) {
              console.error(`Failed to restart ICE after timeout for ${peerId}:`, error)
            }
          }
        }, 10000) // 10 second timeout
      }
    }
    
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${peerId}:`, pc.iceConnectionState)
      if (pc.iceConnectionState === 'failed') {
        console.warn(`ICE connection failed for ${peerId}, attempting restart`)
        try {
          pc.restartIce()
        } catch (error) {
          console.error(`Failed to restart ICE for ${peerId}:`, error)
          // If restart fails, try to recreate the connection with TURN-only policy
          setTimeout(() => {
            console.log(`Attempting to recreate connection for ${peerId} with TURN-only policy`)
            peerConnectionsRef.current.delete(peerId)
            setRemoteStreams((prev) => {
              const next = new Map(prev)
              next.delete(peerId)
              return next
            })
            // Recreate with TURN-only policy
            ensurePeerConnection(peerId, 1)
          }, 1000)
        }
      }
    }
    pc.ontrack = (e) => {
      const [stream] = e.streams
      console.log(`Received remote stream from ${peerId}:`, stream.getAudioTracks().length, 'audio tracks')
      
      // Ensure audio tracks are properly enabled
      stream.getAudioTracks().forEach(track => {
        track.enabled = true
        console.log(`Audio track from ${peerId}:`, track.label, track.readyState)
      })
      
      setRemoteStreams((prev) => {
        const next = new Map(prev)
        next.set(peerId, stream)
        return next
      })
    }
    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${peerId}:`, pc.connectionState)
      if (pc.connectionState === "failed" || pc.connectionState === "closed" || pc.connectionState === "disconnected") {
        console.warn(`Connection lost with ${peerId}, cleaning up`)
        setRemoteStreams((prev) => {
          const next = new Map(prev)
          next.delete(peerId)
          return next
        })
        peerConnectionsRef.current.delete(peerId)
      }
    }
    
    // Add data channel for connection health monitoring
    try {
      const dataChannel = pc.createDataChannel('health', { ordered: true })
      dataChannel.onopen = () => {
        console.log(`Data channel opened with ${peerId}`)
        // Send periodic ping to keep connection alive
        setInterval(() => {
          if (dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
          }
        }, 5000)
      }
      dataChannel.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'ping') {
          console.log(`Received ping from ${peerId}`)
        }
      }
    } catch (error) {
      console.warn("Failed to create data channel:", error)
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
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        wsRef.current?.send(JSON.stringify({ type: "answer", sdp: answer, to: from, roomId }))
        console.log(`Sent answer to ${from}`)
      } catch (error) {
        console.error(`Failed to handle offer from ${from}:`, error)
        // Try to restart ICE if offer handling fails
        try {
          pc.restartIce()
        } catch (restartError) {
          console.error(`Failed to restart ICE for ${from}:`, restartError)
        }
      }
      return
    }

    if (msg.type === "answer" && msg.to === selfId) {
      const pc = ensurePeerConnection(from)
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        console.log(`Set remote description from ${from}`)
      } catch (error) {
        console.error(`Failed to set remote description from ${from}:`, error)
      }
      return
    }

    if (msg.type === "ice-candidate" && msg.to === selfId && msg.candidate) {
      const pc = ensurePeerConnection(from)
      try {
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate))
        console.log(`Added ICE candidate from ${from}:`, msg.candidate.type)
      } catch (error) {
        console.warn(`Failed to add ICE candidate from ${from}:`, error)
      }
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
    
    const connectWebSocket = (retryCount = 0) => {
      // Use deployed signaling server on production, local on development
      const signalUrl = process.env.NODE_ENV === 'production' 
        ? 'wss://webrtc1-btng.onrender.com'  // Your deployed Render signaling server
        : `ws://localhost:${process.env.NEXT_PUBLIC_SIGNAL_PORT || 3001}`
      
      console.log(`Connecting to signaling server: ${signalUrl}`)
      const ws = new WebSocket(signalUrl)
      wsRef.current = ws
      
      ws.onopen = () => {
        console.log("WebSocket connected")
        ws.send(JSON.stringify({ type: "join", roomId, clientId: clientIdRef.current }))
        setIsConnected(true)
        setError(null)
      }
      
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          console.log("Received signaling message:", data.type)
          handleSignal(data)
        } catch (error) {
          console.error("Failed to parse signaling message:", error)
        }
      }
      
      ws.onerror = (e) => {
        console.error("WebSocket error", e)
        setError("Signaling connection failed")
        setIsConnected(false)
      }
      
      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason)
        wsRef.current = null
        setIsConnected(false)
        
        // Retry connection if it wasn't a clean close
        if (event.code !== 1000 && retryCount < 3) {
          console.log(`Retrying connection (attempt ${retryCount + 1}/3)`)
          setTimeout(() => connectWebSocket(retryCount + 1), 2000 * (retryCount + 1))
        }
      }
    }
    
    connectWebSocket()
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

  // Debug function to check connection states
  const debugConnections = useCallback(() => {
    console.log("=== WebRTC Debug Info ===")
    console.log("Local stream:", localStreamRef.current?.getAudioTracks().length || 0, "audio tracks")
    console.log("Remote streams:", remoteStreams.size)
    console.log("Peer connections:", peerConnectionsRef.current.size)
    
    peerConnectionsRef.current.forEach((pc, peerId) => {
      console.log(`Peer ${peerId}:`)
      console.log(`  - Connection state: ${pc.connectionState}`)
      console.log(`  - ICE connection state: ${pc.iceConnectionState}`)
      console.log(`  - ICE gathering state: ${pc.iceGatheringState}`)
      console.log(`  - Signaling state: ${pc.signalingState}`)
    })
    
    remoteStreams.forEach((stream, peerId) => {
      console.log(`Remote stream from ${peerId}:`)
      stream.getAudioTracks().forEach((track, index) => {
        console.log(`  - Track ${index}: ${track.label}, enabled: ${track.enabled}, readyState: ${track.readyState}`)
      })
    })
    console.log("=== End Debug Info ===")
  }, [remoteStreams])

  // Test TURN server connectivity
  const testTURNServers = useCallback(async () => {
    console.log("🧪 Testing TURN server connectivity...")
    
    const testPC = new RTCPeerConnection({
      iceServers: [
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
        { urls: "turn:freeturn.tel:3478", username: "free", credential: "free" }
      ]
    })
    
    let relayCandidatesFound = 0
    
    testPC.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Test ICE candidate: ${event.candidate.type} ${event.candidate.protocol}`)
        if (event.candidate.type === 'relay') {
          relayCandidatesFound++
          console.log(`✅ TURN server working: ${event.candidate.address}`)
        }
      } else {
        console.log(`TURN test complete. Found ${relayCandidatesFound} relay candidates.`)
        if (relayCandidatesFound === 0) {
          console.warn("❌ No working TURN servers found!")
        }
        testPC.close()
      }
    }
    
    // Create a dummy offer to trigger ICE gathering
    try {
      await testPC.createOffer()
      await testPC.setLocalDescription(await testPC.createOffer())
    } catch (error) {
      console.error("TURN test failed:", error)
      testPC.close()
    }
  }, [])

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
    debugConnections,
    testTURNServers,
  }
}
