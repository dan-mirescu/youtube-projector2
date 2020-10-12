let Koa     = require('koa'),
    send    = require('koa-send'),
    Router  = require('@koa/router'),
    serve   = require('koa-static');

const ytdl = require("ytdl-core");

const projectorApp = new Koa();
const projectorServer = require('http').createServer(projectorApp.callback());
const projectorIo = require("socket.io")(projectorServer);

const controllerApp = new Koa();
const controllerServer = require('http').createServer(controllerApp.callback());
const controllerIo = require("socket.io")(controllerServer);

const serverConfig = {
    projectorServerPort: 4000,
    controllerServerPort: 4001
};

const serverData = {
    projectorServerPort: undefined,
    controllerServerPort: undefined,
    localIpAddresses: []
};

function populateServerData() {
    const os = require("os");

    serverData.projectorServerPort = serverConfig.projectorServerPort;
    serverData.controllerServerPort = serverConfig.controllerServerPort;

    const nets = os.networkInterfaces();
    let localIpAddresses = [];
    // const results = Object.create(null); // or just '{}', an empty object

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                // if (!results[name]) {
                //     results[name] = [];
                // }

                // results[name].push(net.address);
                localIpAddresses.push(net.address);
            }
        }
    }

    serverData.localIpAddresses = localIpAddresses;
}
populateServerData();

const state = {
    connectedProjectorsCount: 0,
    loadedVideo: {
        url: undefined,
        // playState: undefined,
        selectedVideoFormat: undefined,
        selectedAudioFormat: undefined,
        allData: undefined // from ytdl
    }
};

function configureProjectorApp() {
    // serve files in public folder (css, js etc)
    projectorApp.use(serve(__dirname + '/public/projector'));

    // this last middleware catches any request that isn't handled by
    // koa-static or koa-router, ie your index.html in your example
    projectorApp.use(function* index() {
        yield send(this, __dirname + '/index.html');
    });

    projectorIo.on('connection', function(socket){
        console.log('projector io connected');
        state.connectedProjectorsCount ++;

        controllerIo.emit("serverStateUpdate", JSON.stringify({
            connectedProjectorsCount: state.connectedProjectorsCount
        }));

        socket.on("disconnect", () => {
            console.log('!! projector socket disconnected');
            state.connectedProjectorsCount --;
            controllerIo.emit("serverStateUpdate", JSON.stringify({
                connectedProjectorsCount: state.connectedProjectorsCount
            }));
        });

        socket.on("error", (error) => {
            let message = '!! projector socket error: ' + error;
            console.log(message);
            controllerIo.emit("message", message);
        });

        if(state.loadedVideo.url) {
            console.log("projector server emit loadVideoInProjector");

            socket.emit("loadVideoInProjector", JSON.stringify({
                allData: state.loadedVideo.allData,
                selectedOptions: {
                    videoUrl: state.loadedVideo.selectedVideoFormat.url,
                    audioUrl: state.loadedVideo.selectedAudioFormat ? state.loadedVideo.selectedAudioFormat.url : undefined
                }
            }));

            // if(state.loadedVideo.playState == "playing") {
            //     socket.emit("controlVideoInProjector", "play");
            // }
        }
    });

    projectorServer.listen(4000, () => {
        console.log('Projector is starting on port 4000')
    });
}

function configureControllerApp() {
    controllerApp.use(serve(__dirname + '/public/controller'));

    let router = new Router();
    router.get("/api/ping", (ctx) => {
        ctx.set('Access-Control-Allow-Origin', '*');
        ctx.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        ctx.set('Access-Control-Allow-Methods', 'GET');
        ctx.body = "pong";
    });
    controllerApp.use(router.routes());

    controllerApp.use(function* index() {
        yield send(this, __dirname + '/index.html');
    });

    controllerIo.on('connection', function(socket){
        console.log('controller io connected');

        socket.on("disconnect", () => {
            console.log('!! controller socket disconnected');
        });

        socket.on("error", (error) => {
            console.log('!! controller socket error: ' + error);
        });

        if(state.loadedVideo.url) {
            console.log("controller server emit loadVideoInProjector");
            socket.emit("loadVideoResponse", JSON.stringify({
                type: "data",
                data: {
                    // playState: state.loadedVideo.playState,
                    allData: state.loadedVideo.allData
                }
            }));
        }

        socket.emit("serverStateUpdate", JSON.stringify({
            connectedProjectorsCount: state.connectedProjectorsCount
        }));

        socket.on("requestServerData", () => {
            console.log("ZEZ controller server on requestServerData");

            console.log("controller server emit serverDataResponse");
            socket.emit("serverDataResponse", JSON.stringify({
                type: "data",
                data: serverData
            }));
        });

        socket.on("loadVideo", async (requestedYoutubeUrl) => {
            console.log("ZEZ controller server on loadVideo");

            // let videoYoutubeUrl = "https://www.youtube.com/watch?v=Wy_k0Tywpb4";
            try {
                let ytdlVideoInfo = await ytdl.getInfo(requestedYoutubeUrl);
                let response = {
                    type: "data",
                    data: {
                        // playState: "paused",
                        allData: ytdlVideoInfo
                    }
                };

                // state.playState = "paused";
                state.loadedVideo.url = ytdlVideoInfo.url;
                state.loadedVideo.allData = ytdlVideoInfo;

                // state.loadedVideo.selectedFormat = ytdlVideoInfo.formats.find(f => f.qualityLabel == "720p");

                let videoFormat = ytdlVideoInfo.formats.find(f => f.qualityLabel == "720p" && f.hasAudio && f.hasVideo);
                if(!videoFormat) {
                    videoFormat = ytdlVideoInfo.formats.find(f => f.qualityLabel == "720p" && f.container == "mp4");

                    let audioFormats = ytdlVideoInfo.formats.filter(f => f.hasAudio && f.container == "mp4");
                    let maxAudioBitrate = Math.max(...audioFormats.map(af => af.audioBitrate));
                    let selectedAudioFormat = audioFormats.find(af => af.audioBitrate == maxAudioBitrate);
                    state.loadedVideo.selectedAudioFormat = selectedAudioFormat;
                }
                else {
                    state.loadedVideo.selectedAudioFormat = undefined;
                }
                state.loadedVideo.selectedVideoFormat = videoFormat;

                console.log("projector server emit loadVideoInProjector");
                projectorIo.emit("loadVideoInProjector", JSON.stringify({
                    allData: ytdlVideoInfo,
                    selectedOptions: {
                        videoUrl: state.loadedVideo.selectedVideoFormat.url,
                        audioUrl: state.loadedVideo.selectedAudioFormat ? state.loadedVideo.selectedAudioFormat.url : undefined,
                    }
                }));

                console.log("controller server emit loadVideoResponse");
                socket.emit("loadVideoResponse", JSON.stringify(response));
            }
            catch(e) {
                let response = {
                    type: "error",
                    data: e.message
                };
                console.log("controller server emit loadVideoResponse with error");
                socket.emit("loadVideoResponse", JSON.stringify(response));
            }
        });

        socket.on("controlVideo", commandJson => {        
            console.log("ZEZ controller server on controlVideo");
            
            let command = JSON.parse(commandJson);

            switch(command.name) {
                case "play": {
                    console.log("projector server emit play");
                    projectorIo.emit("controlVideoInProjector", JSON.stringify({ name: "play" }));
                    break;
                }
                case "pause": {
                    console.log("projector server emit pause");
                    projectorIo.emit("controlVideoInProjector", JSON.stringify({ name: "pause" }));
                    break;
                }
                case "seek": {
                    console.log("projector server emit seek");
                    projectorIo.emit("controlVideoInProjector", JSON.stringify({ name: "seek", amount: command.amount }));
                    break;
                }
            }
        });
    });

    controllerServer.listen(4001, () => {
        console.log('Controller is starting on port 4001');
    });
}

configureProjectorApp();
configureControllerApp();
