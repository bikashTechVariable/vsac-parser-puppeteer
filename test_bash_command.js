import * as util from 'util';
import * as cp from 'child_process';

const exec = util.promisify(cp.exec);

async function run() {
    try {
        const { stdout, stderr } = await exec('ls -la');
        console.log('stdout : ', stdout);
        console.log('stderr : ', stderr);
    } catch (error) {
        console.error(error);
    }
}
run();