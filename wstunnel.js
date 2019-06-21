var server = require('ws').Server;
//https://stackoverflow.com/questions/13364243/websocketserver-node-js-how-to-differentiate-clients
var ws = require('ws');
var net = require("net");
var url = require('url');
var dgram = require('dgram');
var report = true;


var report_status = (chain) => {
    id = chain.srcID;
    var status = (status) =>{
        switch (status){
            case 0 :
                return '<-x->';
            case 1 :
                return '<--->';
            case -1 :
                return '<-S->';
            default :
                return '<-?->';
        }
    }
    str_left = status(chain.srcConnection);
    str_right = status(chain.dstConnection);
    localaddr = (chain.localAddress !== undefined) ? ' | '.concat(chain.localAddress) : '(x.x.x.x)';
    localport = (chain.localPort !== undefined) ? chain.localPort : 'xxxxx';
    server_connection = chain.serverName.concat(localaddr,':',localport);
    dst = chain.dstAddr.concat(':',chain.dstPort);
    if (!chain.srcConnection){
        id = '00000000-0000';
    }
    if (!chain.dstConnection){
        dst = 'detached';
    }
    if (report === true){
        console.log(id,str_left,server_connection,str_right,dst);   
    }
};

class wsServer{
    constructor (config,prefix,name = 'Proxy'){
        this.config = config;
        this.prefix = prefix;
        this.name = name;
        var server = require('ws').Server;
        this.server = new server(config);
        this.connections = new wsConnectionContainer;
        this.server.on('connection',this.newConnection.bind(this));
    }
    newConnection (src,req){
        let rawurl = req.url;// like /url:port
        rawurl = rawurl.replace(this.prefix,"");
        let headers = req.headers;
        let uuid = headers.uuid;
        let url = this.parseURL(rawurl);
        let protocol = url.protocol;
        let port = url.port;
        let addr = url.hostname;
        if (this.connections.isset(uuid) === true){
            console.log('uuid exists, recovering socket...');
            let wsTunnel = this.connections.get(uuid);
            wsTunnel.proxifier.srcReconnect(src);
        } else {
            this.connections.append(new wsTunnel(src,protocol,port,addr,req,headers,this));
        }
    }
    parseURL (rawurl) {
        let url = require('url');
        return new URL(rawurl);
    }
}

class wsTunnel {
    getID(){
        return this.headers.uuid;
    }
    constructor (src,protocol,port,addr,req,headers,server) {
        this.serverName = server.name;
        this.getID = this.getID.bind(this);
        this.src = src;
        this.protocol = protocol.substring(0,protocol.length -1);
        this.port = port;
        this.addr = addr;
        this.req = req;
        this.headers = headers;
        this.server = server;
        this.id = this.getID();
        this.chain = {
            srcID : this.id, 
            srcConnection : 1,
            dstConnection : 0, 
            serverName: this.serverName, 
            dstProtocol: this.protocol, 
            dstPort: this.port,
            dstAddr: this.addr
        };
        this.tcp = this.tcp.bind(this);
        this.udp = this.udp.bind(this);
        this.reversetcp = this.reversetcp.bind(this);
        this[`${this.protocol}`](src,port,addr,req);
    }
    tcp(src,port,addr,req){
        var dst = new net.Socket();
        dst.connect(port, addr);
        this.proxifier = new wsTunnelProxifier(src,dst,addr,req,'message','data','send','write',this.chain,this.server.connections);
    }
    tcpold(src,port,addr,req){
        var dst = new net.Socket();
        dst.connect(port, addr);
        dst.on('connect',() =>{
            this.chain.dstConnection = 1;
            this.chain.localPort = dst.localPort;
            this.chain.localAddress = dst.localAddress;
            report_status(this.chain);
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
            this.chain.srcConnection = 0;
            dst.end();
            report_status(this.chain);
            delete this.chain.srcID;
        });
        dst.on('close', () => {
            this.chain.dstConnection = 0;
            delete this.chain.localPort;
            delete this.chain.localAddress;
            src.close();
            report_status(this.chain);
        });
    }
    udp(src,port,addr,req){
        var dst = dgram.createSocket('udp4');
        dst.on('listening',()=>{
            this.chain.localPort = dst.address().port;
            this.chain.localAddress = dst.address().address;
            this.chain.dstConnection = 1;
            report_status(this.chain);
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
            this.chain.srcConnection = 0;
            if (e === 1006){//abnormal quit: suspend dst socket with timeout
                
            }
            dst.close();
            report_status(this.chain);
            delete this.chain;
            console.log(e);
        });
        dst.on('close', (e) => {
            this.chain.dstConnection = 0;
            delete this.chain.localPort;
            delete this.chain.localAddress;
            report_status(this.chain);
            console.log(e);
        });
    }
    reversetcp(src,port,addr,req){
        var dst = net.createServer(function(dst){

            var address = socket.address();

            dst.on('data',function(data){
                src.send(data);
            });
            src.on('message',(data) =>{
                socket.write(data);
            });
            src.on('error', (e) => {
                console.log(e);
            });
            src.on('close',(e) => {
                this.chain.srcConnection = 0;
                report_status(this.chain);
            });
            dst.on('close', () => {
                src.close();
            });
        });
        dst.listen(port,addr);
        this.chain.dstConnection = 1;
        report_status(this.chain);
    }
    prefab(src,port,addr,req){
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
}

class wsTunnelProxifier{
    constructor (src,dst,addr,req,srcOnMessageEventName,dstOnMessageEventName,srcSendMethodName,dstSendMethodName,chain,container){
        this.src = src;
        this.dst = dst;
        this.addr = addr;
        this.req = req;
        this.srcOnMessageEventName = srcOnMessageEventName;
        this.dstOnMessageEventName = dstOnMessageEventName;
        this.srcSendMethodName = srcSendMethodName;
        this.dstSendMethodName = dstSendMethodName;
        this.chain = chain;
        this.container = container;
        
        this.suspend = this.suspend.bind(this);
        this.resume = this.resume.bind(this);
        
        this.tunnel = this.tunnel.bind(this);
        
        dst.on('error',(e) =>{
            console.log(e);
            src.close();
            dst.end();
        });
        dst.on('connect',() =>{
            this.chain.dstConnection = 1;
            this.chain.localPort = dst.localPort;
            this.chain.localAddress = dst.localAddress;
            report_status(this.chain);
        });
        src.on('close',(e) => {
            let call = this.srcClose.bind(this);
            call(e);
        })
        
        
        this.tunnel();
    }
    suspend(socket,timeOut){
        socket.pause();
        this.abortTimeout = setTimeout(()=>{
            this.container.destroy(this.chain.srcID);
        }, timeOut);
    }
    resume(socket){
        clearTimeout(this.abortTimeout);
        socket.resume();
    }
    srcReconnect(src){
        this.src = src;
        this.resume(this.dst);
        this.tunnel();
    }
    tunnel(){
        this.src.on(`${this.srcOnMessageEventName}`,(data) => {
            this.dst[`${this.dstSendMethodName}`](data);
        });
        this.dst.on(`${this.dstOnMessageEventName}`,(data) => {
            this.src[`${this.srcSendMethodName}`](data);
        });
    }
    srcClose(e){
        if (e === 1006){
            this.suspend(this.dst,5000);
        } else {
            this.dst.end();
            this.container.destroy(this.chain.srcID);
        }
    }
    dstClose(e){
        
    }
}
class wsConnectionContainer{
    constructor(){
        this.container = new Array();
        this.append.bind(this);
        this.get.bind(this);
        this.isset.bind(this);
        this.isset.bind(this);
        this.destroy.bind(this);
    }
    append(Tunnel){
        this.container[Tunnel.id] = Tunnel;
    }
    get(id){
        return this.container[id];
    }
    isset(id){
        return this.container[id] !== undefined;
    }
    destroy(id){
        delete this.container[id] ;
    }
}

var s = new wsServer({port:5001,clientTracking: 0,perMessageDeflate: { threshold: 0}},'/');
