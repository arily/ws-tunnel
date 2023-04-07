/* eslint-disable camelcase */
import net, { type Socket } from 'net'
import dgram from 'dgram'
import WsTunnelProxifier from './wsTunnelProxifier'
import { getEventNames as eventNameResolver } from '../constants'
import report_status from './reportStatus'
import { type IncomingMessage } from 'http'
import type WsServer from './wsServer'
export type Protocol = 'tcp' | 'udp' | 'reversetcp'
export type HeaderWithId =
& ({ connectionid: string } | { connectionId: string })
& ({ clientAddress: string } | { clientaddress: string })
& ({ clientPort: string } | { clientport: string })
& ({ connectionAddress: string } | { connectionaddress: string })
& ({ connectionPort: string } | { connectionport: string })

export interface Chain {
  src: {
    id: string
    connection: number
    bytesRead: number
    bytesWritten: number
    port?: number
    address?: string
  }
  dst: {
    protocol: Protocol
    connection: number
    bytesRead: number
    bytesWritten: number
    port?: number
    address?: string
  }
  client: {
    id: string
    port: number
    address: string
    src: {
      port: number
      address: string
    }
  }
  gate: {
    name: string
    port?: number
    address?: string
  }
  transport?: string
}
export default class wsTunnel {
  name: string
  src: Socket
  dst?: Socket
  protocol: Protocol
  port: number
  address: string
  req: IncomingMessage
  headers: HeaderWithId
  server: WsServer
  chain?: Chain
  proxifier?: WsTunnelProxifier

  constructor ({ src, protocol, port, address, req, headers, server }: { src: Socket | Socket, protocol: string, port: number, address: `${Protocol}/`, req: IncomingMessage, headers: HeaderWithId, server: WsServer }) {
    this.name = server.name
    this.src = src
    this.protocol = protocol.substring(0, protocol.length - 1) as Protocol
    this.port = port
    this.address = address
    this.req = req
    this.headers = headers
    this.server = server
    this[`${this.protocol}`]()
  }

  createChain () {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    this.chain = {
      src: {
        // @ts-expect-error it's ok
        id: self.headers.connectionId || self.headers.connectionid,
        connection: 1,
        get bytesRead () {
          return self.req.socket.bytesRead
        },
        get bytesWritten () {
          return self.req.socket.bytesWritten
        },
        get port () {
          return self.req.socket.remotePort
        },
        get address () {
          return self.req.socket.remoteAddress
        }
      },
      client: {
        // @ts-expect-error it's ok
        id: self.headers.clientId || self.headers.clientid,
        get address () {
          // @ts-expect-error it's ok
          return self.headers.clientAddress || self.headers.clientaddress
        },
        get port () {
          // @ts-expect-error it's ok
          return self.headers.clientPort || self.headers.clientport
        },
        src: {

          get address () {
            // @ts-expect-error it's ok
            return self.headers.connectionAddress || self.headers.connectionaddress
          },
          get port () {
            // @ts-expect-error it's ok
            return self.headers.connectionPort || self.headers.connectionport
          }
        }
      },
      dst: {
        connection: 0,
        get protocol () {
          return self.protocol
        },
        get port () {
          return self.port
        },
        get address () {
          return self.address
        },
        get bytesRead () {
          return self.dst?.bytesRead ?? 0
        },
        get bytesWritten () {
          return self.dst?.bytesWritten ?? 0
        }
      },
      gate: {
        get name () {
          return self.name
        },
        get port () {
          // if (!self.dst.connecting) return null
          return self.dst?.localPort
        },
        get address () {
          // if (self.dst.connecting) return null
          return self.dst?.localAddress
        }
      }
    }
  }

  tcp (src = this.src, port = this.port, address = this.address, req = this.req) {
    this.protocol = 'tcp'
    this.dst = new net.Socket()
    this.dst.connect(port, address)
    this.createChain()
    this.proxifier = new WsTunnelProxifier({
      eventName: eventNameResolver('websocket', this.protocol),
      // chain: this.chain,
      // container: this.server.connections,
      tunnel: this
      // type: 'tcp'
    }, this.server.proxifierConfig)
  }

  udp (src = this.src, port = this.port, address = this.address, req = this.req) {
    const dst = dgram.createSocket('udp4')
    dst.bind()
    this.proxifier = new WsTunnelProxifier({
      src,
      dst,
      address,
      req,
      eventName: {
        srcOnMessageEvent: 'message',
        dstOnMessageEvent: 'message',
        srcSendMethod: 'send',
        dstSendMethod: 'send',
        srcClose: 'close',
        dstClose: 'close',
        dstOnConnection: 'listening'
      },
      chain: this.chain,
      // container: this.server.connections,
      type: 'udp',
      port
    })
  }

  // udpold (src = this.src, port = this.port, address = this.address, req = this.req) {
  //   const dst = dgram.createSocket('udp4')
  //   dst.on('listening', () => {
  //     this.chain.localPort = dst.address().port
  //     this.chain.localAddress = dst.address().address
  //     this.chain.dst.connection = 1
  //     report_status(this.chain)
  //   })

  //   dst.on('error', (error) => {
  //     console.log(error)
  //   })

  //   src.on('message', (data) => {
  //     dst.send(data, port, address, (err, bytes) => {
  //       if (err) console.log('error on sending msg')
  //     })
  //   })
  //   dst.on('message', (data) => {
  //     src.send(data)
  //   })
  //   src.on('close', (e) => {
  //     this.chain.src.connection = 0
  //     if (e === 1006) { // abnormal quit: suspend dst socket with timeout

  //     }
  //     dst.close()
  //     report_status(this.chain)
  //     delete this.chain
  //     console.log(e)
  //   })
  //   dst.on('close', (e) => {
  //     this.chain.dst.connection = 0
  //     delete this.chain.localPort
  //     delete this.chain.localAddress
  //     report_status(this.chain)
  //     console.log(e)
  //   })
  // }

  reversetcp (src = this.src, port = this.port, address = this.address, req = this.req) {
    const dst = net.createServer(function (dst) {
      // const address = dst.address()

      dst.on('data', function (data) {
        src.send(data)
      })
      src.on('message', (data) => {
        dst.write(data)
      })
      src.on('error', (e) => {
        console.log(e)
      })
      src.on('close', (e) => {
        this.chain.src.connection = 0
        report_status(this.chain)
      })
      dst.on('close', () => {
        src.close()
      })
    })
    dst.listen(port, address)
    this.chain.dst.connection = 1
    report_status(this.chain)
  }

  prefab (src = this.src, port = this.port, address = this.address, req = this.req) {
    // let real_connection = undefined;
    const real = this.server.prefabRoute.find((e) => address === e.dial)
    if (undefined !== real) {
      const url = this.parseURL(real.bound)
      const protocol = url.protocol.substring(0, url.protocol.length - 1)
      const port = url.port
      const address = url.hostname
      this[protocol](src, port, address, this.req)
    } else {
      throw new Error('Route Undefined')
    }
  }

  parseURL (rawurl) {
    rawurl = rawurl.replace(this.prefix, '')
    if (rawurl.substring(rawurl.length - 1) === '/') {
      rawurl = rawurl.substring(0, rawurl.length - 1)
    }
    if (rawurl.substring(0, 1) === '/') {
      rawurl = rawurl.substring(1)
    }
    return new URL(rawurl)
  }
}
