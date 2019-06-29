var net = require("net");
var ws = require('ws');
var url = require('url');
require('console-stamp')(console, '[HH:MM:ss.l]');
var getUniqueID = function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4() + '-' + s4();
};
const clientID = getUniqueID();

var report = (chain) => {
    console.log('localhost:'.concat(chain.port),'<--->',chain.remote,'<--->',chain.dest,"(static)");
};
var wsRelay = function(socket,remote,dest,uuid,user){
        var address = socket.address();
        var c = new ws(remote.concat('/',dest),{headers:{uuid:uuid,client:user}});
        
            c.on('open',()=>{
                socket.on('data',(data)=>{
                    try{
                        c.send(data);
                    } catch (error){
                        console.log('Send to ws Error:',error);
                        c.close(1006);
                    }
                });
                c.on('message',(data) =>{
                    try{
                        socket.write(data);
                    } catch (error){
                        console.log('Send to Socket Error:',error);
                        socket.destrory();
                        c.terminate();
                    }
                });
            });
        c.on('ping',()=> console.log('ping'));
    c.on('pong', ()=>console.log('pong'));

        c.on('close',(e) => {
            if (e === 1006){
                c.terminate();
                socket.removeListener('data', callback);
                wsRelay(socket,remote,dest,uuid,user);
            } else {
                socket.end();
            }
        });
        socket.on('close', () => {
            if (c !== undefined && c.readyState === 1 ){
                c.close();
            } else {
                setInterval((c)=>{
                    if (c !== undefined){
                        if (c.readyState === 1) c.close();
                        else c.terminate();
                    }
                },1000);
            }
        });
        socket.on('error',(e)=>{
            console.log(e);
            if (c !== undefined && c.readyState === 1 ){
                c.close();
            } else {
                setInterval((c)=>{
                    if (c !== undefined){
                        if (c.readyState === 1) c.close();
                        else c.terminate();
                    }
                },1000);
            }
            socket.destroy();
        });
    }

var createServer = (port,remote,dest) => {
    var tcp = net.createServer((socket) =>{
        wsRelay(socket,remote,dest,getUniqueID(),clientID);
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


try {
    var {patch} = require('./localtcplistenerconfig');
    createServers(patch);
    //http://blog.cuicc.com/blog/2017/03/26/nodejs-ECONNRESET/
    process.on('uncaughtException', function(err) {
        console.log(err.stack);
        console.log('NOT exit...');
    });
} catch (error){
    console.log(error);
}
