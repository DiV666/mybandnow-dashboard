export const THEMES = {
	light: "light",
	dark: "dark",
} as const;

export type Theme = (typeof THEMES)[keyof typeof THEMES];

type ThemeCandidate = string | null | undefined;

type ResolveInitialThemeOptions = {
	storedTheme: ThemeCandidate;
	currentTheme: ThemeCandidate;
	prefersDark: boolean;
};

function isTheme(value: ThemeCandidate): value is Theme {
	return value === THEMES.light || value === THEMES.dark;
}

export function resolveInitialTheme({
	storedTheme,
	currentTheme,
	prefersDark,
}: ResolveInitialThemeOptions): Theme {
	if (isTheme(storedTheme)) {
		return storedTheme;
	}

	if (isTheme(currentTheme)) {
		return currentTheme;
	}

	return prefersDark ? THEMES.dark : THEMES.light;
}

export function applyTheme(theme: Theme): void {
	document.documentElement.dataset.bsTheme = theme;
}

export function getCurrentTheme(): Theme {
	const currentTheme = document.documentElement.dataset.bsTheme;

	return isTheme(currentTheme) ? currentTheme : THEMES.light;
}

export function toggleTheme(theme: Theme): Theme {
	return theme === THEMES.dark ? THEMES.light : THEMES.dark;
}

export function applyNextTheme(
	currentTheme: Theme,
	persistTheme: (theme: Theme) => void,
): Theme {
	const nextTheme = toggleTheme(currentTheme);

	applyTheme(nextTheme);
	persistTheme(nextTheme);

	return nextTheme;
}
