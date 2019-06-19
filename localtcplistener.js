var net = require("net");
var ws = require('ws');
var url = require('url');

var report = (chain) => {
    console.log('localhost:'.concat(chain.port),'<--->',chain.remote,'<--->',chain.dest,"(static)");
};

var createServer = (port,remote,dest) => {
    var tcp = net.createServer(function(socket){

        var address = socket.address();
        var c = new ws(remote.concat('/',dest));

        c.on('open',()=>{
            socket.on('data',function(data){
                c.send(data);
            });
            c.on('message',(data) =>{
                socket.write(data);
            });
            c.on('close',() => {
                socket.end();
            });
            socket.on('close', () => {
                c.close();
            });
        });
    }).on('error', (e) => {
        tcp.end();
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
            local.on('connect',()=>{
                local_connected = true;
                local.write(data);
            });
        } else {
            local.write(data);
        }
        
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
        });
        local.on('close', () => {
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
    {port:5000,dest:'tcp://localhost:22',remote:'ws://ri.mk:5001'},
    {dest:'reversetcp://localhost:1234',remote:'ws://ri.mk:5001',localAddr: 'tcp://baidu.com:80',reverse: true},
];

createServers(patch);