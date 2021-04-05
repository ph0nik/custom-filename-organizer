const chokidar = require('chokidar');
const fs = require('fs');
const fsprom = require('fs/promises');
const request = require('./request_service');
const nanoid = require('nanoid');
const config = require('./config')
const fileService = require('./file_service');
const { FileQueue } = require('./FileQueue');
const sleep = require('util').promisify(setTimeout);
// const _ = require('lodash');

// var sourceDirectory = 'G:\\JavaScript\\node-crash-course-ninja\\watchtest';
const sourceDirectory = config.user.sourceDirectory;
const filesList = config.files.filesList;




// shortens reference to console object
const log = console.log.bind(console);

// function check if the file extension matches any that is included in user list of extensions
const isVideoFile = (fileName) => {
    videoExtensions = config.extensions;
    ext = fileName.slice(fileName.lastIndexOf('.') + 1);
    if (videoExtensions.includes(ext)) {
        return true;
    } else return false;
};

const testFileReader = (fileName) => {
    fs.readFile(fileName, function (err, data) {
        if (err) {
            return console.log(err);
        }
        var output = getResultsList(data.toString());
        console.log(output);
    })
};

const getPathObject = (path) => {
    return {
        id: nanoid.nanoid(10),
        path: path
    }
};

const pathQueue = new FileQueue(); // new files queue

const updateFilesList = async () => {
    try {
        const diskData = await fileService.loadDatabase();
        let errorCode = 200;
        let elementCount = 0;
        while (pathQueue.hasNext() && errorCode === 200) {
            let path = pathQueue.dequeue();
            if (fileService.findInMap(diskData, path) !== null) {
                log(`${new Date(Date.now()).toISOString()} | ${path} | ignored`);
            } else {
                log(`${new Date(Date.now()).toISOString()} | ${path} | new element`); // send request for every new element
                const id = nanoid.nanoid(10); // genrate random identifier    
                const temp = await request.titlesLookUp(path, id);
                await sleep(5000);
                // const temp = await request.titlesLookUp(path, id);
                errorCode = temp;
                if (errorCode === 200) {
                    diskData.set(id, path); // on any error response from server do not save data to disk        
                    elementCount++;
                }
            }
        }
        fileService.saveDatabase(diskData)
            .then(() => log(`${new Date(Date.now()).toISOString()} | ${elementCount} elements saved`))
            .catch((err) => log(err));
    } catch (err) {
        if (err.code == 'ENOENT') log(`[updateFilesList] ${filesList} file does not exsist!`);
    }
}

const cleanupOnLoad = async () => {
    await fileService.cleanUp();
}

const deleteSymLink = async (path) => {
    // const deleteSymLink = async function (elementId, search)
    try {
        // const data = await fsprom.readFile(filesList, 'utf8');
        // const filesArr = JSON.parse(data);
        // const elem = filesArr.find(x => x.path === path);
        const map = await fileService.loadDatabase();
        const id = fileService.findInMap(map, path);
        // await deleted
        fileService.deleteOnly(id, path);
    } catch (err) {
        log(err);
    }


    // fileService.deleteSymLink
}

/* 
    Return list of watch folders based on list of extensions and directory
*/
const getExtensions = () => {
    let sourceDir = 'G:/JavaScript/disk-crawler/test/watchlist/**/*.';
    let extensions = config.extensions;
    return extensions.map(ext => sourceDir + ext);
}

const addPathElement = (path) => {
    pathQueue.enqueue(path);
}

let watchObjStates = 0;
/* 
    Periodically check watcher object, if new path elements have beed added load them into the queue.
    Else if queue is not empty update file queue.
*/
const getWatchedList = async (watcherObject, interval) => {
    await sleep(1000);
    while (true) {
        let input = watcherObject.getWatched();
        if (watcherObject._eventsCount != watchObjStates) { // check if events count has changed since last iteration
            watchObjStates = watcherObject._eventsCount; // update events count
            let regex = /^[\w,\s-,\.]+\.[A-Za-z]{2,4}$/;
            let keys = Object.keys(input);
            for (const key of keys.values()) {
                for (const val of input[key].filter(el => el.match(regex)).values()) {
                    let path = key + '\\' + val;
                    pathQueue.enqueue(path);
                }
            }
            await updateFilesList();
        }
        if (pathQueue.hasNext()) { // there were no events, check if elements have been added manually
            await updateFilesList();
        }
        await sleep(interval);
    }
}

// defines watcher object
const watcher = chokidar.watch(getExtensions(), {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    awaitWriteFinish: false
});

// TODO let chokidar collect new files and periodically read its base to extract files to the queue
// use glob patterns
// trigger collect function on server get method - everytime user loads up interface
// find sweet spot for interval time reloading method in background


// starts the watcher with specified actions on different events
const loadChokidar = () => {
    return watcher
        .on('add', async (path) => { // in case of file added
            if (isVideoFile(path)) {
                log(`${new Date(Date.now()).toISOString()} | ${path} | added`);
                // testFileQueue.enqueue(path); // call method with path only!!!!

            }
        })
        .on('change', path => {
            if (isVideoFile(path)) {
                log(`${new Date(Date.now()).toISOString()} | ${path} | changed`);
                // testFileQueue.enqueue(path);
                // updateFilesList();
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
            cleanupOnLoad();
            getWatchedList(watcher, 2000);
        });
}



module.exports = { loadChokidar, addPathElement }
