const chokidar = require('chokidar');
const fs = require('fs');
const fsprom = require('fs/promises');
const request = require('./request_and_queue');
const nanoid = require('nanoid');
const config = require('./config')
const fileService = require('./file_service');

// var sourceDirectory = 'G:\\JavaScript\\node-crash-course-ninja\\watchtest';
const sourceDirectory = config.user.sourceDirectory;
const filesList = config.files.filesList;

// defines watcher object
const watcher = chokidar.watch(sourceDirectory, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    awaitWriteFinish: false
});

// shortens reference to console object
const log = console.log.bind(console);

// function check if the file extension matches any that is included in user list of extensions
function isVideoFile(fileName) {
    videoExtensions = config.extensions;
    ext = fileName.slice(fileName.lastIndexOf('.') + 1);
    if (videoExtensions.includes(ext)) {
        return true;
    } else return false;
};

function testFileReader(fileName) {
    fs.readFile(fileName, function (err, data) {
        if (err) {
            return console.log(err);
        }
        var output = getResultsList(data.toString());
        console.log(output);
    })
};

function getPathObject(path) {
    return {
        id: nanoid.nanoid(10),
        path: path
    }
};

var pathList = [];

const updateFilesList = async (arr) => {
    try {
        const data = await fsprom.readFile(filesList, 'utf8');
        diskData = (data.length == 0) ? [{ id: '', path: '' }] : JSON.parse(data);
        
        arr.forEach(x => {
            // If element already exists do nothing
            if (diskData.find(obj => obj.path == x.path) !== undefined) {
                log(`${new Date(Date.now()).toISOString()} | ${x.path} | ignored`);                
            } else {
                // If element is new add it to list stored on disk
                log(`${new Date(Date.now()).toISOString()} | ${x.path} | new element`);
                request.titlesLookUp(x);
                diskData = [...diskData, x];
                log(`${new Date(Date.now()).toISOString} | ${x.path} | saved`);
            }
        })
        fsprom.writeFile(filesList, JSON.stringify(diskData))
        .catch((err) => log(err));
        
    } catch (err) {
        if (err.code == 'ENOENT') {
            log(`[updateFilesList] ${filesList} file does not exsist!`);
        }
        log(err);
    }
}

const deleteSymLink = async function (path) {
    // const deleteSymLink = async function (elementId, search)
    try {
        const data = await fsprom.readFile(filesList, 'utf8');
        const filesArr = JSON.parse(data);
        const elem = filesArr.find(x => x.path === path);
        await fileService.deleteOnly(elem.id);
        log(`${new Date(Date.now()).toISOString()} ${path} | tracks deleted`);

    } catch(err) {
        log(err);
    }
    

    // fileService.deleteSymLink
}

// starts the watcher with specified actions on different events
watcher
    // in case of file added
    .on('add', path => {
        if (isVideoFile(path)) {
            log(`${new Date(Date.now()).toISOString()} | ${path} | added`);
            // TODO change the way objects are added to array
            pathList.push(getPathObject(path));
        }
    })
    .on('change', path => {
        if (isVideoFile(path)) {
            log(`${new Date(Date.now()).toISOString()} | ${path} | changed`);
            pathList.push(getPathObject(path));
            updateFilesList(pathList);
            pathList = [];
        }
    })
    // in case of file delete
    .on('unlink', path => {
        if (isVideoFile(path)) {
            log(`${new Date(Date.now()).toISOString()} | ${path} | deleted`);
            // TODO
            // after deleting and adding the same file it doesn't go to the queue
            deleteSymLink(path);
        }
        // find file in db and delete symlink
    })
    .on('error', error => log('Watcher error:', error))
    // after initial scan
    .on('ready', () => {
        log(new Date(Date.now()), 'Scanning finished | ready!');
        updateFilesList(pathList);
        // tempArray = [];
    });

