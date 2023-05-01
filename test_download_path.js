import puppeteer from "puppeteer";
import path from "path";
const downloadPath = path.resolve("./download");
async function simplefileDownload() {
  const browser = await puppeteer.launch({
    headless: false,
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
simplefileDownload();
