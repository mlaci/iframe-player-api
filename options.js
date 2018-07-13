const main = document.querySelector(".main")
const permissions = main.querySelector(".permissions")
const controls = main.querySelector(".controls")
const urlInput = controls.querySelector("input")
const addButton = controls.querySelector("button")

const id = "iframe-player-controller"
var conditions = []
chrome.declarativeContent.onPageChanged.getRules([id], rules=>{
  if(rules.length>0){
    conditions=rules[0].conditions
    var records = conditions.map((cond)=>`<div>${cond.pageUrl.urlMatches} <button>remove</button></div>`)
    permissions.innerHTML = records.join("")
    permissions.querySelectorAll("button").forEach((button,index)=>button.onclick=()=>remove(index))
  }
})

function setRule(){
  var rule = {
    id,
    conditions,
    actions: [ 
      new chrome.declarativeContent.RequestContentScript({
        js: ["inject.js"],
        allFrames: true
      })
    ]
  }

  chrome.declarativeContent.onPageChanged.removeRules([id], ()=>
    chrome.declarativeContent.onPageChanged.addRules([rule])
  )
  window.location.reload(true)
}

function remove(index){
  const url = conditions[index].pageUrl.urlMatches;
  chrome.permissions.remove({origins:[url]}, removed=>{
    if(!removed){
      console.log(url+" not removed!")
    }
  })
  conditions.splice(index, 1)
  setRule()
}

addButton.onclick = () => {
  if(urlInput.checkValidity() && urlInput.value!=""){
    chrome.permissions.request({origins:[urlInput.value]}, granted=>{
      if(granted){
        
      }
    })
    var newCondition = new chrome.declarativeContent.PageStateMatcher({
      pageUrl: {urlMatches: urlInput.value}
    })
    conditions.push(newCondition)
    setRule()
    urlInput.value!=""
  }
}

urlInput.onkeydown = event => {
  if(event.keyCode == 13){
    addButton.click()
  }
}

chrome.runtime.onInstalled.addListener(function(details) {
  chrome.declarativeContent.onPageChanged.removeRules([id], rules=>{
    if(rules.length>0){
      conditions=rules[0].conditions
      setRule()
    }
  })
})

chrome.permissions.getAll(console.log)