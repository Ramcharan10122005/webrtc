// Basic WebSocket signaling server with room support
const WebSocket = require('ws')

// Fly.io provides PORT. Fall back to SIGNAL_PORT or 3001 for local dev.
const port = Number(process.env.PORT || process.env.SIGNAL_PORT || 3001)
const host = process.env.LISTEN_ADDR || '0.0.0.0'
const wss = new WebSocket.Server({ port, host })

/**
 * rooms: Map<roomId, Map<clientId, WebSocket>>
 */
const rooms = new Map()

function joinRoom(roomId, clientId, ws) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map())
  const members = rooms.get(roomId)
  members.set(clientId, ws)
}

function leaveRoom(roomId, clientId) {
  const members = rooms.get(roomId)
  if (!members) return
  members.delete(clientId)
  if (members.size === 0) rooms.delete(roomId)
}

function broadcast(roomId, senderId, data) {
  const members = rooms.get(roomId)
  if (!members) return
  for (const [id, socket] of members.entries()) {
    if (id === senderId || socket.readyState !== WebSocket.OPEN) continue
    socket.send(JSON.stringify(data))
  }
}

wss.on('connection', (ws) => {
  let roomId = null
  let clientId = null

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    const { type } = msg
    if (type === 'join') {
      roomId = msg.roomId
      clientId = msg.clientId
      joinRoom(roomId, clientId, ws)
      // notify others
      broadcast(roomId, clientId, { type: 'peer-joined', clientId })
      return
    }

    if (!roomId || !clientId) return

    // Relay SDP and ICE to peers in the room
    if (type === 'offer' || type === 'answer' || type === 'ice-candidate') {
      broadcast(roomId, clientId, { ...msg, from: clientId })
      return
    }

    if (type === 'leave') {
      broadcast(roomId, clientId, { type: 'peer-left', clientId })
      leaveRoom(roomId, clientId)
      return
    }
  })

  ws.on('close', () => {
    if (roomId && clientId) {
      broadcast(roomId, clientId, { type: 'peer-left', clientId })
      leaveRoom(roomId, clientId)
    }
  })
})

console.log(`[signal] listening on ws://${host}:${port}`)


