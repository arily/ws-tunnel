module.exports = {
  patch: [
    { port: 12223, address: 'localhost', dest: 'prefab://localhost.ssh', remote: 'ws://localhost:5001' },
    { port: 8080, address: '0.0.0.0', dest: 'tcp://localhost:10800', remote: 'ws://localhost:5001' },
    { port: 1345, address: '0.0.0.0', dest: 'tcp://localhost:3128', remote: 'ws://localhost:5001' }
  ]
}
