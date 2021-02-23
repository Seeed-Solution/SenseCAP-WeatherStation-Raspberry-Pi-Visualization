/**
 * Seeed - SenseCAP
 * 
 * Weather Station
 */
var WebSocketServer = require('websocket').server;
var http = require('http');
const argv = process.argv;

// uarts
const SerialPort = require('serialport');
let connectSerialPort = argv[argv.length - 1];
console.log('1. Connect serial port: ' + connectSerialPort);
const serialPort = new SerialPort(
    connectSerialPort
    , {
        baudRate: 115200
    }
);
serialPort.on('error', function (err) {
    console.log('Error: ', err.message)
});

// websocket
var server = http.createServer(function (request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(9998, function () {
    console.log('2. Websocket server is listening on port 9998');
});

wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});


let wsConnections = [];


// websocket send
wsServer.on('request', function (request) {
    var connection = request.accept(request.protocol, request.origin);
    wsConnections.push(connection);
    console.log((new Date()) + ' Connection accepted.');

    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            connection.sendUTF(message.utf8Data);
        } else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });

    connection.on('close', function (reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });
});

let toSendMeasures = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
    7: 0
};
setInterval(() => {
    wsConnections.forEach((connection) => {
        if (false) {
            connection.sendUTF(JSON.stringify([{
                type: 1,
                value: Math.floor(Math.random() * 35)
            }]));
            connection.sendUTF(JSON.stringify([{
                type: 2,
                value: Math.floor(Math.random() * 35)
            }]));
            connection.sendUTF(JSON.stringify([{
                type: 3,
                value: 100000 + Math.floor(Math.random() * 30000)
            }]));
            connection.sendUTF(JSON.stringify([{
                type: 4,
                value: parseFloat((Math.random() * 2).toFixed(1))
            }]));
            connection.sendUTF(JSON.stringify([{
                type: 5,
                value: Math.floor(Math.random() * 359)
            }]));
            connection.sendUTF(JSON.stringify([{
                type: 6,
                value: parseFloat((Math.random() * 10000).toFixed(1))
            }]));
            connection.sendUTF(JSON.stringify([{
                type: 7,
                value: Math.floor(Math.random() * 500)
            }]));
        } else {
            Object.keys(toSendMeasures).forEach((toSendMeasureKey) => {
                let toSendMeasureValue = toSendMeasures[toSendMeasureKey];
                connection.sendUTF(JSON.stringify([{
                    type: toSendMeasureKey,
                    value: toSendMeasureValue
                }]));
            })
        }
    })
}, 1000);

let append = "";
serialPort.on('data', function (data) {
    var excludeSpecial = function (s) {
        s = s.replace(/\n\r/g, '');
	    return s;
    };

    if(data.toString().indexOf("\r\n") === -1) {
    	return append += data;
    } else {
	data = "" + append;
	append = "";
    }

    console.log('Uarts Raw Data:', data);

    let longstr = excludeSpecial(data.toString());
    console.log(longstr);

    let shortstrArr = longstr.split(';');
    shortstrArr.forEach((shortstr) => {
        let rawMeasure = shortstr.split('=');
        rawMeasure[1] = parseFloat(rawMeasure[1]);
        switch (rawMeasure[0]) {
            case 'AT': 
                toSendMeasures[1] = rawMeasure[1];
                break;
            case 'AH': 
                toSendMeasures[2] = rawMeasure[1];
                break;
            case 'AP': 
                toSendMeasures[3] = rawMeasure[1];
                break;
            case 'LX': 
                toSendMeasures[6] = rawMeasure[1];
                break;
            case 'DA': 
                toSendMeasures[5] = rawMeasure[1];
                break;
            case 'SA': 
                toSendMeasures[4] = rawMeasure[1];
                break;
            case 'RA': 
                toSendMeasures[7] = rawMeasure[1];
                break;
            default:
                break;
        }
    });
    console.log("new event: ", toSendMeasures)
});

const Gpio = require('onoff').Gpio;
const led = new Gpio(18, 'out');

led.writeSync(1);
serialPort.write("0XA;IW=1;AW=1;SR=4;DO=0;CM=1;US=M\r\n");
serialPort.drain(() => {
	led.writeSync(0);
})


setTimeout(() => {
// uart send query
    setInterval(() => {
        const queryCommand = Buffer.from([0x30, 0x58, 0x41, 0x3b, 0x47, 0x30, 0x3f, 0x0D, 0x0A]);
	led.writeSync(1);
        serialPort.write(queryCommand.toString());
	serialPort.drain(() => {
	  led.writeSync(0);
	})
    }, 1000);
}, 2000);



setInterval(function () {
}, 9999999);
