//var server = require('ws').Server;
const http = require('http');
const url = require('url');
//https://stackoverflow.com/questions/13364243/websocketserver-node-js-how-to-differentiate-clients
require('console-stamp')(console, '[HH:MM:ss.l]');

const wsTunnelServer = require('./requires/wsServer');

try{
    var { port, output, outputLevel, wspath } = require('./wstunnelconfig').wsServer;
    report = output;
    logLevel = outputLevel;
    if (wspath[wspath.length-1] == '/'){
        wspath = wspath.substring( 0, wspath.length-1 );
    }
    var s = new wsTunnelServer({
        port:port,
        clientTracking: 0,
    },
                               wspath);
} catch (error) {
    if (logLevel > 1 )console.log(error);
}
