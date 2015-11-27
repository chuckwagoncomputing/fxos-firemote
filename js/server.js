function Server(host, port, username, password, privateKey, type, ruid, hostkey) {
  this.host = host;
  this.port = port;
  this.username = username;
  this.password = password;
  this.privateKey = privateKey;
  this.type = type;
  this.ruid = ruid;
  this.hostkey = hostkey;
  this.socket;
  this.terminalWindow;
};

Server.prototype = {
  connect : function() {
    this.socket = this.createSocket();
    this.connection = new this.protocolMap[this.type](this);
    this.terminalWindow = this.createTerminalWindow(this.connection);
    this.connection.terminalWindow = this.terminalWindow
    this.connection.connect();
  },
  disconnect : function() {
    this.connection.disconnect();
    this.connection = undefined;
    this.terminalWindow = undefined;
    this.socket = undefined;
  }
};