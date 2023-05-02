import puppeteer from "puppeteer";
import { waitForDownload } from "puppeteer-utilz";

import path from "path";
const downloadPath = path.resolve("./download test dir");
async function simplefileDownload() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
  });

  const page = await browser.newPage();
  await page.goto("https://unsplash.com/photos/tn57JI3CewI", {
    waitUntil: "networkidle2",
  });

  // await page._client.send('Page.setDownloadBehavior', {
  //     behavior: 'allow',
  //     downloadPath: downloadPath
  // });
  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadPath,
  });
  await page.click(
    "#app > div > div:nth-child(3) > div > div:nth-child(1) > div.KeJv5.voTTC > header > div.EdCFo > div > div > a"
  );
}
async function simpleFileDownload2() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
  });

  const page = await browser.newPage();
  await page.goto("https://testfiledownload.com/", {
    waitUntil: "networkidle2",
  });
  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadPath,
  });
  await page.click(
    "#main > article > div > div.files_holder > div.inner > div:nth-child(6) > a"
  );
  // await browser.close();
}

async function simpleFileDownload3() {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
  });

  const page = await browser.newPage();
  await page.goto("https://www.buildsometech.com/download-test-files/", {
    waitUntil: "networkidle2",
  });
  const client = await page.target().createCDPSession();

  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadPath,
  });
  await page.click(
    "#post-22383 > div > div.entry-content > figure:nth-child(24) > table > tbody > tr:nth-child(8) > td:nth-child(2) > a"
  );

  const filename = await waitForDownload(downloadPath);
  await browser.close();

  console.log(filename);
}

// simplefileDownload();
// simpleFileDownload2();
simpleFileDownload3();
