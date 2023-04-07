const http = require('http')
const setup = require('proxy')

const server = setup(http.createServer())
server.listen(3128, function () {
  const address = server.address()
  if (!address) { throw new Error('something went wrong') }
  if (typeof address === 'string') {
    console.log('HTTP(s) proxy server listening on ' + address)
    return
  }
  console.log('HTTP(s) proxy server listening on port %d', address.port)
})
