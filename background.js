var getPromise = (func, ...args) => new Promise((resolve, reject) => {
  try {
    func(...args, result => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
      else resolve(result)
    })
  } catch (error) {reject(error)}
});

Math.clamp = (min, value, max) => Math.min(Math.max(min, value), max);

var tabList = {};

var captureTab = tab => new Promise(resolve => {
  if (tab.id in tabList) resolve(tabList[tab.id]);
  else getPromise(chrome.tabCapture.capture, {audio: true, video: false}).then(stream => {
    tabList[tab.id] = x = {
      "audioContext": (audioContext = new AudioContext()),
      "streamSource": audioContext.createMediaStreamSource(stream),
      "gainNode": audioContext.createGain(),
      "volume": 99,
      "muted": false
    };
    x.streamSource.connect(x.gainNode).connect(audioContext.destination);
    set(tab.id);
    resolve(x);
  });
});

var set = (tabId, volume, mute) => {
  let tabInfo = tabList[tabId];
  if (tabInfo === undefined) return;
  if (volume !== undefined) tabInfo.volume = Math.clamp(0, volume, 999);
  if (mute !== undefined) tabInfo.muted = mute;
  tabInfo.gainNode.gain.value = tabInfo.muted ? 0 : tabInfo.volume / 100;
  chrome.browserAction.setBadgeText({"text": String(tabInfo.volume), tabId});
  chrome.browserAction.setBadgeBackgroundColor({"color": tabInfo.muted ? "#F00" : "#4285f6", tabId});
};




chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "set")
    set(request.tabId, request.volume, request.mute);
  else if (request.action === "get") {
    Promise.all([
      getPromise(chrome.tabs.query, {"active": true, "currentWindow": true}),
      getPromise(chrome.tabs.query, {"audible": true})
    ]).then(([[current], audible]) => {
      audible = audible.filter(item => item.id !== current.id).map(item => {
        item.captured = item.id in tabList;
        item.volume = item.captured ? tabList[item.id].volume : 1;
        item.muted = item.captured ? tabList[item.id].muted : false;
        return item;
      });
      captureTab(current).then(() => {
        current.volume = tabList[current.id].volume;
        current.muted = tabList[current.id].muted;
        sendResponse({current, audible});
      });
    });
    return true;
  }
  else if (request.action === "goto") {
    chrome.tabs.update(request.tabId, {"active": true});
    getPromise(chrome.tabs.get, request.tabId).then(tab =>
      chrome.windows.update(tab.windowId, {"focused": true}));
  }
});


chrome.commands.onCommand.addListener(command => 
  getPromise(chrome.tabs.query, {"active": true, "currentWindow": true}).then(([tab]) => {
    let inc = command === "Volume-Up" ? 9 : -9;

    if (["Volume-Up", "Volume-Down"].includes(command))
      captureTab(tab).then(tabInfo => set(tab.id, tabInfo.volume + inc));
    else if (command === "Mute")
      captureTab(tab).then(tabInfo => set(tab.id, undefined, !tabInfo.muted));
    else if (tab.id in tabList) {
      tabList[tab.id].streamSource.mediaStream.getTracks().forEach(track => track.stop());
      chrome.browserAction.setBadgeText({"tabId": tab.id});
      delete tabList[tab.id];
    } else captureTab(tab);
  })
);
