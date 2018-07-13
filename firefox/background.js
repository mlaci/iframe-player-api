browser.tabs.onUpdated.addListener(function update(tabId,changeInfo,tab){
  browser.pageAction.show(tabId)
})

var injected = new Map()
browser.tabs.onUpdated.addListener(function update(id,changeInfo,tab){
  if(injected.has(id) && changeInfo.status=="loading"){
    if(typeof injected.get(id) == "function"){
      browser.webNavigation.onCompleted.removeListener(injected.get(id))
    }
    injected.delete(id)
  }
})

browser.pageAction.onClicked.addListener(({id: tabId})=>{
  if(!injected.has(tabId)){
    browser.tabs.executeScript(tabId, {code:"document.querySelector('iframe.iframe-player-api').src", runAt: "document_end"})
    .then(([frameUrl])=>{
      browser.pageAction.setIcon({tabId, path: "icons/logo32permission.png"})
      injected.set(tabId, frameUrl)
    })
    .catch(err=>{
      browser.pageAction.hide(tabId)
    })
  }
  else if(typeof injected.get(tabId) == "string"){
    var frameUrl = injected.get(tabId)
    browser.permissions.request({origins: [frameUrl]})
    .then(()=>({tabId, frameUrl}))
    .then(getFrameId)
    .then(injectScript)
    .then(()=>{
      browser.pageAction.setIcon({tabId, path: "icons/logo32activated.png"})
    })
    .catch(err=>{
      browser.pageAction.hide(tabId)
    })
  }
})

function getFrameId({tabId, frameUrl}){
  return browser.webNavigation.getAllFrames({tabId})
  .then(frames=>{
    var frameId = frames.find(frame=>frame.url==frameUrl).frameId
    
    function update({tabId: tId, frameId: fId}){
      if(tabId==tId){
        injectScript({tabId, fId})
        browser.webNavigation.onCompleted.removeListener
      }
    }
    injected.set(tabId, update)
    browser.webNavigation.onCompleted.addListener(update, {url:[{urlMatches: frameUrl.split('?')[0]}]})

    return {tabId, frameId}
  })
}

function injectScript({tabId, frameId}){
  return browser.tabs.executeScript(tabId, {frameId, file:"inject.js", runAt: "document_end"})
}