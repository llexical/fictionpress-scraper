/**
 * NOTE: Need to add calibre cli tools to PATH for this to work.
 */
const fs = require("fs");
const CliProgress = require("cli-progress");
const program = require("commander");
const FPScraper = require("../shared/scraper/FictionpressScraper");
const AO3Scraper = require("../shared/scraper/AO3Scraper");
const calibre = require("../shared/calibre");
const config = require("../config");

const { createFolder } = require("../shared/helpers");

const tmpFolder = config.TMP_FOLDER;
const outputFolder = config.OUTPUT_FOLDER;

// Error handling
const errorFileName = `./errors-${Date.now()}.json`;
const errors = [];

// Site Scrapers
const scrapers = {
  fp: FPScraper,
  ao3: AO3Scraper
};

// Setup Progress bar
const progressBar = new CliProgress.Bar({}, CliProgress.Presets.shades_classic);

program
  .version("0.1.0")
  .option(
    "-s, --site [name]",
    "Website this script should be scraping (ao3 or fp)"
  )
  .parse(process.argv);

async function getStory(storyId, { Scraper }) {
  let page = 0;
  const scraper = new Scraper(storyId, { outputFolder: tmpFolder });
  progressBar.start(100, 0);

  const { meta, filepath } = await scraper.getStory();

  progressBar.update(80);

  // Convert to an AW3 file
  createFolder(outputFolder);
  const outputFile = `${outputFolder}/${meta.title} - ${storyId}.azw3`;
  await calibre.ebookConvert(filepath, outputFile, meta);

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
    // Validtion
    const [storyId] = program.args;
    if (!storyId) throw new Error("Story ID is required");

    if (!Object.keys(scrapers).includes(program.site))
      throw new Error(
        "The site parameter is required and must be either ao3 or fp"
      );

    await getStory(storyId, {
      Scraper: scrapers[program.site]
    });
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
