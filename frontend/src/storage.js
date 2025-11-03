// storage.js
export const storage = {
  save(key, value) {
    localStorage.setItem(`atc24_${key}`, JSON.stringify(value));
  },

  load(key, defaultValue = null) {
    const data = localStorage.getItem(`atc24_${key}`);
    return data ? JSON.parse(data) : defaultValue;
  },

  remove(key) {
    localStorage.removeItem(`atc24_${key}`);
  }
};