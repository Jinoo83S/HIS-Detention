
// Global state manager
const State = {
  teachers: {},
  students: {},
  entries: {},
  notices: {},
  recovery: {},

  set(key, value){
    this[key] = value;
    render();
  }
};
