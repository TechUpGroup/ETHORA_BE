FROM node:18-alpine as builder

# Workdir
WORKDIR /app

# Copy & install dependencies
COPY package.json yarn.lock ./
RUN yarn

# Copy source code & build
COPY . .
RUN yarn patches && yarn typechain && yarn build

# ===========================
FROM node:18-alpine
LABEL authors="ThinhHV <thinh@thinhhv.com>"

# Workdir
WORKDIR /app

# Install curl
RUN apk add --no-cache curl

# Copy source built BE
COPY package.json yarn.lock ./
COPY public ./dist/public
COPY ./config/example.yaml ./config/default.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Env default
ENV NODE_ENV=prod

# Export port
EXPOSE 8080

# Start app
# CMD ["yarn", "start:prod"]
CMD ["node", "dist/src/main"]
