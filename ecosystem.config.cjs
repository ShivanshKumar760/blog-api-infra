module.exports = {
  apps: [
    {
      name: 'blog-api',
      script: 'src/server.js',
      cwd: '/opt/blog-api',
      exec_mode: 'cluster',
      instances: 'max', // one worker per vCPU
      max_memory_restart: '400M',
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        ENV_FILE: '/etc/blog-api/.env', // written by cloud-init at boot
      },
    },
  ],
};
