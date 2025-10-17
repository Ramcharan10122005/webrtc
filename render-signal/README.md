# WebRTC Signaling Server

Minimal WebSocket signaling server for the sports platform voice rooms.

## Deploy to Render

1. Create a new GitHub repository with these files
2. Connect to Render and create a new "Web Service"
3. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. Deploy and get your URL (e.g., `https://your-signal-server.onrender.com`)

## Usage

The server handles WebRTC signaling for voice rooms:
- Room-based peer connections
- SDP offer/answer exchange
- ICE candidate relay
- Peer join/leave notifications

## Environment Variables

- `PORT`: Server port (default: 3001, Render sets this automatically)

## Local Testing

```bash
npm install
npm start
```

Server will be available at `ws://localhost:3001`
