import { createApp } from "vue";
// Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./style.css";
import App from "./App.vue";
import { router } from "./ui/router/index.js";

// Bootstrap JS
import * as bootstrap from "bootstrap";

(window as unknown as { bootstrap: typeof bootstrap }).bootstrap = bootstrap;

import { createPinia } from "pinia";
import { browserSessionStorage } from "./infrastructure/storage/browserSessionStorage.js";
import { configureHttpClient } from "./ui/bootstrap/configureHttpClient.js";
import { applyTheme, resolveInitialTheme } from "./ui/theme/theme.js";

const initialTheme = resolveInitialTheme({
	storedTheme: browserSessionStorage.getPreferredTheme(),
	currentTheme: document.documentElement.getAttribute("data-bs-theme"),
	prefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
});

applyTheme(initialTheme);

import { i18n } from "./infrastructure/config/i18n.js";

const app = createApp(App);
app.use(i18n);

const pinia = createPinia();
app.use(pinia);

configureHttpClient();

// Register the Vue router
app.use(router);

app.mount("#app");
