
//TODO add file naming pattern
// 
const config = {
    user: {
        symLinkFolder: "g:\\JavaScript\\disk-crawler\\test\\symlink\\", // user symlink folder
        sourceDirectory: "G:\\JavaScript\\disk-crawler\\test\\watchlist\\" // user watched folder
    },
    dirs: {
        queueFolder: "./data/queue/",            
        links: "./data/links/"
    },
    files: {
        filesList: "./data/database.json",
    },
    urls: {
        search_a: 'https://html.duckduckgo.com/html/?q=site%3Athemoviedb.org%2Fmovie+',
        search_b: '&t=opera&ia=web'
    },
    extensions: ['avi', 'mkv', 'rmvb', 'wmv', 'mpg', 'mpeg', 'mpv', 'ogm', 'm2v', 'qt', 'mov', 'asf', 'mp4', 'm4v'],
    web: {
        appUserAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36 OPR/73.0.3856.344',
        options: {
            'dnt': '1',
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
            'accept-encoding': 'gzip, deflate, sdch, br',
            'content-type': 'application/x-www-form-urlencoded',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
            'referer': 'html.duckduckgo.com',
            'authority': 'duckduckgo.com'
        }
    },
    server: {
        port: 5000,

    }
}

module.exports = config;