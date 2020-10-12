new Vue({
    el: "#app",
    data: {
        socket: undefined,
        clipboardAccessType: undefined,
        youtubeUrl: undefined,
        serverData: undefined,
        connectedProjectorsCount: 0,
        logEntries: [],
        video: {
            title: undefined,
            description: undefined,
            thumbnailSrc: undefined,
            // playState: undefined,
            url: undefined,
            fullUrl: undefined
        },
        playPauseLabel: "Play"
    },
    mounted: function() {
        this.socket = io();

        var self = this;

        if(typeof(NativeAndroid) != "undefined") {
            this.clipboardAccessType = "NativeAndroid";
        }
        else {
            if(navigator && navigator.clipboard && typeof(navigator.clipboard.readText) == "function") {
                navigator.clipboard.readText()
                .then(function() {
                    self.clipboardAccessType = "browser";
                })
                .catch(function() {
                    self.clipboardAccessType = "none";
                });
            }
        }

        var self = this;

        this.socket.on('connect', function() {
            self.log('Connected to controller server');
        });

        this.socket.on('disconnect', function() {
            self.log("!! Disconnected from controller server");
        });

        this.socket.on('error', function() {
            self.log("!! Error from controller server");
        });

        this.socket.on('connect_error', function() {
            self.log("!! connect_error from controller server");
        });

        this.socket.on('connect_timeout', function() {
            self.log("!! connect_timeout from controller server");
        });

        this.socket.on('reconnect', function() {
            self.log("!! reconnect from controller server");
        });

        this.socket.on('reconnect_attempt', function() {
            self.log("!! reconnect_attempt from controller server");
        });

        this.socket.on('reconnecting', function() {
            self.log("!! reconnecting from controller server");
        });

        this.socket.on('reconnect_error', function() {
            self.log("!! reconnect_error from controller server");
        });

        this.socket.on('reconnect_failed', function() {
            self.log("!! reconnect_failed from controller server");
        });

        this.socket.on("serverStateUpdate", function(stateJson) {
            self.log("controller client on serverStateUpdate");
            var state = JSON.parse(stateJson);
            if(state.connectedProjectorsCount !== undefined) {
                self.connectedProjectorsCount = state.connectedProjectorsCount;
            }
        });

        this.socket.on("message", function(message) {
            self.log("!! Message from server: " + message);
        });

        this.socket.on("serverDataResponse", function(serverDataResponseJson) {
            self.log("controller client on serverDataResponse");
            var serverDataResponse = JSON.parse(serverDataResponseJson);
            self.serverData = serverDataResponse.data;
        });

        this.log("projector client emit requestServerData");
        this.socket.emit("requestServerData");

        this.socket.on("loadVideoResponse", function(responseText) {
            self.log("controller client on loadVideoResponse");
            var response = JSON.parse(responseText);

            if(response.type == "error") {
                alert("loadVideoResponse error:\n" + response.data);
                return;
            }

            var d = response.data;
            console.log(d);

            self.video.url = d.allData.url;
            self.video.fullUrl = "https://www.youtube.com" + self.video.url;
            self.video.title = d.allData.videoDetails.title;

            var thumbnails = d.allData.videoDetails.thumbnail.thumbnails;
            var thumbnailIndex = Math.round(thumbnails.length / 2);
            var thumbnail = thumbnails[thumbnailIndex];
            self.video.thumbnailSrc = thumbnail.url;

            self.video.description = d.allData.videoDetails.description.simpleText;

            // this.video.playState = d.playState;
            // if(this.video.playState == "paused") {
            //     this.playPauseLabel = "Play";
            // }
            // else {
            //     this.playPauseLabel = "Pause";
            // }

        });

        // this.socket.on("videoStateUpdated", newVideoStateJson => {
        //     var newVideoState = JSON.parse(newVideoStateJson);

        //     // if(newVideoState.playState !== undefined) {
        //     //     if(newVideoState.playState == "paused") {
        //     //         this.playPauseLabel = "Play";
        //     //     }
        //     //     else {
        //     //         this.playPauseLabel = "Pause";
        //     //     }
        //     // }

        //     // tbd
        //     // if(newVideoState.fullscreen)
        // });
    },
    methods: {
        pasteYoutubeUrl: function() {
            var self = this;

            switch(this.clipboardAccessType) {
                case "NativeAndroid": {
                    self.youtubeUrl = NativeAndroid.pasteFromClipboard();
                    self.log("controller client emit loadVideo");
                    self.socket.emit("loadVideo", self.youtubeUrl);
                    break;
                }
                case "browser": {
                    navigator.clipboard.readText()
                    .then(function(url) {
                        self.youtubeUrl = url;
                        self.log("controller client emit loadVideo");
                        self.socket.emit("loadVideo", url);
                    });
                    break;
                }
            }

            // var url = await navigator.clipboard.readText();
            // this.socket.emit("loadVideo", url);
        },
        log: function(text) {
            var time = new Date().toISOString().substr(11, 8);
            this.logEntries.push("(" + time + ") " + text);
            console.log(text);
        },
        clearYoutubeUrl: function() {
            this.youtubeUrl = "";
        },
        submitYoutubeUrl: function() {
            this.log("controller client emit loadVideo");
            this.socket.emit("loadVideo", this.youtubeUrl);
        },
        showInstructions: function() {
            var self = this;
            var urls = this.serverData.localIpAddresses.map(function(ip) {
                return "http://" + ip + ":" + self.serverData.projectorServerPort;
            });
                
            var text = urls.join("\n");
            alert(text);
        },
        play: function() {
            this.log("controller client emit controlVideo");
            this.emit("controlVideo", { name: "play" });
        },
        pause: function() {
            this.log("controller client emit controlVideo");
            this.emit("controlVideo", { name: "pause" });
        },
        seek: function(amount) {
            this.log("controller client emit controlVideo");
            this.emit("controlVideo", { name: "seek", amount: amount });
        },
        emit: function(channel, object) {
            this.socket.emit(channel, JSON.stringify(object));
        }
    }
});