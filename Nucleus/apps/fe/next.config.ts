import { baseConfig } from "@monorepo/configs/next/base";
import type { NextConfig } from "next";

/**
 * Where the backend lives. Read at BUILD time, because rewrite destinations are
 * baked into `.next/routes-manifest.json` — that is the whole point of using a
 * rewrite instead of a route handler, and it is why a missing build arg fails
 * loudly here instead of silently at the first request.
 */
const API = process.env.AUTH_API_URL || "http://localhost:1001";

const nextConfig: NextConfig = {
	...baseConfig,
	// Turbopack is enabled by default in Next.js 16
	allowedDevOrigins: ["*"],
	experimental: {
		...baseConfig.experimental,
		useTypeScriptCli: true,
	},
	/**
	 * The browser reaches the backend through these, never through
	 * `app/api/**\/route.ts`. Six handlers used to sit here re-implementing the
	 * same cookie forwarding and error shaping once per file; the browser already
	 * sends its cookies, and a rewrite forwards them, so none of that code needs
	 * to exist.
	 *
	 *   /cdn/*     file bytes — real Content-Type, Range requests, derivatives
	 *   /reports/* dashboard aggregates and the Excel export
	 *   /files/*   the files CRUD, including multipart upload
	 */
	async rewrites() {
		return [
			{ source: "/cdn/:path*", destination: `${API}/cdn/:path*` },
			{ source: "/reports/:path*", destination: `${API}/reports/:path*` },
			{ source: "/files/:path*", destination: `${API}/files/:path*` },
		];
	},
};

export default nextConfig;
