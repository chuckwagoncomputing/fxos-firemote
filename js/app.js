var height = 24,
    width = 80,
    activeServer,
    editedServer,
    servers = {},
    firemoteDB = indexedDB.open('firemote-data', '3'),
    db,
    edit = false,
    publicKey,
    privateKey,
    gDebugMode = false;
Server.prototype.protocolMap = { 'ssh2'   : ssh2Connection,
                                            'telnet' : telnetConnection};
Server.prototype.createSocket = function() {
  var options = {};
  var self = this;
  options.binaryType = "arraybuffer";
  var socket = navigator.mozTCPSocket.open(this.host, parseInt(this.port), options);
  socket.onopen = function() {
    self.connection.onOpen();
  };
  socket.ondata = function(event) {
    self.connection.onData(ab2str(event.data));
  };
  socket.onerror = function(event) {
    console.log("Socket failed.");
  };
  socket.onclose = function() {
    self.connection.onClose();
  };
  return socket;
};

Server.prototype.createTerminalWindow = function(connection) {
  var terminal = new cli(document.getElementById("terminalframe").contentWindow, connection);
  terminal.Resize(height, width);
  return terminal;
};

ssh2Connection.prototype.observer.saveKey = function(key) {
  saveServer(activeServer.host, activeServer.port, activeServer.type, activeServer.username, activeServer.password, activeServer.ruid, key);
}

firemoteDB.onsuccess = function (){
  db = this.result;
};
firemoteDB.onerror = function () {
  console.log("DB Root Error");
};
firemoteDB.onupgradeneeded = function (event) {
  /*----------------------------
      firemote-data changelog
    3: added
       servers
       \ hostkey
    2: added
       keypair, keypath => private
       | private
       \ public
    
    1: initial
       servers, keypath => ruid
       | ruid
       | host
       | port
       | type
       | username
       \ password
       settings, keypath => width
       | widthoption
       \ width
  --------------------------------*/
  var db = event.target.result;
  if (db.objectStoreNames.contains('servers') && !event.target.transaction.objectStore('servers').indexNames.contains('hostkey')) {
    db.deleteObjectStore('servers');
  }
  if (!db.objectStoreNames.contains('servers')) {
    var store = event.currentTarget.result.createObjectStore('servers', { autoIncrement : true, keyPath : 'ruid' });
    store.createIndex('ruid', 'ruid', { unique: true });
    store.createIndex('host', 'host', { unique: false });
    store.createIndex('port', 'port', { unique: false });
    store.createIndex('type', 'type', { unique: false });
    store.createIndex('username', 'username', { unique: false });
    store.createIndex('password', 'password', { unique: false });
    store.createIndex('hostkey', 'hostkey', { unique: false });
  }
  if (!db.objectStoreNames.contains('settings')) {
    var settings = event.currentTarget.result.createObjectStore('settings', { autoIncrement : true, keyPath : 'width' });
    settings.createIndex('widthoption', 'widthoption', {unique : true});
    settings.createIndex('width', 'width', {unique : true});
  }
  if (!db.objectStoreNames.contains('keypair')) {
    var keypair = event.currentTarget.result.createObjectStore('keypair', { autoIncrement : true, keyPath : 'private' });
    keypair.createIndex('private', 'private', { unique: true });
    keypair.createIndex('public', 'public', { unique: true });
  }
};

function loadServers() {
  // empty the servers object
  servers = {};
  var store = db.transaction('servers').objectStore('servers');
  var request = store.openCursor();
  request.onsuccess = function (event) {
    var cursor = event.target.result;
    if (cursor) {
      // Get a server item
      var request = store.get(cursor.key);
      request.onsuccess = function (event) {
        var serverItem = event.target.result;
        // updateServer will make a new one since one doesn't exist with this ruid.
        updateServer(serverItem.host, serverItem.port, serverItem.type, serverItem.username, serverItem.password, serverItem.ruid, serverItem.hostkey);
        // continue starts again at request.onsuccess
        cursor.continue();
      };
    }
  };
  request.onerror = function () {
    console.log("DB Open Cursor Error");
  };
}

function loadWidth() {
  var store = db.transaction('settings').objectStore('settings');
  var request = store.openCursor();
  request.onsuccess = function (event) {
    var cursor = event.target.result;
    if (cursor) {
      var request = store.get(cursor.key);
      request.onsuccess = function (event) {
        width = parseInt(event.target.result.width);
        // Put the stored width in the width text field
        document.getElementById("width").value = width;
        // Call setWidthOption so the correct option is selected and
        // the width text field visibility is set correctly.
        setWidthOption(event.target.result.widthoption);
        // continue starts again at request.onsuccess
        cursor.continue();
      };
    }
  };
}

function loadKey() {
  var store = db.transaction('keypair').objectStore('keypair');
  var request = store.openCursor();
  request.onsuccess = function (event) {
    var cursor = event.target.result;
    if (cursor) {
      var request = store.get(cursor.key);
      request.onsuccess = function (event) {
        privateKey = event.target.result.private;
        publicKey = event.target.result.public;
        document.getElementById("nokey").style.display = "none";
        document.getElementById("keyexists").style.display = "block";
        cursor.continue();
      };
    }
  }; 
}

function newServer() {
  // Generate a RUID for this server
  var ruid = UUID.generate();
  updateServer("host", "port", "ssh2", "username", "password", ruid);
  // Make this server the one that is being edited.
  editedServer = servers[ruid];
  // And edit it.
  // When it is done being edited, it will either be saved or deleted,
  //  we don't have to worry about that in this function.
  editServer();
}

function editServer() {
  // Hide the server list and show the edit pane
  document.getElementById("serverlist").style.display = "none";
  document.getElementById("editpane").style.display = "block";
  // Fill in the text fields with the saved values.
  document.getElementById("host").value = editedServer.host;
  document.getElementById("port").value = editedServer.port;
  document.getElementById("username").value = editedServer.username;
  document.getElementById("password").value = editedServer.password;
  // Hide/show the username and password fields as neccessary.
  formTypeChange(editedServer.type);
}

function saveServer(host, port, type, username, password, ruid, hostkey) {
  // Build an object for writing to the database
  // from the values in the entry fields
  var object = { ruid : ruid,
                 host : host,
                 port : port,
                 type : type,
                 username : username, 
                 password : password,
                 hostkey : hostkey};
  var store = db.transaction('servers', 'readwrite').objectStore('servers');
  // delete the server as it was
  var deleteRequest = store.delete(ruid);
  deleteRequest.onsuccess = function () { };
  // store the server as it is
  var request = store.add(object);
  request.onsuccess = function () {
    // Update the server entry
    updateServer(host, port, type, username, password, ruid, hostkey);
  };
  request.onerror = function () {
    console.log("DB Object Creation Error");
  };
}

function updateServer(host, port, type, username, password, ruid, hostkey) {
  // if this is a new server
  if (!servers[ruid]) {
    // Add it to the servers object as a new server
    servers[ruid] = new Server(host, port, username, password, privateKey, type, ruid, hostkey);
    // Build a link for the server
    var item = document.getElementById("server").content;
    var link = item.querySelector("a");
    link.textContent = host;
    link.dataset.ruid = ruid;
    // Add the link to the server list
    document.getElementById("servers").appendChild(document.importNode(item, true));
    // get the newly created link
    link = document.querySelector("[data-ruid='" + ruid + "']");
    // give it a click listener
    link.addEventListener("click", function(event) {
      // if we don't need to edit it
      if (!edit) {
        // set it as the active server
        activeServer = servers[event.target.dataset.ruid];
        // Hide the drawer button and show the close connection button.
        document.getElementById("close").style.display = "block";
        document.getElementById("showdrawer").style.display = "none";
        // Close the drawer
        window.location.hash = "#content";
        // and tell it to connect
        activeServer.connect();
      }
      else {
        // set it as the server being edited
        editedServer = servers[event.target.dataset.ruid];
        // and edit it
        editServer();
      }
    });
  }
  else {
    // If it's not a new server, give it its new values
    document.querySelector("[data-ruid='" + ruid + "']").textContent = host;
    servers[ruid].host = host;
    servers[ruid].port = port;
    servers[ruid].type = type;
    servers[ruid].username = username;
    servers[ruid].password = password;
    servers[ruid].hostkey = hostkey;
  }
}

function deleteServer() {
  var store = db.transaction('servers', 'readwrite').objectStore('servers');
  var deleteRequest = store.delete(editedServer.ruid);
  deleteRequest.onsuccess = function () {
    delete servers[editedServer.ruid];
    var serverLink = document.querySelector("[data-ruid='" + editedServer.ruid + "']");
    serverLink.parentNode.removeChild(serverLink);
    // Hide the edit pane and show server list
    document.getElementById("editpane").style.display = "none";
    document.getElementById("serverlist").style.display = "block";
    window.location.hash = "#content";
    window.location.hash = "#drawer";
  };
}

function saveSettings() {
  var store = db.transaction('settings', 'readwrite').objectStore('settings');
  var request = store.clear();
  request.onsuccess = function () {
    var store = db.transaction('settings', 'readwrite').objectStore('settings');
    var widthOption = document.getElementById("widthoption").value;
    width = parseInt(document.getElementById("width").value);
    // write width option and width
    var request = store.put({ widthoption : widthOption, width : width });
    // call setWidthOption so the width gets set to the correct value
    setWidthOption(widthOption);
    request.onsuccess = function() { };
  };
  // Hide settings and show server list
  document.getElementById("settingpane").style.display = "none";
  document.getElementById("serverlist").style.display = "block";
}

function generateKey() {
  document.getElementById("nokey").style.display = "none";
  document.getElementById("keyback").style.display = "none";
  document.getElementById("generatingkey").style.display = "block";
  var crypt = new JSEncrypt({default_key_size: 2048});
  crypt.getKey(function() {
    privateKey = crypt.getPrivateKey();
    publicKey = crypt.getPublicKey();
    saveKey();
    document.getElementById("generatingkey").style.display = "none";
    document.getElementById("keyexists").style.display = "block";
    document.getElementById("keyback").style.display = "block";
  });
}

function saveKey() {
  var keypair = { private : privateKey, public : publicKey };
  var store = db.transaction('keypair', 'readwrite').objectStore('keypair');
  var request = store.add(keypair);
  request.onsuccess = function () {};
  request.onerror = function () {
    console.log("Saving keypair failed.");
  };
}

function deleteKey() {
  var store = db.transaction('keypair', 'readwrite').objectStore('keypair');
  var deleteRequest = store.delete(privateKey);
  deleteRequest.onsuccess = function () {
    privateKey = "";
    publicKey = "";
    document.getElementById("keyexists").style.display = "none";
    document.getElementById("nokey").style.display = "block";
  };
}

function switchEdit() {
  if (!edit) {
    document.getElementById("servers").classList.add("editedlist");
    edit = true;
  }
  else {
    document.getElementById("servers").classList.remove("editedlist");
    edit = false;
  }
}

function formTypeChange(value) {
  if (value === "ssh2") {
    // show username and password fields
    document.getElementById('username').style.display = "block";
    document.getElementById('password').style.display = "block";
    // Ensure that ssh2 is selected
    document.getElementById('optionssh2').selected = "selected";
    document.getElementById('optiontelnet').selected = "";
  }
  else {
    // hide username and password fields
    document.getElementById('username').style.display = "none";
    document.getElementById('password').style.display = "none";
    // Ensure that telnet is selected
    document.getElementById('optionssh2').selected = "";
    document.getElementById('optiontelnet').selected = "selected";
  }
}

function setWidthOption(widthOption) {
  if (widthOption === "Screen Width") {
    // hide the width text field
    document.getElementById("width").style.display = "none";
    // Set the width to the number of characters the screen will hold horizontally
    width = Math.floor(document.getElementById("terminalframe").scrollWidth / 7) - 6;
    // Ensure that Screen Width is selected
    document.getElementById("optionscreenwidth").selected = "selected";
    document.getElementById("optioncustom").selected = "";
  }
  else {
    // show the width text field
    document.getElementById("width").style.display = "block";
    // set the width to the width value in the text field
    width = parseInt(document.getElementById("width").value);
    // Ensure that Custom is selected
    document.getElementById("optionscreenwidth").selected = "";
    document.getElementById("optioncustom").selected = "selected";
  }
}

window.addEventListener("load", function() {
  // set height
  height = Math.floor((document.getElementById("terminalframe").scrollHeight - 60) / 12);
  // If our IndexedDB instance is up and running, load servers and width settings.
  if (db) {
    loadKey();
    loadServers();
    loadWidth();
  }
  // Hide server list and show setting pane
  document.getElementById("settings").addEventListener("click", function () {
    document.getElementById("serverlist").style.display = "none";
    document.getElementById("settingpane").style.display = "block";
  });
  // Hide server list and show key pane
  document.getElementById("keys").addEventListener("click", function () {
    document.getElementById("serverlist").style.display = "none";
    document.getElementById("keypane").style.display = "block";
  });
  document.getElementById("edit").addEventListener("click", function () { switchEdit() });
  document.getElementById("add").addEventListener("click", function () { newServer(); });
  document.getElementById("close").addEventListener("click", function () {
    activeServer.disconnect();
    document.getElementById("close").style.display = "none";
    document.getElementById("showdrawer").style.display = "block";
  });
  document.getElementById("save").addEventListener("click", function () { 
    saveServer(document.getElementById("host").value,
               document.getElementById("port").value,
               document.getElementById("type").value,
               document.getElementById("username").value, 
               document.getElementById("password").value,
               editedServer.ruid,
               editedServer.hostkey);
    // hide the edit pane and show the server list
    document.getElementById("editpane").style.display = "none";
    document.getElementById("serverlist").style.display = "block";
  });
  document.getElementById("delete").addEventListener("click", function () { deleteServer(); });
  document.getElementById("saveSettings").addEventListener("click", function () { saveSettings(); });
  document.getElementById("importkey").addEventListener("click", function () {
    document.getElementById("nokey").style.display = "none";
    document.getElementById("keyback").style.display = "none";
    document.getElementById("keyfield").style.display = "block";
  });
  document.getElementById("generatekey").addEventListener("click", function () { generateKey(); });
  document.getElementById("exportkey").addEventListener("click", function () { window.location = "mailto:?body=" + publicKey });
  document.getElementById("deletekey").addEventListener("click", function () { deleteKey(); });
  document.getElementById("savekey").addEventListener("click", function () {
    publicKey = document.getElementById("publicfield").value;
    privateKey = document.getElementById("privatefield").value;
    saveKey();
    document.getElementById("keyfield").style.display = "none";
    document.getElementById("keyexists").style.display = "block";
    document.getElementById("keyback").style.display = "block";
  });
  document.getElementById("keyback").addEventListener("click", function() {
    document.getElementById("keypane").style.display = "none";
    document.getElementById("serverlist").style.display = "block";
  });
  document.getElementById("widthoption").onchange = function(event) { setWidthOption(event.target.value); };
  document.getElementById('type').onchange = function(event) { formTypeChange(event.target.value); };
});