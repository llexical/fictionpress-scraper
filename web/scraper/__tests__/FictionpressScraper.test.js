const fs = require("fs");
const request = require("request-promise");
const $ = require("cheerio");
const FictionpressScraper = require("../FictionpressScraper");
const proxy = require("../../proxy");
const helpers = require("../../helpers");

const pageFixture = require("./fixtures/page.fixture");
const metaFixture = require("./fixtures/meta.fixture");
const storyHtmlFixture = "<html></html>";

const storyId = 12345;
let scraper;

jest.mock("request-promise");
jest.mock("../../proxy");

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

describe("FictionpressScraper :: requestPage", () => {
  beforeEach(() => {
    scraper = new FictionpressScraper(storyId);
    proxy.getProxy.mockImplementation(async () => "socks4://0.0.0.0:3452");
    request.mockImplementation(async () => pageFixture);
  });

  it("should return a string", async () => {
    const page = await scraper.requestPage(1);
    expect(typeof page).toBe("string");
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
      await scraper.requestPage(1);
      expect(request).toBeCalledTimes(2);
    });

    it("should blacklist the current proxy", async () => {
      await scraper.requestPage(1);
      expect(proxy.blacklistProxy).toBeCalledTimes(1);
    });

    it("should not throw an error", async () => {
      await expect(scraper.requestPage(1)).resolves.not.toThrow();
    });

    it("should return a string", async () => {
      const page = await scraper.requestPage(1);
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
      await expect(scraper.requestPage(1)).rejects.toThrow();
    });

    it("should retry the request until the retry limit (5)", async () => {
      try {
        await scraper.requestPage(1);
      } catch (e) {
        expect(request).toBeCalledTimes(6);
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});

describe("FictionpressScraper :: getPage", () => {
  beforeEach(() => {
    scraper = new FictionpressScraper(storyId);
    scraper.requestPage = jest.fn(async () => pageFixture);
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

  it("should return false if it cannot find the story text", async () => {
    scraper.requestPage = jest.fn(async () => `<html></html>`);
    const page = await scraper.getPage(1);

    expect(page).toBeFalsy();
  });
});

describe("FictionpressScraper :: getStoryMeta", () => {
  beforeAll(async () => {
    scraper = new FictionpressScraper(storyId);
    scraper.requestPage = jest.fn(async () => pageFixture);
    // No point doing this more than we have to xD
    await scraper.getStoryMeta();
  });

  it("should get the page count", () => {
    expect(scraper.pageCount).toBe(2);
  });

  it("should get the story title", () => {
    expect(scraper.meta.title).toBe(metaFixture.title);
  });

  it("should get the story author", () => {
    expect(scraper.meta.authors).toEqual([metaFixture.author]);
  });

  it("should get the story description", () => {
    expect(scraper.meta.comments).toBe(metaFixture.description);
  });
});

describe("FictionpressScraper :: saveStory", () => {
  beforeEach(async () => {
    scraper = new FictionpressScraper(storyId);
    fs.writeFileSync = jest.fn();
    helpers.createFolder = jest.fn();
  });

  it("should create the output folder", async () => {
    await scraper.saveStory(storyHtmlFixture);
    expect(helpers.createFolder).toBeCalled();
  });

  it("should save the HTML to a html file", async () => {
    await scraper.saveStory(storyHtmlFixture);
    expect(fs.writeFileSync).toBeCalledWith(
      `./tmp/${storyId}.html`,
      storyHtmlFixture
    );
  });

  it("should return the html file path", async () => {
    const filepath = await scraper.saveStory(storyHtmlFixture);
    expect(filepath).toBe(`./tmp/${storyId}.html`);
  });
});

describe("FictionpressScraper :: getStory", () => {
  beforeEach(() => {
    scraper = new FictionpressScraper(storyId);
    scraper.meta.title = "Hi";
    scraper.meta.authors = ["Andy Lane"];
    scraper.meta.comments = "Some kinda desc here";

    scraper.getStoryMeta = jest.fn(async () => true);
    scraper.getPage = jest.fn(async () => storyHtmlFixture);
    scraper.saveStory = jest.fn(async () => `./tmp/${storyId}.html`);
  });

  it("should return story meta", async () => {
    const { meta } = await scraper.getStory();

    expect(scraper.getStoryMeta).toBeCalled();
    expect(meta).toEqual({
      title: "Hi",
      authors: ["Andy Lane"],
      comments: "Some kinda desc here",
      publisher: "fictionpress.com"
    });
  });

  it("should get the stories pages", async () => {
    await scraper.getStory();
    expect(scraper.getPage).toBeCalled();
  });

  it("should return the story filepath", async () => {
    const { filepath } = await scraper.getStory();
    expect(filepath).toBe(`./tmp/${storyId}.html`);
  });

  it("should throw an error if it fails to get story meta info", async () => {
    scraper.getStoryMeta = jest.fn(async () => {
      throw new Error();
    });
    await expect(scraper.getStory()).rejects.toThrow();
  });

  it("should throw an error if it cannot get the pages", async () => {
    scraper.getPage = jest.fn(async () => {
      throw new Error();
    });
    await expect(scraper.getStory()).rejects.toThrow();
  });

  it("should throw an error if it cannot save the story html file", async () => {
    scraper.saveStory = jest.fn(async () => {
      throw new Error();
    });
    await expect(scraper.getStory()).rejects.toThrow();
  });
});
