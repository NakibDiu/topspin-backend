const express = require("express");
const app = express();
const port = 5000;
require('dotenv').config()

app.get("/", (req, res) => {
  res.send("Top is spinning");
});

app.listen(port, () => {
  console.log(`Top spin is listening on port ${port}`);
});
