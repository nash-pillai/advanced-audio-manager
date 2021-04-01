var ce = (name, attributes={}, ...children) => {     // Creates Elements
  const element = name ? document.createElement(name) : new DocumentFragment();
  for (const [k, v] of Object.entries(attributes))
    if (typeof v === "function") element.addEventListener(k, v);
    else if (v === false) continue;
    else element.setAttribute(k, v);
  for (const child of children)
    if (child instanceof HTMLElement) element.appendChild(child);
    else if (typeof child === "string") element.appendChild(document.createTextNode(child));
    else if (Array.isArray(child)) element.appendChild(ce(...child));
  return element;
};

var siteCard = (favIconUrl, title, tabId, url, captured) =>
  ce("div", {"class": "site_card", "data-id": tabId},
    ["img", {
      "src": favIconUrl || "images/globe.svg",
      "alt": "Favicon",
      "title": url,
      click() {chrome.runtime.sendMessage({"action": "goto", tabId}); window.close()},
    }],
    ["span", {title}, title],
    ["input", {
      "type": "number",
      "min": 0,
      "step": 20,
      input() {updateVolume(this.valueAsNumber, this.parentElement)},
      "disabled": !captured,
    }],
    ["input", {
      "type": "range",
      "max": 20,
      "input": sliderChange,
      "disabled": !captured,
    }],
    ["button", {
      click() {updateMute(!this.parentElement.classList.contains("muted"), this.parentElement)},
      "disabled": !captured,
    }, "Mute"],
  );

const a = 1997/840, b = 1009/420;

function sliderChange() {
  const x = this.valueAsNumber;
  updateVolume(Math.round(a * x**2 + b * x), this.parentElement);
}

var updateVolume = (volume, card) => {
  setTab(Number(card.dataset.id), volume);
  card.children[2].valueAsNumber = volume;
  card.children[3].valueAsNumber = Math.round((-b + Math.sqrt(b**2 - 4*a*(-volume))) / (2*a));
};

var updateMute = (mute, card) => {
  setTab(Number(card.dataset.id), undefined, mute);
  card.children[4].innerText = mute ? "Unmute" : "Mute";
  card.classList.toggle("muted", mute);
};

var setTab = (tabId, volume, mute) =>
  chrome.runtime.sendMessage({"action": "set", tabId, volume, mute});

window.onload = () => chrome.runtime.sendMessage({"action": "get"}, ({current, audible}) => {
  const card = siteCard(current.favIconUrl, current.title, current.id, current.url, true);
  setTab(current.id);
  updateMute(current.muted, card);
  updateVolume(current.volume, card);
  document.getElementById("current_tab").replaceChildren(card);

  document.getElementById("audible_list").replaceChildren(...audible.map(item => {
    const card = siteCard(item.favIconUrl, item.title, item.id, item.url, item.captured);
    updateMute(item.muted, card);
    updateVolume(item.volume, card);
    return card;
  }));
  document.getElementsByTagName("hr")[0].hidden = audible.length === 0;
});