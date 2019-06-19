var net = require("net");
var ws = require('ws');

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
}
var createServers = (array) =>{
    array.forEach((item) => {
        createServer(item.port,item.remote,item.dest);
        report(item)
    });
}


var patch = [
    {port:5000,dest:'tcp://ri.mk:22',remote:'ws://ri.mk:5001'},
    {port:10000,dest:'tcp://h.ct2l.tk:1789',remote:'ws://ri.mk:5001'},
];

createServers(patch);