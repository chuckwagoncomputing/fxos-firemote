# Firemote
A SSH and Telnet Client for Firefox OS.

## Installation

```
git clone https://github.com/chuckwagoncomputing/fxos-firemote.git
cd fxos-firemote/js
git clone https://github.com/chuckwagoncomputing/paramikojs.git
```

## Importing Keys
1. Generate keys using `ssh-keygen -t rsa`  
2. Copy and paste id_rsa into the private key field and id_rsa.pub into the public key field.

## Exporting Keys
If you imported keys to Firemote manually, the exported key will be exactly as you imported it.  
If you used Firemote to generate keys, keep on reading.  
Firemote generates RSA keys in PEM/PKCS8 format, so we need to convert the key to the standard OpenSSH public key format.  
1. Copy and paste the key from the email into a new file.  
2. Run `ssh-keygen -i -m PKCS8 -f <(sed -e 's/./&\n/418' -e 's/./&\n/26' <file name> | fold -w 64)`  
3. The output will be in a format OpenSSH can use. Put in in authorized_keys on the server.  
