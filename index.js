/* NOTE:
1. Commas inside data may lead to abnormality for dealing with CSV files
2. Reauthenticate when access token expires
*/

import puppeteer from "puppeteer";
import dotenv from "dotenv";
import path from "path";
import * as fsextra from "fs-extra";
import fs from "fs";
import { waitForDownload } from "puppeteer-utilz";
import * as util from "util";
import * as cp from "child_process";
dotenv.config();
import xlsx from "xlsx";

const RETRY_COUNT = parseInt(process.env.RETRY_COUNT);

console.time("Program execution time : ");

async function convertCsvToXlsx(inputPath, outputPath) {
  try {
    // Read the CSV file
    const csvData = await fs.promises.readFile(inputPath, "utf8");

    // Parse the CSV data into a worksheet
    const sheet = xlsx.utils.json_to_sheet(
      csvData.split("\n").map((line) => {
        return line.split(",");
      })
    );

    // Create a workbook and add the worksheet
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, "Sheet1");

    // Write the workbook to an XLSX file
    await xlsx.writeFile(workbook, outputPath);

    console.log("Conversion complete from CSV to XLSX!");
  } catch (error) {
    console.error("An error occurred while converting the file:", error);
  }
}

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const execDeletePreviousDownloadDirectory = util.promisify(cp.exec);

async function deleteDownloadDirectory() {
  try {
    console.log("Removing previous ./download directory (if exists)");
    await cp.exec("rm -r ./download");
  } catch (error) {
    console.error(error);
  }
}

async function unzip(pathToFileDirectory, fileNameInZippedFormat) {
  const exec = util.promisify(cp.exec);
  // pathToFileDirectory = pathToFileDirectory.replaceAll(' ', '\\ ');
  // fileNameInZippedFormat = fileNameInZippedFormat.replaceAll(' ', '\\ ');
  try {
    // await exec(`cd '${pathToFileDirectory}'`);
    console.log("Current directory for unzipping : " + pathToFileDirectory);
    // const { stdout, stderr } = await exec('pwd');
    // console.log('PWD command : ');
    // console.log(stdout);
    console.log("Unzipping...");
    await exec(
      `cd '${pathToFileDirectory}' && unzip '${fileNameInZippedFormat}' && rm '${fileNameInZippedFormat}'`
    );
    console.log(
      "Unzipping completed for file : " +
        pathToFileDirectory +
        "/" +
        fileNameInZippedFormat
    );
    const xlsxName = fileNameInZippedFormat.split(".");
    xlsxName.pop();
    console.log(
      `Removed : ${fileNameInZippedFormat}\nRetained : ${xlsxName.join(".")}`
    );
  } catch (error) {
    console.error(error);
  }
}

const queue = [];
/*
Each queue element : [type, value, status, id]
type: DIR / ID / TABLE
value: dirname/title (in case of id)/table_name (in case of table name)
status: FORWARD (for dir) / BACKWARD (for dir) / DOWNLOAD (for id) / CSV (for table of CSV type data) 
id: null (for dir) / id_value (in case of id) / CSV (in case of table)
*/

function downloadIdFormatter(id) {
  const tempList = id.split(".");
  let tempIdString = "";
  tempIdString += tempList[0];
  for (let i = 1; i < tempList.length; i++) {
    tempIdString = tempIdString + "\\." + tempList[i];
  }
  return tempIdString;
}

function downloadPathFormatter(downloadStringList) {
  let temp = "";
  temp += downloadStringList[0];
  for (let i = 1; i < downloadStringList.length; i++) {
    if (downloadStringList[i].includes("/")) {
      console.log("Found : " + downloadStringList[i]);
      temp = temp + "/" + downloadStringList[i].replaceAll("/", "-");
    } else {
      temp = temp + "/" + downloadStringList[i];
    }
  }
  return temp;
}

function idToDefaultFilenameConverter(originalId) {
  // Reverse engineering successful
  // Result :
  // This function gives you the filename which will be set to the file after download
  const tempList = originalId.split(".");
  tempList.pop();
  let tempString = tempList.join("_");
  tempString = tempString + ".xlsx.zip";
  return tempString;
}

function findParamFromId(id) {
  const idSplitted = id.split(".");
  return idSplitted[idSplitted.length - 2];
}

async function downloadById(page, downloadIdFormatted) {
  await page.evaluate(
    (downloadIdFormatted) =>
      document.querySelector(downloadIdFormatted).click(),
    downloadIdFormatted
  );
}

async function reAuthenticate(page) {
  console.log("Going to page by URL");
  try {
    page = await gotoPageByURL(page, "https://vsac.nlm.nih.gov/download/ecqm");
  } catch (error) {
    console.log("Failed going into the page");
    console.log("Error : \n" + error);
  }
  console.log("Logging into the page again");
  try {
    page = await logIntoPage(
      page,
      "https://vsac.nlm.nih.gov/vsac/pc/vs/getInactiveTabs"
    );
  } catch (error) {
    console.log("Login failed!");
    console.log("Error : \n" + error);
  }
  return page;
}

async function processQueue(queue, page) {
  const failureReport = [];
  // Status (example DOWNLOAD FAILED)
  // Status code (example : 500)
  // Path (join by '->')
  // Value
  // Id
  // retry count
  failureReport.push([
    "STATUS",
    "STATUS CODE",
    "PATH (joined by ->)",
    "VALUE",
    "ID",
    "RETRY_COUNT",
  ]);

  let downloadStringList = [".", "download"];
  const client = await page.target().createCDPSession();

  console.log("\n\nDOWNLOADING STARTED...\n\n\n");
  for (let index = 0; index < queue.length; index++) {
    // console.log(downloadStringList);
    if (queue[index][0] === "DIR" && queue[index][2] === "FORWARD") {
      downloadStringList.push(queue[index][1]);
    } else if (queue[index][0] === "DIR" && queue[index][2] === "BACKWARD") {
      downloadStringList.pop();
    } else if (queue[index][0] === "ID") {
      downloadStringList.push(queue[index][1]);
      const tempDownloadPath = downloadPathFormatter(downloadStringList);

      await client.send("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: tempDownloadPath,
      });
      console.log("Download path : " + tempDownloadPath);
      console.log("Unformatted id : " + queue[index][3]);
      const downloadId = "#" + queue[index][3];
      const downloadIdFormatted = downloadIdFormatter(downloadId);
      console.log("downloadIdFormatted : " + downloadIdFormatted);
      console.log("Downloading...");

      await downloadById(page, downloadIdFormatted);
      // await page.waitForNavigation({ waitUntil: "networkidle0", timeout: 0 });
      // const filename = await waitForDownload(tempDownloadPath);

      const data = await page.waitForResponse(async (response) => {
        return await response.url().endsWith(findParamFromId(queue[index][3]));
      });
      // console.log(data.status());

      if (data.status() >= 200 && data.status() < 300) {
        const filename = await waitForDownload(tempDownloadPath);
        console.log(
          "\nDownloaded File : " +
            filename +
            "\nDownload Path : " +
            tempDownloadPath +
            "\n\n"
        );
        await unzip(tempDownloadPath, filename);
        downloadStringList.pop();
      } else if (data.status() >= 500 && data.status() < 600) {
        console.log("Inside 500-599 error section");
        // retry mechanism
        for (let tryCount = 0; tryCount < RETRY_COUNT; tryCount++) {
          let errorFlag = false;
          let success = false;
          try {
            await downloadById(page, downloadIdFormatted);
            const dataRetry = await page.waitForResponse(async (response) => {
              return await response
                .url()
                .endsWith(findParamFromId(queue[index][3]));
            });
            if (dataRetry.status() >= 200 && dataRetry.status() < 300) {
              const filename = await waitForDownload(tempDownloadPath);
              console.log(
                "\nDownloaded File : " +
                  filename +
                  "\nDownload Path : " +
                  tempDownloadPath +
                  "\n\n"
              );
              await unzip(tempDownloadPath, filename);
              downloadStringList.pop();
              success = true;
            } else if (dataRetry.status() >= 500 && dataRetry.status() < 600) {
              console.log("dataRetry -> 500 section -> continue");
              continue;
            } else if (dataRetry.status() >= 400 && dataRetry.status() < 500) {
              console.log("dataRetry -> 400 section -> reauthenticate");
              page = await reAuthenticate(page);
            }
          } catch (error) {
            console.log(
              "Error while retrying to download as per the retry mechanism"
            );
            console.log(error);
            errorFlag = true;
          } finally {
            if (success === true) {
              tryCount = RETRY_COUNT;
              continue;
            } else if (errorFlag === true || tryCount === RETRY_COUNT - 1) {
              failureReport.push([
                "DOWNLOAD FAILED",
                data.status(),
                tempDownloadPath,
                queue[index][1],
                queue[index][3],
                RETRY_COUNT,
              ]);
              console.log(
                "File not downloaded in directory : " + tempDownloadPath
              );
              downloadStringList.pop();
              continue;
            }
          }
        }
      } else if (data.status() >= 400 && data.status() < 500) {
        console.log("inside 400-499 error section");
        page = await reAuthenticate(page);
        index--;
        downloadStringList.pop();
      } else {
        console.error(
          "CHECK SCRIPT PLEASE ALONGWITH INSPECTION OF WEBSITE YOU ARE SCRAPPING AS : STATUS CODE NOT RECOGNISED."
        );
        process.exit(1);
      }
    } else if (queue[index][0] === "TABLE") {
      const tempDownloadPath = downloadPathFormatter(downloadStringList);
      try {
        await fsextra.outputFile(
          tempDownloadPath + `/${queue[index][1]}.csv`,
          queue[index][3]
        );
        // Convert from CSV to XLSX
        try {
          await convertCsvToXlsx(
            tempDownloadPath + `/${queue[index][1]}.csv`,
            tempDownloadPath + `/${queue[index][1]}.xlsx`
          );
        } catch (error) {
          console.log(
            "Error occured while converting csv to xlsx for table data"
          );
          console.log("Error" + error);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  if (failureReport.length > 1) {
    const tempDownloadPath = "./download/REPORT.csv";
    let reportString = "";
    for (let i = 0; i < failureReport.length; i++) {
      for (let j = 0; j < failureReport[i].length; j++) {
        console.log('reportString[i][j] : ' + reportString);
        reportString =
          reportString + String(failureReport[i][j]).replaceAll(",", "\uff0c");
        if (j !== failureReport[i].length - 1) {
          reportString += ",";
        }
      }
      if (i !== failureReport.length - 1) reportString = reportString + "\n";
    }
    try {
      console.log("Report string : " + reportString);
      await fsextra.outputFile(tempDownloadPath, reportString);
      // Convert from CSV to XLSX
      try {
        await convertCsvToXlsx(
          "./download/REPORT.csv",
          "./download/REPORT.xlsx"
        );
      } catch (error) {
        console.log("Error occured while converting csv to xlsx");
        console.log("Error" + error);
      }
    } catch (error) {
      console.log("Error occured while generating CSV file");
      console.error(error);
    }
    console.log(
      "FAILURE DETECTED WHILE DOWNLOADING CERTAIN FILES\nPLEASE CHECK THEM INSIDE THE FILE ./download/REPORT.csv"
    );
  } else {
    console.log("ALL FILES DOWNLOADED SUCCESSFULLY\nNO FAILURES DETECTED\n");
  }
  console.log("\nAll download complete\nEnd of tension\n");
  // console.log(downloadStringList);
}

async function gotoPageByURL(page, url) {
  await page.goto(url, {
    timeout: 90000,
    waitUntil: "networkidle2",
  });
  return page;
}

async function logIntoPage(page, waitForLink) {
  const loginLink = await page.$("#login-link");
  await delay(2000);
  await loginLink.click();
  await page.waitForSelector("#apikey");
  const apikey = await page.$("#apikey");
  await apikey.type(process.env.API_KEY);
  await delay(5000);
  await page.waitForSelector("#btnLoginApikey"),
    await Promise.all([
      page.click("#btnLoginApikey"),
      page.waitForResponse(waitForLink),
    ]);
  await page.waitForNetworkIdle();
  return page;
}

async function run() {
  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    headless: false,
    defaultViewport: null,
    devtools: true,
    // slowMo: 500,
  });
  let page = await browser.newPage();
  page = await gotoPageByURL(page, "https://vsac.nlm.nih.gov/download/ecqm");

  await (await browser.pages())[0].close();

  page = await logIntoPage(
    page,
    "https://vsac.nlm.nih.gov/vsac/pc/vs/getInactiveTabs"
  );
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
                console.log("\t\t" + "INSIDE TABLE");
                const className = await page.evaluate(
                  (el) => el.className,
                  childs[l]
                );
                console.log("\t\tClassName : " + className);
                let indexCMS = null;
                const tableHeads = await childs[l].$$(
                  "table > thead > tr > th"
                );
                console.log("\t\t" + tableHeads.length);
                for (let m = 0; m < tableHeads.length; m++) {
                  const title = await (
                    await tableHeads[m].getProperty("innerText")
                  ).jsonValue();
                  if (title.toLowerCase().includes("cms")) {
                    indexCMS = m;
                  }
                }
                const downloadRows = await childs[l].$$("table > tbody > tr");
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
              const headingText = await (
                await childs[l].getProperty("innerText")
              ).jsonValue();
              console.log("\t\t" + (headingText + "(for C-CDA)"));
              queue.push(["DIR", headingText, "FORWARD", null]);
              const nextSibling = await page.evaluateHandle(
                (el) => el.nextElementSibling,
                childs[l]
              );
              const finalChilds = await nextSibling.$$(":scope > *");
              for (let m = 0; m < finalChilds.length; m++) {
                const tagName = await (
                  await finalChilds[m].getProperty("tagName")
                ).jsonValue();

                console.log("\t\t\tTagName Test : " + tagName);
                if (tagName === "TABLE") {
                  console.log("\t\t\t" + "INSIDE TABLE (for C-CDA)");
                  const tableNameElement = await page.evaluateHandle(
                    (el) => el.previousElementSibling,
                    finalChilds[m]
                  );
                  const tableNameText = await (
                    await tableNameElement.getProperty("innerText")
                  ).jsonValue();

                  const table = finalChilds[m];
                  const tableRows = await table.$$("tr");
                  let dataStringForCSV = "";
                  const headerDataRows = await tableRows[0].$$("th");
                  for (let [index, headerDataRow] of headerDataRows.entries()) {
                    const headerText = await (
                      await headerDataRow.getProperty("innerText")
                    ).jsonValue();
                    dataStringForCSV = dataStringForCSV + headerText;
                    if (!(index === headerDataRows.length - 1)) {
                      dataStringForCSV = dataStringForCSV + ",";
                    }
                  }
                  dataStringForCSV = dataStringForCSV + "\n";
                  for (let n = 1; n < tableRows.length; n++) {
                    const dataRows = await tableRows[n].$$("td");
                    for (let [index, dataRow] of dataRows.entries()) {
                      const dataText = await (
                        await dataRow.getProperty("innerText")
                      ).jsonValue();
                      dataStringForCSV = dataStringForCSV + dataText;
                      if (!(index === dataRows.length - 1)) {
                        dataStringForCSV = dataStringForCSV + ",";
                      }
                    }
                    dataStringForCSV += "\n";
                  }
                  queue.push(["TABLE", tableNameText, "CSV", dataStringForCSV]);
                }
              }
              queue.push(["DIR", headingText, "BACKWARD", null]);
            }
          }
        }
      }
      queue.push(["DIR", accordionHeaderText, "BACKWARD", null]);
    }
    queue.push(["DIR", tabListItemText, "BACKWARD", null]);
  }
  // console.log("QUEUE contents : \n");
  // console.log("Length : " + queue.length);
  // for (let element of queue) {
  //   console.log(element);
  // }
  console.log("\n\n\nQueue processing : ");
  await processQueue(queue, page);
  console.log("Completed... \nClosing browser...\n");
  await browser.close();
  console.timeEnd("Program execution time : ");
}

await deleteDownloadDirectory();
run();
