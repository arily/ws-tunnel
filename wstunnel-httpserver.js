//var server = require('ws').Server;
const http = require('http');
const url = require('url');
var fs = require('fs'); //引入文件读取模块
var mime = require('mime-types');

//https://stackoverflow.com/questions/13364243/websocketserver-node-js-how-to-differentiate-clients
require('console-stamp')(console, '[HH:MM:ss.l]');

const wsTunnelServer = require('./requires/wsServer');

try {
	var {
		port,
		output,
		outputLevel,
		wspath
	} = require('./config/wstunnel').wsServer;
	report = output;
	logLevel = outputLevel;
	let noServer = true;
	const match = require('url-match-patterns').
	default;
	if (wspath[wspath.length - 1] == '/') {
		wspath = wspath.substring(0, wspath.length - 1);
	}
	var s = new wsTunnelServer({
			noServer: noServer,
			clientTracking: 0,
		},
		wspath);
	var server = http.createServer(function (request, response) {
		switch (request.url) {
			case wspath:
				break;
			case '/monitor':
				chains = s.connections.getChains();
				response_success(request,response,'application/json', JSON.stringify(chains),200,this.caller);
				break;
			default:
				mini_static_server(request, response);
		}
        access_log(request);
	});

	server.listen(port,
		function () {
			console.log((new Date()) + ' Server is listening on port', port);
		});

	server.on('upgrade',
		function upgrade(request, socket, head) {
			const pathname = url.parse(request.url).pathname;
			pattern = 'http://dummy'.concat(wspath, '/*');
			if (match(pattern, 'http://dummy' + pathname)) {
				s.server.handleUpgrade(request, socket, head,
					function done(ws) {
						s.server.emit('connection', ws, request);
					});
			} else {
				socket.destroy();
			}
		}
    );
} catch (error) {
	if (logLevel > 1) console.log(error);
}

function mini_static_server(request, response) {
	let documentRoot = './public'; 
	let file = documentRoot + request.url;
	if (file[file.length - 1] === '/') {
		file = file.substring(0, file.length - 1); //remove last '/'
	}
	fs.readFile(file,
		function (err, data) {
			if (err) {
				result = ['index.html', 'default.html', 'fallback.html'].some(filename => {
					path = file + '/' + filename;
					if (fs.existsSync(path)) {
						//-----redirect /A to /A/  to fix relative html file path problem (/a ... b/c -> /a/c) to (/a/ ... b/c -> a/b/c)
						if (request.url[request.url.length - 1] !== '/') {
							response.writeHeader(301, {
								'Location': request.url + '/',
							});
							response.end();
							return true;
						}
						//-----redirect end.
						ct = mime.lookup(path);
						data = fs.readFileSync(path);
						if (!ct === false) {
							response_success(request, response, ct, data,200,path);
						}
						return true;
					} else {
						return false;
					}
				});

				if (!result) {
					response_404(request, response);
				}
			} else {
				ct = mime.lookup(file);
				if (!ct === false) {
					response_success(request, response, ct, data,200,file);
				} else {
					response.end('unknown MIME Type.')
				}

			}
		}
	);
}

function response_404(request, response) {
	response.writeHeader(404, {
		'content-type': 'text/html;charset="utf-8"'
	});
	response.write('<h1>404错误</h1><p>你要找的页面不存在</p>');
	response.end();
    if (logLevel <= 2 ){
        console.log('[mini-static-server] [404] '.concat(request.url))
    }
}

function response_success(request, response, mime, data, httpcode = 200,file = undefined) {
	response.writeHeader(httpcode, {
		'content-type': mime
	});
	response.write(data);
	response.end();
    if (logLevel <= 1 ){
        if (file !== undefined ){
            substr = ' -> '.concat(file);
        } else {
            substr = '';
        }
        console.log('[mini-static-server] ['.concat(httpcode).concat('] ').concat(request.url).concat(substr));
    }
}

function location(response, location, httpcode = 301,) {
    if (logLevel <= 1 ){

        console.log('[mini-static-server] ['.concat(httpcode).concat('] ').concat(request.url).concat(' -> ').concat(location));
    }
	response.writeHeader(httpcode, {
		"Location": location,
	});
	response.end();
}
function access_log(request){
    
}