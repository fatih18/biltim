# ---------------------------------------------------------------------------
# Biltim frontend — production image.
#
# This used to be a single stage that ran `bun run --cwd apps/fe dev`, i.e. the
# Next dev server, in the container we shipped. Dev mode compiles on demand, has
# no output caching, prints stack traces to the browser and is roughly an order
# of magnitude slower per request. It was never meant to face users.
#
# Next is configured with `output: "standalone"` (configs/next/base.ts), so the
# build emits a self-contained server plus exactly the node_modules it traced.
# That is what the runtime stage copies — the build toolchain, bun, and the
# other workspaces do not travel with it.
#
# Nothing about the backend's address is baked in here. Every call the browser
# makes is same-origin: the screens call Next server actions
# (apps/fe/lib/api/factory.nucleus.ts is 'use server') and the handful of
# handlers under app/api proxy onward. Both read AUTH_API_URL at RUNTIME, so one
# image works against any backend URL and the address is a compose setting, not
# a rebuild.
# ---------------------------------------------------------------------------

FROM oven/bun:1.2 AS build
WORKDIR /app

# node-gyp needs these for the few native deps in the tree.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY . .

# No `|| bun install` fallback. That fallback silently accepted a lockfile which
# no longer matched package.json, which is how a build can resolve a different
# framework version than the one that was tested. If this fails, the lockfile
# needs regenerating and committing — not routing around.
RUN bun install --frozen-lockfile

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
RUN bun run --cwd apps/fe build

# ---------------------------------------------------------------------------
FROM node:24-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# `standalone` already contains the traced node_modules and the server entry.
# `static` and `public` are the two things Next deliberately leaves out of it.
COPY --from=build --chown=node:node /app/apps/fe/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/fe/.next/static ./apps/fe/.next/static
COPY --from=build --chown=node:node /app/apps/fe/public ./apps/fe/public

USER node
EXPOSE 3000

# Next answers / once it is up; a container that cannot serve its own root is
# not ready, and compose should know that rather than route traffic at it.
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/fe/server.js"]
