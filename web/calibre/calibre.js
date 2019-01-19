const helpers = require("../helpers");

class Calibre {
  ebookConvert(inputFile, outputFile, options) {
    const optionsString = this.getOptionsString(options);

    return helpers.execAsync(
      `ebook-convert "${inputFile}" "${outputFile}" ${optionsString}`
    );
  }

  getOptionsString(options) {
    return Object.keys(options).reduce(
      (acc, key) => (acc += ` --${key} "${options[key]}"`),
      ""
    );
  }
}

module.exports = new Calibre();
