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
      "\n\nItem " +
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
    // const accordionDiv = await page.$$(`div#${href}Accordion > div`);
    console.log(href);
    // NOTE: accordionHeader.length = accordionDiv.length
    for (let j = 0; j < accordionHeader.length; j++) {
      console.log(`accordionHeader index : ${j}`);
      console.log(
        await (await accordionHeader[j].getProperty("innerText")).jsonValue()
      );
      const accordionDiv = await page.evaluateHandle(
        (el) => el.nextElementSibling,
        accordionHeader[j]
      );
      let accordionDivChilds = await accordionDiv.$$(':scope > *');
      for(let k=0; k<accordionDivChilds.length; k++) {
        // console.log('\t' + await (await accordionDivChilds[k].getProperty('tagName')).jsonValue());
        const tagName = await (await accordionDivChilds[k].getProperty('tagName')).jsonValue();
        if(tagName === 'H3') {
          console.log('\t' + await (await accordionDivChilds[k].getProperty('innerText')).jsonValue());
        }
        if(tagName === 'TABLE'){
          console.log('\tINSIDE TABLE');
        }
        if(tagName === 'DIV') {
          console.log('\tINSIDE DIV');
          const childs = await accordionDivChilds[k].$$(':scope > *');
          for(let l = 0; l<childs.length; l++) {
            const tagName = await (await childs[l].getProperty('tagName')).jsonValue();
            // console.log('\t' + tagName);
            if(tagName === 'H3') {
              console.log('\t\t' + await (await childs[l].getProperty('innerText')).jsonValue());
            }
            if(tagName === 'DIV') {
              console.log('\t\tDIV');
              const finalChilds = await childs[l].$$(':scope > *');
              for(let m = 0; m < finalChilds.length; m++) {
                // console.log('\t\t\t' + await (await finalChilds[m].getProperty('tagName')).jsonValue());
                const tagName = await (await finalChilds[m].getProperty('tagName')).jsonValue();
                if(tagName === 'TABLE') {
                  console.log('\t\t\t' + 'INSIDE TABLE');
                }
              }
            }
            if(tagName === 'TABLE') {
              console.log('\t\t' + 'INSIDE TABLE')
            }
          }
        }
      }
    }
  }
  console.log('Completed... \nClosing browser...\n');
  await browser.close();
}

run();
