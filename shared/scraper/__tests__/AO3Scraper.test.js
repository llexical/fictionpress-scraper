const fs = require("fs");
const request = require("request-promise");
const $ = require("cheerio");
const AO3Scraper = require("../AO3Scraper");
const proxy = require("../../proxy");
const helpers = require("../../helpers");

const metaFixture = require("./fixtures/ao3Meta.fixture");
const pageFixture = require("./fixtures/ao3Page.fixture");
const storyHtmlFixture = "<html></html>";

const storyId = 1762113;
let scraper;

jest.mock("request-promise");
jest.mock("../../proxy");

describe("AO3Scraper :: url", () => {
  beforeEach(() => {
    scraper = new AO3Scraper(storyId);
  });

  it("should return a string", () => {
    const url = scraper.url(1);
    expect(typeof url).toBe("string");
  });

  it("should match the expected url", () => {
    const url = scraper.url(1);
    expect(url).toBe(
      "https://archiveofourown.org/works/1762113?view_full_work=true"
    );
  });
});

describe("AO3Scraper :: requestPage", () => {
  beforeEach(() => {
    scraper = new AO3Scraper(storyId);
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
        await scraper.requestPage();
      } catch (e) {
        expect(request).toBeCalledTimes(6);
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});

describe("AO3Scraper :: getChapters", () => {
  beforeEach(() => {
    scraper = new AO3Scraper(storyId);
  });

  it("should return an array", () => {
    const chapters = scraper.getChapters(pageFixture);
    expect(Array.isArray(chapters)).toBe(true);
  });

  it("should return an array the length of the number of chapters", () => {
    const chapters = scraper.getChapters(pageFixture);
    expect(chapters.length).toBe(9);
  });

  it("should return empty array if it cannot find the chapters", () => {
    const chapters = scraper.getChapters(`<html></html>`);
    expect(chapters).toEqual([]);
  });

  describe.only("a single chapter", () => {
    let chapter;
    beforeEach(() => {
      [chapter] = scraper.getChapters(pageFixture);
    });

    it("should return a string", () => {
      expect(typeof chapter).toBe("string");
    });

    it("should have added a h2 with the chapter name", () => {
      const heading = $("h2.chapter", chapter);
      expect(heading.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("AO3Scraper :: getStoryMeta", () => {
  beforeAll(async () => {
    scraper = new AO3Scraper(storyId);
    // No point doing this more than we have to xD
    scraper.getStoryMeta(pageFixture);
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

describe("AO3Scraper :: saveStory", () => {
  beforeEach(async () => {
    scraper = new AO3Scraper(storyId);
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
      `./tmp/ao3-${storyId}.html`,
      storyHtmlFixture
    );
  });

  it("should return the html file path", async () => {
    const filepath = await scraper.saveStory(storyHtmlFixture);
    expect(filepath).toBe(`./tmp/ao3-${storyId}.html`);
  });
});

describe("AO3Scraper :: getStory", () => {
  beforeEach(() => {
    scraper = new AO3Scraper(storyId);
    scraper.pageCount = 2;
    scraper.meta.title = "Hi";
    scraper.meta.authors = ["Andy Lane"];
    scraper.meta.comments = "Some kinda desc here";

    scraper.getStoryMeta = jest.fn(async () => true);
    scraper.getChapter = jest.fn(async () => storyHtmlFixture);
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
    expect(scraper.getChapter).toBeCalled();
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
    scraper.getChapter = jest.fn(async () => {
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
