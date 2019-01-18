const request = require("request-promise");
const $ = require("cheerio");
const SocksProxyAgent = require("socks-proxy-agent");

const proxy = require("../proxy");

class FictionpressScraper {
  constructor(storyId) {
    this.storyId = storyId;
    this.retryLimit = 5;
  }

  url(page) {
    return `https://www.fictionpress.com/s/${this.storyId}/${page}`;
  }

  /**
   * Gets the pages from fictionpress.com
   * and returns the chapter html.
   *
   * @param {int} num
   * @param {int} retries
   */
  async getPage(num, retries = 0) {
    // Setup Proxy
    const proxyUrl = await proxy.getProxy();

    try {
      const response = await request({
        uri: this.url(num),
        agent: new SocksProxyAgent(proxyUrl),
        rejectUnauthorized: false,
        requestCert: true
      });

      const html = $("#storytextp", response).html();
      // Exit out of there are not any more pages!
      if (!html) return false;

      const chapter = $("#chap_select option:selected", response)
        .first()
        .text();
      const chapterName = chapter.replace(/^([0-9]+\.)/, "");
      const htmlChapter = `<h2 class="chapter">${chapterName}</h2>`;

      return htmlChapter + html;
    } catch (e) {
      // throw error if over the retry limit
      if (retries >= this.retryLimit) throw e;

      proxy.blacklistProxy(proxyUrl);
      return this.getPage(num, retries + 1);
    }
  }
}

module.exports = FictionpressScraper;
