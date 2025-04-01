module.exports = {
    apps: [
      {
        name: "whatsapp-bot",
        script: "lib/entrypoints/whatsapp.ts",
        interpreter: "ts-node",
        watch: false,
        env: {
          NODE_ENV: "production",
          DEBUG: "false", // Cambialo a "true" si querés logs en consola
        },
      },
    ],
  };
  