# MCP server + TeX Live, for machines without a local LaTeX install.
#   docker build -t tikzmcp .
#   docker run -i --rm tikzmcp          # speaks MCP over stdio
FROM node:20-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
RUN pnpm install --frozen-lockfile --filter tikzmcp-backend
COPY backend backend
RUN pnpm --filter tikzmcp-backend build \
 && pnpm --filter tikzmcp-backend deploy --prod --legacy /out

FROM node:20-bookworm-slim
# texlive-latex-extra: standalone class; texlive-pictures: tikz + pgfplots
RUN apt-get update && apt-get install -y --no-install-recommends \
      texlive-latex-base texlive-latex-extra texlive-pictures \
      texlive-fonts-recommended dvisvgm \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out .
USER node
ENTRYPOINT ["node", "dist/index.js"]
