FROM node:18-alpine as builder1

# Workdir
WORKDIR /app

# Copy & install dependencies
COPY package.json yarn.lock ./
RUN yarn

# Copy source code & build
COPY . .
RUN yarn build

# ===========================
FROM node:18-alpine
LABEL authors="ThinhHV <thinh@thinhhv.com>"

# Workdir
WORKDIR /app

# Install curl
RUN apk add --no-cache curl

# Copy source built BE
COPY package.json yarn.lock ./
COPY --from=builder1 /app/node_modules ./node_modules
COPY --from=builder1 /app/dist ./dist
COPY ./config/example.yaml ./config/default.yaml

# Env default
ENV NODE_ENV=prod

# Export port
EXPOSE 8080

# Start app
CMD ["yarn", "start:prod"]
