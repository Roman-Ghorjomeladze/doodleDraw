module.exports = {
  apps: [
    {
      name: 'doodledraw',
      script: 'apps/server/dist/main.js',
      cwd: '/opt/doodledraw',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        CORS_ORIGIN: 'https://doodledraw.games',
        ADMIN_USERNAME: 'admin',
        ADMIN_PASSWORD: 'changeme',
      },
    },
  ],
};
