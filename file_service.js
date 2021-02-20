const fs = require('fs');
const fsprom = require('fs/promises');
const config = require('./config');
const request = require('./request_and_queue');

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
function saveSymlinkInfo(objectPath, linkPath, objectId) {
    const writePath = linksFolder + objectId + '.json';
    const symLinkObj = { 'file': objectPath, 'link': linkPath };
    fs.writeFile(writePath, JSON.stringify(symLinkObj), (err) => {
        if (err) {
            log(`[saveSymlinkInfo]${err}`);
        } else {
            log('[saveSymlinkInfo]', new Date(Date.now()), 'Symlink info saved for [', objectPath, ']');
        }
    })
}

// creates symlink absolute path
function createSymLinkPath(n, fileExt) {
    return symLinkFolder + n.title + '\\' + n.title + ' [tmbdid=' + n.link + ']' + fileExt;
}

// delete position from existing queue
function deleteQueueElement(queueFileName) {
    fsprom.unlink(queueFileName)
        .then(() => {
            log('[deleteQueueElement]', new Date(Date.now()), '[', queueFileName, '] deleted');
        })
        .catch((err) => log(err));
}

// creates symlink folder absolute path
function createSymLinkFolder(n) {
    log(`[createSymLinkFolder]${symLinkFolder + n.title}`);
    return symLinkFolder + n.title
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

function deleteAndSearch(elementId) {
    deleteSymLink(elementId, true);
}

function deleteOnly(elementId) {
    deleteSymLink(elementId, false);
}
// delete existing symlink > send request > add to queue
const deleteSymLink = async function (elementId, search) {
    const linkFile = `${linksFolder}${elementId}.json`;
    try {
        const data = await fsprom.readFile(linkFile, 'utf8');
        const parsed = JSON.parse(data);
        const extractedFolderPath = parsed.link.slice(0, parsed.link.lastIndexOf('\\'));
        const extractedFilePath = parsed.link;
        const originalFilePath = parsed.file;
        // delete symlink
        await fsprom.unlink(extractedFilePath);
        // delete symlink folder
        await fsprom.rmdir(extractedFolderPath);
        // delete file containing information about link
        await fsprom.unlink(linkFile);
        log(`new Date(Date.now()) ${extractedFilePath} link deleted.`);
        if (search) {
            // create look up object
            const lookUpObject = {
                id: elementId,
                path: originalFilePath
            }
            // get results for given object
            request.titlesLookUp(lookUpObject);
        }
    } catch (err) {
        log(err);
    }
}

function unique(arr) {
    let flags = {};
    var emptyArr = arr.filter(elem => {
        if (flags[elem.path]) {
            return false;
        }
        flags[elem.path] = true;
        return true;
    })
    // log(emptyArr);
    return emptyArr;
}

const cleanUp = async function () {
    try {
        // get the files from db
        const data = await fsprom.readFile(filesList, 'utf8');
        const parsed = JSON.parse(data);
        // runs access check on all the paths in the given file
        const tempArr = await Promise.all(parsed.map(async (elem) => {
            try {
                // try to check acces to every file, on error checks if file is missing
                await fsprom.access(elem.path);
                // on success it returns the same element
                return elem;
            } catch (err) {
                // if file is not found, element is marked with 'delete' statement and returned
                if (err.code === 'ENOENT') {
                    log(`[cleanUp][${elem.path}] not found`);
                    return elem = { id: elem.id, path: 'delete' };
                }
            }
        }))
        /// deletes all elements from queue, that have been marked above
        tempArr.forEach((elem) => {
            const qe = `${queueFolder}${elem.id}.json`;
            if (elem.path === 'delete') {
                fsprom.unlink(qe)
                    .catch(err => {
                        if (err.code === 'ENOENT') {
                            log(`[cleanUp][${qe}] ignored non existing file`);
                        } else {
                            log(`[cleanUp]${err}`)
                        }
                    })
            }
        })
        // delete objects pointing to non existing files
        const output = tempArr.filter((el) => { return el.path != 'delete' });
        // get list of files from queue folder
        const files = await fsprom.readdir(queueFolder);
        // delete all queue files that are not present in db
        for (const file of files) {
            if (output.find(x => x.id === file.split('.')[0]) === undefined) {
                fsprom.unlink(queueFolder + file)
                    .then(() => {
                        log(`[cleanUp] File ${file} deleted`);
                    });
            }
        }
        // save new file decsriptors to file
        await fsprom.writeFile(filesList, JSON.stringify(output));
    } catch (err) {
        log(`[cleanUp]${err}`);
    }
}

// deleteSymLink('-lckiv7nQf');
const createSymLink = async (elementId, queueElementIndex) => {
    try {
        const fileData = await fsprom.readFile(filesList, 'utf8');
        diskData = JSON.parse(fileData);

        // check if object with given id is present on the list retrieved from a file
        let objectById = diskData.find(x => x.id === elementId);
        if (objectById === undefined) {
            log(`[createSymLink] No matching objects found in file: ${filesList}`);
            // delete from queue
            const queueFileName = `${queueFolder}${elementId}.json`;
            deleteQueueElement(queueFileName);
        } else {
            // get file path
            let objectPath = objectById.path;
            // extract file extension
            let objectExtension = objectPath.slice(objectPath.lastIndexOf('.'), objectPath.length);
            // relative path
            const queueFileName = `${queueFolder}${elementId}.json`;
            // get result values from file with matching id
            const qdata = await fsprom.readFile(queueFileName, 'utf8');
            let queueElementResults = JSON.parse(qdata);
            // create symlink path with given element index
            const symLinkFolder = createSymLinkFolder(queueElementResults[queueElementIndex]);
            const symLinkPath = createSymLinkPath(queueElementResults[queueElementIndex], objectExtension);
            fsprom.mkdir(symLinkFolder)
                .finally(() => {
                    fsprom.symlink(objectPath, symLinkPath)
                        .then(() => {
                            // save symlink info - operation id, original file path and symlink path
                            saveSymlinkInfo(objectPath, symLinkPath, elementId);
                            log('[createSymLink]', new Date(Date.now()), objectPath, ' -> ', symLinkPath, '| link created.');
                            // delete queue file
                            deleteQueueElement(queueFileName);
                        })
                        .catch((err) => {
                            if (err && err.code === 'EEXIST') {
                                log(`[createSymLink][${symLinkPath}] Symlink already exists!`);
                            } else {
                                log(`[createSymLink][${symLinkPath}] ${err}`);
                            }
                        })
                })
                .catch((err) => {
                    log(`[createSymLink][${symLinkFolder}]${err}`);
                })
        };
    } catch (err) {
        if (err.code == 'ENOENT') {
            log(`[createSymLink][readFile] ${filesList} file does not exsist!`);
            return;
        }
        log(err);
    }

}

testObj = { type: 'select', id: 'AXDokRIFH-', index: '2' }
// createSymLink(testObj.id, testObj.index);

// function createSymLink_bak(elementId, queueElementIndex) {
//     // get file path by id
//     fs.readFile(filesList, 'utf8', (err, fileData) => {
//         if (err) {
//             // check if file is present
//             if (err.code == 'ENOENT') {
//                 log(`file-service -> ${filesList}file does not exsist!`);
//                 return;
//             }
//             return log(err);
//         }
//         try {
//             diskData = JSON.parse(fileData);
//         } catch (err) {
//             log(err.toString());
//             return;
//         }
//         // check if object with given id is present on the list retrieved from a file
//         let objectById = diskData.filter(x => {
//             return x.id === elementId;
//         });
//         if (objectById.length === 0) {
//             log(`${new Date(Date.now())} No matching objects found in file: ${filesList}`);
//             // delete from queue
//         } else {
//             // get file path
//             objectPath = objectById[0].path;
//             // extract file extension
//             objectExtension = objectPath.slice(objectPath.lastIndexOf('.'), objectPath.length);
//         }

//         // relative path
//         const queueFileName = `${queueFolder}${elementId}.json`;
//         // get result values from file with matching id
//         fs.readFile(queueFileName, 'utf8', (err, qdata) => {
//             if (err) {
//                 if (err.code == 'ENOENT') {
//                     log(`${queueFileName} file does not exsist!`);
//                     return;
//                 } else {
//                     log(err);
//                     return;
//                 }
//             }
//             try {
//                 queueElementResults = JSON.parse(qdata);
//                 // singleResult = JSON.parse(qdata);
//             } catch (err) {
//                 log(err.toString());
//                 return;
//             }
//             // create symlink path with given element index

//             const symLinkFolder = createSymLinkFolder(queueElementResults[queueElementIndex]);
//             // create folder
//             fs.mkdir(symLinkFolder, (err) => {
//                 if (!err || err.code === 'EEXIST') {
//                     const symLinkPath = createSymLinkPath(queueElementResults[queueElementIndex], objectExtension);
//                     // create symlink
//                     fs.symlink(objectPath, symLinkPath, (err) => {
//                         if (err && err.code === 'EEXIST') {
//                             log('Symlink already exists!');
//                         } else if (err) {
//                             log(err);
//                         } else {
//                             // save symlink info - operation id, original file path and symlink path
//                             saveSymlinkInfo(objectPath, symLinkPath, elementId);
//                             log(new Date(Date.now()), objectPath, ' -> ', symLinkPath, '| symlink created.');
//                             // delete queue file
//                             deleteQueueElement(queueFileName);
//                         }
//                     })
//                 } else {
//                     log(err);
//                 }
//             });
//         })
//     })
// };

module.exports = { createSymLink, deleteSymLink, cleanUp }