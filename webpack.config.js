const path = require("path");

module.exports = {
  entry: "./src/main.js",
  output: {
    path: path.resolve(__dirname, "docs/js"),
    filename: "main.js",
  },
  mode: "development",
  watch: true,
};
