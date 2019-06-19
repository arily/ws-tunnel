var net = require("net");
var ws = require('ws');

var report = (chain) => {
    console.log('localhost:'.concat(chain.port),'<--->',chain.addr);
};

var createServer = (port,addr) => {
    var tcp = net.createServer(function(socket){

        var address = socket.address();
        var c = new ws('ws://localhost:5001/'.concat(addr));

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
}
var createServers = (array) =>{
    array.forEach((item) => {
        createServer(item.port,item.addr);
        report(item)
    });
}


var patch = [
    {port:5000,addr:'tcp://ri.mk:22'},
    {port:10000,addr:'tcp://h.ct2l.tk:1789'},
];

createServers(patch);