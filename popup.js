var ce = (name, attributes={}, ...children) => {     // Creates Elements
  if (name === "__TEXT__") return document.createTextNode(children[0] || "");
  let element = name === "" ? new DocumentFragment() : document.createElement(name);
  for (let [k, v] of Object.entries(attributes))
    typeof v === "function" ? element.addEventListener(k, v) : element.setAttribute(k, v);
  children.forEach((child) =>
    element.appendChild(child instanceof HTMLElement ? child : ce(...child)));
  return element;
};

var siteCard = (favIconUrl, title, tabId, url, captured) =>
  ce("div", {"class": "site_card" + (captured ? " captured" : ""), "data-id": tabId},
    ["img", {
      "src": favIconUrl || "images/globe.svg",  
      "alt": "Favicon", 
      "title": url, 
      "click": () => {chrome.runtime.sendMessage({"action": "goto", tabId}); window.close()},
    }],
    ["span", {"title": title}, ["__TEXT__", {}, title]],
    ["input", {
      "type": "range", 
      "class": "volume_boost", 
      "min": "0", 
      "max": "9", 
      "value": "0", 
      "input": sliderChange,
      ...captured ? {} : {"disabled": ""}
    }],
    ["input", {
      "type": "number", 
      "min": "0", 
      "max": "999", 
      "step": "9", 
      "value": "99", 
      "input": function() {updateVolume(Number(this.value), this.parentElement)},
      ...captured ? {} : {"disabled": ""}
    }],
    ["input", {
      "type": "range", 
      "class": "volume_range", 
      "max": "99", 
      "step": "9", 
      "value": "99", 
      "input": sliderChange,
      ...captured ? {} : {"disabled": ""}
    }],
    ["button", {"class": "mute", "click": muteChange}, ["__TEXT__", {}, "Mute"]],
  );

function sliderChange() {
  let x = this.parentElement;
  updateVolume(Number(x.children[2].value)*100 + Number(x.children[4].value), x);
}

function muteChange() {
  updateMute(!this.parentElement.classList.contains("muted"), this.parentElement);
}

var updateVolume = (volume, x) => {
  setTab(Number(x.dataset.id), volume);
  x.children[2].value = String(Math.floor(volume / 100));
  x.children[3].value = String(volume);
  x.children[4].value = String(volume % 100);
};

var updateMute = (mute, x) => {
  setTab(Number(x.dataset.id), undefined, mute);
  x.children[5].innerText = mute ? "Unmute" : "Mute";
  x.classList.toggle("muted", mute);
}

var setTab = (tabId, volume, mute) => chrome.runtime.sendMessage({"action": "set", tabId, volume, mute});

window.onload = () => chrome.runtime.sendMessage({"action": "get"}, ({current, audible}) => {
  let card = siteCard(current.favIconUrl, current.title, current.id, current.url, true);
  setTab(current.id);
  updateMute(current.muted, card);
  updateVolume(current.volume, card);
  document.getElementById("current_tab").replaceChildren(card);

  document.getElementById("audible_list").replaceChildren(...audible.map(item => {
    let card = siteCard(item.favIconUrl, item.title, item.id, item.url, item.captured);
    updateMute(item.muted, card);
    updateVolume(item.volume, card);
    return card;
  }));
  document.getElementsByTagName("hr")[0].hidden = audible.length === 0;
});