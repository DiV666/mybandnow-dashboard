import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(
			process.env.VITEST
				? {
						template: {
							compilerOptions: {
								hoistStatic: false,
							},
						},
					}
				: undefined,
		),
	],
	test: {
		environment: "./vitest.environment.ts",
		allowOnly: false,
	},
	server: {
		watch: {
			usePolling: true,
			interval: 1000,
			ignored: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
		},
	},
});
