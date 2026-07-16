import { createApp } from "vue";
// Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
import "./style.css";
import App from "./App.vue";
import { router } from "./ui/router/index.js";

// Bootstrap JS
import "bootstrap/dist/js/bootstrap.bundle.min.js";

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

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);

configureHttpClient();

// Register the Vue router
app.use(router);

app.mount("#app");
