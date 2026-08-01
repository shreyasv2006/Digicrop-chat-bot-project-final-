export class AsyncLocalStorage {
  disable() {}
  getStore() {
    return null;
  }
  run(store, callback, ...args) {
    return callback(...args);
  }
  enterWith(store) {}
}
