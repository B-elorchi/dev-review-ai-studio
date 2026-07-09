module.exports = {
  apps: [
    {
      name: "devreview-frontend",
      script: "npm",
      args: "run preview",
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
