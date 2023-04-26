const arr = [100,90,110,-10,0,10];
// const arr = [10];
// arr.reduce()
const result = arr.reduce(function (min, num) {console.log(min, num); return min<num?min:num});
console.log(result);