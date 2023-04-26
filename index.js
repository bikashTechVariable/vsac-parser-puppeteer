// TODO: Check using next sibling

import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    // slowMo: 500,
  });
  const page = await browser.newPage();
  await page.goto("https://vsac.nlm.nih.gov/download/ecqm", {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  const loginLink = await page.$("#login-link");
  await loginLink.click();
  const apikey = await page.$("#apikey");
  await apikey.type(process.env.API_KEY);
  const login = await page.$("#btnLoginApikey");
  await login.click();
  const downloadTabs = await page.$("#downloadTabs");
  const tablist = await downloadTabs.$('ul[role="tablist"]');
  const tabListItems = await tablist.$$("li");
  console.log(
    await (await tabListItems[0].getProperty("innerHTML")).jsonValue()
  );
  for (let i = 0; i < tabListItems.length; i++) {
    // await tabListItems[i].click();
    console.log(
      "Item " +
        i +
        " : " +
        (await (await tabListItems[i].getProperty("innerHTML")).jsonValue())
    );
    console.log(
      await (await tabListItems[i].getProperty("textContent")).jsonValue()
    );
    console.log(
      await tabListItems[i].$eval("a", (n) => n.getAttribute("href"))
    );
    const href = (
      await tabListItems[i].$eval("a", (n) => n.getAttribute("href"))
    )
      .split("_")[1]
      .toLowerCase();
    await page.waitForSelector(`div#${href}Accordion`);
    const accordionHeader = await page.$$(`div#${href}Accordion > h3`);
    const accordionDiv = await page.$$(`div#${href}Accordion > div`);
    console.log(href);
    // NOTE: accordionHeader.length = accordionDiv.length
    for (let j = 0; j < accordionHeader.length; j++) {
      console.log(j);
      // const elementIdForJ = await (
      //   await accordionHeader[j].getProperty("id")
      // ).jsonValue();
      // console.log(`elementIdForJ : ${elementIdForJ}`);
      // console.log("before promise.all");
      // await Promise.all([
      //   // page.waitForNavigation(),
      //   page.waitForSelector(`#${elementIdForJ}`, `[aria-selected="true"]`),
      //   accordionHeader[j].click(),
      //   // page.waitForSelector(`#${elementId}[aria-selected="true"]`),
      // ]);
      // console.log("after promise.all");
      console.log(
        await (await accordionHeader[j].getProperty("innerText")).jsonValue()
      );
      // await accordionHeader[j].click({delay:1});
      let d = await accordionDiv[j].$$("div > h3");
      let e = await accordionDiv[j].$$("div > div");
      console.log(d.length === e.length);
      console.log(d.length);
      console.log(e.length, '\n\n');
      for (let k = 0; k < d.length; k++) {
        console.log('k : ', k);
        console.log(
          "\t" + (await (await d[k].getProperty("innerHTML")).jsonValue())
        );
        // const elementIdForK = await (await d[k].getProperty("id")).jsonValue();
        // console.log("elementIdForK", elementIdForK);
        // console.log("k: before promise.all");
        // await Promise.all([
        //   page.waitForSelector(`#${elementIdForK}`, `[aria-selected='true']`),
        //   d[k].click(),
        // ]);
        // console.log("k : after promise.all");
      }

    }
  }
}

run();
