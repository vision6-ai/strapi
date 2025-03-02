# Use Node.js LTS as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and yarn.lock before running install (for caching)
COPY package.json yarn.lock ./

# Install corepack for Yarn
RUN npm install -g corepack@latest && corepack enable

# Install dependencies
RUN yarn install --immutable
# Copy project files
COPY . .

# Build the Strapi application
RUN yarn build

# Expose port
EXPOSE 1337

# Start Strapi
CMD ["yarn", "start"]
