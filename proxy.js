const fs = require("fs");
const request = require("request-promise");
const $ = require("cheerio");
const SocksProxyAgent = require("socks-proxy-agent");

const { appendFileAsync, createFolder } = require("./helpers.js");

const proxyListUrl = "http://www.gatherproxy.com/sockslist";

/**
 * Gets a list of available free socks proxy servers from
 * http://www.gatherproxy.com/sockslist which has been up
 * since 2013 and seemed pretty stable, no design changes etc.
 *
 * TODO: Want to sort them by response time reverse :).
 *
 * @returns Array - Array of proxy items
 */
async function getProxyList() {
  const proxyList = [];
  const response = await request(proxyListUrl);

  // Get table rows
  const tableRows = $("#tblproxy tr", response);

  // Data
  tableRows.each((i, row) => {
    // The first 2 rows are headings and ads
    if (i <= 2) return;

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
    proxyList.push({
      ipAddress: ipAddress.match(/([0-9]+\.?)+/g)[0],
      port: port.match(/([0-9])+/g)[0],
      protocol: "SOCKS" + protocol.match(/([0-9]+)/g).reverse()[0],
      responseTimes: responseTimes.match(/([0-9])+/g)[0]
    });
  });

  return proxyList;
}

module.exports = {
  getProxyList
};
