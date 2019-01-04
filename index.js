/**     
 * NOTE: Need to add calibre cli tools to PATH for this to work.
 */
require('dotenv').config();
const fs = require('fs');
const rp = require('request-promise');
const $ = require('cheerio');
const {appendFileAsync, execAsync} = require('./helpers.js');

const storyId = process.env.STORY_ID;
const importsFolder = process.env.IMPORTS_FOLDER;

const url = page => `https://www.fictionpress.com/s/${storyId}/${page}`;
const storyFolder = `${importsFolder}/${storyId}`;
const meta = {
    title: '',
    authors: '',
    comments: '',
    pubdate: '',
    publisher: 'fictionpress.com'
}

// Create the imports folder if it doesn't exist on run.
if (!fs.existsSync(importsFolder)){
    fs.mkdirSync(importsFolder);
}

async function getPage(num, storyFolder) {
    try {
        response = await rp(url(num));

        const html = $('#storytextp', response).html();
        // Exit out of there are not any more pages!
        if (!html) return false;

        const chapter = $('#chap_select option:selected', response).first().text();
        const chapterName = chapter.replace(/^([0-9]+\.)/, '');
        htmlChapter = `<h2 class="chapter">${chapterName}</h2>`

        await appendFileAsync(`${storyFolder}/index.html`, htmlChapter + html)
        return true;
    } catch(e) {
        console.error(e);
    }
}

async function getStoryMeta() {
    try {
        response = await rp(url(1));

        meta.title = $('#profile_top > b', response).text();
        meta.authors = [$('#profile_top > a', response).text()];
        meta.comments = $('#profile_top > div', response).text();
    
        return true;
    } catch(e) {
        console.error(e);
    }
}

async function convertStoryToMobi() {
    const htmlFile = `${importsFolder}/${storyId}/index.html`; 
    const mobiFile = `${importsFolder}/${meta.title} - ${storyId}.mobi`; 

    try {
        const options = {
            ...meta
        };
        const optionsString = Object.keys(options)
            .reduce((acc, key) => acc += ` --${key} "${options[key]}"` , '');
        
        await execAsync(`ebook-convert "${htmlFile}" "${mobiFile}" ${optionsString}`);
    } catch(e) {
        console.log(e);
    }
}

async function getStory() {
    let hasPages = true, page = 0;

    // Create story folder if does not exist
    if (!fs.existsSync(storyFolder)){
        fs.mkdirSync(storyFolder);
    }

    // Reset index.html if does exist
    if (fs.existsSync(`${storyFolder}/index.html`)) {
        fs.writeFileSync(`${storyFolder}/index.html`, '');
    }

    // Get story meta info i.e. author, title
    getStoryMeta();

    // Write pages
    while(hasPages) {
        page++;
        hasPages = await getPage(page, storyFolder);
    };

    // Convert to a Mobi file
    await convertStoryToMobi()

    console.log(`
        Downloaded & converted successfully!

        Title: ${meta.title}
        Authors: ${meta.authors.join(',')}
        Chapters: ${page - 1}
        Summary: ${meta.comments}
    `);
}

getStory()