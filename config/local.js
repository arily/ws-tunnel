module.exports = {
  patch: [
    { port: 12223, addr: 'localhost', dest: 'prefab://localhost.ssh', remote: 'ws://localhost:5001' },
    { port: 8080, addr: '0.0.0.0', dest: 'prefab://localhost.socks_proxy', remote: 'ws://localhost:5001' }
  ]
}
