FROM oven/bun:1.1 AS base
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY . .
RUN bun install --frozen-lockfile || bun install

EXPOSE 3000
CMD ["bun", "run", "--cwd", "apps/fe", "dev"]
