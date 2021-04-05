const got = require('got');
const fs = require('fs').promises;
const parser = require('./parser');
const config = require('./config');

// change request to ->site:themoviedb.org/movie the comb 1991 -company +Overview
// remove duplicate link ids from results?

let fileName = 'G:\\JavaScript\\node-crash-course-ninja\\watchtest\\Climb Dance - Ari Vatanen.mpg';
let appUserAgent = config.web.appUserAgent;
let options = config.web.options;
let queueFolder = config.dirs.queueFolder;

// shortens reference to console object
const log = console.log.bind(console);

//returns file name without path and extension
function getFileName(f) {
    if (f.includes('\\')) {
        return fileNameExtracted = f.slice(f.lastIndexOf('\\'), f.lastIndexOf('.'));
    } else return f;

}

// create url link with given search phrase
function createSearchUrl(f) {
    return config.urls.search_a + getFileName(f) + '+overview';
}


// create search object based on custom phrase
const manualSearch = async (id, phrase) => {
    return await titlesLookUp(phrase, id);
}

// TODO
// use proxy list, add selected adressess to queue, proces file queue one by one using different proxies


// Returns response code received from server
// accepts file path as argument
const titlesLookUp = async (path, id) => {
    let query = 'site:themoviedb.org/movie ' + getFileName(path) + ' +overview';
    const data = { // POST data
        q: query,
        b: ''
    };
    const usp = new URLSearchParams(data); // url search params

    // options for POST request with proxy
    const optionsPost = {
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Content-Type': 'application/x-www-form-urlencoded',
            'DNT': 1,
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': 1,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.192 Safari/537.36 OPR/74.0.3911.218'
        },
        form: usp, // using form
        // agent: {
        //     http: new HttpProxyAgent({
        //         keepAlive: true,
        //         keepAliveMsecs: 1000,
        //         maxSockets: 256,
        //         maxFreeSockets: 256,
        //         scheduling: 'lifo',
        //         proxy: 'http://135.181.198.130:80'
        //     })
        // }
    };
    // create search url
    // const searchUrl = createSearchUrl(n.path);
    const searchUrl = 'https://html.duckduckgo.com';
    // const searchUrl = 'https://www.wp.pl';
    try {
        const response = await got.post(searchUrl, optionsPost);
        log(`[Server response] Code: ${response.statusCode}`);
        if (response.statusCode === 200) {
            const webResults = await parser.getResultsList(response.body);
            if (webResults.length !== 0) {
                queueFileName = queueFolder + id + '.json'; // file name -> id.json >> [list]
                await fs.writeFile(queueFileName, JSON.stringify(webResults))
                    .then(() => log('[titlesLookUp(n)] ', new Date(Date.now()), '|', queueFileName, '| Queue updated'))
                    .catch((err) => log(err));
                return response.statusCode; // after all operations are finished return status code
            }
        } else {
            log(`[Server response] Error code: ${response.statusCode}`);
            return response.statusCode;
        }
    } catch (error) {
        log(`[request module] Error ${error.response.statusCode}: ${error.response.body}`);
        return error.response.statusCode;
    }
};

module.exports = { titlesLookUp, manualSearch };