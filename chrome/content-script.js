var media = document.querySelectorAll("video, audio")[0]
var playerLib = this.jwplayer && this.jwplayer(document.querySelector(".jwplayer").id || "player")

function ranges(timeRange){
  return Array.from(Array(timeRange.length)).map((_,index)=>({start:timeRange.start(index),end:timeRange.end(index)}))
}

function playerState(media){
  var state = "idle"
  if(media.readyState>0){
    state = "loadedmetadata"
  }
  if(media.readyState>1){
    state = "waiting"
  }
  if(media.readyState>2){
    if(media.ended){
      state = "ended"
    }
    else{
      if(media.paused){
        state = "paused"
      }
      else{
        state = "playing"
        
      }
    }
  }
  return state
}

function parseStartDate(item){
  if(item.type=="dash"){
    return fetch(item.file)
    .then(response=>response.text())
    .then(text=>text.match(/availabilityStartTime="(.*)"/)[1])
    .then(dateString=>new Date(dateString).getTime())
  }
  else if(item.type=="hls"){
    return new Promise(resolve=>{
      if(hlsStartDate){
        resolve(hlsStartDate)
      }
      else{
        playerLib.on('meta', function meta({programDateTime}){
          if(programDateTime){
            resolve(new Date(programDateTime).getTime())
            playerLib.off('meta', meta)
          }
        })
      }
    })
  }
}

var port = undefined
var commands = {
  //main
  play: function(){
    media.play()
    .then(()=>{
      this.postMessage("ok")
    })
  },
  pause: function(){
    media.pause()
    this.postMessage("ok")
  },
  getCurrentTime: function(){
    this.postMessage(media.currentTime)
  },
  getStartDate: function(){
    parseStartDate(playerLib.getPlaylistItem())
    .then(date=>this.postMessage(date))
  },
  setCurrentTime: function(time){
    media.currentTime = time
    this.postMessage("ok")
  },
  getBuffered: function(){
    this.postMessage(ranges(media.buffered))
  },
  getPlayed: function(){
    this.postMessage(ranges(media.played))
  },
  getSeekable: function(){
    this.postMessage(ranges(media.played))
  },
  getDuration: function(){
    this.postMessage(media.duration)
  },
  getPlayerState: function(){
    this.postMessage(playerState(media))
  },
  //controls
  showControls: function(){
    media.controls = true
    this.postMessage("ok")
  },
  hideControls: function(){
    media.controls = false
    this.postMessage("ok")
  },
  //playlist
  next: function(){
    playerLib.playlistNext()
    this.postMessage("ok")
  },
  prev: function(){
    playerLib.playlistPrev()
    this.postMessage("ok")
  },
  playAt: function(index){
    playerLib.playlistItem(index)
    this.postMessage("ok")
  },
  getPlaylist: function(){
    this.postMessage(JSON.parse(JSON.stringify(playerLib.getPlaylist())))
  },
  getPlaylistIndex: function(){
    this.postMessage(playerLib.getPlaylistIndex())
  },
  reload: function(){
    location.reload()
    this.postMessage("ok")
  },
  //volume
  mute:  function(){
    media.muted = true
    this.postMessage("ok")
  },
  unmute: function(){
    media.muted = false
    this.postMessage("ok")
  },
  isMuted: function(){
    this.postMessage(media.muted)
  },
  getVolume: function(){
    this.postMessage(media.volume)
  },
  setVolume:  function(volume){
    media.volume = volume
    this.postMessage("ok")
  },
  //quality
  getPlaybackQuality: function(){
    var quality = playerLib.getQualityLevels()[playerLib.getCurrentQuality()].label
    this.postMessage(quality)
  },
  setPlaybackQuality: function(quality){
    var index = playerLib.getQualityLevels().findIndex(({label})=>label.startsWith(quality))
    playerLib.setCurrentQuality(index)
    this.postMessage("ok")
  },
  getAvailableQualityLevels: function(){
    this.postMessage(playerLib.getQualityLevels())
  }
}

var events = {}
window.addEventListener("message", event=>{
  var {type, commandName, eventName} = event.data
  var port = event.ports[0]
  if(type=="registerCommand"){
    port.onmessage = event=>{
      commands[commandName].apply(port, event.data.params)
    }
  }
  else if(type=="subscribeEvent"){
    var listener = event=>port.postMessage({type:event.type})
    events[eventName] = listener
    media.addEventListener(eventName, listener)
  }
  else if(type=="unsubscribeEvent"){
    media.removeEventListener(eventName, events[eventName])
    delete events[eventName]
  }
})

var hlsStartDate
if(playerLib){
  playerLib.on('firstFrame', ()=>media = document.querySelectorAll("video, audio")[0])

  playerLib.on('playlistItem', item=>{
    media = document.querySelectorAll("video, audio")[0]

    hlsStartDate = null
    if(item.type=="hls"){
      playerLib.on('meta', function meta({programDateTime}){
        if(programDateTime){
          hlsStartDate = new Date(programDateTime).getTime()
          playerLib.off('meta', meta)
        }
      })
    }
  })
}

parent.postMessage("onPlayerReady", "*")