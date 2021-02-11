var ce = (name, attributes={}, ...children) => {     // Creates Elements
  if (name == "__TEXT__") return document.createTextNode(children[0] || "");
  let element = name == "__FRAG__" ? new DocumentFragment() : document.createElement(name);
  for (let [k, v] of Object.entries(attributes))
    typeof v === "function" ? element.addEventListener(k, v) : element.setAttribute(k, v);
  children.forEach((child) =>
    element.appendChild(child instanceof HTMLElement ? child : ce(...child)));
  return element;
};

var siteCard = (favIconUrl, title, tabId, captured) =>
  ce("div", {"class": "site_card" + (captured ? " captured" : ""), "data-id": tabId},
    ["img", {
      "src": favIconUrl || "images/globe.svg",  
      "alt": "Favicon", 
      "title": "Go to Tab", 
      "click": function() {chrome.runtime.sendMessage({action: 'goto', tabId})}
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
  return x;
};

var updateMute = (mute, x) => {
  setTab(Number(x.dataset.id), undefined, mute);
  x.children[5].innerText = mute ? "Unmute" : "Mute";
  x.classList.toggle("muted", mute);
  return x;
}

var setTab = (tabId, volume, mute) => chrome.runtime.sendMessage({action: 'set', tabId, volume, mute});


window.onload = () => chrome.runtime.sendMessage({action: 'get'}, response => {
  setTab(response.current.id);
  document.getElementById("current_tab").appendChild(
    updateMute(response.current.muted, updateVolume(response.current.volume,
      siteCard(response.current.favIconUrl, response.current.title, response.current.id, true))));
  document.getElementById("audible_list").appendChild(
    ce("__FRAG__", {}, ...response.audible.map(item =>
      updateMute(item.muted, updateVolume(item.volume,
        siteCard(item.favIconUrl, item.title, item.id, item.captured))))));
  if (response.audible.length > 0)
    document.body.insertBefore(ce("hr"), document.getElementById("audible_list"));
});