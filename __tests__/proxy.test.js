const fs = require("fs");
const request = require("request-promise");
const proxy = require("../proxy");

const proxyListFixture = require("./fixtures/proxyList.fixture");
const proxyListHtml = require("./fixtures/proxyListHtml.fixture");

jest.mock("request-promise");
request.mockImplementation(async () => proxyListHtml);

describe("proxy :: getProxyList", () => {
  it("should get an array of proxies", async () => {
    const proxyList = await proxy.getProxyList();

    expect(proxyList).toBeInstanceOf(Array);
    expect(proxyList.length).toBeGreaterThan(0);
  });

  describe("each proxy item", () => {
    let proxyObj;

    beforeAll(async () => {
      const proxyList = await proxy.getProxyList();
      proxyObj = proxyList[0];
    });

    it("should have ip address", () => {
      expect(proxyObj).toHaveProperty("ipAddress");
    });

    it("should have port", () => {
      expect(proxyObj).toHaveProperty("port");
    });

    it("should have socks protocol", () => {
      expect(proxyObj).toHaveProperty("protocol");
    });

    it("should have response time", () => {
      expect(proxyObj).toHaveProperty("responseTime");
    });

    it("should be the same as if a human extracted the data", () => {
      expect(proxyObj).toEqual(proxyListFixture[0]);
    });
  });
});

describe("proxy :: getProxy", () => {
  beforeEach(async () => {
    proxy.getProxyList = jest.fn(async () => proxyListFixture);
    proxy.proxy = null; // clear the proxy cache
  });

  it("should return a single proxy connection string", async () => {
    const proxyString = await proxy.getProxy();

    expect(proxy.getProxyList).toBeCalledTimes(1);
    expect(proxyString).toEqual("socks5://37.59.8.29:19571");
  });

  it("should return the same result from the cache", async () => {
    await proxy.getProxy();
    const proxyString = await proxy.getProxy();

    expect(proxy.getProxyList).toBeCalledTimes(1);
    expect(proxyString).toEqual("socks5://37.59.8.29:19571");
  });
});
