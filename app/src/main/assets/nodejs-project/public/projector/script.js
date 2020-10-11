var app = new Vue({
    el: "#app",
    data: {
        socket: undefined,
        overlayVisible: undefined,
        ignoreControlCommands: undefined,
        headerVisible: true,
        headerPinned: true,
        headerFadeoutTimeout: undefined,
        video: {
            title: undefined,
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

        // var videoData = {
        //     allData: "{raw data from ytdl}",
        //     selectedOptions: {
        //         videoUrl: "the video url from the format selected in the controller"
        //     }
        // };

        var self = this;

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
            console.log("projector client on loadVideoInProjector");
            
            var videoData = JSON.parse(videoDataJson);
            self.video.allData = videoData.allData;
            self.video.title = videoData.allData.videoDetails.title;
            self.video.videoUrl = videoData.selectedOptions.videoUrl;
            self.video.audioUrl = videoData.selectedOptions.audioUrl;

            self.video.playState = "paused";
            self.video.currentTime = 0;
            self.video.totalTime = videoData.allData.videoDetails.lengthSeconds;

            self.videoElement.src = self.video.videoUrl;
            self.audioElement.src = self.video.audioUrl;
        });

        this.socket.on("controlVideoInProjector", function(commandJson) {
            console.log("projector client on controlVideoInProjector");

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
                    self.videoElement.currentTime += command.amount;

                    if(self.video.audioUrl !== undefined) {
                        self.audioElement.currentTime = self.videoElement.currentTime;
                    }

                    var newCurrentTime = self.video.currentTime + command.amount;
                    newCurrentTime = Math.max(newCurrentTime, 0);
                    newCurrentTime = Math.min(newCurrentTime, self.video.totalTime);
                    self.video.currentTime = newCurrentTime;

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