const fs = require("fs");
const request = require("request-promise");
const $ = require("cheerio");
const SocksProxyAgent = require("socks-proxy-agent");

const { appendFileAsync, createFolder } = require("./helpers.js");

const proxyListUrl = "http://www.gatherproxy.com/sockslist";

class Proxy {
  constructor() {
    this.blacklist = [];
  }
  /**
   * Gets a list of available free socks proxy servers from
   * http://www.gatherproxy.com/sockslist which has been up
   * since 2013 and seemed pretty stable, no design changes etc.
   *
   * TODO: Want to sort them by response time reverse :).
   *
   * @returns Array - Array of proxy items
   */
  async getProxyList() {
    if (this.proxyList) {
      return this.proxyList.filter(
        proxy => !this.blacklist.includes(proxy.connString)
      );
    }

    const proxyList = [];
    const response = await request(proxyListUrl);

    // Get table rows
    const tableRows = $("#tblproxy tr", response);

    // Data
    tableRows.each((i, row) => {
      // The first 2 rows are headings and ads
      if (i < 2) return;

      const rowData = [];
      $("td", row).each((i, col) => {
        rowData.push($(col).text() || $(col).html());
      });

      const [, ipAddress, port, , , protocol, responseTimes] = rowData;
      /**
       * IP address and port are both stored in a strange script tag
       * I think to make it harder to scrape, I guess if they change
       * it will break, but seems fine for now, pretty simple regex.
       *
       * Possible socks Num formats are currently: "socks4", "socks4/5", "socks5".
       */
      const proxy = {
        ipAddress: ipAddress.match(/([0-9]+\.?)+/g)[0],
        port: port.match(/([0-9])+/g)[0],
        protocol: "socks" + protocol.match(/([0-9]+)/g).reverse()[0],
        responseTime: +responseTimes.match(/([0-9])+/g)[0]
      };
      proxy.connString = `${proxy.protocol}://${proxy.ipAddress}:${proxy.port}`;

      proxyList.push(proxy);
    });

    this.proxyList = proxyList
      .sort((a, b) => a.responseTime - b.responseTime)
      .filter(proxy => !this.blacklist.includes(proxy.connString));

    return this.proxyList;
  }

  async getProxy() {
    if (!this.proxy || this.blacklist.includes(this.proxy.connString)) {
      const proxyList = await this.getProxyList();
      // Order by shortest response time
      this.proxy = proxyList[0];
    }

    return this.proxy.connString;
  }

  async blacklistProxy(connString) {
    this.blacklist.push(connString);

    if (this.proxy.connString === connString) {
      this.getProxy();
    }
  }
}

module.exports = new Proxy();
