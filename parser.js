const fs = require('fs');
const cheerio = require('cheerio');

var fileName = 'Haxan.1922.by.lutfucan.html';
var titleStringClass = '.result__a';
var resultDescriptionClass = '.result__snippet';
var linkAttribute = 'href';

// shortens reference to console object
const log = console.log.bind(console);

// extracts id of given result
function linkSlicer(i) {
    return i.slice(i.indexOf('/movie/') + 7, i.indexOf('-'));
}

// return array of objects that contain specified value or phrase
function companyFilter(obj) {
    return obj.link.includes('/movie/');
}

// merges toghether three result arrays
let combine = function (title, desc, link) {
    var combinedResults = [];
    for (i = 0; i < title.length; i++) {
        combinedResults[i] = {
            title: title[i],
            link: link[i],
            desc: desc[i]
        };
    }
    return combinedResults;
}

// extracts title from result header
function titleSlicer(i) {
    if (i.includes('(')) {
        return i.slice(0, i.indexOf(')') + 1);
    } else {
        return i;
    }

}

// added promise elements
var getResultsList = async (htmlSource) => {
    return new Promise((resolve, reject) => {
        let $ = cheerio.load(htmlSource);
        var resultTitles = [];
        var resultDescription = [];
        var resultLinks = [];

        // checks if it has first class that we are looking for, if not, function breaks and returns empty array
        if ($(titleStringClass).hasClass(titleStringClass.slice(1))) {
            log(`[getResultsList] Document structure is correct.`)
        } else {
            log(`[getResultsList] missing document class: ${titleStringClass}`);
            // return [];
            reject([]);
        }

        // find HTML element that coresponds with link title
        $(titleStringClass).each(function (i, e) {
            resultTitles[i] = $(this).text();
        });

        // find HTML element that coresponds with link description and url
        $(resultDescriptionClass).each(function (i, e) {
            resultDescription[i] = $(this).text();
            resultLinks[i] = $(this).attr(linkAttribute);
        })

        combinedResults = combine(resultTitles, resultDescription, resultLinks);

        var withoutCompany = combinedResults.filter(companyFilter);

        withoutCompany.forEach(
            resultItem => resultItem.link = linkSlicer(resultItem.link)
        )

        withoutCompany.forEach(
            resultItem => resultItem.title = titleSlicer(resultItem.title)
        )
        // return withoutCompany;
        resolve(withoutCompany);
    })
}

// test cheerio parser reading data from a file
function testFileReader(fileName) {
    fs.readFile(fileName, function (err, data) {
        if (err) {
            return console.log(err);
        }
        var output = getResultsList(data.toString());
        console.log(output);
    })
};


// testFileReader(fileName);

module.exports = { getResultsList, testFileReader };