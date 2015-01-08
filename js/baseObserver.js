function baseObserver() { }

baseObserver.prototype = {
  connNo              : 1,

  // optional functions to override
  onWelcomed          : function() { },

  onConnectionRefused : function() {  },

  onConnected : function() {
    document.getElementById("connect").style.cssText = "display: none;";
    document.getElementById("close").style.cssText = "display: block;";
  },

  onLoginAccepted : function(newHost) { },

  onLoginDenied : function() {
    connect(false, true);
  },

  onDisconnected : function(attemptingReconnect) {
    document.getElementById("connect").style.cssText = "display: block;";
    document.getElementById("close").style.cssText = "display: none;";
    gCli.history.innerHTML = "";
    gCli.historyOuter.style.height = 0;
    gCli.historyCache = [];
    gCli.Clear();
    gCli.__OnEscSeqCUP(null);
    gCli.update("Closed.");
  },

  onReconnecting : function() {  },

  onError : function(msg, skipAlert) {
    error(msg, false, false, skipAlert);
  },

  onDebug : function(msg, level) {
    debug(msg, level, false);
  },

  onAppendLog : function(msg, css, type) {
    appendLog(msg + "\n", css, type, false);
  },

  onStdin : function(msg, css, type) {
    stdin(msg);
  },

  onIsReadyChange : function(state) {
    try {
      window.onbeforeunload = state ? null : beforeUnload;
    } catch (ex) { }
  }

};
