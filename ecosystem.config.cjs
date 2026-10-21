module.exports = {
  apps: [
    {
      name: "fxgh-lapius7",
      script: "src/server.ts",
      interpreter: "bun",
      cwd: __dirname,
      max_memory_restart: "600M",
    },
  ],
};
