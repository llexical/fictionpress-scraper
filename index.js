/**
 * NOTE: Need to add calibre cli tools to PATH for this to work.
 */
require("dotenv").config();
const fs = require("fs");
const request = require("request-promise");
const $ = require("cheerio");
const CliProgress = require("cli-progress");
const SocksProxyAgent = require("socks-proxy-agent");

const { appendFileAsync, execAsync, createFolder } = require("./helpers.js");

const storyId = process.env.STORY_ID;
const tmpFolder = process.env.TMP_FOLDER || "./tmp";
const outputFolder = process.env.OUTPUT_FOLDER || "./output";

// Setup Proxy
const proxyUrl = "socks4://38.84.132.236:42187";
var agent = new SocksProxyAgent(proxyUrl);

// Setup Progress bar
const progressBar = new CliProgress.Bar({}, CliProgress.Presets.shades_classic);

const url = page => `https://www.fictionpress.com/s/${storyId}/${page}`;
const storyFolder = `${tmpFolder}/${storyId}`;
const meta = {
  title: "",
  authors: "",
  comments: "",
  pubdate: "",
  publisher: "fictionpress.com"
};
let pageCount = 0;
let progressIncrement = 0;

// Create temp & output folders
createFolder(tmpFolder);
createFolder(outputFolder);

async function getPage(num, storyFolder) {
  try {
    response = await request({ uri: url(num), agent });

    const html = $("#storytextp", response).html();
    // Exit out of there are not any more pages!
    if (!html) return false;

    const chapter = $("#chap_select option:selected", response)
      .first()
      .text();
    const chapterName = chapter.replace(/^([0-9]+\.)/, "");
    htmlChapter = `<h2 class="chapter">${chapterName}</h2>`;

    progressBar.update(progressBar.value + progressIncrement);
    return htmlChapter + html;
  } catch (e) {
    console.error(e);
  }
}

async function writeHTMLFile(pages) {
  const summary = `<h2 class="chapter">Summary</h2><p>${meta.comments}</p>`;
  await appendFileAsync(`${storyFolder}/index.html`, summary + pages.join(""));
}

async function getStoryMeta() {
  try {
    response = await request({ uri: url(1), agent });

    pageCount = $("#chap_select", response)
      .first()
      .children().length;

    meta.title = $("#profile_top > b", response).text();
    meta.authors = [$("#profile_top > a", response).text()];
    meta.comments = $("#profile_top > div", response).text();
  } catch (e) {
    console.error(e);
  }
}

async function convertStory(outputFile) {
  const htmlFile = `${tmpFolder}/${storyId}/index.html`;

  const options = {
    ...meta
  };
  const optionsString = Object.keys(options).reduce(
    (acc, key) => (acc += ` --${key} "${options[key]}"`),
    ""
  );

  await execAsync(
    `ebook-convert "${htmlFile}" "${outputFile}" ${optionsString}`
  );
}

async function getStory() {
  let page = 0;
  const fetchPages = [];
  progressBar.start(100, 0);

  // Create story folder if does not exist
  createFolder(storyFolder);

  // Reset index.html if does exist
  if (fs.existsSync(`${storyFolder}/index.html`)) {
    fs.writeFileSync(`${storyFolder}/index.html`, "");
  }

  // Get story meta info i.e. author, title
  await getStoryMeta();

  // Set the progress increments and update
  progressIncrement = Math.floor(100 / (pageCount + 3));
  progressBar.update(progressBar.value + progressIncrement);

  // Gets all the pages
  while (page <= pageCount) {
    page++;
    fetchPages.push(getPage(page, storyFolder));
  }
  const pages = await Promise.all(fetchPages);

  // Writes pages to a html file
  // (can't write earlier or they wont be in order xD)
  await writeHTMLFile(pages);
  progressBar.update(progressBar.value + progressIncrement);

  // Convert to an AW3 file
  const outputFile = `${outputFolder}/${meta.title} - ${storyId}.azw3`;
  await convertStory(outputFile);
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

try {
  getStory();
} catch (e) {
  progressBar.stop();
  console.log(e);
}
