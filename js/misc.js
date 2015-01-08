function cloneObject(what) {
    for (var i in what) {
        this[i] = what[i];
    }
}

function debug(ex, level, trusted) {
    if (gDebugMode && window['console'] && window.console.log) {
        console.log("\n" + (level ? level : "Debug") + ": " + (ex.stack ? (ex.message + '\n' + ex.stack) : (ex.message ? ex.message : ex)) + "\n");
    }
}

function inherit(derived, base) {
  for (property in base) {
    if (!derived[property]) {
      derived[property] = base[property];
    }
  }
}