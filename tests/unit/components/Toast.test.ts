import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useToastStore, showToast } from '../../../src/stores/toastStore';

describe('Toast & Notification System Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.getState().clearToasts();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Toast appears immediately when created', () => {
    showToast('Operation successful', 'success');
    const toasts = useToastStore.getState().toasts;
    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('Operation successful');
    expect(toasts[0].type).toBe('success');
  });

  it('2. Toast automatically disappears after 5 seconds', () => {
    showToast('Auto dismiss test', 'info', 5000);
    expect(useToastStore.getState().toasts.length).toBe(1);

    vi.advanceTimersByTime(4999);
    expect(useToastStore.getState().toasts.length).toBe(1);

    vi.advanceTimersByTime(2);
    expect(useToastStore.getState().toasts.length).toBe(0);
  });

  it('3. Manual X dismissal works immediately', () => {
    const id = showToast('Manual dismiss test', 'warning');
    expect(useToastStore.getState().toasts.length).toBe(1);

    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts.length).toBe(0);
  });

  it('4. Dismissed toast does not reappear after timer expires', () => {
    const id = showToast('Dismiss test', 'error', 5000);
    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts.length).toBe(0);

    vi.advanceTimersByTime(6000);
    expect(useToastStore.getState().toasts.length).toBe(0);
  });

  it('5. Multiple toasts have independent auto-dismiss timers', () => {
    showToast('Toast A', 'info', 5000);
    vi.advanceTimersByTime(2000);
    showToast('Toast B', 'success', 5000);

    expect(useToastStore.getState().toasts.length).toBe(2);

    // At t=5s (3s after Toast B), Toast A should be removed, Toast B remains
    vi.advanceTimersByTime(3001);
    expect(useToastStore.getState().toasts.length).toBe(1);
    expect(useToastStore.getState().toasts[0].message).toBe('Toast B');

    // At t=7s (5s after Toast B), Toast B is also removed
    vi.advanceTimersByTime(2000);
    expect(useToastStore.getState().toasts.length).toBe(0);
  });

  it('6. New toast event after previous dismissal creates a fresh toast', () => {
    const id1 = showToast('First toast', 'success', 5000);
    vi.advanceTimersByTime(5001);
    expect(useToastStore.getState().toasts.length).toBe(0);

    const id2 = showToast('Second toast', 'success', 5000);
    expect(useToastStore.getState().toasts.length).toBe(1);
    expect(id1).not.toBe(id2);
    expect(useToastStore.getState().toasts[0].message).toBe('Second toast');
  });

  it('7. Clear toasts resets all active timers cleanly', () => {
    showToast('T1', 'info', 5000);
    showToast('T2', 'error', 5000);
    expect(useToastStore.getState().toasts.length).toBe(2);

    useToastStore.getState().clearToasts();
    expect(useToastStore.getState().toasts.length).toBe(0);

    vi.advanceTimersByTime(10000);
    expect(useToastStore.getState().toasts.length).toBe(0);
  });

  it('8. Error toasts also auto-dismiss after 5 seconds', () => {
    showToast('Connection failed', 'error', 5000);
    expect(useToastStore.getState().toasts.length).toBe(1);

    vi.advanceTimersByTime(5001);
    expect(useToastStore.getState().toasts.length).toBe(0);
  });
});
