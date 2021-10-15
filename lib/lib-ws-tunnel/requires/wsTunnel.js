/* eslint-disable camelcase */
const net = require('net')
const dgram = require('dgram')
const WsTunnelProxifier = require('./wsTunnelProxifier')
const { getEventNames: eventNameResolver } = require('../constants')
const report_status = require('./reportStatus')
module.exports = class wsTunnel {
  constructor ({ src, protocol, port, address, req, headers, server }) {
    this.name = server.name
    this.src = src
    this.protocol = protocol.substring(0, protocol.length - 1)
    this.port = port
    this.address = address
    this.req = req
    this.headers = headers
    this.server = server
    this[`${this.protocol}`]()
  }

  createChain () {
    const self = this
    this.chain = {
      src: {
        id: self.headers.connectionId || self.headers.connectionid,
        connection: 1,
        // get connection () {
        //   return self.src.connecting
        // },
        // set connection (stat) {
        //   setImmediate(() => {
        //     console.log(`set src connection stat to ${stat}, now is ${self.src.connecting}`)
        //   })
        // },
        // bytesRead: 0,
        // bytesWritten: 0,
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
        id: self.headers.clientId || self.headers.clientid,
        get address () {
          return self.headers.clientAddress || self.headers.clientaddress
        },
        get port () {
          return self.headers.clientPort || self.headers.clientport
        },
        src: {
          // get id () {
          //   return self.headers.connectionId || self.headers.connectionid
          // },
          get address () {
            return self.headers.connectionAddress || self.headers.connectionaddress
          },
          get port () {
            return self.headers.connectionPort || self.headers.connectionport
          }
        }
      },
      dst: {
        connection: 0,
        // get connection () {
        //   return (
        //     self.dst.connecting
        //       ? self.chain.src.connection
        //         ? 1
        //         : -1
        //       : 0
        //   )
        // },

        // set connection (stat) {
        //   const now = self.chain.dst.connection
        //   setImmediate(() => {
        //     console.log(`set dst connection stat to ${stat}, now is ${now}`)
        //   })
        // },
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
          return self.dst.bytesRead
        },
        get bytesWritten () {
          return self.dst.bytesWritten
        }
      },
      gate: {
        get name () {
          return self.name
        },
        get port () {
          // if (!self.dst.connecting) return null
          return self.dst.localPort
        },
        get address () {
          // if (self.dst.connecting) return null
          return self.dst.localAddress
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
      // chain: this.chain,
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

  reversetcp (src, port, address, req) {
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
