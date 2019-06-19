var server = require('ws').Server;
//https://stackoverflow.com/questions/13364243/websocketserver-node-js-how-to-differentiate-clients
var ws = require('ws');
var net = require("net");
var url = require('url');
var dgram = require('dgram');
var report = true;
var prefix = '/';

var report_status = (chain) => {
    status = chain;
    id = status.id;
    str_left = (status.srcConnection) ? '<--->' : '<-x->';
    str_right = (status.dstConnection) ? '<--->' : '<-x->';
    localaddr = (status.localAddress !== undefined) ? '<->'.concat(status.localAddress) : '(x.x.x.x)';
    localport = (status.localPort !== undefined) ? status.localPort : 'xxxxx';
    server_connection = server_name.concat(localaddr,':',localport);
    if (!status.srcConnection){
        id = '00000000-0000';
    }
    if (report === true){
        console.log(id,str_left,server_connection,str_right,rawurl);   
    }
};
var rerun_with_real = (real) => {
    dispatch(real);
};
var branch_tcp = (src,port,addr,req) => {
    
    var dst = new net.Socket();
    dst.connect(port, addr);
    dst.on('connect',() =>{
        chain.dstConnection = true;
        chain.localPort = dst.localPort;
        chain.localAddress = dst.localAddress;
        report_status(chain);
    });
        
    src.on('error',(e) =>{
        console.log(e);
        src.close();
    });
    dst.on('error',(e) =>{
        console.log(e);
        src.close();
        dst.end();
    });
    
    src.on('message',(data) => {
        dst.write(data);
    });
    dst.on('data',(data) => {
        src.send(data);
    });
    //src.pipe(dst);
    //dst.pipe(src);

    src.on('close',() => {
        chain.srcConnection = false;
        dst.end();
        report_status(chain);
        delete chain.id;
    });
    dst.on('close', () => {
        chain.dstConnection = false;
        delete chain.localPort;
        delete chain.localAddress;
        src.close();
        report_status(chain);
    });
};
var branch_udp = (src,port,addr,req) => {
    var dst = dgram.createSocket('udp4');
        dst.on('listening',()=>{
            chain.localPort = dst.address().port;
            chain.localAddress = dst.address().address;
            chain.dstConnection = true;
            report_status(chain);
        });
        
        dst.on('error', (error) => {
           console.log(error); 
        });
        
        
        src.on('message',(data) => {
            dst.send(data,port,addr,(err,bytes)=>{});
        });
        dst.on('message',(data) => {
            src.send(data);
        });
        src.on('close',(e) => {
            chain.srcConnection = false;
            dst.close();
            report_status(chain);
            delete chain;
            console.log(e);
        });
        dst.on('close', (e) => {
            chain.dstConnection = false;
            delete chain.localPort;
            delete chain.localAddress;
            report_status(chain);
            console.log(e);
        });
};
var branch_predfab = (src,port,addr,req) =>{
    myroute = [
            {'dial' : 'myname',
             'bound' : 'tcp://localhost:22'
            }
        ];
        real_connection = undefined;
        myroute.some((e) => {
            if (addr === e.dial){
                real = e.bound;
                return true;
            }
            return false;
        });
        if (undefined !== real){
            dispatch(real,src,req);
        }
}
var branch_reverse_tcp = (src,port,addr,req) =>{
    var dst = net.createServer(function(socket){

        var address = socket.address();

        //socket.on('data',function(data){
        //    console.log('sent to ws',data.toString());
        //    src.send(data);
        //});
        socket.pipe(src);
        src.on('message',(data) =>{
            console.log('sent to tcp',data.toString());
            socket.write(data);
        });
        src.on('error', (e) => {
            console.log(e);
        });
        src.on('close',() => {
            dst.close();
        });
        socket.on('close', () => {
            src.close();
        });
    });
    dst.listen(port,addr);
    chain.dstConnection = true;
    report_status(chain);
    
}
var dispatch = (rawurl,src,req)=>{
    url = new URL(rawurl);
    protocol = url.protocol;
    port = url.port;
    addr = url.hostname;
    chain.url = url;
    //connection to remote 
     if (protocol == "tcp:"){
        branch_tcp(src,port,addr,req);
    } else if (protocol == "udp:"){
        branch_udp(src,port,addr,req);
    } else if (protocol == 'prefab:'){
        branch_prefab(src,port,addr,req);
    } else if (protocol == 'reversetcp:'){
        branch_reverse_tcp(src,port,addr,req);
    }
};

var s = new server({port:5001,clientTracking: 0,perMessageDeflate: { threshold: 0}});
var server_name = 'Proxy';
    s.getUniqueID = function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + '-' + s4();
    };

s.on('connection',function(src,req){
    rawurl = req.url;// like /url:port
    rawurl = rawurl.replace(prefix,"");
    
    if (rawurl == ''){
        rawurl = 'tcp://localhost:8080'
    }
    src_id = s.getUniqueID();
    chain = {id : src_id, srcConnection : true,dstConnection : false};//
    report_status(chain);
    dispatch(rawurl,src,req);
});