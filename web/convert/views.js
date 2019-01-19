const FictionpressScraper = require("../../shared/scraper/FictionpressScraper");
const calibre = require("../../shared/calibre");
const { createFolder } = require("../../shared/helpers");
const config = require("../../config");

/**
 * Convert fictionpress story into a .azw3 file.
 * There are many problems with this method HOWEVER it does work :O (ZOMGIKNOW)
 *
 * Known Issues:
 * - No validation checks on the story id
 * - If the story id doesn't exist it creates an empty .azw3 file (lol)
 * - Takes a longtime (30s ish?)
 * - Pretty much exactly the same code as in the cli method.
 *
 * Planned Improvements:
 * - Validate story ID & error if the story doesn't exist
 * - This endpoint return immediatly and use ws for the rest.
 * - Centralise the code? I dunno man, think on it.
 */
async function getFictionpress(req, res) {
  const { storyId } = req.params;

  try {
    const scraper = new FictionpressScraper(storyId, {
      outputFolder: config.TMP_FOLDER
    });

    // Get story
    const { meta, filepath } = await scraper.getStory();

    // Convert to an AW3 file
    createFolder(config.OUTPUT_FOLDER);
    const outputFile = `${config.OUTPUT_FOLDER}/${
      meta.title
    } - ${storyId}.azw3`;
    await calibre.ebookConvert(filepath, outputFile, meta);

    res.json({
      title: meta.title,
      authors: meta.authors.join(", "),
      summary: meta.comments,
      file: outputFile
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = {
  getFictionpress
};
