/** biome-ignore-all lint/suspicious/noTemplateCurlyInString: <Next config uses template strings inside curly braces> */
import path from "node:path";
import type { NextConfig } from "next";

export const baseConfig: NextConfig = {
	output: "standalone",
	reactCompiler: true,
	experimental: {
		serverActions: {
			bodySizeLimit: "10mb",
		},
		externalDir: true,
	},
	compiler: {
		// removeConsole: true,
		// removeConsole: process.env.NODE_ENV === 'production',
	},
	// Performance optimizations
	poweredByHeader: false,
	compress: true,
	env: {
		NEXT_TELEMETRY_DISABLED: "1",
	},
	allowedDevOrigins: [
		"10.23.3.151",
		"localhost",
		"127.0.0.1",
		"*.sitewatcher.com",
	],
	transpilePackages: [],
	outputFileTracingRoot: path.join(__dirname, "../../"),
	outputFileTracingIncludes: {
		"/**": [
			/*
			 * Workspace packages the SERVER actually loads at runtime.
			 *
			 * `./packages/**` and `./hooks/**` were here and neither directory
			 * exists in this repo. `./configs/**` was here too and does not
			 * belong: @monorepo/configs ships tsconfig JSON, biome JSON and this
			 * very next config — all build-time. Including it is what broke the
			 * build, because the glob descends into configs/node_modules, where
			 * `@types/node` is a symlink TO A DIRECTORY, and the tracer opens
			 * every path it collects as a file:
			 *     Is a directory (os error 21)
			 * The compile itself had already succeeded; it died writing the trace
			 * manifest, which is why the error names no source file.
			 */
			"./utilities/**/*",
			"./managers/**/*",
			// Next.js kritik dependencies (standalone bazılarını atlıyor)
			"./node_modules/styled-jsx/**/*",
			"./apps/fe/node_modules/styled-jsx/**/*",
			// Diğer kritik paketler
			"./node_modules/@next/**/*",
			"./node_modules/next/**/*",
		],
	},
	/*
	 * The workspace globs above end in `**\/*`, which walks into each
	 * workspace's own node_modules — and `configs/node_modules/@types/node` is a
	 * SYMLINK TO A DIRECTORY. The tracer opens every path it collects as a file,
	 * so the build died with `Is a directory (os error 21)` while emitting the
	 * trace manifest, after compiling successfully. Nothing under a workspace's
	 * node_modules belongs in the trace anyway: those are resolved copies of
	 * packages the tracer already follows through the import graph.
	 */
	outputFileTracingExcludes: {
		"/**": [
			"./configs/node_modules/**/*",
			"./utilities/*/node_modules/**/*",
			"./managers/*/node_modules/**/*",
			// The same directory reached the other way: apps/fe/node_modules
			// symlinks @monorepo/configs back at the workspace root.
			"./apps/*/node_modules/@monorepo/*/node_modules/**/*",
		],
	},
	// Strict mode
	typescript: {
		ignoreBuildErrors: false,
	},
	async rewrites() {
		const authApiUrl = process.env.AUTH_API_URL?.replace(/\/$/, "");
		if (!authApiUrl) {
			return [];
		}

		return [
			// OAuth proxy - GitHub callback will hit frontend, forward to backend
			{
				source: "/oauth/:path*",
				destination: `${authApiUrl}/oauth/:path*`,
			},
			/*
			 * File proxy -> the CDN route, not the files TABLE.
			 *
			 * `${authApiUrl}/files/:id` is the generated CRUD read and answers the
			 * row as JSON; `${authApiUrl}/cdn/:id` is the storage route and answers
			 * the bytes with a real Content-Type. The header's avatar
			 * (`file-proxy/<id>`) was therefore being handed a JSON body to render
			 * as an image. Same mistake as app/api/view-file, same fix.
			 */
			{
				source: "/file-proxy/:path*",
				destination: `${authApiUrl}/cdn/:path*`,
				has: [
					{
						type: "header",
						key: "accept",
						value: "(.*)",
					},
				],
			},
			// Desktop agent downloads proxy
			{
				source: "/downloads/desktop-agent/:filename",
				destination: `${authApiUrl}/api/downloads/desktop-agent/:filename`,
			},
			{
				source: "/downloads/desktop-agent",
				destination: `${authApiUrl}/api/downloads/desktop-agent`,
			},
		];
	},
	// Security headers
	async headers() {
		return [
			{
				source: "/file-proxy/:path*",
				headers: [
					{ key: "x-forwarded-host", value: "${host}" },
					{ key: "origin", value: "${protocol}://${host}" },
					{ key: "referer", value: "${protocol}://${host}/" },
				],
			},
			// PDF files
			{
				source: "/file-proxy/files/:path*",
				headers: [
					{ key: "Content-Type", value: "application/pdf" },
					{ key: "Cache-Control", value: "public, max-age=86400" }, // 24 saat cache
					{ key: "origin", value: "${protocol}://${host}" },
					{ key: "referer", value: "${protocol}://${host}/" },
				],
			},
			// Image files
			{
				source: "/file-proxy/files/:path*",
				headers: [
					{ key: "Content-Type", value: "image/*" },
					{ key: "Cache-Control", value: "public, max-age=604800" }, // 7 gün cache
					{ key: "Accept-Ranges", value: "bytes" },
					{ key: "origin", value: "${protocol}://${host}" },
					{ key: "referer", value: "${protocol}://${host}/" },
				],
			},
			// Audio files
			{
				source: "/file-proxy/files/:path*",
				headers: [
					{ key: "Content-Type", value: "audio/mpeg" },
					{ key: "Cache-Control", value: "public, max-age=86400" }, // 24 saat cache
					{ key: "origin", value: "${protocol}://${host}" },
					{ key: "referer", value: "${protocol}://${host}/" },
				],
			},
			{
				source: "/(.*)",
				headers: [
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "X-Frame-Options",
						value: "SAMEORIGIN",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "X-XSS-Protection",
						value: "1; mode=block", // modern tarayıcılar pek dikkate almıyor ama eski tarayıcılar için
					},
					{
						key: "Accept-Ranges",
						value: "bytes",
					},
				],
			},
		];
	},
	images: {
		unoptimized: true,
	},
};
