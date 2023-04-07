// https://github.com/mscdex/socksv5
const socks = require('socksv5')
const wsServerConfig = require('../config/wstunnel').wsServer

const srv = socks.createServer(async function (info, accept, deny) {
  accept()
  const url = `http://${info.srcAddr}:${wsServerConfig.port}/api/report/final`
  fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      src: {
        address: info.srcAddr,
        port: info.srcPort
      },
      get location () {
        switch (info.cmd) {
          case 'connect': {
            return `tcp://${info.dstAddr}:${info.dstPort}`
          }
          default: {
            return `${info.cmd} ${info.dstAddr}:${info.dstPort}`
          }
        }
      }
    })
  }).catch(console.error)
})
srv.listen(10800, 'localhost', function () {
  console.log('SOCKS server listening on port 10800')
})

srv.useAuth(socks.auth.UserPassword(function (user, password, cb) {
  // const stat = user === 'nodejs' && password === 'rules!'
  const stat = true
  cb(stat)
}))
