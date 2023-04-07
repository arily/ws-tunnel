module.exports = {
  apps: [
    {
      name: 'LocalListener',
      max_memory_restart: '100M',
      script: 'npm start client',
      // out_file: "/var/logs/nova_out.log",
      // error_file: "/var/logs/nova_error.log",
      instances: 1,
      watch: true,
      exec_mode: 'cluster'
    }
  ]
}
