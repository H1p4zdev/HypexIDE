import { throttle, debounce, memoizeLast, createChunks, paginateItems } from '../utils/performance';

describe('Performance Utilities', () => {
  describe('throttle', () => {
    jest.useFakeTimers();

    it('calls function immediately on first call', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('does not call function again within interval', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);
      throttled();
      throttled();
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls function again after interval', () => {
      const fn = jest.fn();
      const throttled = throttle(fn, 100);
      throttled();
      jest.advanceTimersByTime(150);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('does not call immediately', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 200);
      debounced();
      expect(fn).not.toHaveBeenCalled();
    });

    it('calls after delay', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 200);
      debounced();
      jest.advanceTimersByTime(200);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('resets timer on repeated calls', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 200);
      debounced();
      jest.advanceTimersByTime(100);
      debounced();
      jest.advanceTimersByTime(100);
      expect(fn).not.toHaveBeenCalled();
      jest.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('can be cancelled', () => {
      const fn = jest.fn();
      const debounced = debounce(fn, 200);
      debounced();
      debounced.cancel();
      jest.advanceTimersByTime(300);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('memoizeLast', () => {
    it('caches last result', () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoized = memoizeLast(fn);
      memoized(5);
      memoized(5);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('recomputes on different args', () => {
      const fn = jest.fn((x: number) => x * 2);
      const memoized = memoizeLast(fn);
      memoized(5);
      memoized(6);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('returns correct result', () => {
      const memoized = memoizeLast((x: number) => x * 2);
      expect(memoized(7)).toBe(14);
    });
  });

  describe('createChunks', () => {
    it('splits array into chunks', () => {
      const chunks = createChunks([1, 2, 3, 4, 5], 2);
      expect(chunks).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('handles exact division', () => {
      const chunks = createChunks([1, 2, 3, 4], 2);
      expect(chunks).toEqual([[1, 2], [3, 4]]);
    });

    it('handles empty array', () => {
      expect(createChunks([], 3)).toEqual([]);
    });
  });

  describe('paginateItems', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('returns first page', () => {
      expect(paginateItems(items, 0, 3)).toEqual([1, 2, 3]);
    });

    it('returns second page', () => {
      expect(paginateItems(items, 1, 3)).toEqual([4, 5, 6]);
    });

    it('handles last partial page', () => {
      expect(paginateItems(items, 3, 3)).toEqual([10]);
    });
  });
});
