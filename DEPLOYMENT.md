# Deployment Guide

## Architecture
- **Frontend (Next.js)**: Deploy to Vercel
- **Signaling Server (WebSocket)**: Deploy to Render

## Step 1: Deploy Signaling Server to Render

1. Go to [render.com](https://render.com) and create an account
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `sports-platform-signaling`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Free

5. Add Environment Variables:
   - `SIGNAL_PORT`: `10000`
   - `NODE_ENV`: `production`

6. Deploy and note the URL (e.g., `https://sports-platform-signaling.onrender.com`)

## Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and create an account
2. Import your GitHub repository
3. Add Environment Variables:
   - `NEXT_PUBLIC_SIGNAL_URL`: `wss://your-signaling-server.onrender.com`

4. Deploy

## Step 3: Update Environment Variables

After both deployments are complete:

1. **In Vercel Dashboard**:
   - Go to your project settings
   - Add environment variable: `NEXT_PUBLIC_SIGNAL_URL` = `wss://your-actual-render-url.onrender.com`

2. **Redeploy** your Vercel project to pick up the new environment variable

## Local Development

For local development, create a `.env.local` file:
```
NEXT_PUBLIC_SIGNAL_PORT=3001
```

Then run:
```bash
npm run dev
```

## Testing

1. Open your Vercel-deployed site in two different browser tabs/windows
2. Join the same voice room
3. Test audio communication between the two sessions

## Troubleshooting

- **WebSocket connection fails**: Check that your Render URL is correct and uses `wss://` (secure WebSocket)
- **Audio not working**: Ensure both users have granted microphone permissions
- **Connection issues**: Check browser console for WebRTC errors
