// PM2 ecosystem configuration for FiskAI workers
// https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: "regulatory-truth-pipeline",
      script: "npx",
      args: "tsx src/lib/regulatory-truth/workers/continuous-pipeline.ts",
      cwd: "/home/admin/FiskAI",

      // Restart policy
      autorestart: true,
      max_restarts: 10,
      min_uptime: "60s", // Minimum uptime before considering restart successful (60s window)
      restart_delay: 5000, // 5s delay between restarts

      // Logging
      error_file: "logs/regulatory-pipeline-error.log",
      out_file: "logs/regulatory-pipeline-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true, // Merge logs from cluster instances

      // Environment variables
      env: {
        NODE_ENV: "production",
        PIPELINE_CYCLE_DELAY_MS: "30000", // 30s between cycles
        PIPELINE_PHASE_DELAY_MS: "5000", // 5s between phases
        // DATABASE_URL is passed from system environment
      },

      // Advanced options
      watch: false, // Don't watch files in production
      instances: 1, // Single instance for pipeline worker
      exec_mode: "fork", // Fork mode (not cluster)
      kill_timeout: 10000, // 10s grace period for shutdown
      listen_timeout: 5000, // 5s for app to listen

      // Auto-restart on file changes (disabled in production)
      ignore_watch: ["node_modules", "logs", ".git"],
    },
  ],
}
