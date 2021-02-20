const express = require('express');
const fs = require('fs');
const fsa = require('fs/promises');
const request = require('./request_and_queue');
const testParser = require('./parser');
const fileService = require('./file_service');
const dirWatcher = require('./dir_watcher');

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

// register view engine
app.set('view engine', 'ejs');

// listen for request = start server
app.listen(config.server.port);

// set up folder for static files
app.use(express.static('public'));

// function gets data and turns it into a object
app.use(express.urlencoded({ extended: true }));

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
    if (action.hasOwnProperty('clean-button')) {
        fileService.cleanUp();
    }
    

})

app.get('/', (req, res) => {
    if (areFoldersSet()) {
        fs.readdirAsync(queueFolder)
            .then((filenames) => {
                // extracting files IDs from list of files inside folder
                queueFilesIds = filenames.map(elem => elem.split('.')[0]);
                return Promise.all(filenames.map(getQueueFile));
            })
            .then((queueResults) => {
                // pair file IDs with result lists found in queue folder
                queueElementResults = queueFilesIds.map((elem, index) => {
                    return { id: elem, filepath: '', results: queueResults[index] }
                });
                // get listed files data from database.json
                fs.readfileAsync(filesList, 'utf8')
                    .then((data) => {
                        queueArray = queueElementResults.map((elem) => {
                            found = data.find(obj => obj.id === elem.id);
                            if (found === undefined) {
                                elem.filepath = 'NOT FOUND';
                                log(`ID [${elem.id}] not found in database.json!`);
                            } else {
                                elem.filepath = found.path;
                            }
                            return elem;
                        })
                        res.render('index', { queueArray });
                    })
                // catching any rejects from promises
            }).catch((err) => {
                log(err);
            });
    } else {
        res.redirect('/setup');
    }

})

app.post('/', async (req, res) => {
    log(req.body);
    let selection = req.body;
    if (selection.type === 'search') {
        const search = await request.manualSearch(selection.id, selection.query);
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

app.post('/links', (req, res) => {
    log(req.body);
})

app.use((req, res) => {
    res.send('404');
})