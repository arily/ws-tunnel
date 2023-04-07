import { type IncomingMessage } from 'http'
import WsTunnel from './wsTunnel'
import { Server } from 'ws'

export default class WsServer {
  prefix: string
  name: string
  prefabRoute: Array<{ dial: string, bound: string }>
  proxifierConfig: {
    reconnectWindow: number
    reconnectEnabled: boolean
  }

  server: Server
  connections: Map<string | string[], WsTunnel>

  constructor (wsConfig, { prefix = '/', gate = { name: 'Proxy' }, prefabRoute = [], proxifier }) {
    if (prefix.substring(prefix.length - 1) === '/') {
      prefix = prefix.substring(0, prefix.length - 1)
    }
    this.prefix = prefix
    this.name = gate.name
    this.prefabRoute = prefabRoute
    this.proxifierConfig = proxifier
    this.server = new Server(wsConfig)
    this.connections = new Map()
    this.parseURL = this.parseURL.bind(this)
    this.server.on('connection', this.newConnection.bind(this))
  }

  prefab (prefab: Array<{ dial: string, bound: string }>) {
    this.prefabRoute = prefab
  }

  newConnection (src: WebSocket, req: IncomingMessage) {
    try {
      // src.pause()
      const rawurl = req.url ?? req[':path'] // like /url:port
      const headers = req.headers
      const connectionId = headers.connectionId ?? headers.connectionid

      if (!connectionId) throw new Error('missing connection Id')

      const url = this.parseURL(rawurl)
      const protocol = url.protocol
      const port = url.port
      const address = url.hostname
      if (this.connections.has(connectionId)) {
        console.log('connectionId exists, recovering socket...')
        const wsTunnel = this.connections.get(connectionId)
        if (!wsTunnel) {
          throw new Error('missing tunnel')
        }
        wsTunnel.proxifier.srcReconnect(src)
      } else {
        this.connections.set(connectionId, new WsTunnel({ src, protocol, port, address, req, headers, server: this }))
      }
      // src.resume()
    } catch (error) {
      console.log(error)
      src.close()
    }
  }

  parseURL (rawurl) {
    // rawurl = rawurl.replace(this.prefix, '')
    if (rawurl.startsWith(this.prefix)) rawurl = rawurl.substring(this.prefix.length)
    if (rawurl.substring(rawurl.length - 1) === '/') {
      rawurl = rawurl.substring(0, rawurl.length - 1)
    }
    if (rawurl.substring(0, 1) === '/') {
      rawurl = rawurl.substring(1)
    }
    return new URL(rawurl)
  }
}
