FROM oven/bun:1.1 AS base
WORKDIR /app

# node-gyp/native modüller için gerekli
RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY . .

# lockfile bozuksa install kırılmasın diye önce dene, olmazsa lock'suz devam et
RUN bun install --frozen-lockfile || bun install

EXPOSE 1001
CMD ["bun", "run", "--cwd", "apps/be", "dev"]
