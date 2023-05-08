// import * as xlsx from 'xlsx';

// // CSV data in string format
// const csvData = 'Name,Age,Gender\nJohn,30,Male\nJane,25,Female\n';

// // Parse the CSV data into a worksheet
// const sheet = xlsx.utils.json_to_sheet(csvData.split('\n').map(line => {
//   return line.split(',');
// }));

// // Create a workbook and add the worksheet
// const workbook = xlsx.utils.book_new();
// xlsx.utils.book_append_sheet(workbook, sheet, 'Sheet1');

// // Write the workbook to an XLSX file
// xlsx.writeFile(workbook, 'output.xlsx');

import fs from 'fs';
import xlsx from 'xlsx';

async function convertCsvToXlsx(inputPath, outputPath) {
  try {
    // Read the CSV file
    const csvData = await fs.promises.readFile(inputPath, 'utf8');

    // Parse the CSV data into a worksheet
    const sheet = xlsx.utils.json_to_sheet(csvData.split('\n').map(line => {
      return line.split(',');
    }));

    // Create a workbook and add the worksheet
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'Sheet1');

    // Write the workbook to an XLSX file
    await xlsx.writeFile(workbook, outputPath);

    console.log('Conversion complete!');
  } catch (error) {
    console.error('An error occurred while converting the file:', error);
  }
}

await convertCsvToXlsx('./download/REPORT.csv', './download/REPORT.xlsx');
