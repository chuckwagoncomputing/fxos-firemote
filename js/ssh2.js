function ssh2Mozilla(observer) {
  inherit(this, new baseProtocol());
  this.observer = observer;

  setTimeout(this.keepAlive.bind(this), 60000);
}

ssh2Mozilla.prototype = {
  // override base class variables
  protocol     : 'ssh2',

  // read-write variables
  width        : 80,
  height       : 24,
  tunnels      : '',

  // internal variables
  channels     : {},
  refreshRate  : 10,
  transport    : null,
  client       : null,
  shell        : null,
  relogin      : false,
  options      : {},


  connect : function(reconnect) {
    var self = this;
    this.setupConnect(reconnect);
    this.observer.version = this.version;
    this.relogin = false;

    var proxyInfo = null;
      
    this.options.binaryType = "arraybuffer";
    console.log(this.host + ":" + this.port);
    this.controlTransport = this.transportService.open(this.host, parseInt(this.port), this.options);
    this.controlTransport.onopen = function () {
      self.onConnected();
    };
    this.controlTransport.ondata = function (event) {
      self.transport.fullBuffer += ab2str(event.data);
      self.transport.run();
    };
    this.controlTransport.onerror = function(event) {
      self.observer.onError(event.data);
    };
    this.controlTransport.onclose = function() {
      self.onDisconnected();
    };

    var shell_success = function(shell) {
      self.shell = shell;
      self.channels["main"] = { 'serverSocket' : null, 'chan' : shell, 'bufferOut' : "" };

      self.loginAccepted();
      self.isReady = true;
      self.input();
    };
      
    var auth_success = function() {
      self.client.invoke_shell('xterm-256color', self.width, self.height, shell_success);
    };

    var write = function(out) {
      self.controlTransport.send(str2ab(out));
    };

    this.client = new paramikojs.SSHClient();
    this.transport = this.client.connect(this.observer, write, auth_success,
                                      this.host, parseInt(this.port), this.login, this.password, null, null);
  },

  cleanup : function(isAbort) {
    this._cleanup();
    for (var x in this.channels) {
      if (this.channels[x]['serverSocket']) {
        try {
          this.channels[x]['serverSocket'].close();
        } catch (ex) { }
      }
    }
    this.channels = {};
  },

  resetReconnectState : function() {
    for (var x in this.channels) {
      if (this.channels[x]['serverSocket']) {
        try {
          this.channels[x]['serverSocket'].close();
        } catch (ex) { }
      }
    }
    this.channels = {};
  },

  sendQuitCommand : function(legitClose) {                                       // called when shutting down the connection
    this.client.close(legitClose);
    this.kill();
  },

  keepAlive : function() {
    if (this.isConnected && this.keepAliveMode) {
      this.client._transport.global_request('keepalive@lag.net', null, false);
    }

    setTimeout(this.keepAlive.bind(this), 60000);
  },

  input : function() {
    try {
      if (!this.shell || this.shell.closed) {
        this.legitClose = true;
        this.onDisconnect();
        return;
      }
      var stdin = this.shell.recv(65536);
    } catch(ex if ex instanceof paramikojs.ssh_exception.WaitException) {
      this.check_stderr();
      return;
    }
    if (stdin) {
      this.observer.onStdin(stdin, 'input', 'input');
    }
    this.check_stderr();
  },

  check_stderr : function() {
    try {
      var stderr = this.shell.recv_stderr(65536);
    } catch(ex if ex instanceof paramikojs.ssh_exception.WaitException) {
      setTimeout(this.input.bind(this), this.refreshRate);
      return;
    }
    if (stderr) {
      this.observer.onError(stderr, 'error', 'error');
    }

    setTimeout(this.input.bind(this), this.refreshRate);
  },

  output : function(out, key) {
    key = key || "main";
    if (!this.channels[key]) {
      return;
    }

    this.channels[key]['bufferOut'] += out;
    this.send_output(key);
  },

  send_output : function(key) {
    while (this.channels[key]['bufferOut'].length > 0) {
      try {
        var n = this.channels[key]['chan'].send(this.channels[key]['bufferOut']);
      } catch(ex if ex instanceof paramikojs.ssh_exception.WaitException) {
        var self = this;
        var wait_callback = function() {
          self.send_output(key);
        }
        setTimeout(wait_callback, this.refreshRate);
        return;
      }
      if (n <= 0) { // eof
        break;
      }
      this.channels[key]['bufferOut'] = this.channels[key]['bufferOut'].substring(n);
    }
  },

  recoverFromDisaster    : function() { /* do nothing */ },
  
}
