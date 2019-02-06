const fs = require("fs");
const request = require("request-promise");
const $ = require("cheerio");
const SocksProxyAgent = require("socks-proxy-agent");
const helpers = require("../helpers");

const proxy = require("../proxy");

class AO3Scraper {
  /**
   *
   * @param {*} storyId
   * @param {*} param1
   */
  constructor(storyId, { outputFolder = "./tmp", retryLimit = 5 } = {}) {
    this.storyId = storyId;
    this.outputFolder = outputFolder;
    this.retryLimit = retryLimit;
    // TODO: Move into getStory not needed in class scope
    this.meta = {
      title: "",
      authors: "",
      comments: "",
      publisher: "https://archiveofourown.org/"
    };
    this.pageCount = 0;
  }

  /**
   * Main function, gets the story and saves it
   * in a html file.
   *
   * Returns an object with meta and the stories
   * html file path.
   */
  async getStory() {
    try {
      // Return the full story
      const pageHTML = await this.requestPage();
      this.getStoryMeta(pageHTML);
      const chapters = this.getChapters(pageHTML);

      // Create summary page
      const summary = `<h2 class="chapter">Summary</h2><p>${
        this.meta.comments
      }</p>`;

      // Save story
      const storyPath = await this.saveStory(summary + chapters.join(""));

      // Return all info required to turn into a book :D
      return {
        meta: this.meta,
        filepath: storyPath
      };
    } catch (e) {
      throw new Error("There were errors downloading the story");
    }
  }

  /**
   * Saves the story as a html file
   *
   * @param {string} storyHtml
   */
  async saveStory(storyHtml) {
    const htmlPath = `${this.outputFolder}/ao3-${this.storyId}.html`;
    // Create output folder if it doesn't exist
    helpers.createFolder(this.outputFolder);
    // Write html file for story
    fs.writeFileSync(htmlPath, storyHtml);
    return htmlPath;
  }

  /**
   * Finds & stores the stories meta information
   */
  async getStoryMeta(pageHTML) {
    this.meta.title = $(".preface h2.title", pageHTML)
      .text()
      .trim();

    this.meta.authors = [$(".preface a[rel='author']", pageHTML).text()];

    this.meta.comments = [];
    $(".preface > .summary p", pageHTML).each((i, elem) =>
      this.meta.comments.push(
        $(elem)
          .text()
          .trim()
      )
    );
    this.meta.comments = this.meta.comments.join("\n\n");
  }

  /**
   * Gets the chapters from the page html
   * and returns the chapter html.
   *
   * @param {int} num
   */
  getChapters(pageHTML) {
    const chaptersHTML = [];

    $("#chapters > .chapter", pageHTML).each((index, elem) => {
      chaptersHTML.push($(elem).html());
    });

    // Exit out of there are not any more pages!
    if (!chaptersHTML) return false;

    return chaptersHTML.map(chapterHTML => {
      const chapterName = $("h3.title", chapterHTML).text();
      const notes = $("#notes .userstuff", chapterHTML).html();
      const html = $("div[role='article'].userstuff", chapterHTML).html();

      const htmlChapter = `<h2 class="chapter">${chapterName}</h2>`;
      const htmlNotes = `<p><b>Notes: ${notes}</b></p>`;

      return htmlChapter + htmlNotes + html;
    });
  }

  /**
   * Returns the full page url for the story.
   * @param {int} page
   */
  url() {
    return `https://archiveofourown.org/works/${
      this.storyId
    }?view_adult=true&view_full_work=true`;
  }

  /**
   * Gets a single story page from fictionpress.
   * Handles proxy agents and retries.
   *
   * @param {int} num
   * @param {int} retries
   */
  async requestPage(retries = 0) {
    // Setup Proxy
    const proxyUrl = await proxy.getProxy();

    try {
      const page = await request({
        uri: this.url(),
        agent: new SocksProxyAgent(proxyUrl),
        rejectUnauthorized: false,
        requestCert: true,
        timeout: 10000
      });
      return page;
    } catch (e) {
      // throw error if over the retry limit
      if (retries >= this.retryLimit) throw e;

      proxy.blacklistProxy(proxyUrl);
      return this.requestPage(retries + 1);
    }
  }
}

module.exports = AO3Scraper;
