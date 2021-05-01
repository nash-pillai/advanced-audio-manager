const getPromise = (func, ...args) => new Promise((resolve, reject) => {
  try {
    func(...args, result => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(result);
    });
  } catch (error) {reject(error)}
});

function createElement(name, attributes={}, ...children) {
  const element = name ? document.createElement(name) : new DocumentFragment();
  if (name) Object.entries(attributes).forEach(add_attribute, element);
  element.append(...children.map(child =>
    Array.isArray(child) ? createElement(...child) : child));
  return element;
}

function add_attribute([k, v]) {
  if (v === false) return;
  if (Array.isArray(v)) return v.map(i => [k, i]).forEach(add_attribute, this);
  if (typeof v === "function") return this.addEventListener(k, v);
  if (v === true) v = "";
  if (k in ["classList", "relList"]) return this[k].add(...v.split(/\s+/));
  this.setAttribute(k, v);
}
