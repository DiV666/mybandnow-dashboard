import { watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { useI18n } from 'vue-i18n';

const BRAND_NAME = 'My Band Now';

type MetaRoute = Pick<RouteLocationNormalizedLoaded, 'name' | 'query' | 'meta'>;
type Translate = (key: string) => string;

function readMetaKey(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

// The song track editor gets the song's own name as its title instead of a fixed one,
// since route.meta can't express a value that depends on the query.
export function resolvePageTitle(route: MetaRoute, t: Translate): string | null {
  if (route.name === 'SongTrackEditor') {
    const songTitle = route.query.title;
    return typeof songTitle === 'string' && songTitle.trim().length > 0
      ? songTitle
      : t('dashboard.trackEditor.defaultTitle');
  }

  const titleKey = readMetaKey(route.meta.titleKey);
  return titleKey ? t(titleKey) : null;
}

export function resolvePageDescription(
  route: Pick<MetaRoute, 'meta'>,
  t: Translate,
): string | null {
  const descriptionKey = readMetaKey(route.meta.descriptionKey);
  return descriptionKey ? t(descriptionKey) : null;
}

export function resolveDocumentTitle(pageTitle: string | null): string {
  return pageTitle ? `${BRAND_NAME} - ${pageTitle}` : BRAND_NAME;
}

function upsertDescriptionMeta(content: string): void {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'description');
    document.head.appendChild(meta);
  }

  meta.setAttribute('content', content);
}

/**
 * Keeps the document title ("My Band Now - <page>") and meta description in sync with the
 * current route and locale.
 */
export function useDocumentMeta(): void {
  const route = useRoute();
  const { t, locale } = useI18n();

  watchEffect(() => {
    // Referenced only to keep the title/description reactive to a live locale switch.
    void locale.value;

    document.title = resolveDocumentTitle(resolvePageTitle(route, t));

    const description = resolvePageDescription(route, t);
    if (description) {
      upsertDescriptionMeta(description);
    }
  });
}
