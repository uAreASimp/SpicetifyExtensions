// NAME: Autoplay
// AUTHOR: uAreASimp
// VERSION: 0.2
// DESCRIPTION: Autoplays selected song after having song be paused for 5 seconds, pause song to revert back to original before autoplay.
/// <reference path="../../../Local/spicetify/globals.d.ts" />


(function AutoPlay() {

    if (!(Spicetify.showNotification && Spicetify.Platform && Spicetify.ContextMenu && Spicetify.URI && Spicetify.SVGIcons)) {
        setTimeout(AutoPlay, 10);
        return;
    }


    //CHANGE FOR SONG YOU WANT TO AUTOPLAY
    let SONG_URI = localStorage.getItem("SONG_URI") || "spotify:track:4PTG3Z6ehGkBFwjybzWkR8";
    //CHANGE FOR SONG YOU WANT TO AUTOPLAY



    // Constants
    const BUTTON_NAME_TEXT = "AutoPlay";
    const STORAGE_KEY = "autoplay_spicetify";
    const AUTO_PLAYED_KEY = "is_auto_played"


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
    let autoPlayedVar = localStorage.getItem(AUTO_PLAYED_KEY) === "true"; // Updated key here
    let savedPlaybackState = null;

    // Initialize autoPlayedVar if it's not set
    if (autoPlayedVar === null) {
        autoPlayedVar = true;
        localStorage.setItem(AUTO_PLAYED_KEY, true);
    }

    // Reference to the button instance
    let autoplayButton;

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

    const WAIT_TIME = 5000; // 5 seconds
    let timerId = null;
    let lastPlayerState = null;

    // Function checkPlaybackState() is updated to ensure correct handling of autoPlayedVar
    function checkPlaybackState() {
        // Check if autoPlayVar is true
        if (!autoPlayVar) {
            //console.log("Auto play is not enabled. Skipping playback state check.");
            clearTimer();
            return;
        }

        //console.log("Checking playback state...");
        const playerState = getPlayerState();

        if (!playerState) {
            //console.log("No player state available.");
            return;
        }

        const isPlaying = !playerState.isPaused;
        //console.log("isPlaying:", isPlaying);

        if (isPlaying) {
            //console.log("Song is playing. Clearing timer if it exists.");
            clearTimer();
            lastPlayerState = playerState;
            if (!autoPlayedVar) {
                document.getElementById('autoplayIndicator').style.display = 'none';
            }
        } else {
            if (autoPlayedVar) { // Updated logic for autoPlayedVar
                restorePlaybackState();
            } else {
                //console.log("No song playing. Starting timer.");
                startTimer();
            }
        }

        if (playerState.isPaused && autoPlayVar) {
            if (autoPlayedVar) { // Updated logic for autoPlayedVar
                restorePlaybackState();
            } else {
                //console.log("No song playing. Starting timer.");
                startTimer();
            }
        }
    }


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
                console.log(`No song playing for ${WAIT_TIME} ms. Auto-playing song: ${SONG_URI}`);
                saveCurrentPlaybackState();
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
                timerId = null; // Reset timerId after playing the song
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



 function saveCurrentPlaybackState() {
    const playerState = getPlayerState();

    if (playerState) {
        const wasPaused = playerState.isPaused;
        
        // Resume playback if it's paused
        if (wasPaused) {
            Spicetify.Player.play();
        }

        // Save the volume directly
        savedPlaybackState = {
            uri: playerState.progress !== undefined ? playerState.progress : Spicetify.Player.data?.item.uri,
            position: playerState.progress !== undefined ? playerState.progress : Spicetify.Player.getProgressPercent(),
            volume: playerState.volume !== undefined ? playerState.volume : Spicetify.Player.getVolume(),
            repeat: Spicetify.Player.getRepeat(),
            shuffle: Spicetify.Player.getShuffle(),
        };

        
        //console.log("Current track URI:", Spicetify.Player.data?.item.uri);

        console.log("Saved playback URI:", savedPlaybackState.uri);
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
        console.log("Restoring playback state:", savedPlaybackState);
        Spicetify.Player.playUri(savedPlaybackState.uri);
        setTimeout(() => {
            Spicetify.Player.setVolume(savedPlaybackState.volume);
            Spicetify.Player.setRepeat(savedPlaybackState.repeat);
            Spicetify.Player.setShuffle(savedPlaybackState.shuffle);
            Spicetify.Player.seek(savedPlaybackState.position);
            savedPlaybackState = null; // Clear saved state after restoring
            // Hide the autoplay indicator
            document.getElementById('autoplayIndicator').style.display = 'none';
        }, 500);
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
        } else {
            console.log("Spicetify player not ready. Retrying initialization in 1 second.");
            setTimeout(initialize, 1000);
        }
    }

    initialize();
})();
