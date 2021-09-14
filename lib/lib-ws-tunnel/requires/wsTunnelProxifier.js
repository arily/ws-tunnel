/* eslint-disable camelcase */
const report_status = require('./reportStatus')
module.exports = class wsTunnelProxifier {
  constructor ({ src, dst, addr, req, functionName, chain, container, type = 'tcp', port = undefined }, config = {
    reconnectWindow: 5000,
    reconnectEnabled: true,
    report: true
  }) {
    this.src = src
    this.dst = dst
    this.addr = addr
    this.req = req
    this.functionName = functionName
    this.chain = chain
    this.container = container
    this.port = port
    this.config = config

    dst.on('error', (e) => {
      this.closeDst()
    })
    src.on('error', e => {
      this.closeSrc(1001)
    })
    // tcp
    if (type === 'tcp') {
      dst.on('connect', () => {
        this.chain.dstSentBytes = this.chain.srcSentBytes = 0
        this.chain.dstConnection = 1
        this.chain.localPort = dst.localPort
        this.chain.localAddress = dst.localAddress
        report_status(this.chain)
      })
    } else if (type === 'udp') {
      dst.on('listening', () => {
        this.chain.dstSentBytes = this.chain.srcSentBytes = 0
        this.chain.dstConnection = 1
        this.chain.localPort = dst.address().port
        this.chain.localAddress = dst.address().address
        this.chain.dstConnection = 1
        report_status(this.chain)
      })
    }

    src.on('close', (e) => {
      this.srcOnClose(e)
    })
    dst.on('close', (e) => {
      this.dstOnClose(e)
    })

    this.wsKeepalive()
    this.tunnel()
  }

  getSrc () {
    return this.src
  }

  getDst () {
    return this.dst
  }

  suspend (socket, timeOut) {
    socket.pause()
    this.chain.dstConnection = -1
    this.abortTimeout = setTimeout(() => {
      this.closeDst()
      this.chain.dstConnection = 0
      this.container.delete(this.chain.srcId)
    }, timeOut)
    report_status(this.chain)
  }

  resume (socket) {
    this.chain.dstConnection = 1
    clearTimeout(this.abortTimeout)
    socket.resume()
    report_status(this.chain)
    this.src.on(`${this.srcOnMessageEventName}`, (data) => {
      this.dst[`${this.dstSendMethodName}`](data)
    })
    this.src.on('close', (e) => {
      this.srcOnClose(e)
    })
  }

  srcReconnect (src) {
    this.src.terminate()
    delete this.src
    this.src = src
    this.chain.srcConnection = 1
    this.resume(this.dst)
  }

  tunnel () {
    this.src.removeListener(`${this.functionName.srcOnMessageEvent}`, () => {})
    this.dst.removeListener(`${this.functionName.dstOnMessageEvent}`, () => {})
    this.src.on(`${this.functionName.srcOnMessageEvent}`, (data) => {
      this.dst[`${this.functionName.dstSendMethod}`](data, this.port)
      this.chain.dstSentBytes += data.byteLength
    })
    this.dst.on(`${this.functionName.dstOnMessageEvent}`, (data) => {
      this.src[`${this.functionName.srcSendMethod}`](data)
      this.chain.srcSentBytes += data.byteLength
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
      this.chain.srcConnection = 1
    } else if (socket === 'dst') {
      this.chain.dstConnection = 1
    }
  }

  srcOnClose (e) {
    this.chain.srcConnection = 0
    report_status(this.chain)
    if (e === 1001) {
      this.suspend(this.dst, this.config.reconnectWindow)
    } else {
      if (this.chain.dstConnection === 1) {
        this.closeDst(e)
      }
      this.container.delete(this.chain.srcId)
    }
  }

  dstOnClose (e) {
    this.chain.dstConnection = 0
    this.closeSrc(1000)
    report_status(this.chain)
  }

  closeSrc (e = 1000) {
    this.src[`${this.functionName.srcClose}`](e)
  }

  closeDst (e = 1000) {
    this.dst[`${this.functionName.dstClose}`]()
  }
}
