module.exports = {
  apps: [
    {
      name: "devreview-frontend",
      script: "./node_modules/.bin/vite",
      args: "preview --host",
      cwd: "./",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      }
    }
  ]
};
