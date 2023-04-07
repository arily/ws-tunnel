/* eslint-disable camelcase */
const report = true
module.exports = (chain) => {
  let id = chain.src.id
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
  const str_left = status(chain.src.connection)
  const str_right = status(chain.dst.connection)
  const localaddress = (chain.gate.address !== undefined) ? ' | '.concat(chain.gate.address) : '(x.x.x.x)'
  const localport = (chain.gate.port !== undefined) ? chain.gate.port : 'xxxxx'
  const server_connection = chain.gate.name.concat(localaddress, ':', localport)
  let dst = chain.dst.address.concat(':', chain.dst.port)
  if (!chain.src.connection) {
    id = '00000000-0000'
  }
  if (!chain.dst.connection) {
    dst = 'detached'
  }
  if (report === true) {
    console.log(id, str_left, server_connection, str_right, dst)
  }
}
