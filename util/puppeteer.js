const puppeteer = require("puppeteer");

const puppeteerConfig = {
  headless: false,
  args: ["--disable-blink-features=AutomationControlled"],
  slowMo: 50,
};

module.exports = {
  puppeteer,
  puppeteerConfig,
};
