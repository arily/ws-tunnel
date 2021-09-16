// const server = require('ws').Server;
// const http = require('http')
// const url = require('url')
// https://stackoverflow.com/questions/13364243/websocketserver-node-js-how-to-differentiate-clients
require('console-stamp')(console, '[HH:MM:ss.l]')

const WsTunnelServer = require('lib-ws-tunnel').WsServer

let {
  port,
  // output,
  outputLevel,
  wspath,
  gate: {
    name
  }
} = require('./config/wstunnel').wsServer
//   report = output
const logLevel = outputLevel
try {
  if (wspath[wspath.length - 1] === '/') {
    wspath = wspath.substring(0, wspath.length - 1)
  }
  // eslint-disable-next-line no-unused-vars
  const s = new WsTunnelServer({
    port: port,
    clientTracking: 0,
    path: wspath,
    gate: {
      name: name || 'server'
    }
  })
} catch (error) {
  if (logLevel > 1) console.log(error)
}
