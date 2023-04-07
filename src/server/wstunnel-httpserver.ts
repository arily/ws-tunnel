import { type Socket } from 'net'

import http, { IncomingMessage, type ClientRequest, type ServerResponse } from 'http'
import http2 from 'http2'
import net from 'net'
import path from 'path'

import StaticServer from './static/MiniStaticServer'

import conf from '../config/wstunnel'
import WsServer from '../lib/requires/wsServer'
import match from 'url-match-patterns'
// https://stackoverflow.com/questions/13364243/websocketserver-node-js-how-to-differentiate-clients
// require('console-stamp')(console, '[HH:MM:ss.l]')
const doNothing = () => {}
const fileServer = new StaticServer({
  root: path.join(__dirname, '../public')
})
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
    prefabRoute: conf.prefab,
    proxifier: conf.proxifier,
    // path: wspath,
    gate: {
      name: name || 'server'
    }
  })
  const handler = async function (request: Request, response: ServerResponse) {
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
        const body: Buffer[] = []
        request.on('data', (chunk: Buffer) => {
          body.push(chunk)
        }).on('end', () => {
          const str = Buffer.concat(body).toString()
          // at this point, `body` has the entire request body stored in it as a string
          try {
            const json = JSON.parse(str)
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
        await fileServer.request(request, response)
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
    server.on('upgrade', (request: Request, socket: Socket, head: Headers) => {
      const pathname = request.url
      const pattern = 'http://dummy'.concat(wspath, '/*')
      if (match(pattern, 'http://dummy' + pathname)) {
        s.server.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          s.server.emit('connection', ws, request)
        })
      } else {
        socket.destroy()
      }
    })
  })
  server.listen(port, () => { console.log('Server started') })
} catch (error) {
  if (logLevel > 1) console.log(error)
}
