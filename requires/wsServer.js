module.exports = class wsServer{
    constructor (config,prefix,name = 'Proxy'){
        this.log = require("../config/wstunnel").wsServer.output;
        this.config = config;
        this.prefix = prefix;
        if (prefix.substring(prefix.length -1 ) == '/'){
            this.prefix.substring(0,prefix.length - 1);
        }
        this.name = name;
        var server = require('ws').Server;
        this.server = new server(config);
        var wsConnectionContainer = require('./wsConnectionContainer');
        this.connections = new wsConnectionContainer;
        this.newConnection = this.newConnection.bind(this);
        this.server.on('connection',this.newConnection);
    }
    newConnection (src,req){
        let rawurl = req.url;// like /url:port
        let headers = req.headers;
        let uuid = headers.uuid;
        let url = this.parseURL(rawurl);
        let protocol = url.protocol;
        let port = url.port;
        let addr = url.hostname;
        if (this.connections.isset(uuid) === true){
            if (this.log) console.log('uuid exists, recovering socket...');
            let wsTunnel = this.connections.get(uuid);
            wsTunnel.proxifier.srcReconnect(src);
        } else {
            var wsTunnel = require('./wsTunnel');
            this.connections.append(new wsTunnel(src,protocol,port,addr,req,headers,this));
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