const rule = {
  conditions: [
    new chrome.declarativeContent.PageStateMatcher({
      css: ["iframe.iframe-player-api"]
    })
  ],
  actions: [ 
    new chrome.declarativeContent.ShowPageAction()
   ]
}
chrome.runtime.onInstalled.addListener(function(details) {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([rule])
  })
})

var injected = new Map()
chrome.tabs.onUpdated.addListener(function update(id,changeInfo,tab){
  if(injected.has(id) && changeInfo.status=="loading"){
    chrome.webNavigation.onCompleted.removeListener(injected.get(id))
    injected.delete(id)
  }
})

chrome.pageAction.onClicked.addListener(({id: tabId})=>{
  if(!injected.has(tabId)){
    detectScript(tabId)
    .then(getPermission)
    .then(getFrameId)
    .then(injectScript)
    .then(tabId=>{
      chrome.pageAction.setIcon({tabId, path: "icons/logo32activated.png"})
    })
  }
})

function detectScript(tabId){
  return new Promise((resolve,reject)=>{
    chrome.tabs.executeScript(tabId, {code:"document.querySelector('iframe.iframe-player-api').src", runAt: "document_end"}, ([url])=>{
      resolve({tabId, url})
    })
  })
}

function getPermission({tabId, url}){
  return new Promise((resolve, reject)=>{
    chrome.permissions.request({origins: [url]}, granted => {
      if(granted){
        resolve({tabId, url})
      }
      else{
        reject()
      }
    })
  })
}

function getFrameId({tabId, url}){
  return new Promise((resolve,reject)=>{
    chrome.webNavigation.getAllFrames({tabId}, frames=>{
      var frameId = frames.find(frame=>frame.url==url).frameId
      resolve({tabId, frameId})

      function update({tabId: tId, frameId: fId}){
        if(tabId==tId){
          injectScript({tabId, fId})
          chrome.webNavigation.onCompleted.removeListener
        }
      }
      injected.set(tabId, update)
      chrome.webNavigation.onCompleted.addListener(update, {url:[{urlMatches: url.split('?')[0]}]})
    })
  })
}

function injectScript({tabId, frameId}){
  return new Promise((resolve,reject)=>{
    chrome.tabs.executeScript(tabId, {frameId, file:"inject.js", allFrames: true, runAt: "document_end"}, result=>resolve(tabId))
  })
}