FROM node:18-alpine

WORKDIR /app

COPY package.json ./

# Install ALL dependencies (not just production, dotenv is needed)
RUN npm install

# Copy the rest of the application code
COPY . .

EXPOSE 8000

CMD ["node", "server.js"]
