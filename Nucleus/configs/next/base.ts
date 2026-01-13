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
			// Workspace packages
			"./packages/**/*",
			"./utilities/**/*",
			"./managers/**/*",
			"./hooks/**/*",
			"./configs/**/*",
			// Next.js kritik dependencies (standalone bazılarını atlıyor)
			"./node_modules/styled-jsx/**/*",
			"./apps/fe/node_modules/styled-jsx/**/*",
			// Diğer kritik paketler
			"./node_modules/@next/**/*",
			"./node_modules/next/**/*",
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
			// File proxy
			{
				source: "/file-proxy/:path*",
				destination: `${authApiUrl}/files/:path*`,
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
