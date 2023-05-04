const startTime = Date.now();
for(let i= 0; i<100000000; i++){
}
const endTime = Date.now();
const timeDiff = endTime - startTime;
console.log('Start Time : ' + startTime);
console.log('End Time : ' + endTime);
console.log('Time Diff : ' + timeDiff);