const fs = require("fs");
const request = require("request-promise");
const proxy = require("../proxy");

const proxyListFixture = require("./fixtures/proxyList.fixture.js");
const proxyListHtml = require("./fixtures/proxyListHtml.fixture");

jest.mock("request-promise");
request.mockImplementation(async () => proxyListHtml);

describe("proxy :: getProxyList", () => {
  beforeEach(() => {
    proxy.blacklist = [];
    proxy.proxyList = null;
  });

  it("should get an array of proxies", async () => {
    const proxyList = await proxy.getProxyList();

    expect(proxyList).toBeInstanceOf(Array);
    expect(proxyList.length).toBeGreaterThan(0);
  });

  it("should remove blacklisted proxies from returned array", async () => {
    proxy.blacklist = [
      proxyListFixture[0].connString,
      proxyListFixture[2].connString
    ];

    const proxyList = await proxy.getProxyList();

    expect(proxyList).not.toEqual(
      expect.arrayContaining([expect.objectContaining(proxyListFixture[0])])
    );
    expect(proxyList).not.toEqual(
      expect.arrayContaining([expect.objectContaining(proxyListFixture[2])])
    );
    expect(proxyList.length).toBeGreaterThan(0);
  });

  describe("each proxy item", () => {
    let proxyObj;

    beforeEach(async () => {
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

  describe("with cache", () => {
    beforeEach(() => {
      // Set cache value
      proxy.proxyList = proxyListFixture;
    });

    it("should return the cached proxy list", async () => {
      const proxyList = await proxy.getProxyList();
      expect(proxyList).toEqual(proxyList);
    });
  });
});

describe("proxy :: getProxy", () => {
  beforeEach(async () => {
    proxy.getProxyList = jest.fn(async () => proxyListFixture);
    proxy.proxy = null; // clear the proxy cache
    proxy.proxyList = null;
    proxy.blacklist = [];
  });

  it("should return a single proxy connection string", async () => {
    const proxyString = await proxy.getProxy();

    expect(proxy.getProxyList).toBeCalledTimes(1);
    expect(proxyString).toEqual("socks5://35.185.36.99:1080");
  });

  it("should return the same result from the cache", async () => {
    await proxy.getProxy();
    const proxyString = await proxy.getProxy();

    expect(proxy.getProxyList).toBeCalledTimes(1);
    expect(proxyString).toEqual("socks5://35.185.36.99:1080");
  });

  describe("with cache", () => {
    beforeEach(() => {
      proxy.proxy = proxyListFixture[2];
    });

    it("should return the cached proxy value", async () => {
      const proxyString = await proxy.getProxy();

      expect(proxyString).toEqual(proxyListFixture[2].connString);
    });

    it("should reset the cached proxy value if it is blacklisted", async () => {
      proxy.blacklist = [proxy.proxy.connString];
      const proxyString = await proxy.getProxy();

      expect(proxyString).not.toEqual(proxyListFixture[2].connString);
    });
  });
});
