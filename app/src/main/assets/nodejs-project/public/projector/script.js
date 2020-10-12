var app = new Vue({
    el: "#app",
    data: {
        socket: undefined,
        connectionStatus: "pending",
        connectionCssClass: "orange",
        overlayVisible: undefined,
        logVisible: false,
        logEntries: [],
        ignoreControlCommands: undefined,
        headerVisible: true,
        headerPinned: true,
        headerFadeoutTimeout: undefined,
        video: {
            title: "(No video)",
            videoUrl: undefined,
            audioUrl: undefined,
            playState: undefined,
            currentTime: undefined,
            totalTime: undefined,
            allData: undefined
        },
        videoElement: undefined,

        videoTimeInterval: undefined
    },
    mounted: function() {
        this.videoElement = this.$refs.videoElement;
        this.audioElement = this.$refs.audioElement;

        var self = this;

        this.overlayVisible = false;
        this.ignoreControlCommands = false;

        var result = this.videoElement.play();
        if(result && result.then) {
            result.then(function() {
                self.videoElement.pause();
                self.overlayVisible = false;
                self.ignoreControlCommands = false;
            })
            .catch(function() {
                self.overlayVisible = true;
                self.ignoreControlCommands = true;
            });
        }
        else {
            this.videoElement.pause();
        }

        this.socket = io();

        var self = this;

        this.socket.on('connect', function() {
            self.log('Connected to projector server');
            self.connectionStatus = "OK";
            self.connectionCssClass = "green";
        });

        this.socket.on('disconnect', function() {
            self.log("!! Disconnected from projector server");
            self.connectionStatus = "bad";
            self.connectionCssClass = "red";

        });

        this.socket.on('error', function() {
            self.log("!! Error on projector client socket");
        });

        this.socket.on('connect_error', function() {
            self.log("!! connect_error on projector client socket");
            self.connectionStatus = "bad";
            self.connectionCssClass = "red";
        });

        this.socket.on('connect_timeout', function() {
            self.log("!! connect_timeout on projector client socket");
            self.connectionStatus = "bad";
            self.connectionCssClass = "red";
        });

        this.socket.on('reconnect', function() {
            self.log("!! reconnect on projector client socket");
            self.connectionStatus = "OK";
            self.connectionCssClass = "green";
        });

        this.socket.on('reconnect_attempt', function() {
            self.log("!! reconnect_attempt on projector client socket");
            self.connectionStatus = "pending";
            self.connectionCssClass = "orange";
        });

        this.socket.on('reconnecting', function() {
            self.log("!! reconnecting on projector client socket");
            self.connectionStatus = "pending";
            self.connectionCssClass = "orange";
        });

        this.socket.on('reconnect_error', function() {
            self.log("!! reconnect_error on projector client socket");
            self.connectionStatus = "bad";
            self.connectionCssClass = "red";
        });

        this.socket.on('reconnect_failed', function() {
            self.log("!! reconnect_failed on projector client socket");
            self.connectionStatus = "bad";
            self.connectionCssClass = "red";
        });


        // var videoData = {
        //     allData: "{raw data from ytdl}",
        //     selectedOptions: {
        //         videoUrl: "the video url from the format selected in the controller"
        //     }
        // };


        document.addEventListener("mousemove", function() {
            self.showHeader();
            self.scheduleHeaderFadeout();
        });

        this.videoElement.addEventListener("play", function() {
            self.onVideoPlay();
        });

        this.videoElement.addEventListener("pause", function() {
            self.onVideoPause();
        });

        this.videoElement.addEventListener("seeked", function() {
            self.onVideoSeeked();
        });


        this.socket.on("loadVideoInProjector", function(videoDataJson) {
            self.log("projector client: on loadVideoInProjector");
            
            var videoData = JSON.parse(videoDataJson);
            if(videoData) {
                self.video.allData = videoData.allData;
                self.video.title = videoData.allData.videoDetails.title;
                self.video.videoUrl = videoData.selectedOptions.videoUrl;
                self.video.audioUrl = videoData.selectedOptions.audioUrl;
    
                self.video.playState = "paused";
                self.video.currentTime = 0;
                self.video.totalTime = videoData.allData.videoDetails.lengthSeconds;
    
                self.videoElement.src = self.video.videoUrl;
                if(self.video.audioUrl) {
                    self.audioElement.src = self.video.audioUrl;
                }
            }
            else {
                self.video.allData = {};
                self.video.title = "(No video)";
                self.video.videoUrl = "";
                self.video.audioUrl = "";

                self.video.playState = "paused";
                self.video.currentTime = 0;
                self.video.totalTime = 0;

                self.videoElement.src = "";
                self.audioElement.src = "";
            }
        });

        this.socket.on("controlVideoInProjector", function(commandJson) {
            self.log("projector client: on controlVideoInProjector " + commandJson);

            if(self.ignoreControlCommands) {
                console.warn("ignoring control command");
                return;
            }

            var command = JSON.parse(commandJson);

            switch(command.name) {
                case "play": {
                    self.play();
                    break;
                }
                case "pause": {
                    self.pause();
                    break;
                }
                case "seek": {
                    self.seek(command.amount);
                    break;
                }
            }
        });
    },
    methods: {
        play: function() {
            // this.video.playState = "playing";

            // var self = this;

            // clearInterval(this.videoTimeInterval);
            // this.videoTimeInterval = setInterval(function() {
            //     self.video.currentTime ++;
            // }, 1000);

            this.videoElement.play();
            // if(this.video.audioUrl !== undefined) {
            //     this.audioElement.currentTime = this.videoElement.currentTime;
            //     this.audioElement.play();
            // }

            // this.unpinHeader();
            // this.scheduleHeaderFadeout();
        },
        pause: function() {
            // this.video.playState = "paused";

            // this.pinHeader();

            // clearInterval(this.videoTimeInterval);

            this.videoElement.pause();
            // if(this.video.audioUrl !== undefined) {
            //     this.audioElement.pause();
            // }
        },
        seek: function(amount) {
            this.videoElement.currentTime += amount;

            if(this.video.audioUrl !== undefined) {
                this.audioElement.currentTime = this.videoElement.currentTime;
            }

            var newCurrentTime = this.video.currentTime + amount;
            newCurrentTime = Math.max(newCurrentTime, 0);
            newCurrentTime = Math.min(newCurrentTime, this.video.totalTime);
            this.video.currentTime = newCurrentTime;

        },
        log: function(text) {
            var time = new Date().toISOString().substr(11, 8);
            this.logEntries.push("(" + time + ") " + text);
            console.log(text);
        },
        clearLog: function() {
            this.logEntries = [];
        },
        goFullscreen: function() {
            this.videoElement.requestFullscreen();
        },
        showHeader: function() {
            this.headerVisible = true;
        },
        pinHeader: function() {
            this.headerPinned = true;
            this.headerVisible = true;
            clearTimeout(this.headerFadeoutTimeout);
        },
        unpinHeader: function() {
            this.headerPinned = false;
        },
        scheduleHeaderFadeout: function() {
            if(this.headerPinned) {
                return;
            }

            clearTimeout(this.headerFadeoutTimeout);
            var self = this;
            this.headerFadeoutTimeout = setTimeout(function() {
                self.headerVisible = false;
            }, 4000);
        },
        overlayClicked: function() {
            this.overlayVisible = false;
            this.ignoreControlCommands = false;
        },
        onVideoSeeked: function() {
            var newCurrentTime = this.videoElement.currentTime;
            newCurrentTime = Math.max(newCurrentTime, 0);
            newCurrentTime = Math.min(newCurrentTime, this.video.totalTime);
            this.video.currentTime = newCurrentTime;
        },
        onVideoPlay: function() {
            this.video.playState = "playing";

            var self = this;

            clearInterval(this.videoTimeInterval);
            this.videoTimeInterval = setInterval(function() {
                self.video.currentTime ++;
            }, 1000);

            if(this.video.audioUrl !== undefined) {
                this.audioElement.currentTime = this.videoElement.currentTime;
                this.audioElement.play();
            }

            this.unpinHeader();
            this.scheduleHeaderFadeout();
        },
        onVideoPause: function() {
            this.video.playState = "paused";

            this.pinHeader();

            clearInterval(this.videoTimeInterval);

            if(this.video.audioUrl !== undefined) {
                this.audioElement.pause();
            }
        }
        // showHeaderPermanently: function() {
        //     clearTimeout(this.headerFadeoutTimeout);
        //     this.headerVisible = true;
        // },
        // showHeaderTemporarily: function() {
        //     clearTimeout(this.headerFadeoutTimeout);
        //     this.headerVisible = true;
        //     var self = this;
        //     this.headerFadeoutTimeout = setTimeout(function() {
        //         self.headerVisible = false;
        //     }, 4000);
        // }
    },
    filters: {
        friendlyTime: function(valueSeconds) {
            valueSeconds = valueSeconds || 0;
            return new Date(valueSeconds * 1000).toISOString().substr(11, 8);
        }
    }
});


// document.getElementById("lol").addEventListener("click", () => {
//     // socket.emit("chat", "test");
//     socket.emit("videoRequest");
// });

// let video = document.getElementById("video");

// socket.on("loadVideo", (url) => {
//     video.src = url;
//     video.play();
// });