## Remoter

This is a small web app that sends commands to my Logitech Harmony universal remote. It can both change activities and send individual button presses.

## Install

```sh
# install dependencies
npm install

# generate keys - when asked for a name, type the URL it will be served from
openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout key.pem -out cert.pem

# create a configuration file.
echo '{ "password": "YOUR-PASSWORD", "salt": "randomCharacters"}' >> config.json

# run the server
node remoter.js -p [YOUR-PORT]
```

## Trust the Keys
Make sure that once you have generated the "cert.pem" certificate file, you double click it in OSX or open it in iOS in order to add it to the list of trusted certificates. This will make the scary warning in browsers go away.

Note that this will only work if you have added the correct "name" to the certificate, which should be asked when you generate it with openssl. The name must be set to the URL from which it will be served, i.e.: mysite.com (no port is necessary).

## Screenshots

![desktop](/screenshots/desktop.png "Desktop") ![mobile](/screenshots/mobile.png "Mobile")
