// NAME: Autoplay
// AUTHOR: uAreASimp
// VERSION: 0.1
// DESCRIPTION: Autoplays selected song after having song be paused for 5 seconds, pause song to revert back to original before autoplay.
    

(function AutoPlay() {

    //CHANGE FOR SONG YOU WANT TO AUTOPLAY
    const SONG_URI = "spotify:track:0MUQtVlIkuMeDfZFm5xKRq"

    
    // Constants
    const BUTTON_NAME_TEXT = "AutoPlay";
    const STORAGE_KEY = "autoplay_spicetify";



    // Retrieve or initialize state from localStorage
    let autoPlayVar = localStorage.getItem(STORAGE_KEY) === "true";
    let autoPlayedVar = localStorage.getItem(STORAGE_KEY) === "false";
    let savedPlaybackState = null; 

    // Reference to the button instance
    let autoplayButton = null;

    // Function to toggle autoplay variable and update localStorage
    function toggleAutoPlay() {
        autoPlayVar = !autoPlayVar; // Toggle the variable
        localStorage.setItem(STORAGE_KEY, autoPlayVar); // Save to localStorage
        updateButton(); // Update the button's appearance
    }

    // Function to update the button's appearance based on autoPlayVar
    function updateButton() {
        const icon = autoPlayVar
            ? `<svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.350175,0.37457282C9.7802043,0.37457282,6.2102339,0.37457282,2.6402636,0.37457282C2.1901173,0.43000784,2.3537108,0.94911284,2.3229329,1.2621688C2.3229329,5.9446788,2.3229329,10.62721,2.3229329,15.309742C2.4084662,15.861041,2.9630936,15.536253,3.1614158,15.248148C4.7726941,13.696623,6.3839408,12.145098,7.9952191,10.593573C9.7069009,12.241789,11.418583,13.890005,13.130265,15.53822C13.626697,15.863325,13.724086,15.200771,13.667506,14.853516C13.667506,10.132999,13.667506,5.4124518,13.671726,0.52196684C13.520105,0.37034182,13.350175,0.37457282ZM13.032844,14.563698C11.426929,13.017345,9.8210448,11.470993,8.2151293,9.9246401C7.8614008,9.6568761,7.6107412,10.12789,7.3645243,10.320193C5.8955371,11.734694,4.4265815,13.149196,2.9575943,14.563698C2.9575943,10.045543,2.9575943,5.5273888,2.9575943,1.0092338C6.3160002,1.0092338,9.674438,1.0092338,13.032844,1.0092338C13.032844,5.5273888,13.032844,10.045543,13.032844,14.563698Z"></path></svg>`
            : `<svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2,2.5C2,2.22386,2.22386,2,2.5,2H13.5C13.7761,2,14,2.22386,14,2.5C14,2.77614,13.7761,3,13.5,3H2.5C2.22386,3,2,2.77614,2,2.5ZM2.5,7C2.22386,7,2,7.22386,2,7.5C2,7.77614,2.22386,8,2.5,8H13.5C13.7761,8,14,7.77614,14,7.5C14,7.22386,13.7761,7,13.5,7H2.5ZM2,12.5C2,12.2239,2.22386,12,2.5,12H13.5C13.7761,12,14,12.2239,14,12.5C14,12.7761,13.7761,13,13.5,13H2.5C2.22386,13,2,12.7761,2,12.5Z"></path></svg>`;

        const buttonText = autoPlayVar ? `${BUTTON_NAME_TEXT} (On)` : `${BUTTON_NAME_TEXT} (Off)`;

        if (autoplayButton) {
            autoplayButton.text = buttonText;
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

    //const SONG_URI = "spotify:track:5RhWszHMSKzb7KiXk4Ae0M"; // Replace with your desired Spotify URI
    const WAIT_TIME = 5000; // 5 seconds
    let timerId = null;
    let lastPlayerState = null;

    function checkPlaybackState() {

        // Check if autoPlayVar is true
        if (!autoPlayVar) {
           // console.log("Auto play is not enabled. Skipping playback state check.");
            clearTimer();
            return;
        }

      //  console.log("Checking playback state...");
        const playerState = getPlayerState();

        if (!playerState) {
          //  console.log("No player state available.");
            return;
        }

        const isPlaying = !playerState.isPaused;
      //  console.log("isPlaying:", isPlaying);

        if (isPlaying) {
         //   console.log("Song is playing. Clearing timer if it exists.");
            clearTimer();
            lastPlayerState = playerState;
        } else {
            if (autoPlayedVar === true) {
                restorePlaybackState();
            }
            else {
            //    console.log("No song playing. Starting timer.");
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

    function startTimer() {
        if (timerId === null) {
            timerId = setTimeout(() => {
            //    console.log(`No song playing for ${WAIT_TIME} ms. Auto-playing song: ${SONG_URI}`);
                saveCurrentPlaybackState();
                Spicetify.Player.setVolume(0);
                setTimeout(() => {
                    playSong(SONG_URI);
                }, 200);
                autoPlayedVar = true;
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
     //   console.log("Attempting to play song:", uri);
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
        };

        
        //console.log("Current track URI:", Spicetify.Player.data?.item.uri);

        console.log("Saved playback URI:", savedPlaybackState.uri);
        console.log("Saved playback progress:", savedPlaybackState.position);
        console.log("Saved playback volume:", savedPlaybackState.volume);
    } else {
        console.log("No player state available. Cannot save playback volume.");
    }
}









    function restorePlaybackState() {
        if (savedPlaybackState) {
            console.log("Restoring playback state:", savedPlaybackState);
            Spicetify.Player.playUri(savedPlaybackState.uri);
            Spicetify.Player.setVolume(savedPlaybackState.volume);
            setTimeout(() => {
                Spicetify.Player.seek(savedPlaybackState.position);
                savedPlaybackState = null; // Clear saved state after restoring
            }, 200);
            autoPlayedVar = false;
        }
    }


















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
