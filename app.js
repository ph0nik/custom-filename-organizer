const express = require('express');
const fs = require('fs');
const fsprom = require('fs/promises');
const requestService = require('./request_service');
const testParser = require('./parser');
const fileService = require('./file_service');
const directoryService = require('./dir_watcher');

const config = require('./config');
const queueFolder = config.dirs.queueFolder;
const symLinkFolder = config.user.symLinkFolder;
const sourceDirectory = config.user.sourceDirectory;
const linkDirectory = config.dirs.links;
const filesList = config.files.filesList;

// express app
const app = express();

// shortens reference to console object
const log = console.log.bind(console);

// check if user folders are correctly configured
function areFoldersSet() {
    return sourceDirectory === '' || symLinkFolder === '' ? false : true;
}

let watch = directoryService.loadChokidar(); // load directory watcher module



app.set('view engine', 'ejs'); // register view engine

// app.set('dirWatch', watch);

app.listen(config.server.port); // listen for request = start server

app.use(express.static('public')); // set up folder for static files

app.use(express.urlencoded({ extended: true })); // function gets data and turns it into a object

// promise wrapper around read files in directory function
fs.readdirAsync = (dirname) => {
    return new Promise((resolve, reject) => {
        fs.readdir(dirname, (err, filenames) => {
            if (err) {
                reject(err);
            } else {
                resolve(filenames);
            }
        })
    })
};

// promise wrapper around read file function
fs.readfileAsync = (filename, options) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, options, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(data));
            }
        })
    })
};

// helper function
function getQueueFile(filename) {
    return fs.readfileAsync(queueFolder + filename, 'utf8');
}

function getLinksFile(filename) {
    return fs.readfileAsync(linkDirectory + filename, 'utf8');
}

//TODO
// setup endpoint
// TODO set default naming convention, prompt user to inpu custom naming pattern
app.get('/setup', (req, res) => {
    const links = {
        symlink: symLinkFolder,
        source: sourceDirectory
    }
    res.render('setup', { links });
    // check if paths were setup
    // prompt user if they weren't 
});

app.post('/setup', async (req, res) => {
    log(req.body);
    let action = req.body;
    if (action.hasOwnProperty('cleanup')) {
        await fileService.cleanUp();
    }
    res.redirect('/setup');
})

app.get('/', async (req, res) => {
    if (areFoldersSet()) {
        const filenames = await fsprom.readdir(queueFolder)
            .catch((err) => { log(`[app.get('/')]${err}`); });
        const queueFilesIds = filenames.map(elem => elem.split('.')[0]);
        const queueResults = [];
        for (const file of filenames.values()) {
            let resList = await fsprom.readFile(queueFolder + file, 'utf8')
                .catch((err) => { log(err); });
            queueResults.push(JSON.parse(resList));
        }
        const dataMap = await fileService.loadDatabase();
        const queueArray = queueFilesIds.map((elem, index) => {
            let path = dataMap.get(elem);
            if (path === undefined) log(`[app.get('/')] ID [${elem}] not found in database.json!`);
            return { id: elem, filepath: path, results: queueResults[index] };
        });
        res.render('test', { queueArray });
    } else {
        res.redirect('/setup');
    }

})

// temporary object to store last search parameters
let cachedSearchObject = {
    type: '',
    id: '',
    query: ''
}

// compares values of temporary object to the one passed via POST method
const compareSearchObject = (obj) => {
    if (cachedSearchObject.id === obj.id && cachedSearchObject.query === obj.query) return true;
    else {
        cachedSearchObject = obj;
        return false
    };
}

//TODO add multi version movies
/* 
    regural
    uncut
    director's cut
    unrated
    
*/
app.post('/', async (req, res) => {
    log('[post] ' + req.body);
    let selection = req.body;
    if (selection.type === 'search') {
        // check if this exact selection was performed last time
        if (compareSearchObject(selection)) {
            log(`[app.post('/'] Search ignored due to repeated values`);
        } else {
            const search = await requestService.manualSearch(selection.id, selection.query);
        }
    } else if (selection.type === 'select') {
        const search = await fileService.createSymLink(selection.id, selection.index);
    }
    res.redirect('/');
})

app.get('/links', (req, res) => {
    fs.readdirAsync(linkDirectory)
        .then((filenames) => {
            linksIds = filenames.map(elem => elem.split('.')[0])
            return Promise.all(filenames.map(getLinksFile));
        })
        .then((links) => {
            links = links.map((link, index) => {
                return { id: linksIds[index], file: link.file, link: link.link };
            })
            res.render('links', { links });
        })
})

app.post('/links', async (req, res) => {
    // log(req.body);
    let id = req.body.id;
    let db = await fileService.loadDatabase();
    let path = db.get(id);
    await fileService.deleteSymLink(id, false);
    directoryService.addPathElement(path);
    res.redirect('/');
})

app.use((req, res) => {
    res.send('404');
})