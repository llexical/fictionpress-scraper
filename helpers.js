const fs = require('fs');
const { exec } = require('child_process');

/** Doesn't block event loop */
async function appendFileAsync(path, content) {
    return new Promise((resolve, reject) => {
        fs.appendFile(path, content, (err) => {
            if (err) reject(err);
            resolve();
        });
    });
}

async function execAsync(command, options) {
    return new Promise((resolve, reject) => {
        exec(command, options, (err) => {
            if (err) reject(err);
            resolve();
        });
    });
}

module.exports = {
    appendFileAsync,
    execAsync,
};