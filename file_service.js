const fs = require('fs');
const fsprom = require('fs/promises');
const config = require('./config');
const request = require('./request_service');
// const dirWatcher = require('./dir_watcher');
const sleep = require('util').promisify(setTimeout);

const symLinkFolder = config.user.symLinkFolder;
const filesList = config.files.filesList;
const queueFolder = config.dirs.queueFolder;
const linksFolder = config.dirs.links;

// shortens reference to console object
const log = console.log.bind(console);

// Name (Year) [tmdbid=xxxx]
// n - result object
// {id: id, index: index}
var testId = 'u8SlTMytFM';
var index = 0;
var testObj = {
    "id": testId,
    "index": index
}


// creates file with information about current symlink
const saveSymlinkInfo = (objectPath, linkPath, objectId) => {
    const writePath = linksFolder + objectId + '.json';
    const symLinkObj = { 'file': objectPath, 'link': linkPath };
    fsprom.writeFile(writePath, JSON.stringify(symLinkObj))
        .then(() => { log('[saveSymlinkInfo]', new Date(Date.now()), 'Symlink info saved for [', objectPath, ']'); })
        .catch((err) => { log(`[saveSymlinkInfo] ${err}`); });
}

// delete position from existing queue
function deleteQueueElement(queueFileName) {
    fsprom.unlink(queueFileName)
        .then(() => {
            log('[deleteQueueElement]', new Date(Date.now()), '[', queueFileName, '] deleted');
        })
        .catch((err) => log(err));
}

// changes illegal characters for underscore
function characterPrison(phrase) {
    let illegalChars = /[/?<>\:*"]/g;
    return phrase.replace(illegalChars, '_');
}

// / ? < > \ : * | "
// creates symlink folder absolute path
function createSymLinkFolder(n) {
    friendlyTitle = characterPrison(n.title);
    log(`[createSymLinkFolder]${symLinkFolder + friendlyTitle}`);
    return symLinkFolder + friendlyTitle;
}

// creates symlink absolute path
function createSymLinkPath(n, fileExt, part) {
    friendlyTitle = characterPrison(n.title);
    if (part !== 0) {
        friendlyTitle = friendlyTitle + '-disc' + part;
    }
    return symLinkFolder + friendlyTitle + '\\' + friendlyTitle + ' [tmbdid=' + n.link + ']' + fileExt;
}

// promise wrapper around read file function
fs.readfileAsync = (filename) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf8', (err, data) => {
            if (err) {
                // check if file is present
                if (err.code == 'ENOENT') {
                    log(`${filesList} file not found!`);
                }
                reject(err);
            } else {
                try {
                    output = JSON.parse(data);
                } catch (err) {
                    reject(err);
                }
                resolve(output);
            }
        })
    })
};

const deleteAndSearch = (elementId) => {
    deleteSymLink(elementId, true);
};

const deleteOnly = (elementId, path) => {
    deleteSymLink(elementId, false)
        .then(() => { log(`${new Date(Date.now()).toISOString()} ${path} | tracks deleted`) });
};
// TODO add method delete folder with all its contents
// delete existing symlink > send request > add to queue
const deleteSymLink = async function (elementId, search) {
    const linkFile = `${linksFolder}${elementId}.json`;
    try {
        const data = await fsprom.readFile(linkFile, 'utf8');
        const db = await loadDatabase();
        const parsed = JSON.parse(data);
        const extractedFolderPath = parsed.link.slice(0, parsed.link.lastIndexOf('\\'));
        const extractedFilePath = parsed.link;
        await fsprom.readdir(extractedFolderPath) // delete all files from symlink folder
            .then((files) => {
                for (const file of files.values()) {
                    fsprom.unlink(extractedFolderPath + '\\' + file)
                        .catch((err) => { log(err) });
                }
            })
            .then(() => {
                fsprom.rmdir(extractedFolderPath); // delete symlink folder
                fsprom.unlink(linkFile); // delete file containing information about link
            })
            .catch((err) => { log(err) });
        log(`${new Date(Date.now()).toISOString()} ${extractedFilePath} link deleted.`);
        let newPath = db.get(elementId);
        db.delete(elementId); // delete path from databse
        await saveDatabase(db);
        if (search) {
            // dirWatcher.addPathElement(newPath); // add element to search queue
        }
    } catch (err) {
        if (err.code === 'ENOENT' && err.path === linkFile) {
            log(`${new Date(Date.now()).toISOString()} | ${linkFile} | no links for this file found`);
        }
        log(err);
    }
};

// let testLink = 'ht5dts4xOs';
// deleteSymLink(testLink);

// save db to file, takes map as argument, returns promise
const saveDatabase = (map) => {
    let output = Object.fromEntries(map);
    return fsprom.writeFile(filesList, JSON.stringify(output));
    // .then(() => { log(`${new Date(Date.now()).toISOString()} [file service] database saved`) })
    // .catch((err) => {
    //     log(err);
    //     log()
    // });
};

const loadDatabase = () => {
    const tempMap = new Map();
    return fsprom.readFile(filesList, 'utf8')
        .then((data) => {
            let obj = JSON.parse(data);
            for (const [key, value] of Object.entries(obj)) { tempMap.set(key, value); }
            return tempMap;
        })
        .catch((err) => {
            // log(err);
            log(`[loadDB] Error: wrong data input or missing file`);
            return tempMap;
        });
};

const loadQueueElement = (queueFileName) => {
    return fsprom.readFile(queueFileName, 'utf8')
        .then((data) => {
            let obj = JSON.parse(data);
            return obj;
        })
        .catch((err) => {
            // log(err);
            log(`[loadQueue] Error: wrong data input or missing file`);
            let empty = { 'title': '', 'link': '', 'desc': '' }; // in case of strange behaviour return empty object
            return empty;
        })
};

// finds given value inside given map, returns key for given value otherwise returns null
const findInMap = (map, value) => {
    for (const key of map.keys()) {
        if (map.get(key) === value) return key;
    }
    return null;
};

/* 
    Removes wrongfuly created queue files and invalid elements from database.
*/
const cleanUp = async function () {
    const parsed = await loadDatabase();
    let dirCounter = 0;
    /* 
       Runs access check on all the paths in the given file.
       Always reports first element, which is object with empty id and empty path. 
    */
    for (const key of parsed.keys()) {
        await fsprom.access(parsed.get(key)) // check access to file
            .catch((err) => {
                if (err.code === 'ENOENT') {
                    log(`[cleanUp][${parsed.get(key)}] not found`);
                    dirCounter++;
                    parsed.set(key, 'delete'); // on error mark element for deletion
                }
            });
    }
    log(`[cleanUp] Directory checkup finished, found ${dirCounter} invalid directories.`);
    let linkCounter = 0;
    /* 
        For every invalid path found in database, delete queue file pointing to that path.
    */
    for (const key of parsed.keys()) { // deletes all elements from queue, that have been marked above
        const qe = `${queueFolder}${key}.json`;
        if (parsed.get(key) === 'delete') {
            parsed.delete(key);
            linkCounter++;
            fsprom.unlink(qe)
                .then((qe) => {
                    log(`[cleanUp][queue] ${qe} invalid queue file deleted.`)
                })
                .catch((err) => {
                    if (err.code === 'ENOENT') log(`[cleanUp][${qe}] ignored non existing file`);
                    else log(`[cleanUp]${err}`)
                });
        }
    }
    linkCounter = 0;
    /* 
        Delete every file queue file that doesn't appear in database.
    */
    fsprom.readdir(queueFolder) // delete queue files absent from db
        .then((files) => {
            for (const file of files) {
                let key = file.split('.')[0];
                if (parsed.get(key) === undefined) {
                    linkCounter++;
                    fsprom.unlink(queueFolder + file)
                        .then(() => { log(`[cleanUp] File ${file} deleted`); })
                }
            }
            log(`[cleanUp][not in db] ${linkCounter} invalid queue links found.`);
        });
    /* 
        Save new file descriptors to database.
    */
    saveDatabase(parsed);
};


/* 
    Creates folder with given full path, only if it doesn't exist.
*/
const createFolder = async (folderName) => {
    let folderExists = await fsprom.access(folderName)
        .then(() => {
            return true;
        })
        .catch(() => {
            return false;
        })
    if (folderExists) {
        log(`[createFolder]${folderName} already exists`)
    } else {
        return fsprom.mkdir(folderName)
            .catch((err) => {
                log(`[createFolder][${folderName}] ${err}`);
            })
    }
};

/* 
    Regular expression list containint phrases that may occur in the file name, in case of movies split into multiple files.
*/
const regexArr = [/cd[^A-Za-z]?\d/i, /disc[^A-Za-z]?\d/i, /part[^A-Za-z]?\d/i, /chapter[^A-Za-z]?\d/i, /s\d\de\d\d/i];

/* 
    Checks if given file name (with full path) contains a movie split into parts. 
    If so, returns part number extracted from a file name, else returns 0.
*/
const getDiscNumber = (path) => {
    let fileName = path.slice(path.lastIndexOf('\\') + 1, path.lastIndexOf('.')).toLowerCase();
    for (i = 0; i < regexArr.length; i++) {
        let expression = regexArr[i];
        let result = fileName.match(expression);
        if (result !== null && i < 4) {
            let notDigit = /\D/g;
            return result[0].replace(notDigit, ''); // extract digits from found phrase
        }
        if (result !== null && i >= 4) {
            return result[0].substring(5); // extract last character from found phrase
        }
    }
    return 0;
}

/* 
    Creates symlink folder and file with given arguments, element id and array index.
    When successful, creates link file containing both original file path and symlink file path.
    Finally, deletes queue file with given id.
*/
const createSymLink = async (elementId, queueElementIndex) => {
    const diskData = await loadDatabase();
    // check if object with given id is present on the list retrieved from a file
    const queueFileName = `${queueFolder}${elementId}.json`;
    if (diskData.get(elementId) === undefined) {
        log(`[createSymLink] No matching objects found in file: ${filesList}`);
    } else {
        let objectPath = diskData.get(elementId); // get path
        let objectExtension = objectPath.slice(objectPath.lastIndexOf('.'), objectPath.length); // extract extension
        const queueElementResults = await loadQueueElement(queueFileName); // get queue file
        let discNumber = getDiscNumber(objectPath); // get part number if movie has been split, else return 0
        const symLinkFolder = createSymLinkFolder(queueElementResults[queueElementIndex]); // create symlink folder
        const symLinkPath = createSymLinkPath(queueElementResults[queueElementIndex], objectExtension, discNumber); // create symlink path
        await createFolder(symLinkFolder);
        fsprom.symlink(objectPath, symLinkPath)
            .then(() => {
                saveSymlinkInfo(objectPath, symLinkPath, elementId); // save symlink info - operation id, original file path and symlink path
                log('[createSymLink]', new Date(Date.now()), symLinkPath, '| link created.');
            })
            .catch((err) => {
                if (err && err.code === 'EEXIST') { log(`[createSymLink][${symLinkPath}] Symlink already exists!`); }
                else { log(`[createSymLink][${symLinkPath}] ${err}`); }
            })
    }
    deleteQueueElement(queueFileName);
}

module.exports = { createSymLink, deleteSymLink, cleanUp, deleteOnly, saveDatabase, loadDatabase, findInMap }