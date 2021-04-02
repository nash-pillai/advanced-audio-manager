var getPromise = (func, ...args) => new Promise((resolve, reject) => {
  try {
    func(...args, result => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError)
      else resolve(result)
    })
  } catch (error) {reject(error)}
});

Math.clamp = (min, value, max) => Math.min(Math.max(min, value), max);

const tabList = {};

var captureTab = async tab => {
  if (tab.id in tabList) return tabList[tab.id];
  else {
    const stream = await getPromise(chrome.tabCapture.capture, {audio: true, video: false}),
          audioContext = new AudioContext(),
          x = tabList[tab.id] = {
            audioContext,
            "streamSource": audioContext.createMediaStreamSource(stream),
            "gainNode": audioContext.createGain(),
            "volume": 100,
            "muted": false,
          };
    x.streamSource.connect(x.gainNode).connect(audioContext.destination);
    set(tab.id);
    return x;
  }
};

var set = (tabId, volume, mute) => {
  const tabInfo = tabList[tabId];
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
      getPromise(chrome.tabs.query, {"audible": true}),
    ]).then(async ([[current], audible]) => {
      audible = audible.filter(item => item.id !== current.id).map(item => {
        item.captured = item.id in tabList;
        item.volume = item.captured ? tabList[item.id].volume : 1;
        item.muted = item.captured ? tabList[item.id].muted : false;
        return item;
      });
      await captureTab(current);
      current.volume = tabList[current.id].volume;
      current.muted = tabList[current.id].muted;
      sendResponse({current, audible});
    });
    return true;
  }
  else if (request.action === "goto") {
    chrome.tabs.update(request.tabId, {"active": true});
    getPromise(chrome.tabs.get, request.tabId).then(tab =>
      chrome.windows.update(tab.windowId, {"focused": true}));
  }
});


chrome.commands.onCommand.addListener(async command => {
  const [tab] = await getPromise(chrome.tabs.query, {"active": true, "currentWindow": true}),
        inc = command === "Volume-Up" ? 20 : -20;

  if (command === "Capture" && tab.id in tabList) {
    tabList[tab.id].streamSource.mediaStream.getTracks().forEach(track => track.stop());
    chrome.browserAction.setBadgeText({"tabId": tab.id});
    delete tabList[tab.id];
  } else {
    const tabInfo = await captureTab(tab);
    if (["Volume-Up", "Volume-Down"].includes(command))
      set(tab.id, tabInfo.volume + inc);
    else if (command === "Mute") set(tab.id, undefined, !tabInfo.muted);
  }
});
