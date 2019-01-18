const request = require("request-promise");
const $ = require("cheerio");
const FictionpressScraper = require("../FictionpressScraper");
const proxy = require("../../proxy");

const pageFixture = require("./fixtures/page.fixture");

const storyId = 12345;
let scraper;

jest.mock("../../proxy");
jest.mock("request-promise");

describe("FictionpressScraper :: url", () => {
  beforeEach(() => {
    scraper = new FictionpressScraper(storyId);
  });

  it("should return a string", () => {
    const url = scraper.url(1);
    expect(typeof url).toBe("string");
  });

  it("should match the expected url", () => {
    const url = scraper.url(1);
    expect(url).toBe("https://www.fictionpress.com/s/12345/1");
  });
});

describe("FictionpressScraper :: getPage", () => {
  beforeEach(() => {
    scraper = new FictionpressScraper(storyId);
    proxy.getProxy.mockImplementation(async () => "socks4://0.0.0.0:3452");
    request.mockImplementation(async () => pageFixture);
  });

  it("should return a string", async () => {
    const page = await scraper.getPage(1);
    expect(typeof page).toBe("string");
  });

  it("should have added a h2 with the chapter name", async () => {
    const page = await scraper.getPage(1);
    const heading = $("h2.chapter", page);

    expect(heading.length).toBeGreaterThanOrEqual(1);
  });

  describe("if the request fails once", () => {
    beforeEach(() => {
      request
        .mockImplementationOnce(async () => {
          throw new Error("ERRORRR");
        })
        .mockImplementationOnce(async () => pageFixture);
    });

    it("should retry the request", async () => {
      await scraper.getPage(1);
      expect(request).toBeCalledTimes(2);
    });

    it("should blacklist the current proxy", async () => {
      await scraper.getPage(1);
      expect(proxy.blacklistProxy).toBeCalledTimes(1);
    });

    it("should not throw an error", async () => {
      await expect(scraper.getPage(1)).resolves.not.toThrow();
    });

    it("should return a string", async () => {
      const page = await scraper.getPage(1);
      expect(typeof page).toBe("string");
    });
  });

  describe("If all the requests fail", () => {
    beforeEach(() => {
      request.mockImplementation(async () => {
        throw new Error("ERRROORRR");
      });
    });

    it("should throw an error", async () => {
      await expect(scraper.getPage(1)).rejects.toThrow();
    });

    it("should retry the request until the retry limit (5)", async () => {
      try {
        await scraper.getPage(1);
      } catch (e) {
        expect(request).toBeCalledTimes(6);
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
