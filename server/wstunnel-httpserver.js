const http = require('http')
const http2 = require('http2')
const net = require('net')
const path = require('path')
const match = require('url-match-patterns').default
const doNothing = () => {}
// const uuid = require('uuid')

// https://stackoverflow.com/questions/13364243/websocketserver-node-js-how-to-differentiate-clients
// require('console-stamp')(console, '[HH:MM:ss.l]')

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
  gate: { name },
  key,
  cert
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
    gate: {
      name: name || 'server'
    }
  })
  const handler = function (request, response) {
    switch (request.url) {
      case wspath:
        break
      case '/api/connections': {
        const chains = [...s.connections.values()].map(conn => conn.chain)
        fileServer.response_success(request, response, 'application/json', JSON.stringify(chains), 200, this.caller)
        break
      }
      case '/api/report/final': {
        // const chains = [...s.connections.values()].map(conn => conn.chain)
        // fileServer.response_success(request, response, 'application/json', JSON.stringify(chains), 200, this.caller)

        // https://nodejs.org/zh-cn/docs/guides/anatomy-of-an-http-transaction/
        let body = []
        request.on('data', (chunk) => {
          body.push(chunk)
        }).on('end', () => {
          body = Buffer.concat(body).toString()
          // at this point, `body` has the entire request body stored in it as a string
          try {
            const json = JSON.parse(body)
            // if (!json.connectionId) throw new Error('no connectionId')
            // if (!s.connections.has(json.connectionId)) throw new Error('connection id not exists')
            if (!json.src) throw new Error('no src')
            if (!json.location) throw new Error('no final data')

            // const chain = s.connections.get(json.connectionId)
            const chains = [...s.connections.values()].map(conn => conn.chain)
            const chain = chains.find((chain) => chain.gate.address === json.src?.address && chain.gate.port === json.src?.port)
            if (!chain) throw new Error('no chain')
            chain.final = chain.final ?? {}
            chain.final.location = json.location
          } catch (error) {
            const res = JSON.stringify({
              error: error.message
            })
            response.writeHead(500, {
              'Content-Length': Buffer.byteLength(res),
              'Content-Type': 'application/json'
            })
              .end(res)
          }
          response.on('error', doNothing)
          const res = JSON.stringify({ ok: true })
          response.writeHead(200, {
            'Content-Length': Buffer.byteLength(res),
            'Content-Type': 'application/json'
          })
            .end(res)
        })
        break
      }
      default:
        fileServer.request(request, response)
    }
    fileServer.access_log(request)
  }
  const httpServer = http.createServer(handler)
  const http2Server = http2.createSecureServer({
    key,
    cert,
    allowHTTP1: true,
    settings: {
      enableConnectProtocol: true
    }
  }, handler)

  const server = net.createServer(socket => {
    socket.once('data', buffer => {
      // Pause the socket
      socket.pause()

      // Determine if this is an HTTP(s) request
      const byte = buffer[0]

      let protocol
      if (byte === 22) {
        protocol = 'https'
      } else if (byte > 32 && byte < 127) {
        protocol = 'http'
      }

      const proxy = server[protocol]
      if (proxy) {
        // Push the buffer back onto the front of the data stream
        socket.unshift(buffer)

        // Emit the socket to the HTTP(s) server
        proxy.emit('connection', socket)
      }

      // As of NodeJS 10.x the socket must be
      // resumed asynchronously or the socket
      // connection hangs, potentially crashing
      // the process. Prior to NodeJS 10.x
      // the socket may be resumed synchronously.
      process.nextTick(() => socket.resume())
    })
  })

  server.http = httpServer
  server.https = http2Server

  ;[httpServer, http2Server].forEach(server => {
    // server.listen(port, () => {
    //   console.info((new Date()) + ' Server is listening on port', port)
    // })
    // server.on('connection', (conn) => {
    //   conn.socketId = uuid.v4()
    // })

    server.on('upgrade', (request, socket, head) => {
      const pathname = request.url
      const pattern = 'http://dummy'.concat(wspath, '/*')
      if (match(pattern, 'http://dummy' + pathname)) {
        s.server.handleUpgrade(request, socket, head, (ws) => {
          s.server.emit('connection', ws, request)
        })
      } else {
        socket.destroy()
      }
    })
  })
  // const head = Buffer.from('')
  // http2Server.on('stream', (stream, headers) => {
  //   // console.log(headers)
  //   stream.headers = headers
  //   if (headers[':method'] === 'CONNECT') {
  //     // stream.respond()

  //     // const ws = new Websocket(null)
  //     // stream.setNoDelay = () => {}
  //     // ws.setSocket(stream, head, 100 * 1024 * 1024)

  //     // s.server.emit('connection', ws, stream)
  //     s.server.handleUpgrade(stream, stream.session, head, (ws) => {
  //       s.server.emit('connection', ws, stream)
  //     })
  //   } else {
  //     stream.respond()
  //     stream.end('ok')
  //   }
  // })
  server.listen(port, () => console.log('Server started'))
} catch (error) {
  if (logLevel > 1) console.log(error)
}
