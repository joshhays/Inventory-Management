require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const app = require("./app");
const env = require("./config/env");

app.listen(env.port, () => {
  console.log(`Inventory API listening on port ${env.port}`);
});
