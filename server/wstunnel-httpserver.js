// const server = require('ws').Server;
const http = require('http')
// const URL = require('url').Url
const path = require('path')
// const fs = require('fs') // 引入文件读取模块
// const mime = require('mime-types')
const match = require('url-match-patterns').default

// https://stackoverflow.com/questions/13364243/websocketserver-node-js-how-to-differentiate-clients
require('console-stamp')(console, '[HH:MM:ss.l]')

// const lib = require('lib-ws-tunnel')
const WsServer = require('lib-ws-tunnel').WsServer

const StaticServer = require('./static/MiniStaticServer')
const fileServer = new StaticServer({
  root: path.join(__dirname, '../public')
})

const conf = require('../config/wstunnel')
let {
  port,
  // output,
  outputLevel,
  wspath,
  serverName
} = conf.wsServer
// let report = output
const logLevel = outputLevel
if (wspath[wspath.length - 1] === '/') {
  wspath = wspath.substring(0, wspath.length - 1)
}
try {
  const s = new WsServer({
    noServer: true,
    clientTracking: 0
  }, {
    prefabRoute: conf.Prefab,
    proxifier: conf.Proxifier,
    path: wspath,
    serverName: serverName || 'server'
  })
  const server = http.createServer(function (request, response) {
    switch (request.url) {
      case wspath:
        break
      case '/api/connections': {
        const chains = [...s.connections.values()].map(conn => conn.chain)
        fileServer.response_success(request, response, 'application/json', JSON.stringify(chains), 200, this.caller)
        break
      }
      default:
        fileServer.request(request, response)
    }
    fileServer.access_log(request)
  })

  server.listen(port, function () {
    console.info((new Date()) + ' Server is listening on port', port)
  })

  server.on('upgrade', function upgrade (request, socket, head) {
    const pathname = request.url
    const pattern = 'http://dummy'.concat(wspath, '/*')
    console.log(pattern)
    if (match(pattern, 'http://dummy' + pathname)) {
      console.log('matched')
      s.server.handleUpgrade(request, socket, head, function done (ws) {
        s.server.emit('connection', ws, request)
      })
    } else {
      socket.destroy()
    }
  })
} catch (error) {
  if (logLevel > 1) console.log(error)
}
