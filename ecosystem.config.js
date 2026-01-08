module.exports = {
  apps: [
    {
      name: "jsonrock-prod",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        ...process.env,
        PORT: 3004,
      },
    },
    {
      name: "jsonrock-dev",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        ...process.env,
        PORT: 3003,
      },
    },
  ],
};
