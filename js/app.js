var gDebugMode = false, 
    gCli,
    gConnection,
    height = 24,
    width = 80,
    widthOption,
    serverObjects = [],
    edit = false,
    firemoteDB = indexedDB.open('firemote-data', '1'),
    db;

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}
function str2ab(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/**
 * Fast UUID generator, RFC4122 version 4 compliant.
 * @author Jeff Ward (jcward.com).
 * @license MIT license
 * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
 **/
var UUID = (function() {
  var self = {};
  var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }
  self.generate = function() {
    var d0 = Math.random()*0xffffffff|0;
    var d1 = Math.random()*0xffffffff|0;
    var d2 = Math.random()*0xffffffff|0;
    var d3 = Math.random()*0xffffffff|0;
    return lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+'-'+
      lut[d1&0xff]+lut[d1>>8&0xff]+'-'+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+'-'+
      lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+'-'+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
      lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
  };
  return self;
})();

function connectToServer(host, port, type, username, password) {
  if (host && port) {
    setProtocol(type);
    gConnection.host = host;
    gConnection.port = port;
    if (username && password) {
      gConnection.login = username;
      gConnection.password = password;
    }
    gConnection.width = gCli.cols;
    gConnection.height = gCli.rows;
    gConnection.connect(false);         
  }
}

function addItem() {
  ruid = UUID.generate();
  putItem('host', 'port', 'ssh2', 'username', 'password', ruid);
  editItem('host', 'port', 'ssh2', 'username', 'password', ruid);
}

function saveItem(ruid) {
  deleteItem(ruid);
  if (document.getElementById('type').value === "ssh2") {
    putItem(document.getElementById('host').value,
            document.getElementById('port').value,
            document.getElementById('type').value,
            document.getElementById('username').value,
            document.getElementById('password').value);
  }
  else {
    putItem(document.getElementById('host').value,
            document.getElementById('port').value,
            document.getElementById('type').value,
            null, null);
  }
  listItems();
  edit = false;
}

function editItem(host, port, type, username, password, ruid) {
  username = username || "username";
  password = password || "password";
  document.getElementById('servers').innerHTML = "<input type='text' id='host' style='width: 90%;' value='" + host + "'></input>";
  document.getElementById('servers').innerHTML += "<input type='text' id='port' style='width: 90%;' value='" + port + "'></input>";
  if (type === "telnet") {
    document.getElementById('servers').innerHTML += "<select id='type' class='draweritem'><option selected='selected'>telnet</option><option>ssh2</option></select>";
    document.getElementById('servers').innerHTML += "<input type='text' id='username' style='width: 90%; display: none;' value='" + username + "'></input>";
    document.getElementById('servers').innerHTML += "<input type='password' id='password' style='width: 90%; display: none;' value='" + password + "'></input>";
  }
  else {
    document.getElementById('servers').innerHTML += "<select id='type' class='draweritem'><option>telnet</option><option selected='selected'>ssh2</option></select>";
    document.getElementById('servers').innerHTML += "<input type='text' id='username' style='width: 90%;' value='" + username + "'></input>";
    document.getElementById('servers').innerHTML += "<input type='password' id='password' style='width: 90%;' value='" + password + "'></input>";
  }
  document.getElementById('servers').innerHTML += "<button id='save' class='bb-button recommend draweritem'>Save</button>";
  document.getElementById('servers').innerHTML += "<button id='delete' class='bb-button danger draweritem'>Delete</button>";
  document.getElementById('delete').addEventListener('click', function() {
    deleteItem(ruid);
    listItems();
    edit = false;
  });
  document.getElementById('save').addEventListener('click', function() { saveItem(ruid); });
  document.getElementById('type').onchange = function () {
    if (document.getElementById('type').value === "ssh2") {
      document.getElementById('username').style.display = "block";
      document.getElementById('password').style.display = "block";
    }
    else {
      document.getElementById('username').style.display = "none";
      document.getElementById('password').style.display = "none";
    }
  };
}

function createServerItemFunction(ruid, host, port, type, username, password) {
  return function () {
    if (edit === true) {
      editItem(host, port, type, username, password, ruid);
    }
    else {
      connectToServer(host, port, type, username, password);
      window.location = "#content";
    }
  };
}

function buildServerList() {
  serverObjects = serverObjects.sort(function(a, b){
    var hostA=a.host.toLowerCase(), hostB=b.host.toLowerCase();
    if (hostA < hostB) {
      return -1;
    }
    if (hostA > hostB) {
      return 1;
    }
    return 0;
  });
  document.getElementById('servers').innerHTML = "";
  for (var i = 0; i < serverObjects.length; i += 1) {
    var newItem = document.createElement('li');
    if (edit === true) {
      newItem.innerHTML = "<a style='color: #008aaa;' id='" + serverObjects[i].ruid + "'>" + serverObjects[i].host + "</a>";
    }
    else {
      newItem.innerHTML = "<a id='" + serverObjects[i].ruid + "'>" + serverObjects[i].host + "</a>";
    }
    document.getElementById("servers").appendChild(newItem);
    document.getElementById(serverObjects[i].ruid).addEventListener("click", createServerItemFunction(serverObjects[i].ruid,
                                                                                                      serverObjects[i].host,
                                                                                                      serverObjects[i].port,
                                                                                                      serverObjects[i].type,
                                                                                                      serverObjects[i].username,
                                                                                                      serverObjects[i].password));
  }
}

firemoteDB.onsuccess = function (){
  db = this.result;
};
firemoteDB.onerror = function () {
  gConnection.observer.onError("DB Root Error");
};
firemoteDB.onupgradeneeded = function (event) {
  var store = event.currentTarget.result.createObjectStore('servers', { autoIncrement : true, keyPath : 'ruid' });
  store.createIndex('ruid', 'ruid', { unique: true });
  store.createIndex('host', 'host', { unique: false });
  store.createIndex('port', 'port', { unique: false });
  store.createIndex('type', 'type', { unique: false });
  store.createIndex('username', 'username', { unique: false });
  store.createIndex('password', 'password', { unique: false });
  var settings = event.currentTarget.result.createObjectStore('settings', { autoIncrement : true, keyPath : 'width' });
  settings.createIndex('widthoption', 'widthoption', {unique : true});
  settings.createIndex('width', 'width', {unique : true});
};

function putItem(host, port, type, username, password, ruid) {
  ruid = ruid || UUID.generate()
  var object = { ruid : ruid, host : host, port : port, type : type, username : username, password : password };
  var store = db.transaction('servers', 'readwrite').objectStore('servers');
  var request = store.add(object);
  request.onsuccess = function () { };
  request.onerror = function () {
    gConnection.observer.onError("DB Object Creation Error");
  };
}

function deleteItem(ruid) {
  var store = db.transaction('servers', 'readwrite').objectStore('servers');
  var request = store.delete(ruid);
  request.onsuccess = function () { };
}

function listItems() {
  serverObjects = [];
  var store = db.transaction('servers').objectStore('servers');
  var request = store.openCursor();
  request.onsuccess = function (event) {
    var cursor = event.target.result;
    if (cursor) {
      var request = store.get(cursor.key);
      request.onsuccess = function (event) {
        serverObjects.push(event.target.result);
        cursor.continue();
      };
    }
    else {
      buildServerList();
    }
  };
  request.onerror = function () {
    gConnection.observer.onError("DB Open Cursor Error");
  };
}

function showSettings() {
  document.getElementById("servers").innerHTML = "<h2>Width</h2>";
  if (widthOption === "Screen Width") {
    document.getElementById("servers").innerHTML += "<select id='widthoption' class='draweritem'><option selected='selected'>Screen Width</option><option>Custom</option></select>";
    document.getElementById("servers").innerHTML += "<input type='number' id='width' style='display: none; width: 90%;'></input>";
  }
  else {
    document.getElementById("servers").innerHTML += "<select id='widthoption' class='draweritem'><option>Screen Width</option><option selected='selected'>Custom</option></select>";
    document.getElementById("servers").innerHTML += "<input type='number' id='width' style='width: 90%;'></input>";
  }
  document.getElementById("servers").innerHTML += "<button id='save' class='bb-button recommend draweritem'>Save</button>";
  document.getElementById("width").value = width;
  document.getElementById("save").addEventListener("click", function () { saveSettings(); });
  document.getElementById("widthoption").onchange = function() {
    if (document.getElementById("widthoption").value === "Screen Width") {
      document.getElementById("width").style.display = "none";
    }
    else {
      document.getElementById("width").style.display = "block";
    }
  };
}

function saveSettings() {
  widthOption = document.getElementById("widthoption").value;
  var store = db.transaction('settings', 'readwrite').objectStore('settings');
  var request = store.clear();
  request.onsuccess = function () {
    if (widthOption === "Screen Width") {
      width = Math.floor(document.getElementById("cmdlog").scrollWidth / 7) - 6;
      gCli.Resize(height, width);
    }
    else {
      width = document.getElementById("width").value;
    }
    var store = db.transaction('settings', 'readwrite').objectStore('settings');
    var request = store.put({ widthoption : widthOption, width : width });
    request.onsuccess = function() { };
    listItems();
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
        width = event.target.result.width;
        widthOption = event.target.result.widthoption;
        cursor.continue();
      };
    }
  };
}

window.addEventListener("load", function() {
  gCli = new cli(document.getElementById("cmdlog").contentWindow);
  height = Math.floor((document.getElementById("cmdlog").scrollHeight - 60) / 12);
  if (db) {
    listItems();
    loadWidth();
  }
  gCli.Resize(height, width);
  gCli.update("Touch + to begin.");
  document.getElementById("edit").addEventListener("click", function () {
    if (!edit) {
      edit = true;
    }
    else {
      edit = false;
    }
    listItems();
  });
  document.getElementById("settings").addEventListener("click", function () { showSettings(); });
  document.getElementById("add").addEventListener("click", function () { addItem(); });
  document.getElementById("close").addEventListener("click", function () { gConnection.disconnect(); });
});