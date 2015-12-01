function ssh2Connection(parent) {
  this.host = parent.host;
  this.port = parent.port;
  this.username = parent.username;
  this.password = parent.password;
  this.privateKey = parent.privateKey;
  this.hostkey = parent.hostkey;
  this.socket = parent.socket;
  this.terminalWindow = parent.terminalWindow;
};

ssh2Connection.prototype = {
  observer : {
    version : 1,
    onSftpCache : function(buffer, new_key, cacheCallback) {
      var accept = confirm("This server has a host key we haven't seen before.\n" + new_key + "\nAccept this key?");
      if (accept) {
        cacheCallback('y');
        var entry = this.client._host_keys._entries[0];
        this.saveKey(entry.to_line());
      }
      else {
        cacheCallback('');
      }
    }
  },
  connect : function() {
    this.terminalWindow.onTerminalReset();
    var credentials = { 'username' : this.username, 'password' : this.password, 'privateKey' : this.privateKey};
    var methods = ['password', 'interactive', 'publickey', 'gssapi-mic', 'gssapi-keyex'];
    var gssapiOptions = {'host' : 'hostname', 'auth' : true, 'keyex' : true, 'deleg-cred' : true};
    var timeout = 30;
    var pkey = null;
    if (this.privateKey) {
      pkey = new paramikojs.RSAKey(null, null, null, null, null, null, this.privateKey);
    }
    setTimeout(this.keepAlive.bind(this), 60000);
    this.client = new paramikojs.SSHClient();
    this.observer.client = this.client;
    if (this.hostkey) {
      this.client._host_keys._entries.push(new paramikojs.HostKeyEntry().from_line(this.hostkey));
    }
    this.client.set_missing_host_key_policy(new paramikojs.AskPolicy());
    this.transport = this.client.connect(this.observer, this.write.bind(this), this.auth_success.bind(this), this.host, this.port, credentials.username, credentials.password, pkey, null, this.timeout, false);
    this.refreshRate = 10;
  },
  disconnect : function() {
    this.socket.close();
  },
  write : function(out) {
    this.socket.send(str2ab(out));
  },
  auth_success : function() {
    this.client.invoke_shell('xterm-256color', this.width, this.height, this.shell_success.bind(this));
  },
  shell_success : function(shell) {
    this.shell = shell;
    this.input();
  },
  keepAlive : function() {
    if (this.socket.readyState === "connected") {
      this.client._transport.global_request('keepalive@lag.net', null, false);
    }
    setTimeout(this.keepAlive.bind(this), 60000);
  },
  onOpen : function() {},
  onClose : function() {},
  onData : function(data) {
    this.transport.fullBuffer += data;
    this.transport.run();
  },
  input : function() {
    try {
      if (!this.shell || this.shell.closed) {
        this.onClose();
        return;
      }
      var stdin = this.shell.recv(65536);
    } catch(ex if ex instanceof paramikojs.ssh_exception.WaitException) {
      this.check_stderr();
      return;
    }
    if (stdin) {
      this.terminalWindow.update(stdin);
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
      this.terminalWindow.update(stderr);
    }

    setTimeout(this.input.bind(this), this.refreshRate);
  },
  send : function(out) {
    while (out.length > 0) {
      try {
        var n = this.shell.send(out);
      } catch(ex if ex instanceof paramikojs.ssh_exception.WaitException) {
        var self = this;
        var wait_callback = function() {
          self.send(out);
        }
        setTimeout(wait_callback, this.refreshRate);
        return;
      }
      if (n <= 0) { // eof
        break;
      }
      out = out.substring(n);
    }
  }
};

var gRsaKeyWorkerJs = '/js/paramikojs/sign_ssh_data_worker.js'