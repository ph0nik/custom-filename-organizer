const got = require('got');
const fs = require('fs').promises;
const parser = require('./parser');
const config = require('./config');

// change request to ->site:themoviedb.org/movie the comb 1991 -company +Overview
// remove duplicate link ids from results?

let fileName = 'G:\\JavaScript\\node-crash-course-ninja\\watchtest\\Climb Dance - Ari Vatanen.mpg';
let appUserAgent = config.web.appUserAgent;
let queueFolder = config.dirs.queueFolder;

// shortens reference to console object
const log = console.log.bind(console);

//returns file name without path and extension
function getFileName(f) {
	// log(f);
	if (f.includes('\\')) {
		return fileNameExtracted = f.slice(f.lastIndexOf('\\'), f.lastIndexOf('.'));
	} else return f;

}

// create url link with given search phrase
function createSearchUrl(f) {
	return config.urls.search_a + getFileName(f)+ '+ overview' + config.urls.search_b;
}

var testObj = { "id": "ctt7lvmKRN", "path": "G:\\JavaScript\\node-crash-course-ninja\\watchtest\\Upstream.Color.2013.BRRIP.XVID-AC3-PULSAR-sample.avi" };

// create search object based on custom phrase
async function manualSearch(id, phrase) {
	return new Promise((resolve, reject) => {
		obj = {
			'id': id,
			'path': phrase
		};
		resolve(titlesLookUp(obj));
	})
}

// sprawic by ta funkcja zwracala wartosc
async function titlesLookUp(n) {
	// create search url
	const searchUrl = createSearchUrl(n.path);
	var options = {
		headers: {
			'user-agent': appUserAgent
		}
	}
	try {
		// get results from external source
		const response = await got(searchUrl, options);
		const webResults = await parser.getResultsList(response.body);

		// file name -> id.json >> [list]
		queueFileName = queueFolder + n.id + '.json';
		log(queueFileName);

		// TODO change to async perhaps?
		fs.writeFile(queueFileName, JSON.stringify(webResults), function (err) {
			if (err) log(err);
			log(new Date(Date.now()), '|', queueFileName, '| Queue updated')
		});
	} catch (error) {
		errObj = [{
			'title': 'ERROR',
			'link': '',
			'desc': error.response.body
		}];
		// TODO correct below part
		// save file containing search results elements
		log(errObj);
		// fs.writeFile(queueFileName, JSON.stringify(errObj), (err) => {
		// 	if (err) log(err);
		// 	log(new Date(Date.now()), '|', queueFileName, '| Queue updated')
		// })
		log(error.response.body);
	}
};

module.exports = { titlesLookUp, manualSearch };
// titlesLookUp(fileName);

