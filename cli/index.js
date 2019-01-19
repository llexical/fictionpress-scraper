/**
 * NOTE: Need to add calibre cli tools to PATH for this to work.
 */
const fs = require("fs");
const CliProgress = require("cli-progress");
const FictionpressScraper = require("../shared/scraper/FictionpressScraper");
const config = require("../config");

const { execAsync, createFolder } = require("../shared/helpers");

const storyId = config.STORY_ID;
const tmpFolder = config.TMP_FOLDER || "./tmp";
const outputFolder = config.OUTPUT_FOLDER || "./output";

// Error handling
const errorFileName = `./errors-${Date.now()}.json`;
const errors = [];

// Setup Progress bar
const progressBar = new CliProgress.Bar({}, CliProgress.Presets.shades_classic);

// Create temp & output folders
createFolder(tmpFolder);
createFolder(outputFolder);

async function convertStory(inputFile, outputFile, options) {
  const optionsString = Object.keys(options).reduce(
    (acc, key) => (acc += ` --${key} "${options[key]}"`),
    ""
  );

  await execAsync(
    `ebook-convert "${inputFile}" "${outputFile}" ${optionsString}`
  );
}

async function getStory() {
  let page = 0;
  const scraper = new FictionpressScraper(storyId);
  progressBar.start(100, 0);

  const { meta, filepath } = await scraper.getStory();

  progressBar.update(80);

  // Convert to an AW3 file
  const outputFile = `${outputFolder}/${meta.title} - ${storyId}.azw3`;
  await convertStory(filepath, outputFile, meta);

  progressBar.update(100);
  progressBar.stop();

  console.log(`
      Downloaded & converted successfully!

      Title: ${meta.title}
      Authors: ${meta.authors.join(",")}
      Chapters: ${page - 1}
      Summary: ${meta.comments}
      
      Saved to: ${outputFile}
    `);
}

async function getStoryRunner() {
  try {
    await getStory();
  } catch (e) {
    progressBar.stop();

    errors.push(e);
    fs.writeFileSync(errorFileName, JSON.stringify(errors));

    console.log(`
      ${e.message}
  
      ${errors.length ? `For more information view: ${errorFileName}.` : ""}
    `);
  }
}

getStoryRunner();
