const tabList = {}, audioContext = new AudioContext();

async function captureTab(tab){
  if (tab.id in tabList) return {...tabList[tab.id], captured: true};
  const tabInfo = {
    "volume": 100,
    "muted": tab.mutedInfo?.muted ?? false,
    "gainNode": audioContext.createGain(),
  };

  try {
    const stream = await getPromise(chrome.tabCapture.capture, {audio: true});
    audioContext.createMediaStreamSource(stream)
      .connect(tabInfo.gainNode)
      .connect(audioContext.destination);
    tabList[tab.id] = {...tabInfo, stream};
    return {...tabInfo, captured: true};
  } catch (err) {
    console.warn("%ccaptureTab", "font-style: italic", "failed:", err.message);
    return {...tabInfo, captured: false};
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
  tabList[tab.id].stream.getTracks()[0].stop();
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
