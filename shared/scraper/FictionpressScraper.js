const fs = require("fs");
const request = require("request-promise");
const $ = require("cheerio");
const SocksProxyAgent = require("socks-proxy-agent");
const helpers = require("../helpers");

const proxy = require("../proxy");

class FictionpressScraper {
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
      publisher: "fictionpress.com"
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
  async getStory(useProxy=false) {
    let page = 0;
    const fetchPages = [];

    try {
      // Get story meta info i.e. author, title
      await this.getStoryMeta(useProxy);

      // Gets all the pages
      while (page <= this.pageCount) {
        page++;
        fetchPages.push(this.getPage(page, useProxy));
      }
      const pages = await Promise.all(fetchPages);

      // Create summary page
      const summary = `<h2 class="chapter">Summary</h2><p>${
        this.meta.comments
      }</p>`;

      // Save story
      const storyPath = await this.saveStory(summary + pages.join(""));

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
    const htmlPath = `${this.outputFolder}/${this.storyId}.html`;
    // Create output folder if it doesn't exist
    helpers.createFolder(this.outputFolder);
    // Write html file for story
    fs.writeFileSync(htmlPath, storyHtml);
    return htmlPath;
  }

  /**
   * Finds & stores the stories meta information
   */
  async getStoryMeta(useProxy) {
    const pageHTML = await this.requestPage(1, useProxy, false);

    this.pageCount = $("#chap_select", pageHTML)
      .first()
      .children().length;

    this.meta.title = $("#profile_top > b", pageHTML).text();
    this.meta.authors = [$("#profile_top > a", pageHTML).text()];
    this.meta.comments = $("#profile_top > div", pageHTML).text();
  }

  /**
   * Gets the pages from fictionpress.com
   * and returns the chapter html.
   *
   * @param {int} num
   */
  async getPage(num, useProxy) {
    const pageHTML = await this.requestPage(num, useProxy);

    const html = $("#storytextp", pageHTML).html();
    // Exit out of there are not any more pages!
    if (!html) return false;

    const chapter = $("#chap_select option:selected", pageHTML)
      .first()
      .text();
    const chapterName = chapter.replace(/^([0-9]+\.)/, "");
    const htmlChapter = `<h2 class="chapter">${chapterName}</h2>`;

    return htmlChapter + html;
  }

  /**
   * Returns the full page url for the story.
   * @param {int} page
   */
  url(page) {
    return `https://www.fictionpress.com/s/${this.storyId}/${page}`;
  }

  /**
   * Gets a single story page from fictionpress.
   * Handles proxy agents and retries.
   *
   * @param {int} num
   * @param {int} retries
   */
  async requestPage(num, useProxy=false, retries = 0) {
    let proxyUrl = '';

    if (useProxy) {
      // setup proxy -- not working right now xD
      proxyUrl = await proxy.getProxy();
    }

    try {
      const proxyAgent = useProxy ? {agent: new SocksProxyAgent(proxyUrl)} : {};
      const page = await request({
        uri: this.url(num),
        rejectUnauthorized: false,
        requestCert: true,
        timeout: 10000,
        ...proxyAgent
      });
      return page;
    } catch (e) {
      // throw error if over the retry limit
      if (retries >= this.retryLimit) throw e;

      proxy.blacklistProxy(proxyUrl);
      return this.requestPage(num, useProxy, retries + 1);
    }
  }
}

module.exports = FictionpressScraper;
