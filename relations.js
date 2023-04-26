// const data = {
//     ecqmAccordion: {
//         startId: 16,
//         endId: 14
//     },
//     ecqmprmAccordion: {

//     },
//     ccdaAccordion: {

//     },
//     cdcrecAccordion: {

//     }
// }

function idValidator() {
  // TODO: Validate if an id doesn't enters into another section's id
}

const ecqmHeaderIdFinder = function (currentYear) {
  // NOTE: currentYear should be integer
  const startYear = 2013;
  const startYearId = 24;
  const result = startYearId - (currentYear - startYear);
  return result;
};

const ecqmprmHeaderIdFinder = function (currentYear) {
  // NOTE: currentYear should be integer
  // Currently there is only one tag for ecqmprm
  return 51;
};

const ccdaHeaderIdFinder = function (currentYear) {
  // NOTE: currentYear should be integer
  const duplicateYears = [2018]; // Data which occur more than two times a year
  const startYear = 2016;
  const startYearId = 49;
  const result = startYearId - (currentYear - startYear);
  if (duplicateYears.length === 0) {
    return [result];
  }
  const minDuplicateYear = duplicateYears.reduce(function (min, num) {
    return min < num ? min : num;
  });
  if (currentYear < minDuplicateYear) {
    return [result];
  }
  for(let year in duplicateYears) {
    let counter = 0;
    if(currentYear > year) {
      counter++;
    }
  }
};

const cdcrecHeaderIdFinder = function (currentYear) {
  // NOTE: currentYear should be integer
  // Currently there is only one tag for cdcrec
  return 50;
};

const headerIdGenerator = function (tabRef, currentYear) {
  let result;
  switch (tabRef) {
    case "ecqm":
      result = ecqmHeaderIdFinder(currentYear);
      break;
    case "ecqmprm":
      result = ecqmprmHeaderIdFinder(currentYear);
      break;
    case "ccda":
      result = ccdaHeaderIdFinder(currentYear);
      break;
    case "cdcrec":
      result = cdcrecHeaderIdFinder(currentYear);
      break;
    default:
      result = null;
  }
  if (result) {
    result = "ui-id-" + result;
  }
  return result;
};

export { headerIdGenerator };
