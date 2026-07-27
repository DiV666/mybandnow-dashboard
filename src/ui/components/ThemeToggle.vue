<template>
	<button
		type="button"
		class="theme-toggle btn btn-sm"
		:class="buttonClass"
		:aria-label="ariaLabel"
		:title="ariaLabel"
		@click="onToggle"
	>
		<span aria-hidden="true">{{ icon }}</span>
	</button>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { browserSessionStorage } from "../../infrastructure/storage/browserSessionStorage.js";
import { THEMES, applyNextTheme, getCurrentTheme, type Theme } from "../theme/theme.js";

const theme = ref<Theme>(getCurrentTheme());

const isDark = computed(() => theme.value === THEMES.dark);
const icon = computed(() => (isDark.value ? "☀" : "☾"));
const ariaLabel = computed(() =>
	isDark.value ? "Switch to light theme" : "Switch to dark theme",
);
const buttonClass = computed(() =>
	isDark.value ? "btn-outline-light" : "btn-outline-dark",
);

function onToggle(): void {
	theme.value = applyNextTheme(theme.value, (nextTheme) => {
		browserSessionStorage.setPreferredTheme(nextTheme);
	});
}
</script>

<style>
.theme-toggle {
	position: fixed;
	right: 1rem;
	bottom: 1rem;
	z-index: var(--rock-z-floating-control);
	width: 2.75rem;
	height: 2.75rem;
	min-height: 2.75rem;
	padding: 0;
	border-width: 1px;
	border-radius: 50%;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background-color: color-mix(in srgb, var(--bs-body-bg) 88%, transparent);
	backdrop-filter: blur(8px);
	box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(var(--rock-accent-tertiary-rgb), 0.35);
}

.theme-toggle span {
	font-size: 0.9rem;
	line-height: 1;
}
</style>
