import type { Environment } from "vitest/environments";

export default {
	name: "vue-client-node",
	viteEnvironment: "client",
	setup() {
		return {
			teardown() {},
		};
	},
} satisfies Environment;
