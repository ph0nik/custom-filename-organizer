const config = {
    dirs: {
        queueFolder: "./queue/",
        symLinkFolder: 'G:\\JavaScript\\node-crash-course-ninja\\symlink\\',
        sourceDirectory: 'G:\\JavaScript\\node-crash-course-ninja\\watchtest',
        links: "./links/"

    },
    files: {
        filesList: './database.json',
    },
    urls: {
        search_a: 'https://html.duckduckgo.com/html/?q=site%3Athemoviedb.org%2Fmovie+',
        search_b: '&t=opera&ia=web'
    },
    extensions: ['avi', 'mkv', 'rmvb', 'wmv', 'mpg', 'mpeg', 'mpv', 'ogm', 'm2v', 'qt', 'mov', 'asf', 'mp4', 'm4v'],
    web: {
        appUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36 OPR/73.0.3856.344',
    },
    server: {
        port: 5000,

    }
}

module.exports = config;