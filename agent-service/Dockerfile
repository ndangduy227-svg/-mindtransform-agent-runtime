# agent-service — Railway always-on container
# NOTE: Playwright/Chromium is heavy (needs ~1GB RAM). Per v3 doc, prefer
# splitting screenshot into a separate light service. This base image keeps
# the engine lean; uncomment the Playwright block only if you run media in-host.

FROM node:20-slim

WORKDIR /app

# --- (optional) Playwright + Chromium deps. Uncomment if media runs in-host. ---
# RUN apt-get update && apt-get install -y \
#     chromium fonts-liberation libnss3 libatk-bridge2.0-0 libgtk-3-0 \
#     && rm -rf /var/lib/apt/lists/*
# ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
# ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# --- (optional) Lark CLI. Add install steps here once auth/setup is confirmed. ---
# See 12_Agents/04_Tool_Specs/LARK_CLI_SETUP_STATUS.md

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .
RUN npm run build

# Railway runs ONE process per service. Deploy server + worker as 2 services
# from the same image, overriding the start command:
#   server:  npm run start:server
#   worker:  npm run start:worker
CMD ["npm", "run", "start:server"]
