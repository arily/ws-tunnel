/* eslint-disable camelcase */
const report = true
module.exports = function (chain) {
  let id = chain.srcId
  const status = (status) => {
    switch (status) {
      case 0:
        return '<-x->'
      case 1:
        return '<--->'
      case -1:
        return '<-S->'
      default:
        return '<-?->'
    }
  }
  const str_left = status(chain.srcConnection)
  const str_right = status(chain.dstConnection)
  const localaddr = (chain.localAddress !== undefined) ? ' | '.concat(chain.localAddress) : '(x.x.x.x)'
  const localport = (chain.localPort !== undefined) ? chain.localPort : 'xxxxx'
  const server_connection = chain.serverName.concat(localaddr, ':', localport)
  let dst = chain.dstAddr.concat(':', chain.dstPort)
  if (!chain.srcConnection) {
    id = '00000000-0000'
  }
  if (!chain.dstConnection) {
    dst = 'detached'
  }
  if (report === true) {
    console.log(id, str_left, server_connection, str_right, dst)
  }
}
