import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue';

interface UseModalFocusTrapOptions {
  onEscape?: () => void;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  if (typeof container.querySelectorAll !== 'function') {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Traps Tab focus inside a modal-like container while it is open, restores focus to whatever
 * had it beforehand once it closes, and optionally reacts to Escape. No-ops outside a real DOM
 * (e.g. the lightweight test renderer used in this project has no `document`).
 */
export function useModalFocusTrap(
  containerRef: Ref<HTMLElement | null>,
  isOpen: Ref<boolean>,
  options: UseModalFocusTrapOptions = {},
): void {
  if (typeof document === 'undefined') {
    return;
  }

  let previouslyFocusedElement: HTMLElement | null = null;

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && options.onEscape) {
      options.onEscape();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const container = containerRef.value;
    if (!container) {
      return;
    }

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const activeIsInside =
      !!active && typeof container.contains === 'function' && container.contains(active);

    if (event.shiftKey) {
      if (!activeIsInside || active === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (!activeIsInside || active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  watch(isOpen, async (open) => {
    if (open) {
      previouslyFocusedElement = document.activeElement as HTMLElement | null;
      document.addEventListener('keydown', handleKeydown);
      await nextTick();

      const container = containerRef.value;
      const [firstFocusable] = container ? getFocusableElements(container) : [];
      const target = firstFocusable ?? container;
      target?.focus();
    } else {
      document.removeEventListener('keydown', handleKeydown);
      previouslyFocusedElement?.focus();
      previouslyFocusedElement = null;
    }
  });

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
}
