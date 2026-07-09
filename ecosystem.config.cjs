module.exports = {
  apps: [
    {
      name: "devreview-frontend",
      script: "./node_modules/vite/bin/vite.js",
      args: "preview --host",
      cwd: "./",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
