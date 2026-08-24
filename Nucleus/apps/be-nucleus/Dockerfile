# ---------------------------------------------------------------------------
# Biltim backend — production image.
#
# Since nucleus-core-ts 0.10 the framework serves itself on Bun.serve; there is
# no Elysia and no plugin to mount. src/index.ts calls createNucleusServer and
# hands it the /reports group, so this image only has to run one Bun process.
#
# The drizzle schema is generated from config.json at BUILD time and baked in.
# Doing it at container start would make every restart wait on codegen, and
# would let a container come up against a schema its image was never built with.
# ---------------------------------------------------------------------------

FROM oven/bun:1.2 AS build
WORKDIR /app

COPY . .

# No `|| bun install` fallback — see the note in apps/fe/Dockerfile. A stale
# lockfile has to be fixed and committed, not worked around at image build.
RUN bun install --frozen-lockfile

RUN bun --cwd apps/be-nucleus run gen

# ---------------------------------------------------------------------------
FROM oven/bun:1.2 AS runtime
WORKDIR /app

COPY --from=build --chown=bun:bun /app /app

ENV NODE_ENV=production \
    PORT=1001

USER bun
EXPOSE 1001

# /health is served by the framework and needs no authentication. This is what
# makes compose hold the frontend back until the API can actually answer —
# without it the FE starts against a backend that is still pushing schema.
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=12 \
  CMD bun -e "fetch('http://127.0.0.1:1001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/apps/be-nucleus
CMD ["bun", "run", "src/index.ts"]
