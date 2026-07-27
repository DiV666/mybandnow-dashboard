import { createI18n } from 'vue-i18n';
import es from './locales/es.json';
import en from './locales/en.json';
import ca from './locales/ca.json';
import gl from './locales/gl.json';
import eu from './locales/eu.json';

// Get default browser language or default to 'es'
const getBrowserLang = () => {
  const lang = navigator.language.split('-')[0];
  const supported = ['es', 'en', 'ca', 'gl', 'eu'];
  return supported.includes(lang) ? lang : 'es';
};

export const i18n = createI18n({
  legacy: false, // Using Composition API
  locale: getBrowserLang(),
  fallbackLocale: 'es',
  messages: {
    es,
    en,
    ca,
    gl,
    eu
  }
});
