import { NextApiRequest, NextApiResponse } from 'next'
const { AccessToken } = require('livekit-server-sdk')

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { roomName, participantName, isAdmin } = req.body

    if (!roomName || !participantName) {
      return res.status(400).json({ error: 'Room name and participant name are required' })
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'LiveKit credentials not configured' })
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
    })

    const grant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
      canUpdateMetadata: !!isAdmin, // Admins can update other participants' metadata
      canPublishData: !!isAdmin, // Admins can publish data (for signaling)
    }

    token.addGrant(grant)

    const jwt = await token.toJwt()

    res.status(200).json({ token: jwt })
  } catch (error) {
    console.error('Error generating LiveKit token:', error)
    res.status(500).json({ error: 'Failed to generate token' })
  }
}
