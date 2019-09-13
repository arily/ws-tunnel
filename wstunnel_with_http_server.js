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
	} = require('./wstunnelconfig').wsServer;
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
				response.writeHead(200, {
					'Content-Type': 'application/json',
					"Access-Control-Allow-Origin": "*"
				});
				chains = s.connections.getChains();
				response.end(JSON.stringify(chains));
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
	let documentRoot = '.'; //这里是文件路径这里表示同级目录下我有个http2文件夹
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
							response_200(request, response, ct, data);
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
					response_200(request, response, ct, data);
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
}

function response_200(request, response, mime, data, httpcode = 200) {
	response.writeHeader(httpcode, {
		'content-type': mime
	});
	response.write(data);
	response.end();
}

function location(response, location, httpcode = 301) {
	response.writeHeader(httpcode, {
		"Location": location,
	});
	response.end();
}
function access_log(request){
    
}