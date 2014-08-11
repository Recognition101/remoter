/* global require, __dirname, console, process */

var fs         = require('fs');
var net        = require('net');
var https      = require('https');
var cli        = require('commander');
var express    = require('express');
var exphbs     = require('express-handlebars');
var session    = require('express-session');
var bodyParser = require('body-parser');

// Global functions and data structures

var config = {
    id: '5e518d07-bcc2-4634-ba3d-c20f338d8927-2',

    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
           'Saturday'],

    devices: {
        '13208895': {
            'TempHotter': 'AC Low',
            'TempCooler': 'AC High',
            'FanModeDown': 'AC Off'
        },
        '13208361': {
            'DirectionDown': true,
            'DirectionUp': true,
            'DirectionLeft': true,
            'DirectionRight': true
        }
    },

    activities: {
        '5114079': 'All Off',
        '5096740': 'Apple TV',
        '5096721': 'XBox'
    },

    https: {}
};

var data = { history: { items: [] } };

var addHistory = function addHistory(name) {
    var d = new Date();
    data.history.items.unshift({
        name: name,
        timeStr: config.days[d.getDay()] + ', ' +
                 d.getMonth() + '/' + d.getDate() + ' ' +
                 (d.getHours() % 12) + ':' + d.getMinutes() +
                 (d.getHours() > 12 ? 'p' : 'a'),
        time: d.getTime()
    });

    data.history.items.length = Math.min(data.history.items.length, 10);
};

var loadOrError = function loadOrError(fnm, isJson) {
    try {
        var read = fs.readFileSync(fnm);
        return isJson ? JSON.parse(read) : read;
    } catch(e) {
        console.error('FATAL ERROR: Could not load [' + fnm + '].' +
                      isJson ? ' Ensure that ' + fnm + ' is valid JSON.' : '');
        return null;
    }
};

var sendCommand = function sendCommand(type, command) {
    var id = Math.round(Math.random() * 100000000);
    var client = net.connect(5222, '10.0.1.16');
    client.on('error', function(){});
    client.write(
        '<iq type="get" id="' + id + '">' +
            '<oa xmlns="connect.logitech.com" ' +
                'mime="vnd.logitech.harmony/vndch.harmony.engine?' +
                    type + '">' + command +
            '</oa>' +
        '</iq>'
    );

    client.on('data', function(a) {
        client.end();
        client.destroy();
        client.unref();
    });
};

//Read configuration from CLI and files

cli.version('0.1')
    .usage('This runs the remote server.')
    .option('-p, --port <n>', 'The port number to listen on.', 4450)
    .option('-c, --conf <f>', 'The name of the configuration file.',
            'config.json')
    .option('-k, --key <f>', 'The name of the key pem file.', 'key.pem')
    .option('-c, --cert <f>', 'The name of the certificate file.', 'cert.pem')
    .parse(process.argv);

cli.port = parseInt(cli.port, 10);
cli.port = isNaN(cli.port) ? 4450 : cli.port;

config.secrets    = loadOrError(cli.conf, true);
config.https.key  = loadOrError(cli.key);
config.https.cert = loadOrError(cli.cert);

if (!config.secrets || !config.https.key || !config.https.cert) {
    return;
}


//Configure Express Stack

var app = express();
var hbs = exphbs.create({
    partialsDir: [ 'views' ]
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

app.use(session({
    secret: config.secrets.salt,
    resave: true,
    saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: false }));

app.use('/static', express.static(__dirname + '/static'));

//log in barrier
app.post('*', function(req, res, next) {
    req.session['loggedin'] = req.session['loggedin'] ||
                              req.body.password === config.secrets['password'];
    next();
});
app.all('*', function(req, res, next) {
    req.session['loggedin'] = req.session['loggedin'] &&
                              !('logout' in req.query);
    if (!req.session['loggedin']) {
        res.render('login', {});

    } else {
        next();
    }
});

//Start Activity Rest API
app.all('/activity/:id', function(req, res, next) {
    var id = parseInt(req.params.id, 10);

    if (!isNaN(id) && id && ''+id in config.activities) {
        sendCommand('startactivity', 'activityId=' + id + ':timestamp=0');
        addHistory(config.activities[''+id]);

    } else if (req.params.id === 'chromecast') {
        sendCommand('startactivity', 'activityId=5096740:timestamp=0');
        setTimeout(function() {
            sendCommand('holdAction', 'status=press:action={' +
                '"type"::"IRCommand",' +
                '"deviceId"::"13208317",' +
                '"command"::"Chromecast"' +
            '}');
        }, 5000);
        addHistory('Chromecast');

    }
    next();
});

//Press Button Rest API
app.all('/command/:device/:command', function(req, res, next) {
    var device = config.devices[req.params.device];
    if (device && req.params.command in device) {
        sendCommand('holdAction', 'action={' +
            '"type"::"IRCommand",' +
            '"deviceId"::"' + req.params.device + '",' +
            '"command"::"' + req.params.command + '"' +
        '}:status=press:timestamp=0');

        addHistory(device[req.params.command]);
    }
    next();
});

//Render the page
app.all('*', function(req, res) {
    if ('history' in req.query) {
        res.render('history', data['history']);
    } else {
        res.render('remote', data);
    }
});

https.createServer(config.https, app).listen(cli.port);
