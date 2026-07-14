import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { router } from "./ui/router";

// Bootstrap CSS
import "bootstrap/dist/css/bootstrap.min.css";
// Bootstrap JS
import "bootstrap/dist/js/bootstrap.bundle.min.js";

import { createPinia } from "pinia";
import { configureHttpClient } from "./ui/bootstrap/configureHttpClient.js";

const app = createApp(App);

const pinia = createPinia();
app.use(pinia);

configureHttpClient();

// Register the Vue router
app.use(router);

app.mount("#app");
