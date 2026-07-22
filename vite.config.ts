import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			"@": join(projectRoot, "src"),
		},
	},
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
