    // let router = new Router();


    // // rest endpoints
    // router.get('/api/getVideo', async (ctx) => {
    //     let videoYoutubeUrl = ctx.query.url;
    //     let videoInfo = await ytdl.getInfo(videoYoutubeUrl);
    //     let format = videoInfo.formats.find(f => f.qualityLabel == "720p");
    //     ctx.body = format.url;
    // });

    // router.post('/api/whatever', (ctx) => {
    //     ctx.body = 'hi from post'
    // });

    // projectorApp.use(router.routes());

            // socket.on("videoRequest", async () => {
        //     let videoYoutubeUrl = "https://www.youtube.com/watch?v=Wy_k0Tywpb4";
        //     let videoInfo = await ytdl.getInfo(videoYoutubeUrl);
        //     let format = videoInfo.formats.find(f => f.qualityLabel == "720p");
        //     // ctx.body = format.url;
        //     socket.emit("loadVideo", format.url);
        // });