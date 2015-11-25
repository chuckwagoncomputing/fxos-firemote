function telnetConnection(parent) {
  this.host = parent.host;
  this.port = parent.port;
  this.socket = parent.socket;
  this.terminalWindow = parent.terminalWindow;
};

telnetConnection.prototype = {
  connect : function() {
    this.terminalWindow.onTerminalReset();   
  },
  disconnect : function() {
    this.socket.close();
  },
  onOpen : function() {},
  onData : function(data) {
    this.terminalWindow.update(data);
  },
  onClose : function() {},
  send : function(out) {
    this.socket.send(str2ab(out));
  }
};
