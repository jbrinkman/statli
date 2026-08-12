# Multi-target Dockerfile: builds TWO images from a single build context.
#
# Targets:
#   app  — Astro SSR dashboard + API (port 4321)
#   mcp  — MCP server with streamable HTTP transport (port 4322)
#
# Both targets share the same dependency install and build stages, ensuring
# they always use the same package versions and compiled artifacts. Building
# them from one Dockerfile prevents version drift between the API server and
# the MCP tools that call it.
#
# Usage:
#   docker compose up --build

# Stage 1: Dependencies
FROM node:24-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci

# Stage 2: Build everything
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build
RUN npm run build:mcp

# Stage 3a: App (Astro SSR)
FROM node:24-alpine AS app
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]

# Stage 3b: MCP Server (Streamable HTTP)
FROM node:24-alpine AS mcp
WORKDIR /app
COPY --from=build /app/dist/mcp-server ./dist/mcp-server
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
ENV MCP_PORT=4322
EXPOSE 4322
CMD ["node", "./dist/mcp-server/index.js"]
