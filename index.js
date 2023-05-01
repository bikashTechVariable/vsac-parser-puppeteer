import puppeteer from "puppeteer";
import dotenv from "dotenv";
dotenv.config();

const queue = [];
/*
Each queue element : [type, id, status]
type: DIR / ID / null (in case of backward)
value: dirname/title (in case of id)
status: FORWARD / BACKWARD / DOWNLOAD
id: id_name / null (in case of dir)
*/

async function run() {
  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    headless: false,
    defaultViewport: null,
    devtools: true,
    // slowMo: 500,
  });
  const page = await browser.newPage();
  await page.goto("https://vsac.nlm.nih.gov/download/ecqm", {
    timeout: 90000,
    // waitUntil: "domcontentloaded",
    waitUntil: "networkidle2",
  });
  await (await browser.pages())[0].close();
  const loginLink = await page.$("#login-link");
  await loginLink.click();
  await page.waitForSelector("#apikey");
  const apikey = await page.$("#apikey");
  await apikey.type(process.env.API_KEY);
  await page.waitForSelector("#btnLoginApikey"),
    await Promise.all([
      page.click("#btnLoginApikey"),
      // page.waitForResponse(response => response.url() === 'https://vsac.nlm.nih.gov/vsac/pc/vs/getInactiveTabs' && response.status === 200)
      page.waitForResponse(
        "https://vsac.nlm.nih.gov/vsac/pc/vs/getInactiveTabs"
      ),
    ]);
  // await page.evaluate(() => document.querySelector('#eh_only\\.cms\\.20220505\\.excel').click());
  // return;
  const downloadTabs = await page.$("#downloadTabs");
  const tablist = await downloadTabs.$('ul[role="tablist"]');
  const tabListItems = await tablist.$$("li");
  console.log(
    await (await tabListItems[0].getProperty("innerText")).jsonValue()
  );
  for (let i = 0; i < tabListItems.length; i++) {
    const tabListItemText = await (
      await tabListItems[i].getProperty("textContent")
    ).jsonValue();
    console.log(
      "\n\nItem " +
        i +
        " : " +
        (await (await tabListItems[i].getProperty("innerHTML")).jsonValue())
    );
    queue.push(["DIR", tabListItemText, "FORWARD", null]);
    console.log(tabListItemText);
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
      const accordionHeaderText = await (
        await accordionHeader[j].getProperty("innerText")
      ).jsonValue();
      console.log(accordionHeaderText);
      queue.push(["DIR", accordionHeaderText, "FORWARD", null]);
      const accordionDiv = await page.evaluateHandle(
        (el) => el.nextElementSibling,
        accordionHeader[j]
      );
      let accordionDivChilds = await accordionDiv.$$(":scope > *");
      for (let k = 0; k < accordionDivChilds.length; k++) {
        // console.log('\t' + await (await accordionDivChilds[k].getProperty('tagName')).jsonValue());
        const tagName = await (
          await accordionDivChilds[k].getProperty("tagName")
        ).jsonValue();
        if (tagName === "TABLE") {
          console.log("\tINSIDE TABLE");
          const className = await page.evaluate(
            (el) => el.className,
            accordionDivChilds[k]
          );
          console.log("\tClassname : " + className);
          const downloadRows = await accordionDivChilds[k].$$(
            "table > tbody > tr"
          );
          console.log("\tdownloadRows : " + downloadRows);
          console.log("\tlength : " + downloadRows.length);
          for (let downloadRow of downloadRows) {
            const downloadTitle = await downloadRow.$(".vsac-downloadTitle");
            const downloadButtons = await downloadRow.$$(
              ".vsac-downloadButton"
            );
            const downloadTitleText = await (
              await downloadTitle.getProperty("innerText")
            ).jsonValue();
            console.log("\t\t" + downloadTitleText);
            for (let downloadButton of downloadButtons) {
              const buttonText = await (
                await downloadButton.getProperty("innerText")
              ).jsonValue();
              if (buttonText.toLowerCase().includes(process.env.FILE_TYPE)) {
                console.log("\t\t\tButton text : " + buttonText);
                const idName = await (
                  await downloadButton.getProperty("id")
                ).jsonValue();
                console.log("\t\t\tId : " + idName);
                queue.push(["ID", downloadTitleText, "DOWNLOAD", idName]);
              }
            }
          }
        }
        if (tagName === "H3") {
          const accordianChildHeadingText = await (
            await accordionDivChilds[k].getProperty("innerText")
          ).jsonValue();
          k++;
          console.log("\tFrom here: " + accordianChildHeadingText);
          queue.push(["DIR", accordianChildHeadingText, "FORWARD", null]);
          if (
            (await (
              await accordionDivChilds[k].getProperty("tagName")
            ).jsonValue()) === "DIV"
          ) {
            console.log("\tINSIDE DIV");
            const childs = await accordionDivChilds[k].$$(":scope > *");
            for (let l = 0; l < childs.length; l++) {
              const tagName = await (
                await childs[l].getProperty("tagName")
              ).jsonValue();
              if (tagName === "TABLE") {
                // console.log('\n\nThis should be in section : ecqm');
                console.log("\t\t" + "INSIDE TABLE");
                const className = await page.evaluate(
                  (el) => el.className,
                  childs[l]
                );
                console.log("\t\tClassName : " + className);
                let indexCMS = null;
                // console.log(await (await childs[l].getProperty('innerHTML')).jsonValue());
                const tableHeads = await childs[l].$$(
                  "table > thead > tr > th"
                );
                // console.log('\t\t' + tableHeads);
                console.log("\t\t" + tableHeads.length);
                for (let m = 0; m < tableHeads.length; m++) {
                  const title = await (
                    await tableHeads[m].getProperty("innerText")
                  ).jsonValue();
                  // console.log('\t\t\ttitle : ' + title);
                  if (title.toLowerCase().includes("cms")) {
                    indexCMS = m;
                  }
                }
                const downloadRows = await childs[l].$$("table > tbody > tr");
                // console.log("\t\tdownloadRows : " + downloadRows);
                console.log("\t\tlength : " + downloadRows.length);
                for (let downloadRow of downloadRows) {
                  const downloadTitle = await downloadRow.$(
                    ".vsac-downloadTitle"
                  );
                  const downloadTitleText = await (
                    await downloadTitle.getProperty("innerText")
                  ).jsonValue();
                  console.log("\t\tdownloadTitleText : " + downloadTitleText);
                  const rowData = await downloadRow.$$("td");
                  const buttons = await rowData[indexCMS].$$("button");
                  // console.log('\t\t'+buttons);
                  // console.log('\t\t'+buttons.length);
                  for (let button of buttons) {
                    const buttonText = await (
                      await button.getProperty("innerText")
                    ).jsonValue();
                    if (
                      buttonText.toLowerCase().includes(process.env.FILE_TYPE)
                    ) {
                      console.log("\t\t\t" + buttonText);
                      const buttonId = await (
                        await button.getProperty("id")
                      ).jsonValue();
                      console.log("\t\t\t" + buttonId);
                      queue.push([
                        "ID",
                        downloadTitleText,
                        "DOWNLOAD",
                        buttonId,
                      ]);
                    }
                  }
                }
              }
            }
          }
          queue.push(["DIR", accordianChildHeadingText, "BACKWARD", null]);
        } else if (tagName === "DIV") {
          const childs = await accordionDivChilds[k].$$(":scope > *");
          for (let l = 0; l < childs.length; l++) {
            const tagName = await (
              await childs[l].getProperty("tagName")
            ).jsonValue();
            if (tagName === "H3") {
              console.log(
                "\t\t" +
                  ((await (
                    await childs[l].getProperty("innerText")
                  ).jsonValue()) +
                    "(for C-CDA)")
              );
            }
            if (tagName === "DIV") {
              const finalChilds = await childs[l].$$(":scope > *");
              for (let m = 0; m < finalChilds.length; m++) {
                const tagName = await (
                  await finalChilds[m].getProperty("tagName")
                ).jsonValue();
                if (tagName === "TABLE") {
                  console.log("\t\t\t" + "INSIDE TABLE (for C-CDA)");
                }
              }
            }
          }
        }
      }
      queue.push(["DIR", accordionHeaderText, "BACKWARD", null]);
    }
    queue.push(["DIR", tabListItemText, "BACKWARD", null]);
  }
  console.log("QUEUE contents : \n");
  console.log("Length : " + queue.length);
  for (let element of queue) {
    console.log(element);
  }
  console.log("Completed... \nClosing browser...\n");
  await browser.close();
}

run();
