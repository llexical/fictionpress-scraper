const fs = require("fs");
const request = require("request-promise");
const { getProxyList } = require("../proxy");

const proxyListHtml = require("./fixtures/proxyListHtml");

jest.mock("request-promise");
request.mockImplementation(async () => proxyListHtml);

describe("proxy :: getProxyList", () => {
  it("should get an array of proxies", async () => {
    const proxyList = await getProxyList();

    expect(proxyList).toBeInstanceOf(Array);
    expect(proxyList.length).toBeGreaterThan(0);
  });

  describe("each proxy item", () => {
    let proxy;

    beforeAll(async () => {
      const proxyList = await getProxyList();
      proxy = proxyList[0];
    });

    it("should have ip address", () => {
      expect(proxy).toHaveProperty("ipAddress");
    });

    it("should have port", () => {
      expect(proxy).toHaveProperty("port");
    });

    it("should have socks protocol", () => {
      expect(proxy).toHaveProperty("protocol");
    });

    it("should have response times", () => {
      expect(proxy).toHaveProperty("responseTimes");
    });
  });
});
