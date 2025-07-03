# HRFlow Docker Configuration
# Multi-stage build for optimized production image

# Development stage
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S hrflow -u 1001

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=builder --chown=hrflow:nodejs /app/dist ./dist
COPY --from=builder --chown=hrflow:nodejs /app/server ./server
COPY --from=builder --chown=hrflow:nodejs /app/shared ./shared
COPY --from=builder --chown=hrflow:nodejs /app/drizzle.config.ts ./

# Create uploads directory
RUN mkdir -p uploads && chown hrflow:nodejs uploads

# Switch to non-root user
USER hrflow

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]

# Labels for metadata
LABEL maintainer="HRFlow Team"
LABEL version="1.0.0"
LABEL description="HRFlow HR Management System"