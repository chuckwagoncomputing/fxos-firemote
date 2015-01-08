cli.prototype.__TELNET_IAC = 255;
cli.prototype.__OnTelnetIAC = function(text, index) {
  var code = text.substr(index + 1, 1);
  var value = text.substr(index + 2, 1);
  var seq_null = String.fromCharCode(0);
  var seq_sb   = String.fromCharCode(250);
  var seq_se   = String.fromCharCode(240);
  var seq_iac  = String.fromCharCode(255);
  var seq_will = String.fromCharCode(251);
  var seq_wont = String.fromCharCode(252);
  var seq_do   = String.fromCharCode(253);
  var seq_dont = String.fromCharCode(254);
  if (code === seq_do) {
    if(value.charCodeAt(0) === 31) {
      gConnection.output(seq_iac + seq_will + value);
      gConnection.output(seq_iac
                       + seq_sb
                       + value
                       + String.fromCharCode(0)
                       + String.fromCharCode(width)
                       + String.fromCharCode(0)
                       + String.fromCharCode(height)
                       + seq_iac
                       + seq_se);
    }
    else if (value.charCodeAt(0) === 1) {
      gConnection.output(seq_iac + seq_wont + value);
    }
    else {
      gConnection.output(seq_iac + seq_wont + value);
    }
    return index + 3;
  }
  else if (code === seq_will) {
    if (value.charCodeAt(0) === 1) {
      gConnection.output(seq_iac + seq_do + value);
    }
    return index + 3;
  }
  else if (code === seq_sb) {
    if (value.charCodeAt(0) === 24) {
      gConnection.output(seq_iac
                       + seq_sb
                       + value
                       + seq_null
                       + "xterm"
                       + seq_iac
                       + seq_se);
    }
    else if (value.charCodeAt(0) === 32) {
      gConnection.output(seq_iac
                       + seq_sb
                       + value
                       + seq_null
                       + "38400,38400"
                       + seq_iac
                       + seq_se);
    }
    else if (value.charCodeAt(0) === 35) {
      gConnection.output(seq_iac
                       + seq_sb
                       + value
                       + seq_null
                       + "fire-telnet:0.0"
                       + seq_iac
                       + seq_se);
    }
    else if (value.charCodeAt(0) === 39) {
      gConnection.output(seq_iac
                       + seq_sb
                       + value
                       + seq_null
                       + seq_null
                       + "DISPLAY"
                       + String.fromCharCode(1)
                       + "fire-telnet:0.0"
                       + seq_iac
                       + seq_se);
    }
    return  index + text.substr(index).indexOf(seq_se) + 1;
  }
  else {
    console.log(code.charCodeAt(0));
    return index + 3;
  }
};