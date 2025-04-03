
let currentSong = new Audio();
let songs;
let currFolder;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}
// Modify the getSongs function to filter out navigation elements
async function getSongs(folder) {
    if (!folder || folder === "undefined") {
        console.error("Invalid folder:", folder);
        return [];
    }

    currFolder = folder;
    console.log(`Fetching songs from folder: ${folder}`);

    try {
        let a = await fetch(`/${folder}/`);
        if (!a.ok) {
            throw new Error(`Failed to fetch songs from ${folder}: ${a.status}`);
        }
        
        let response = await a.text();
        let div = document.createElement("div");
        div.innerHTML = response;
        let as = div.getElementsByTagName("a");
        songs = [];

        console.log(`Found ${as.length} links in ${folder}`);

        // First pass: Look for MP3 files
        for (let index = 0; index < as.length; index++) {
            const element = as[index];
            const href = element.href;
            const innerText = element.innerText || element.textContent;
            
            // Debug each link
            console.log(`Link ${index}: ${href}, Text: ${innerText}`);
            
            // Method 1: Check URL ends with .mp3
            if (href.toLowerCase().endsWith(".mp3")) {
                try {
                    const url = new URL(href);
                    const pathname = url.pathname;
                    const filename = pathname.split('/').pop();
                    songs.push(filename);
                    console.log(`Added song (URL method): ${filename}`);
                } catch (e) {
                    console.error("Failed to parse URL:", e);
                    
                    // Fallback: Simple string split
                    const parts = href.split('/');
                    const filename = parts[parts.length - 1];
                    songs.push(filename);
                    console.log(`Added song (split method): ${filename}`);
                }
            } 
            // Method 2: Check if the inner text contains .mp3
            else if (innerText && innerText.toLowerCase().endsWith('.mp3')) {
                songs.push(innerText);
                console.log(`Added song (text method): ${innerText}`);
            }
        }

        // If no MP3 files found, try looking for any files that might be songs
        if (songs.length === 0) {
            console.warn(`No MP3 files found in ${folder}, looking for other potential song files`);
            
            // Get the list of songs from info.json if possible
            try {
                const infoResponse = await fetch(`/${folder}/info.json`);
                if (infoResponse.ok) {
                    const info = await infoResponse.json();
                    if (info.songs && Array.isArray(info.songs) && info.songs.length > 0) {
                        console.log(`Found ${info.songs.length} songs in info.json`);
                        songs = info.songs;
                    }
                }
            } catch (e) {
                console.error("Failed to get songs from info.json:", e);
            }
            
            // If still no songs, try looking for any files that aren't directories
            if (songs.length === 0) {
                for (let index = 0; index < as.length; index++) {
                    const element = as[index];
                    const innerText = element.innerText || element.textContent;
                    // Filter out navigation elements and non-audio files
                    if (innerText && 
                        !innerText.includes('/') && 
                        !innerText.endsWith('/') &&
                        !innerText.includes('Parent Directory') &&
                        !innerText.endsWith('.json') &&
                        !innerText.endsWith('.jpg') &&
                        !innerText.endsWith('.png') &&
                        !['~', '..', '.', 'songs', folder.split('/').pop()].includes(innerText)) {
                        songs.push(innerText);
                        console.log(`Added potential song: ${innerText}`);
                    }
                }
            }
        }

        if (songs.length === 0) {
            console.warn(`No songs found in ${folder} after all attempts`);
            document.querySelector(".songinfo").innerHTML = "No songs found in this album";
            return [];
        } else {
            console.log(`Successfully found ${songs.length} songs in ${folder}: ${songs.join(', ')}`);
        }
        
        // Show all the songs in the playlist
        let songUL = document.querySelector(".songList").getElementsByTagName("ul")[0];
        songUL.innerHTML = "";
        for (const song of songs) {
            songUL.innerHTML = songUL.innerHTML + `<li><img class="invert" width="34" src="img/music.svg" alt="">
                                <div class="info">
                                      <div>${decodeURIComponent(song).replace(/\+/g, " ")}</div>
                                    <div>Harry</div>
                                </div>
                                <div class="playnow">
                                    <span>Play Now</span>
                                    <img class="invert" src="img/play.svg" alt="">
                                </div> </li>`;
        }
    
        // Attach an event listener to each song
        Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach(e => {
            e.addEventListener("click", () => {
                const songName = e.querySelector(".info").firstElementChild.innerHTML.trim();
                playMusic(songName);
            });
        });
    
        return songs;
    } catch (error) {
        console.error("Error fetching songs:", error);
        return [];
    }
}

// Modify the playMusic function to handle audio properly
const playMusic = (track, pause = false) => {
    if (!track) {
        console.error("No track provided to playMusic function");
        return;
    }
     // Stop the currently playing song
    if (currentSong) {
        currentSong.pause();
        currentSong.src = "";
    }
    // Skip navigation elements
    if (['~', '..', '.', 'songs'].includes(track) || track === currFolder.split('/').pop()) {
        console.warn(`Skipping invalid track: ${track}`);
        return;
    }
    
    console.log("Attempting to play:", track);
    
    // Create a new Audio instance each time
    currentSong = new Audio();
    
    // Ensure proper path construction
    let trackPath;
    if (track.startsWith('http') || track.startsWith('/')) {
        trackPath = track;
    } else {
        trackPath = `/${currFolder}/${track}`;
    }
    
    console.log("Full track path:", trackPath);
    currentSong.src = trackPath;
    
    // Set up event listeners
    currentSong.addEventListener('loadeddata', () => {
        console.log("Audio loaded successfully");
        document.querySelector(".songtime").innerHTML = `00:00 / ${secondsToMinutesSeconds(currentSong.duration)}`;
    });
    
    currentSong.addEventListener('canplay', () => {
        console.log("Audio can play");
        // Only play if pause is false
        if (!pause) {
            currentSong.play()
                .then(() => {
                    console.log("Playback started successfully");
                    play.src = "img/pause.svg";
                })
                .catch(error => {
                    console.error("Error starting playback:", error);
                    play.src = "img/play.svg";
                });
        }
    });
    
    currentSong.addEventListener('error', (e) => {
        console.error("Audio error:", e);
        play.src = "img/play.svg";
        document.querySelector(".songinfo").innerHTML = `Error playing: ${track}`;
    });
    
    // Update UI
    document.querySelector(".songinfo").innerHTML = decodeURIComponent(track).replace(/\+/g, " ");
    document.querySelector(".songtime").innerHTML = "00:00 / 00:00";

    // Update the play button
    if (!pause) {
        play.src = "img/pause.svg";
    } else {
        play.src = "img/play.svg";
    }
}

async function displayAlbums() {
    console.log("displaying albums...")
    let a = await fetch(`/songs/`)
    let response = await a.text();
    let div = document.createElement("div")
    div.innerHTML = response;
    let anchors = div.getElementsByTagName("a")
    let cardContainer = document.querySelector(".cardContainer")
    cardContainer.innerHTML = "";

    let array = Array.from(anchors);
    for (let index = 0; index < array.length; index++) {
        const e = array[index]; 
        if (e.href.includes("/songs") && !e.href.includes(".htaccess")) {
            let urlParts = new URL(e.href);
            let pathSegments = urlParts.pathname.split("/").filter(Boolean);
            let folder = pathSegments.length > 1 ? pathSegments[pathSegments.length - 1] : null;
            console.log("Anchor href:", e.href);  
            console.log("Extracted folder:", folder); 

             // Fixing undefined issue
             if (!folder || folder.includes("127.0.0.1") || folder === "songs") {
                console.warn("Skipping invalid folder:", folder);
                continue;
            }
            let infoJsonPath = `/songs/${folder}/info.json`;
            console.log(`Fetching metadata from: ${infoJsonPath}`);

            try {
                let infoResponse = await fetch(infoJsonPath);

                if (!infoResponse.ok) {
                    console.warn(`Skipping album: info.json not found for ${folder}`);
                    continue;
                }
                // Parse the JSON only once
                let info = await infoResponse.json();
                console.log("Album info:", info);
                
                // Append album card
                let albumCard = document.createElement("div");
                albumCard.classList.add("card");
                albumCard.dataset.folder = folder;
                albumCard.innerHTML = `
                    <div class="play">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5"
                                stroke-linejoin="round" />
                        </svg>
                    </div>
                    <img src="/songs/${folder}/cover.jpg" alt="Album Cover">
                    <h2>${info.title}</h2>
                    <p>${info.description}</p>
                `;

                // Attach event listener to the newly created card
                albumCard.addEventListener("click", async () => {
                    console.log(`Fetching songs from: ${folder}`);
                     // Show loading indicator
                     document.querySelector(".songinfo").innerHTML = "Loading songs...";
                    
                     // Fetch songs from the folder
                     let songsArray = await getSongs(`songs/${folder}`);
                     
                     if (!songsArray || songsArray.length === 0) {
                         console.warn(`No valid songs found in ${folder}`);
                         document.querySelector(".songinfo").innerHTML = "No songs found in this album";
                         return;
                     }
                     
                     // Try to play the first song
                     playMusic(songsArray[0]);
                 });

                cardContainer.appendChild(albumCard);

            } catch (error) {
                console.error("Error fetching album metadata:", error);
            }
        }
    }
     
}

async function main() {
    console.log("Initializing Spotify-like music player...");
    
    // Initialize the audio player
    currentSong = new Audio();
    currentSong.volume = 0.5; // Set default volume to 50%
    
    // Update the volume slider
    document.querySelector(".range").getElementsByTagName("input")[0].value = 50;

    // Display all the albums on the page
    await displayAlbums()
    // Try to find an album with actual songs
    let albumsWithSongs = ['songs/Bright_(mood)', 'songs/ncs'];
    let songsFound = false;

    for (let album of albumsWithSongs) {
        try {
            console.log(`Trying to load album: ${album}`);
            let albumSongs = await getSongs(album);
            
            if (albumSongs && albumSongs.length > 0) {
                console.log(`Found songs in ${album}, loading this album`);
                songsFound = true;
                playMusic(albumSongs[0], true); // Load first song but don't play
                break;
            }
        } catch (error) {
            console.error(`Error loading album ${album}:`, error);
        }
    }
    
    if (!songsFound) {
        console.warn("No songs found in any album");
        document.querySelector(".songinfo").innerHTML = "Select an album to start playing";
    }
     // Try to load the default album
     try {
        console.log("Loading default album: songs/ncs");
        let defaultSongs = await getSongs("songs/ncs");
        
        if (defaultSongs && defaultSongs.length > 0) {
            console.log("Default album loaded successfully");
            playMusic(defaultSongs[0], true); // Load the first song but don't play it yet
        } else {
            console.warn("No songs found in the default album");
            document.querySelector(".songinfo").innerHTML = "Select an album to start playing";
        }
    } catch (error) {
        console.error("Error loading default album:", error);
    }
    // Attach an event listener to play, next and previous
    document.getElementById("play").addEventListener("click", () => {
        if (!currentSong.src) {
            console.warn("No song loaded to play");
            return;
        }
        
        if (currentSong.paused) {
            currentSong.play()
                .then(() => {
                    console.log("Playback started");
                    play.src = "img/pause.svg";
                })
                .catch(error => {
                    console.error("Error starting playback:", error);
                });
        } else {
            currentSong.pause();
            play.src = "img/play.svg";
        }
    });

    // Listen for timeupdate event
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerHTML = `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`
        document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
    })

    // Add an event listener to seekbar
    document.querySelector(".seekbar").addEventListener("click", e => {
        if (!currentSong.src) return;
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = ((currentSong.duration) * percent) / 100
    })

    // Add an event listener for hamburger
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0"
    })

    // Add an event listener for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%"
    })

    // Add an event listener to previous
    previous.addEventListener("click", () => {
        currentSong.pause()
        console.log("Previous clicked")
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0])
        if (index === -1) {
            // Try to find the song using the file name
            const fileName = currentSong.src.split("/").pop();
            index = songs.findIndex(song => song.includes(fileName));
        }
        
        if ((index - 1) >= 0) {
            playMusic(songs[index - 1]);
        } else {
            console.log("Already at the first song");
        }
    })

    // Add an event listener to next
    document.getElementById("next").addEventListener("click", () => {
        if (!songs || songs.length === 0) return;
        
        let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
        if (index === -1) {
            // Try to find the song using the file name
            const fileName = currentSong.src.split("/").pop();
            index = songs.findIndex(song => song.includes(fileName));
        }
        
        if ((index + 1) < songs.length) {
            playMusic(songs[index + 1]);
        } else {
            console.log("Already at the last song");
        }
    })

    // Add an event to volume
    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        console.log("Setting volume to", e.target.value, "/ 100");
        currentSong.volume = parseInt(e.target.value) / 100;
        
        // Update the volume icon
        if (currentSong.volume > 0) {
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("mute.svg", "volume.svg");
        } else {
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("volume.svg", "mute.svg");
        }
    })

    // Add event listener to mute the track
    document.querySelector(".volume>img").addEventListener("click", e=>{ 
        if(e.target.src.includes("volume.svg")){
            e.target.src = e.target.src.replace("volume.svg", "mute.svg")
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        }
        else{
            e.target.src = e.target.src.replace("mute.svg", "volume.svg")
            currentSong.volume = .10;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
        }

    })

    console.log("Music player initialized successfully");



}

main() 
