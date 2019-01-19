const express = require("express");
const router = express.Router();

const { getFictionpress } = require("./views");

// define the home page route
router.get("/fictionpress/:storyId", getFictionpress);

module.exports = router;
