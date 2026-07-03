import axios from 'axios';

// Creamos la instancia aislada
export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar el x-correlation-id
httpClient.interceptors.request.use(
  (config) => {
    // Usamos el API nativo de Crypto para generar el UUID
    const correlationId = crypto.randomUUID();
    
    // Inyectamos el header en cada petición
    config.headers['x-correlation-id'] = correlationId;
    
    // Opcional: Console.log para debug en desarrollo
    // console.debug(`[HTTP] Request -> correlation-id: ${correlationId}`);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
