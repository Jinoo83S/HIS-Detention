
// DB Layer (modular, no overwrite)
const DB = {
  get: async (path) => (await db.ref(path).once('value')).val() || {},
  set: async (path, data) => db.ref(path).set(data),
  update: async (path, data) => db.ref(path).update(data),
  push: async (path, data) => db.ref(path).push(data),
  remove: async (path) => db.ref(path).remove()
};
