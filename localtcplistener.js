var net = require("net");
var ws = require('ws');
var url = require('url');
var getUniqueID = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};


var report = (chain) => {
    console.log('localhost:'.concat(chain.port),'<--->',chain.remote,'<--->',chain.dest,"(static)");
};
var wsRelay = function(socket,remote,dest,uuid){
        var address = socket.address();
        var c = new ws(remote.concat('/',dest),{headers:{uuid:uuid}});
        
            c.on('open',()=>{
                socket.on('data',(data)=>{
                    c.send(data);
                });
                c.on('message',(data) =>{
                    socket.write(data);
                });
            });
        

        c.on('close',(e) => {
            console.log(e);
            if (e === 1006){
                wsRelay(socket,remote,dest,uuid);
            } else {
                socket.end();
            }
        });
        socket.on('close', () => {
            c.close();
        });

    }

var createServer = (port,remote,dest,uuid = getUniqueID()) => {
    var tcp = net.createServer((socket) =>{
        wsRelay(socket,remote,dest,uuid);
    }).on('error', (e) => {
        console.log(e);
    });
    tcp.listen(port);
};
var createReverseRelayTCP = (protocol,localPort,localAddr,remote,dest)=>{
    var c = new ws(remote.concat('/',dest));
    c.on('open',()=>{
        var local = new net.Socket();
        local_connected = false;
        c.on('message',(data) => {
            if (!local_connected){
                local.connect(localPort, localAddr);
            }
            local.write(data);
        });
        local.on('connect',()=>{
            local_connected = true;
        });
        c.on('error',(e) =>{
            console.log(e);
            c.close();
        });
        local.on('error',(e) =>{
            local_connected = false;
            console.log(e);
            local.end();
        });
       
        local.on('data',(data) => {
            c.send(data);
        });
        
        c.on('close',() => {
            local.end();
            createReverseRelayTCP(protocol,localPort,localAddr,remote,dest);
        });
        local.on('close', () => {
            local_connected =false;
            c.close();
        });
    });
}
var createServers = (array) =>{
    array.forEach((item) => {
        if (!item.reverse){
            createServer(item.port,item.remote,item.dest);
        } else if (item.reverse) {
            url = new URL(item.localAddr);
            protocol = url.protocol;
            localport = url.port;
            local_addr = url.hostname;
            createReverseRelayTCP(protocol,localport,local_addr,item.remote,item.dest);
        }
        report(item);
    });
}


var patch = [
    {port:5000,dest:'tcp://localhost:5004',remote:'ws://localhost:5001'},
];

createServers(patch);