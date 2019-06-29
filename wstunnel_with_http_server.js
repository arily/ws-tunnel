//var server = require('ws').Server;
const http = require('http');
const url = require('url');
var fs = require('fs');//引入文件读取模块
var mime = require('mime-types');

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
    var s = new wsTunnelServer({
        noServer: noServer,
        clientTracking: 0,
    },
                               wspath);
    var server = http.createServer(function(request, response) {
        if (request.url == wspath){

        } else if(request.url == '/monitor'){
            response.writeHead(200, {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*"
            });
            chains = s.connections.getChains();
//            for (var key in chains) {
//                switch(chains[key].srcConnection){
//                    case 0 :
//                        chains[key].srcConnection = 'disconnected';
//                        break;
//                    case 1 :
//                        chains[key].srcConnection = 'connected';
//                        break;
//                    case -1 :
//                        chains[key].srcConnection = 'halted';
//                }
//                switch(chains[key].dstConnection){
//                    case 0 :
//                        chains[key].dstConnection = 'disconnected';
//                        break;
//                    case 1 :
//                        chains[key].dstConnection = 'connected';
//                        break;
//                    case -1 :
//                        chains[key].dstConnection = 'halted';
//                }
//            }
            response.end(JSON.stringify(chains));
        } else {
            let documentRoot = '.';//这里是文件路径这里表示同级目录下我有个http2文件夹
            //response.writeHead(404);
            let file = documentRoot + request.url;
            if (file[file.length -1] === '/'){
                file = file.substring(0,file.length - 1); //remove last '/'
            }
            fs.readFile( file , function(err,data){
                /*
                    一参为文件路径
                    二参为回调函数
                        回调函数的一参为读取错误返回的信息，返回空就没有错误
                        二参为读取成功返回的文本内容
                */
                if(err){
                    result = ['index.html','default.html','fallback.html'].some(filename => {
                        path = file + '/' + filename;
                        if (fs.existsSync(path)){
                            //-----redirect /A to /A/  to fix relative html file path problem (/a ... b/c -> /a/c) to (/a/ ... b/c -> a/b/c)
                            if (request.url[request.url.length -1] !== '/'){
                                 response.writeHeader(301,{
                                    'Location' : request.url+'/',
                                });
                                response.end();
                                return true;
                            }
                            //-----redirect end.
                            ct = mime.lookup(path);
                            data = fs.readFileSync(path);
                            if (!ct === false){
                                response.writeHeader(200,{
                                    'content-type' : ct
                                });
                                response.write(data);//将index.html显示在客户端
                                response.end();
                            }
                            return true;
                        } else {
                            return false;
                        }
                    });

                    if (!result){
                        response.writeHeader(404,{
                            'content-type' : 'text/html;charset="utf-8"'
                        });
                        response.write('<h1>404错误</h1><p>你要找的页面不存在</p>');
                        response.end();
                    }
                }else{
                    ct = mime.lookup(file);
                    if (!ct === false){
                        response.writeHeader(200,{
                            'content-type' : ct,
                        });
                        response.write(data);//将index.html显示在客户端
                        response.end();
                    } else {
                        response.end('unknown MIME Type.')
                    }
                    
                }
            });
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
