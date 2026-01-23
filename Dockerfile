FROM node:20-bookworm-slim

# Install system dependencies
# texlive-latex-extra contains standalone class
# texlive-pictures contains tikz and pgfplots
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-pictures \
    texlive-fonts-recommended \
    dvisvgm \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Setup Backend
COPY backend/package.json backend/tsconfig.json ./backend/
COPY backend/src ./backend/src/
WORKDIR /app/backend
RUN pnpm install
RUN pnpm build

# Setup Frontend
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN pnpm install
COPY frontend ./

# Build Frontend
RUN pnpm build

# Runtime env
ENV NODE_ENV=production
EXPOSE 3000

CMD ["pnpm", "start"]
