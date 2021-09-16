module.exports = {
  patch: [
    { port: 12223, address: 'localhost', dest: 'prefab://localhost.ssh', remote: 'ws://localhost:5001' },
    { port: 8080, address: '0.0.0.0', dest: 'prefab://localhost.socks_proxy', remote: 'ws://localhost:5001' },
    { port: 1345, address: '0.0.0.0', dest: 'tcp://localhost:3128', remote: 'wss://localhost:5001' }
  ]
}
