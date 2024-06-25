// NAME: Autoplay
// AUTHOR: uAreASimp
// VERSION: 0.3.5
// DESCRIPTION: Autoplays selected song after having song be paused for 5 seconds, pause song to revert back to original before autoplay.
/// <reference path="../../../Local/spicetify/globals.d.ts" />


(async function AutoPlay() {

    if (!(Spicetify.showNotification && Spicetify.Platform && Spicetify.ContextMenu && Spicetify.URI && Spicetify.SVGIcons)) {
        setTimeout(AutoPlay, 10);
        return;
    }


    // Constants
    const BUTTON_NAME_TEXT = "AutoPlay";
    const BUTTON2_NAME_TEXT = "Last FM Farm"
    const STORAGE_KEY = "autoplay_spicetify";
    const AUTO_PLAYED_KEY = "is_auto_played"
    const LastFMToggle = "is_LFM_Toggle";
    let playlisturi;


    // Add CSS for the textbox
    const style = document.createElement('style');
    style.innerHTML = `
    #autoplayIndicator {
        position: fixed;
        bottom: 100px; /* Adjust this value as needed */
        right: 10px;
        padding: 10px;
        background-color: rgba(255, 255, 255, 1);
        color: black;
        border-radius: 5px;
        display: none;
        z-index: 1000;
    }
`;
    document.head.appendChild(style);

    // Add the textbox to the document
    const indicator = document.createElement('div');
    indicator.id = 'autoplayIndicator';
    indicator.innerText = 'Autoplayed, pause to return';
    document.body.appendChild(indicator);



    // Retrieve or initialize state from localStorage
    let autoPlayVar = localStorage.getItem(STORAGE_KEY) === "true";
    let autoPlayedVar = localStorage.getItem(AUTO_PLAYED_KEY); // Updated key here
    let SONG_URI = localStorage.getItem("SONG_URI") || "spotify:track:4PTG3Z6ehGkBFwjybzWkR8";
    let LFMFarmVar = localStorage.getItem(LastFMToggle) === "true";
    let savedPlaybackState = null;
    let songChangeCheck = false;
    let isRestoring = false;
    let isStartingAuto = false;

    // Initialize autoPlayedVar if it's not set
    if (autoPlayedVar === null) {
        autoPlayedVar = false;
        localStorage.setItem(AUTO_PLAYED_KEY, false);
    }
    autoPlayedVar = false;
    localStorage.setItem(AUTO_PLAYED_KEY, false);

    // Reference to the button instance
    let autoplayButton;
    let LFMButton;
    let songProgress;

    // Function to toggle autoplay variable and update localStorage
    function toggleAutoPlay() {
        autoPlayVar = !autoPlayVar; // Toggle the variable
        localStorage.setItem(STORAGE_KEY, autoPlayVar); // Save to localStorage

        if (autoPlayedVar) { // Updated logic for autoPlayedVar
            restorePlaybackState();
        }

        updateButton(); // Update the button's appearance
    }

    // Function to update the button's appearance based on autoPlayVar
    function updateButton() {
        const icon = autoPlayVar
            ? `<svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 2l10 6-10 6V2z"></path>
                  </svg>`
            : `<svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
                     <path d="M3 2h3v12H3zm7 0h3v12h-3z"></path>`
        const buttonText = autoPlayVar
            ? `${BUTTON_NAME_TEXT} (On)`
            : `${BUTTON_NAME_TEXT} (Off)`

        if (autoplayButton) {
            autoplayButton.label = buttonText;
            autoplayButton.icon = icon;
        } else {
            autoplayButton = new Spicetify.Topbar.Button(
                buttonText,
                icon,
                self => {
                    toggleAutoPlay();
                }
            );
        }
    }

    // Initialize the button
    updateButton();


    // Function to toggle LFM Farm variable and update localStorage
    function toggleLastFMFarm() {
        LFMFarmVar = !LFMFarmVar; // Toggle the variable
        localStorage.setItem(LastFMToggle, LFMFarmVar); // Save to localStorage

        updateFMButton(); // Update the button's appearance
        Spicetify.showNotification("LastFM farm toggled.");
    }

    // Function to update the LFM Farm button's appearance based on LFMFarmVar
    function updateFMButton() {
        const FMicon = LFMFarmVar
            ? `<svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 2l10 6-10 6V2z"></path>
                  </svg>`
            : `<svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
                     <path d="M3 2h3v12H3zm7 0h3v12h-3z"></path>`;
        const FMbuttonText = LFMFarmVar
            ? `${BUTTON2_NAME_TEXT} (On)`
            : `${BUTTON2_NAME_TEXT} (Off)`;

        if (LFMButton) {
            LFMButton.label = FMbuttonText;
            LFMButton.icon = FMicon;
        } else {
            LFMButton = new Spicetify.Topbar.Button(
                FMbuttonText,
                FMicon,
                self => {
                    toggleLastFMFarm();
                }
            );
        }
    }

    // Initialize the LFM Farm button
    updateFMButton();


    const WAIT_TIME = 5000; // 5 seconds
    let timerId = null;
    let lastPlayerState = null;

    function checkPlaybackState() {
        if (!autoPlayVar) {
            //console.log("Auto play is not enabled. Skipping playback state check.");
            clearTimer();
            return;
        }

        //console.log("Checking playback state...");
        const playerState = getPlayerState();
        //console.log(playerState)

        if (!playerState) {
            //console.log("No player state available.");
            return;
        }

        const isPlaying = !playerState.isPaused;

        if (isPlaying) {
            //console.log("Song is playing. Clearing timer if it exists.");
            clearTimer();
            lastPlayerState = playerState;
            return;
        } else if (playerState.isPaused && autoPlayVar) {
            if (autoPlayedVar) {
                //console.log("Restoring playback.")
                restorePlaybackState();
                return;
            } else {
                //console.log("No song playing. Starting timer.");
                startTimer();
                return;
            }
        }
    }



    function songChange() {
        console.log("Songchange check...")
        if (songChangeCheck === true && isRestoring === false && isStartingAuto === false) {
            savedPlaybackState = null; // Clear saved state after restoring
            autoPlayedVar = false;
            localStorage.setItem(AUTO_PLAYED_KEY, false); // Updated localStorage here
            document.getElementById('autoplayIndicator').style.display = 'none';
            songChangeCheck = false;
            console.log("Songchange check approved.")
        }
    }




    //// Register a listener that will be called when player changes track
    //Spicetify.Player.addEventListener("songchange", (event) => {
    //    console.log("SongChange event!")
    //    queueCheck();
    //});



    function getPlayerState() {
        const player = Spicetify.Player;
        if (player && player.data) {
            return player.data;
        }
        return null;
    }

    // Function startTimer() is updated to include localStorage update
    function startTimer() {
        if (timerId === null && autoPlayVar) { // Check if autoPlayVar is true
            timerId = setTimeout(() => {
                isStartingAuto = true;
                console.log(`No song playing for ${WAIT_TIME} ms. Auto-playing song: ${SONG_URI}`);
                saveCurrentPlaybackState();
                Spicetify.Platform.PlayerAPI.clearQueue();
                Spicetify.Player.setVolume(0);
                setTimeout(() => {
                    playSong(SONG_URI);
                    Spicetify.Player.setRepeat(2);
                    Spicetify.Player.setShuffle(false);
                    // Show the autoplay indicator
                    document.getElementById('autoplayIndicator').style.display = 'block';
                }, 200);
                autoPlayedVar = true;
                localStorage.setItem(AUTO_PLAYED_KEY, true); // Updated localStorage here
                timerId = null; // Reset timerId after playing the songset
                setTimeout(() => {
                    songChangeCheck = true;
                    isStartingAuto = false;
                    console.log("SongChangeCheck = true")
                }, 1000);
                console.log("Countdown finished.")
            }, WAIT_TIME);
        }
    }


    function clearTimer() {
        if (timerId !== null) {
            clearTimeout(timerId);
            timerId = null;
        }
    }

    async function playSong(uri) {
        console.log("Attempting to play song:", uri);
        await Spicetify.Player.playUri(uri);
    }


    function isUserAddedTrack(track) {
        // Assume user-added tracks have shorter UID length
        // Adjust this pattern check based on further observations if needed
        return track.uid.length <= 4;
    }

    function differentiateTracks(playerState) {
        const userAddedTracks = [];
        const playlistTracks = [];

        playerState.nextItems.forEach(track => {
            if (isUserAddedTrack(track)) {
                userAddedTracks.push(track);
            } else {
                playlistTracks.push(track);
            }
        });

        console.log('User Added Tracks:', userAddedTracks);
        console.log('Playlist Tracks:', playlistTracks);

        return {
            userAddedTracks,
            playlistTracks
        };
    }



    function saveCurrentPlaybackState() {
        const playerState = getPlayerState();

        if (playerState) {
            const wasPaused = playerState.isPaused;

            // Resume playback if it's paused
            if (wasPaused) {
                Spicetify.Player.play();
            }

            // Attempt to get context URI
            let context_Uri = playerState.context;

            console.log(playerState)

            console.log(context_Uri)

            // Check if the context URI is a playlist
            if (context_Uri.uri.includes('spotify:playlist:')) {
                playlisturi = context_Uri.uri;
            } else {
                playlisturi = "none";
            }

            let queueTracks = differentiateTracks(playerState);


            // Save the volume directly
            savedPlaybackState = {
                playlist: playlisturi,
                uri: playerState.progress !== undefined ? playerState.progress : Spicetify.Player.data?.item.uri,
                userQueue: queueTracks.userAddedTracks.map(track => track.uri),
                position: playerState.progress !== undefined ? playerState.progress : Spicetify.Player.getProgressPercent(),
                volume: playerState.volume !== undefined ? playerState.volume : Spicetify.Player.getVolume(),
                repeat: Spicetify.Player.getRepeat(),
                shuffle: Spicetify.Player.getShuffle(),
            };


            //console.log("Current track URI:", Spicetify.Player.data?.item.uri);


            console.log("Saved playback Song URI:", savedPlaybackState.uri);
            console.log("Saved playback playlist:", savedPlaybackState.playlist);
            console.log("Saved playback queue: ", savedPlaybackState.userQueue);
            console.log("-----------------------------------------------------")
            console.log("Saved playback progress:", savedPlaybackState.position);
            console.log("Saved playback volume:", savedPlaybackState.volume);
            console.log("Saved playback repeat:", savedPlaybackState.repeat);
            console.log("Saved playback shuffle:", savedPlaybackState.shuffle);
        } else {
            console.log("No player state available. Cannot save playback volume.");
        }
    }



    // Function restorePlaybackState() is updated to include localStorage update
    function restorePlaybackState() {
        if (savedPlaybackState && autoPlayedVar) { // Check if autoPlayedVar is true
            isRestoring = true;
            console.log("Restoring playback state:", savedPlaybackState);
            if (savedPlaybackState.playlist === "none") {
                Spicetify.Player.playUri(savedPlaybackState.uri);
            } else {
                Spicetify.Player.playUri(savedPlaybackState.playlist);
                Spicetify.addToQueue([{ uri: savedPlaybackState.uri }]);
                setTimeout(() => {
                    Spicetify.Player.next();
                }, 300);
            }
            setTimeout(() => {
                Spicetify.Player.setVolume(savedPlaybackState.volume);
                Spicetify.Player.setRepeat(savedPlaybackState.repeat);
                Spicetify.Player.setShuffle(savedPlaybackState.shuffle);
                Spicetify.Player.seek(savedPlaybackState.position);
                if (savedPlaybackState.userQueue && savedPlaybackState.userQueue.length > 0) {
                    savedPlaybackState.userQueue.forEach(uri => {
                        Spicetify.addToQueue([{ uri: uri }]);
                    });
                }
                savedPlaybackState = null; // Clear saved state after restoring
                // Hide the autoplay indicator
                document.getElementById('autoplayIndicator').style.display = 'none';
                isRestoring = false;
            }, 800);
            autoPlayedVar = false;
            localStorage.setItem(AUTO_PLAYED_KEY, false); // Updated localStorage here
        }
    }


    const { Type } = Spicetify.URI;

    function setTrackAsAuto(uri) {
        let uriObj = Spicetify.URI.fromString(uri[0]);
        localStorage.setItem("SONG_URI", "spotify:track:" + uriObj.id);
        SONG_URI = localStorage.getItem("SONG_URI") || "spotify:track:4PTG3Z6ehGkBFwjybzWkR8";
        Spicetify.showNotification("Song selected for AutoPlay."),
            console.log("URI Object:", "spotify:track:" + uriObj.id);
    }


    function ifItemIsTrack(uri) {
        let uriObj = Spicetify.URI.fromString(uri[0]);
        switch (uriObj.type) {
            case Type.TRACK:
                return true;
        }
        return false;
    }

    // Create a new menu item that only appears when a track is selected
    const menuItem = new Spicetify.ContextMenu.Item(
        "Set as Autoplay",
        setTrackAsAuto,
        ifItemIsTrack,
        Spicetify.SVGIcons["play"],
        false,
    ).register();



    function queueCheck() {


        if (autoPlayedVar && songChangeCheck && !isStartingAuto && !isRestoring) {
            let queue = Spicetify.Queue.nextTracks;
            let lastQueue;
            if (queue !== lastQueue) {
                console.log("Calling song change event")
                songChange();
            }
            else {
                console.log("Update queue")
                lastQueue = queue;
            }
        }
        else {
            console.log("No song change.")
        }

    }



    function LastFMFarmFunc() {

        if (autoPlayedVar && LFMFarmVar) {
            songProgress = Spicetify.Player.getProgressPercent();

            if (songProgress >= 0.55) {
                Spicetify.Player.next();
                Spicetify.showNotification("LastFM farm: Song skip.");

            }

        }
        //console.log(songProgress)

    };





    function initialize() {
        console.log("Initializing script...");
        if (typeof Spicetify === "undefined" || !Spicetify.Player) {
            console.log("Spicetify or Spicetify.Player not ready. Retrying initialization in 1 second.");
            setTimeout(initialize, 1000);
            return;
        }

        const player = Spicetify.Player;
        if (player) {
            console.log("Spicetify player found. Starting playback state check.");
            setInterval(checkPlaybackState, 1000); // Check playback state every second
            setInterval(LastFMFarmFunc, 1000);
        } else {
            console.log("Spicetify player not ready. Retrying initialization in 1 second.");
            setTimeout(initialize, 1000);
        }
    }

    initialize();
})();
