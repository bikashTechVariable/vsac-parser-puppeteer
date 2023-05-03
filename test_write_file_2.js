import * as fs from "fs-extra";

const content = "hello,world\ni am bikash\nhow , are, you\n";
const file = "./tmp/hello world/test abcd 1234/file.txt";

async function asyncAwait() {
  try {
    await fs.outputFile(file, content);

  } catch (err) {
    console.error(err);
  }
}
asyncAwait();
