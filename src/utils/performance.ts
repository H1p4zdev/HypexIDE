// ─── Performance utilities ─────────────────────────────────────────────────────

/**
 * Throttle: ensure fn is called at most once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number
): T {
  let lastCalled = 0;
  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCalled >= intervalMs) {
      lastCalled = now;
      return fn(...args);
    }
  }) as T;
}

/**
 * Debounce: delay fn until no calls for durationMs
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  durationMs: number
): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), durationMs);
  };
  debounced.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  return debounced as T & { cancel: () => void };
}

/**
 * Memoize last call (1-result cache)
 */
export function memoizeLast<T extends (...args: any[]) => any>(fn: T): T {
  let lastArgs: Parameters<T> | null = null;
  let lastResult: ReturnType<T> | null = null;

  return ((...args: Parameters<T>): ReturnType<T> => {
    if (
      lastArgs &&
      args.length === lastArgs.length &&
      args.every((arg, i) => arg === lastArgs![i])
    ) {
      return lastResult as ReturnType<T>;
    }
    lastArgs = args;
    lastResult = fn(...args);
    return lastResult as ReturnType<T>;
  }) as T;
}

/**
 * Performance mark helper
 */
export class PerformanceMark {
  private marks: Map<string, number>;

  constructor() {
    this.marks = new Map();
  }

  start(name: string) {
    this.marks.set(name, Date.now());
  }

  end(name: string): number {
    const start = this.marks.get(name);
    if (!start) return -1;
    const duration = Date.now() - start;
    this.marks.delete(name);
    return duration;
  }

  measure(name: string, fn: () => void): number {
    this.start(name);
    fn();
    return this.end(name);
  }

  async measureAsync(name: string, fn: () => Promise<void>): Promise<number> {
    this.start(name);
    await fn();
    return this.end(name);
  }
}

// ─── Performance budgets ──────────────────────────────────────────────────────
export const PERFORMANCE_BUDGETS = {
  coldStart: 2000,         // < 2s
  fileOpen: 500,           // < 500ms
  syntaxHighlight: 100,    // < 100ms
  terminalLatency: 50,     // < 50ms
  searchResults: 200,      // < 200ms
  renderFrame: 16,         // < 16ms (60fps)
} as const;

export function checkBudget(label: string, duration: number): void {
  const budget = PERFORMANCE_BUDGETS[label as keyof typeof PERFORMANCE_BUDGETS];
  if (budget && duration > budget) {
    console.warn(
      `[Performance] ${label} exceeded budget: ${duration}ms > ${budget}ms`
    );
  }
}

// ─── Virtual list utilities ───────────────────────────────────────────────────
export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number
): T[] {
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

export function createChunks<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}
