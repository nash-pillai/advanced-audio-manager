const a = 1997/840, b = 1009/420;

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

window.onload = async () => {
  const {current, audible} = await getPromise(chrome.runtime.sendMessage, {"action": "get"}),
        card = siteCard(current.favIconUrl, current.title, current.id, current.url, current.captured);
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
};