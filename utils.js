const getPromise = (func, ...args) => new Promise((resolve, reject) => {
  try {
    func(...args, result => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else resolve(result);
    });
  } catch (error) {reject(error)}
});

function ce(name, attributes={}, ...children) {     // Creates Elements
  const element = name ? document.createElement(name) : new DocumentFragment();
  for (const [k, v] of Object.entries(attributes))
    if (typeof v === "function") element.addEventListener(k, v);
    else if (k === "classList") element.classList.add(...v);
    else if (Array.isArray(v)) v.forEach(i => element.addEventListener(k, i));
    else if (v === false) continue;
    else element.setAttribute(k, v);
  for (const child of children)
    if (child instanceof HTMLElement) element.appendChild(child);
    else if (typeof child === "string") element.appendChild(document.createTextNode(child));
    else if (Array.isArray(child)) element.appendChild(ce(...child));
  return element;
}