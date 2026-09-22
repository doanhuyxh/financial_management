module.exports = {
  apps: [
    {
      name: 'finance-management-web',

      script: './node_modules/next/dist/bin/next',
      args: 'start',
      exec_mode: 'cluster',
      instances: "max",

      wait_ready: true,
      autorestart: true,
      restart_delay: 5000,
      listen_timeout: 15000,
      kill_timeout: 5000,

      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Ho_Chi_Minh',
        PORT: 3004,
      },

      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // ===== RESTART PROTECTION =====
      max_restarts: 10,
      min_uptime: '60s',

    },
  ],
};
