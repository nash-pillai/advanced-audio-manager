function siteCard(favIconUrl, title, tabId, url, captured) {
  return ce("div", {"class": "site_card", "data-id": tabId},
    ["img", {
      "src": favIconUrl || "/images/globe.svg",
      "alt": "Favicon",
      "title": url,
      click() {
        chrome.runtime.sendMessage({"action": "goto", tabId});
        window.close();
      },
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
      input() {
        const x = this.valueAsNumber;
        updateVolume(Math.round(a * x**2 + b * x), this.parentElement);
      },
      "disabled": !captured,
    }],
    ["button", {
      click() {updateMute(!this.parentElement.classList.contains("muted"), this.parentElement)},
      "disabled": !captured,
    }, "Mute"],
  );
}