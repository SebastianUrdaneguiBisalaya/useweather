/** Watches page visibility and whether `target` is on screen. */
export const watchVisibility = (
  target: Element,
  onChange: (visible: boolean) => void,
): (() => void) => {
  let pageVisible = document.visibilityState !== "hidden";
  let onScreen = true;
  const emit = (): void => onChange(pageVisible && onScreen);

  const onVisibility = (): void => {
    pageVisible = document.visibilityState !== "hidden";
    emit();
  };
  document.addEventListener("visibilitychange", onVisibility);

  let observer: IntersectionObserver | null = null;
  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      onScreen = entry.isIntersecting;
      emit();
    });
    observer.observe(target);
  }

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    observer?.disconnect();
    observer = null;
  };
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Watches `prefers-reduced-motion`. Reports `false` when matchMedia is unavailable. */
export const watchReducedMotion = (
  onChange: (reduced: boolean) => void,
): {
  matches: boolean;
  stop: () => void;
} => {
  if (typeof matchMedia !== "function") {
    return {
      matches: false,
      stop: () => {},
    };
  }
  const query = matchMedia(REDUCED_MOTION_QUERY);
  const listener = (event: MediaQueryListEvent): void =>
    onChange(event.matches);
  query.addEventListener("change", listener);
  return {
    matches: query.matches,
    stop: () => query.removeEventListener("change", listener),
  };
};

/** Watches the size of `target`. Reports the initial size synchronously. */
export const watchSize = (
  target: HTMLElement,
  onChange: (width: number, height: number) => void,
): (() => void) => {
  onChange(target.clientWidth, target.clientHeight);
  if (typeof ResizeObserver !== "function") return () => {};
  let observer: ResizeObserver | null = new ResizeObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (entry) onChange(entry.contentRect.width, entry.contentRect.height);
  });
  observer.observe(target);
  return () => {
    observer?.disconnect();
    observer = null;
  };
};
