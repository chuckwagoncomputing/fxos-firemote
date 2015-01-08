function telnetMoz(observer) {
  inherit(this, new baseProtocol());
  this.observer = observer;
}

telnetMoz.prototype = {
  protocol : 'telnet',
  message  : "",
  outMessage : new ArrayBuffer(1),
  options : {},
  
  connect : function() {
    var self = this;
    gCli.onTerminalReset();
    this.options.binaryType = "arraybuffer";
    this.controlTransport = this.transportService.open(this.host, this.port, this.options);
    this.controlTransport.onopen = function () {
      self.onConnected();
    };
    this.controlTransport.ondata = function (event) {
      self.observer.onStdin(ab2str(event.data));
    };
    this.controlTransport.onerror = function(event) {
      self.observer.onError("Error, connection failed.");
    };
    this.controlTransport.onclose = function() {
      self.onDisconnected();
    };
  },
  
  kill : function() {
    this.controlTransport.close();
  },
  
  output : function(msg) {
    this.controlTransport.send(str2ab(msg));
  },
  
  cleanup : function() { }
};
