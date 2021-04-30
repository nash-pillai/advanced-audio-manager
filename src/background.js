const tabList = {}, audioContext = new AudioContext();

var captureTab = async tab => {
  if (tab.id in tabList) return tabList[tab.id];
  else {
    const stream = await getPromise(chrome.tabCapture.capture, {audio: true, video: false}),
          x = tabList[tab.id] = {
            "streamSource": audioContext.createMediaStreamSource(stream),
            "gainNode": audioContext.createGain(),
            "volume": 100,
            "muted": false,
          };
    x.streamSource.connect(x.gainNode).connect(audioContext.destination);
    return x;
  }
};

var set = (tabId, volume, mute) => {
  const tabInfo = tabList[tabId];
  tabInfo.volume = Math.max(0, volume ?? tabInfo.volume);
  tabInfo.muted = mute ?? tabInfo.muted;
  tabInfo.gainNode.gain.value = tabInfo.muted ? 0 : tabInfo.volume / 100;
  chrome.browserAction.setBadgeText({"text": String(tabInfo.volume), tabId});
  chrome.browserAction.setBadgeBackgroundColor({"color": tabInfo.muted ? "#F00" : "#48F", tabId});
};

function stopCapture(tab) {
  tabList[tab.id].streamSource.mediaStream.getTracks()[0].stop();
  chrome.browserAction.setBadgeText({"tabId": tab.id});
  delete tabList[tab.id];
}

chrome.contextMenus.create({
  "title": "Toggle Captured",
  "contexts": ["browser_action"],
  async onclick(info, tab) {
    if (tab.id in tabList) {
      return stopCapture(tab);
    }
    await captureTab(tab);
    set(tab.id);
  },
});

chrome.contextMenus.create({
  "title": "Toggle Muted",
  "contexts": ["browser_action"],
  async onclick(info, tab) {
    const {muted} = await captureTab(tab);
    set(tab.id, undefined, !muted);
  },
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "set")
    set(request.tabId, request.volume, request.mute);
  else if (request.action === "get") {
    Promise.all([
      getPromise(chrome.tabs.query, {"active": true, "currentWindow": true}),
      getPromise(chrome.tabs.query, {"audible": true}),
    ]).then(async ([[current], audible]) => {
      audible = audible.filter(item => item.id !== current.id).map(item => ({
        ...item,
        ...(tabList[item.id] ?? {"volume": 100, "muted": false}),
        "captured": item.id in tabList,
      }));
      current = {...current, ...await captureTab(current)};
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
    return stopCapture(tab);
  }
  const tabInfo = await captureTab(tab);
  set(tab.id,
    command.startsWith("Volume-") ? tabInfo.volume + inc: undefined,
    command === "Mute" ? !tabInfo.muted : undefined,
  );
});
