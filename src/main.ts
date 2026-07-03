import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { router } from './ui/router';

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';
// Bootstrap JS
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const app = createApp(App);

// Usamos el router de Vue
app.use(router);

app.mount('#app');
