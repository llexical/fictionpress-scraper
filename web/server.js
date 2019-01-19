"use strict";

const express = require("express");
const convertApi = require("./convert/routes");

// Constants
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

// App
const app = express();
app.use("/api/convert", convertApi);

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
