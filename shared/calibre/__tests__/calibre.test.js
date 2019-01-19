const helpers = require("../../helpers");
const calibre = require("../calibre");

const inputFile = "./tmp/1234.html";
const outputFile = "./output/1234.azw3";
const options = {
  title: "Hi",
  comments: "Hey"
};
const optionsStringFixture = `--title "Hi" --comments "Hey"`;

describe("Calibre :: ebookConvert", () => {
  beforeAll(async () => {
    calibre.getOptionsString = jest.fn(() => optionsStringFixture);
    helpers.execAsync = jest.fn();

    await calibre.ebookConvert(inputFile, outputFile, options);
  });

  it("should change the options into a string", () => {
    expect(calibre.getOptionsString).toBeCalled();
  });

  it("Should run the ebook conversion", () => {
    expect(helpers.execAsync).toBeCalledWith(
      `ebook-convert "${inputFile}" "${outputFile}" ${optionsStringFixture}`
    );
  });
});

describe("Calibre :: getOptionsString", () => {
  let optionsString;
  beforeAll(() => {
    optionsString = calibre.getOptionsString(options);
  });
  it("should return a string", () => {
    expect(typeof optionsString).toBe("string");
  });

  it("should prepend -- to each of the keys", () => {
    const optionKeys = optionsString.match(/(--[a-z]*)/g);
    expect(optionKeys).toEqual(["--title", "--comments"]);
  });

  it("should put double quotes around the values", () => {
    const optionVals = optionsString.match(/("[A-z]*")/g);
    expect(optionVals).toEqual(['"Hi"', '"Hey"']);
  });
});
