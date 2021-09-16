/* eslint-disable camelcase */
const report_status = require('./reportStatus')
module.exports = class wsTunnelProxifier {
  constructor ({ eventName, tunnel }, config = {
    reconnectWindow: 5000,
    reconnectEnabled: true,
    report: true
  }) {
    this.tunnel = tunnel
    const { dst, src, req, protocol: type } = tunnel
    // this.src = src
    // this.dst = dst
    // this.address = address
    // this.req = req
    // this.port = port
    this.eventName = eventName
    this.config = config

    dst.on('error', (e) => {
      this.closeDst()
    })
    src.on('error', e => {
      this.closeSrc(1001)
    })
    this.tunnel.chain.transport = `ws HTTP${req?.httpVersion}`
    // tcp
    if (type === 'tcp') {
      dst.on('connect', () => {
        this.tunnel.chain.dst.connection = 1
        report_status(this.tunnel.chain)
      })
    } else if (type === 'udp') {
      dst.on('listening', () => {
        this.tunnel.chain.dst.connection = 1
        this.tunnel.chain.dst.connection = 1
        report_status(this.tunnel.chain)
      })
    }

    src.on('close', (e) => {
      this.srcOnClose(e)
    })
    dst.on('close', (e) => {
      this.dstOnClose(e)
    })

    this.wsKeepalive()
    this.tunneling()
  }

  get container () {
    return this.tunnel.server.connections
  }

  get src () {
    return this.tunnel.src
  }

  get dst () {
    return this.tunnel.dst
  }

  suspend (socket, timeout) {
    socket.pause()
    this.tunnel.chain.dst.connection = -1

    this.abortTimeout = setTimeout(() => {
      this.closeDst()
      this.tunnel.chain.dst.connection = 0
      this.container.delete(this.tunnel.chain.src.id)
    }, timeout)
    report_status(this.tunnel.chain)
  }

  resume (socket) {
    this.tunnel.chain.dst.connection = 1
    clearTimeout(this.abortTimeout)
    socket.resume()
    report_status(this.tunnel.chain)
    this.src.on(this.srcOnMessageEventName, (data) => {
      this.dst[this.dstSendMethodName](data)
    })
    this.src.on('close', (e) => {
      this.srcOnClose(e)
    })
  }

  srcReconnect (src) {
    this.src.terminate()
    delete this.src
    this.src = src
    this.tunnel.chain.src.connection = 1
    this.resume(this.dst)
  }

  tunneling () {
    // this.src.removeListener(this.eventName.srcOnMessageEvent, () => {})
    // this.dst.removeListener(this.eventName.dstOnMessageEvent, () => {})
    this.src.on(this.eventName.srcOnMessageEvent, (data) => {
      this.dst[this.eventName.dstSendMethod](data, this.port)
      // this.tunnel.chain.src.bytesRead += data.byteLength
    })
    this.dst.on(this.eventName.dstOnMessageEvent, (data) => {
      this.src[this.eventName.srcSendMethod](data)
      // this.tunnel.chain.src.bytesWritten += data.byteLength
    })
  }

  wsKeepalive () {
    this.src.on('pong', () => {
      const f = () => {}
      this.alive('src')
      this.srcTimeoutInterval = setInterval(() => {
        this.connectionInterrupted('src')
      }, 5000)
      this.srcPingInterval = setInterval(() => {
        this.src.ping(f)
      }, 3000)
    })
  }

  connectionInterrupted (socket) {
    if (socket === 'src') {
      this.srcOnClose(1001)
    }
  }

  alive (socket) {
    if (socket === 'src') {
      this.tunnel.chain.src.connection = 1
    } else if (socket === 'dst') {
      this.tunnel.chain.dst.connection = 1
    }
  }

  srcOnClose (e) {
    this.tunnel.chain.src.connection = 0
    report_status(this.tunnel.chain)
    if (e === 1001) {
      this.suspend(this.dst, this.config.reconnectWindow)
    } else {
      if (this.tunnel.chain.dst.connection === 1) {
        this.closeDst(e)
      }
      this.container.delete(this.tunnel.chain.src.id)
    }
  }

  dstOnClose (e) {
    this.tunnel.chain.dst.connection = 0
    this.closeSrc(1000)
    report_status(this.tunnel.chain)
  }

  closeSrc (e = 1000) {
    this.src[this.eventName.srcClose](e)
  }

  closeDst (e = 1000) {
    this.dst[this.eventName.dstClose]()
  }
}
