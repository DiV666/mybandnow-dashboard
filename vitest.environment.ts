import type { Environment } from "vitest/environments";

export default {
	name: "vue-client-node",
	viteEnvironment: "client",
	setup() {
		Object.defineProperty(globalThis, "navigator", {
			value: { language: "es-ES" },
			configurable: true,
		});

		return {
			teardown() {},
		};
	},
} satisfies Environment;
