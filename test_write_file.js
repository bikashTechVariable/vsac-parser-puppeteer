import fs from 'fs';
import path from 'path';

const content = 'hello,world\ni am bikash\nhow , are, you\n';

async function run() {
    await fs.writeFile(path.join('.', 'test1 abc', 'test2 def', 'file.txt'), content, {flag: 'w+'} ,err => {
        if(err) {
            console.log(err);
        }
    });
}

run();