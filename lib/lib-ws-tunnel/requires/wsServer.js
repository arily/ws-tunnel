const Server = require('ws').Server
const WsTunnel = require('./wsTunnel')
const WsConnectionContainer = require('./wsConnectionContainer')

module.exports = class wsServer {
  constructor (wsConfig, { prefix = '/', proxyServerName = 'Proxy', prefabRoute = [], proxifier }) {
    if (prefix.substring(prefix.length - 1) === '/') {
      prefix = prefix.substring(0, prefix.length - 1)
    }
    this.prefix = prefix
    this.name = proxyServerName
    this.prefabRoute = prefabRoute
    this.proxifierConfig = proxifier
    this.server = new Server(wsConfig)
    this.connections = new WsConnectionContainer()
    this.newConnection = this.newConnection.bind(this)
    this.parseURL = this.parseURL.bind(this)
    this.server.on('connection', this.newConnection)
  }

  prefab (prefab) {
    this.prefabRoute = prefab
  }

  newConnection (src, req) {
    try {
      const rawurl = req.url // like /url:port
      const headers = req.headers
      const uuid = headers.uuid
      const url = this.parseURL(rawurl)
      const protocol = url.protocol
      const port = url.port
      const addr = url.hostname
      if (this.connections.isset(uuid) === true) {
        if (this.config.log === true) console.log('uuid exists, recovering socket...')
        const wsTunnel = this.connections.get(uuid)
        wsTunnel.proxifier.srcReconnect(src)
      } else {
        this.connections.append(new WsTunnel({ src, protocol, port, addr, req, headers, server: this }))
      }
    } catch (error) {
      console.log(error)
      src.close()
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
