/**
 * Redux-Persist CookieStorage (ESM 호환 순수 구현체)
 */

export class CookieStorage {
  constructor(cookies, options = {}) {
    this.cookies = cookies;
    this.keyPrefix = options.keyPrefix || '';
    this.indexKey = options.indexKey || 'reduxPersistIndex';
    this.expiration = options.expiration || {};
    if (!this.expiration.default) {
      this.expiration.default = null;
    }
    this.setCookieOptions = options.setCookieOptions;
  }

  getItem(key, callback) {
    const item = (this.cookies && this.cookies.get(this.keyPrefix + key)) || null;
    if (callback) {
      callback(null, item);
    }
    return Promise.resolve(item);
  }

  setItem(key, value, callback) {
    const options = Object.assign({}, this.setCookieOptions);
    let expires = this.expiration.default;
    if (typeof this.expiration[key] !== 'undefined') {
      expires = this.expiration[key];
    }
    if (expires) {
      options["expires"] = expires;
    }

    if (this.cookies && this.cookies.set) {
      this.cookies.set(this.keyPrefix + key, value, options);
    }

    const indexOptions = Object.assign({}, this.setCookieOptions);
    if (this.expiration.default) {
      indexOptions["expires"] = this.expiration.default;
    }

    return this.getAllKeys().then((allKeys) => {
      if (allKeys.indexOf(key) === -1) {
        allKeys.push(key);
        if (this.cookies && this.cookies.set) {
          this.cookies.set(this.indexKey, JSON.stringify(allKeys), indexOptions);
        }
      }
      if (callback) {
        callback(null);
      }
      return Promise.resolve(null);
    });
  }

  removeItem(key, callback) {
    if (this.cookies && this.cookies.expire) {
      this.cookies.expire(this.keyPrefix + key);
    }

    return this.getAllKeys().then((allKeys) => {
      const filtered = allKeys.filter((k) => k !== key);
      if (this.cookies && this.cookies.set) {
        this.cookies.set(this.indexKey, JSON.stringify(filtered));
      }
      if (callback) {
        callback(null);
      }
      return Promise.resolve(null);
    });
  }

  getAllKeys(callback) {
    let result = [];
    if (this.cookies && this.cookies.get) {
      const cookie = this.cookies.get(this.indexKey);
      if (cookie) {
        try {
          result = JSON.parse(cookie);
        } catch (e) {
          result = [];
        }
      }
    }

    if (callback) {
      callback(null, result);
    }
    return Promise.resolve(result);
  }
}

export default CookieStorage;
