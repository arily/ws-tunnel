const net = require('net')
const Ws = require('ws')
let url = require('url')
require('console-stamp')(console, '[HH:MM:ss.l]')
const getUniqueID = function () {
  function s4 () {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  }
  return s4() + s4() + '-' + s4()
}
const clientID = getUniqueID()

const report = (chain) => {
  console.info('localhost:'.concat(chain.port), '->', chain.remote, '->', chain.dest)
}
const wsRelay = function (socket, remote, dest, uuid, user, testDrop = false) {
//   const address = socket.address()
  let timer
  const c = new Ws(remote + '/' + dest, { headers: { uuid: uuid, client: user } })
  if (testDrop) {
    timer = setTimeout(_ => {
      c.close(1001)
    }, 5000)
  }

  c.on('open', () => {
    console.log('connected')
    socket.on('data', (data) => {
      try {
        c.send(data)
      } catch (error) {
        // console.log('Send to ws Error:',error);
        c.close(1001)
      }
    })
    c.on('message', (data) => {
      try {
        socket.write(data)
      } catch (error) {
        // console.log('Send to Socket Error:',error);
        socket.destrory()
        c.terminate()
      }
    })
  })

  c.on('close', (e) => {
    if (e === 1001 || e === 1006) {
      c.terminate()
      socket.removeAllListeners('data')
      socket.removeAllListeners('close')
      socket.removeAllListeners('error')
      setImmediate(_ => { wsRelay(socket, remote, dest, uuid, user, testDrop) })
    } else {
      socket.end()
    }
  })
  socket.on('close', () => {
    if (undefined !== timer) {
      clearTimeout(timer)
    }
    if (c !== undefined && c.readyState === 1) {
      c.close(1000)
    } else {
      setTimeout((c) => {
        if (c !== undefined) {
          if (c.readyState === 1) c.close(1000)
          else c.terminate(1000)
        }
      }, 1000)
    }
  })
  c.on('error', (e) => {
    //            c.close(1001);
    return 1001
  })
  socket.on('error', (e) => {
    // console.log(e);
    if (c !== undefined && c.readyState === 1) {
      c.close()
    } else {
      setInterval((c) => {
        if (c !== undefined) {
          if (c.readyState === 1) c.close()
          else c.terminate()
        }
      }, 1000)
    }
    socket.destroy()
  })
}

const createServer = (port, remote, dest, testDrop) => {
  const tcp = net.createServer((socket) => {
    wsRelay(socket, remote, dest, getUniqueID(), clientID, testDrop)
  })
  tcp.listen(port)
}
const createReverseRelayTCP = (protocol, localPort, localAddr, remote, dest) => {
  const c = new Ws(remote.concat('/', dest))
  const local = new net.Socket()
  let localConnected
  c.on('open', () => {
    localConnected = false
    c.on('message', (data) => {
      if (!localConnected) {
        local.connect(localPort, localAddr)
      }
      local.write(data)
    })
    local.on('connect', () => {
      localConnected = true
    })
    c.on('error', (e) => {
      console.log(e)
      c.close()
    })
    local.on('error', (e) => {
      localConnected = false
      console.log(e)
      local.end()
    })

    local.on('data', (data) => {
      c.send(data)
    })

    c.on('close', () => {
      local.end()
      createReverseRelayTCP(protocol, localPort, localAddr, remote, dest)
    })
    local.on('close', () => {
      localConnected = false
      c.close()
    })
  })
}
const createServers = (array) => {
  array.forEach((item) => {
    if (!item.reverse) {
      createServer(item.port, item.remote, item.dest, item.testDrop)
    } else if (item.reverse) {
      url = new URL(item.localAddr)
      const protocol = url.protocol
      const localport = url.port
      const localAddr = url.hostname
      createReverseRelayTCP(protocol, localport, localAddr, item.remote, item.dest)
    }
    report(item)
  })
}

try {
  const { patch } = require('../config/local.js')
  createServers(patch)
  // http://blog.cuicc.com/blog/2017/03/26/nodejs-ECONNRESET/
  process.on('uncaughtException', function (err) {
    console.log(err.stack)
    console.log('NOT exit...')
  })
} catch (error) {
  console.log(error)
}
