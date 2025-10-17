FROM node:20-alpine
WORKDIR /app

# Install deps
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN npm ci || npm install

# Copy source
COPY . .

ENV NODE_ENV=production
EXPOSE 3001

# Fly will provide PORT; the server reads PORT or SIGNAL_PORT
CMD ["node", "signal.js"]


