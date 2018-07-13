var script = document.createElement("script")
script.src = chrome.extension.getURL("content-script.js")
document.head.appendChild(script)