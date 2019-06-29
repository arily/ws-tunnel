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
    let noServer = true;
    const match = require('url-match-patterns').default;
    if (wspath[wspath.length-1] == '/'){
        wspath = wspath.substring( 0, wspath.length-1 );
    }
    
    
    
    var s = new wsTunnelServer({noServer: noServer,clientTracking: 0,perMessageDeflate: { threshold: 0}},wspath);
    var server = http.createServer(function(request, response) {
        if(request.url !== '/monitor'){
            response.writeHead(404);
            response.end();
        } else {
            response.writeHead(200, {'Content-Type': 'application/json'});
            chains = s.connections.getChains();
            for (var key in chains) {
                switch(chains[key].srcConnection){
                    case 0 :
                        chains[key].srcConnection = 'disconnected';
                        break;
                    case 1 :
                        chains[key].srcConnection = 'connected';
                        break;
                    case -1 :
                        chains[key].srcConnection = 'halted';
                }
                switch(chains[key].dstConnection){
                    case 0 :
                        chains[key].dstConnection = 'disconnected';
                        break;
                    case 1 :
                        chains[key].dstConnection = 'connected';
                        break;
                    case -1 :
                        chains[key].dstConnection = 'halted';
                }
            }
            response.end(JSON.stringify(chains));
        }
    });
    
    
    
    server.listen(port, function() {
        console.log((new Date()) + ' Server is listening on port',port);
    });

    
    server.on('upgrade', function upgrade(request, socket, head) {
        const pathname = url.parse(request.url).pathname;
        pattern = 'http://dummy'.concat(wspath,'/*');
        if (match(pattern,'http://dummy' + pathname)) {
            s.server.handleUpgrade(request, socket, head, function done(ws) {
                s.server.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });
    
} catch (error) {
    if (logLevel > 1 )console.log(error);
}
