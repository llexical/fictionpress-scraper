# Fictionpress Scraper · [![Build Status](http://ec2-18-216-77-80.us-east-2.compute.amazonaws.com:8080/buildStatus/icon?job=fictionpress-scraper-pipeline)](http://ec2-18-216-77-80.us-east-2.compute.amazonaws.com:8080/job/fictionpress-scraper-pipeline/)

Pass an ID in via a .env file for a fictionpress story
and this script will scrape the whole story from the website
and then save it as a `.azw3` file which can be used for kindle apps.

# Requirements

- [NodeJS `^10.14.2`](https://nodejs.org/en/)
- [Calibre `^3.37.0`](https://calibre-ebook.com/)

# Setup

- Download this repo.
- Install dependencies `npm install`
- Add the [calibre commandline interface](https://manual.calibre-ebook.com/generated/en/cli-index.html) folder to your PATH.
- Add .env file: `cp .env.example .env` and update the story id to a valid fictionpress story id.
- Run `node index.js`.
