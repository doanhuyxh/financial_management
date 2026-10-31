module.exports = {
  apps: [
    {
      name: 'finance-management-web',

      script: './node_modules/next/dist/bin/next',
      args: 'start',
      // 1 instance thì fork ổn định hơn cluster (không qua lớp cluster của PM2).
      exec_mode: 'fork',
      instances: 1,

      autorestart: true,
      // Crash liên tục thì giãn dần thời gian restart thay vì restart dồn dập.
      exp_backoff_restart_delay: 1000,
      kill_timeout: 5000,
      // Rò rỉ bộ nhớ thì tự restart trước khi server bị treo/OOM.
      max_memory_restart: '1G',

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
