module.exports = {
  apps: [
    {
      name: 'wstunnelHttpServer',
      max_memory_restart: '300M',
      script: 'npm start server',
      // out_file: "/var/logs/nova_out.log",
      // error_file: "/var/logs/nova_error.log",
      instances: 1,
      watch: true,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'Sock5_Server',
      max_memory_restart: '100M',
      script: 'npm start socks5Server',
      // out_file: "/var/logs/nova_out.log",
      // error_file: "/var/logs/nova_error.log",
      instances: 2,
      watch: true,
      exec_mode: 'cluster'
    }
  ]
}
