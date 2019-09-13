module.exports = class wsTunnel {
    getID(){
        return this.headers.uuid;
    }
    constructor (src,protocol,port,addr,req,headers,server) {

//        this.url = require('url');
//        this.dgram = require('dgram');
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
            clientID : this.headers.client,
            srcConnection : 1,
            dstConnection : 0, 
            serverName: this.serverName, 
            dstProtocol: this.protocol, 
            dstPort: this.port || 'censored',
            dstAddr: this.addr
        };
        this.tcp = this.tcp.bind(this);
        this.udp = this.udp.bind(this);
        this.reversetcp = this.reversetcp.bind(this);
        this[`${this.protocol}`](src,port,addr,req);
    }
    tcp(src,port,addr,req){
        let net = require("net");
        var dst = new net.Socket();
        dst.connect(port, addr);
        let wsTunnelProxifier = require('./wsTunnelProxifier');
        this.proxifier = new wsTunnelProxifier(
            src,
            dst,
            addr,
            req,
            {
                srcOnMessageEvent:'message',
                dstOnMessageEvent:'data',
                srcSendMethod:'send',
                dstSendMethod:'write',
                srcClose:'close',
                dstClose:'end',
                dstOnConnection: 'connect'
            },
            this.chain,
            this.server.connections,
            'tcp'
        );
    }
    
    udp(src,port,addr,req){
        var dgram = require('dgram');
        var dst = dgram.createSocket('udp4');
        dst.bind()
        let wsTunnelProxifier = require('./wsTunnelProxifier');
        this.proxifier = new wsTunnelProxifier(
            src,
            dst,
            addr,
            req,
            {
                srcOnMessageEvent:'message',
                dstOnMessageEvent:'message',
                srcSendMethod:'send',
                dstSendMethod:'send',
                srcClose:'close',
                dstClose:'close',
                dstOnConnection:'listening',
            },
            this.chain,
            this.server.connections,
            'udp',
            port
        );
    }
    udpold(src,port,addr,req){
        var dgram = require('dgram');
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
        let net = require("net");
        let dst = net.createServer(function(dst){

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
        let myroute = require('../wstunnelconfig').Prefab;
        let real_connection = undefined;
        let real = undefined;
        myroute.some((e) => {
            if (addr === e.dial){
                real = e.bound;
                return true;
            }
            return false;
        });
        if (undefined !== real){
            let url = this.parseURL(real);
            this.protocol = url.protocol.substring(0,url.protocol.length -1);
            this.port = url.port;
            this.addr = url.addr;
            this[`${this.protocol}`](this.src,this.port,this.addr,this.req);
        } else {
            
        }
    }
    parseURL (rawurl) {
        rawurl = rawurl.replace(this.prefix,"");
        if (rawurl.substring(rawurl.length -1 ) == '/'){
            rawurl = rawurl.substring(0,rawurl.length - 1);
        }
        if (rawurl.substring(0,1) === '/'){
            rawurl = rawurl.substring(1);
        }
        let url = require('url');
        return new URL(rawurl);
    }
}
