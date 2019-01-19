require("dotenv").config();

module.exports = {
  STORY_ID: process.env.STORY_ID,
  TMP_FOLDER: process.env.TMP_FOLDER || "./tmp",
  OUTPUT_FOLDER: process.env.OUTPUT_FOLDER || "./output"
};
