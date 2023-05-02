// const arr = [100,90,110,-10,0,10];
// const result = arr.reduce(function (min, num) {console.log(min, num); return min<num?min:num});
// console.log(result);

import puppeteer from "puppeteer";
async function simplefileDownload() {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto("https://unsplash.com/photos/tn57JI3CewI", {
    waitUntil: "networkidle2",
  });
  await page.click(
    "#app > div > div:nth-child(3) > div > div:nth-child(1) > div.KeJv5.voTTC > header > div.EdCFo > div > div > a"
  );
}
// simplefileDownload();

console.log('#eh_only\\.cms\\.20220505\\.excel');
function downloadIdFormatter(id) {
  const tempList = id.split(".");
  let tempIdString = "";
  tempIdString += tempList[0];
  for (let i = 1; i < tempList.length; i++) {
    tempIdString = tempIdString + "\\." + tempList[i];
  }
  return tempIdString;
}
console.log(downloadIdFormatter("eh_only.cms.20220505.excel"));
