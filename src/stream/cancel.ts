export class CancelToken {
  private _cancelled = false;
  private listeners: Array<() => void> = [];

  get cancelled(): boolean {
    return this._cancelled;
  }

  cancel() {
    if (this._cancelled) return;
    this._cancelled = true;
    for (const fn of this.listeners) {
      try {
        fn();
      } catch (e) {
        // swallow
      }
    }
    this.listeners = [];
  }

  onCancel(fn: () => void): () => void {
    if (this._cancelled) {
      fn();
      return () => {};
    }
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  }
}
