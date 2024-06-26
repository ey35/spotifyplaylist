const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const CLIENT_ID = '5d6f98b8609744a9bf6a31c86322de2f';
const REDIRECT_URI = 'https://spotifyplaylistmakers.netlify.app/';
const RESPONSE_TYPE = 'token';
const SCOPES = 'user-top-read playlist-modify-public playlist-modify-private';

let likedTracks = [];
let dislikedTracks = [];
let accessToken = localStorage.getItem('spotify_access_token');
let player;

// Function to handle login with Spotify
function handleLogin() {
    const authUrl = `${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=${RESPONSE_TYPE}&scope=${encodeURIComponent(SCOPES)}`;
    window.location.href = authUrl;
}

// Function to extract the access token from the URL hash
function extractAccessToken() {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
        localStorage.setItem('spotify_access_token', token);
        accessToken = token;
        window.location.hash = ''; // Clear the hash
        initializePlayer();
        fetchRecommendations();
    }
}

// Call the extractAccessToken function on page load
window.onload = extractAccessToken;

// Function to initialize Spotify Web Playback SDK
function initializePlayer() {
    if (!accessToken) {
        alert('Please login with Spotify first');
        return;
    }

    // Initialize Spotify Player
    window.onSpotifyWebPlaybackSDKReady = () => {
        player = new Spotify.Player({
            name: 'Spotify Playlist Maker',
            getOAuthToken: cb => { cb(accessToken); }
        });

        // Error handling
        player.addListener('initialization_error', ({ message }) => { console.error(message); });
        player.addListener('authentication_error', ({ message }) => { console.error(message); });
        player.addListener('account_error', ({ message }) => { console.error(message); });
        player.addListener('playback_error', ({ message }) => { console.error(message); });

        // Ready
        player.addListener('ready', ({ device_id }) => {
            console.log('Ready with Device ID', device_id);
        });

        // Not Ready
        player.addListener('not_ready', ({ device_id }) => {
            console.log('Device ID has gone offline', device_id);
        });

        // Connect to the player
        player.connect();
    };
}

// Function to fetch recommendations from Spotify
function fetchRecommendations() {
    if (!accessToken) {
        alert('Please login with Spotify first');
        return;
    }

    let seedTracks = likedTracks.slice(-5).concat(dislikedTracks.slice(-5));
    if (seedTracks.length === 0) {
        seedTracks = ['3n3Ppam7vgaVa1iaRUc9Lp']; // Fallback to a default track if no seed tracks are available
    }
    const url = `https://api.spotify.com/v1/recommendations?limit=1&market=US&seed_tracks=${seedTracks.join(',')}`;
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.tracks && data.tracks.length > 0) {
            const track = data.tracks[0];
            const songDetails = document.getElementById('song-details');
            songDetails.textContent = `${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`;
            songDetails.dataset.trackId = track.id;

            // Play the song
            playSong(track.uri);
        } else {
            alert('No recommendations available.');
        }
    })
    .catch(error => console.error('Error fetching recommendations:', error));
}

// Function to play a song using Spotify Web Playback SDK
// Function to play a song using Spotify Web Playback SDK
function playSong(uri) {
    if (!player) {
        console.error('Player not initialized');
        return;
    }
    
    player.getCurrentState().then(state => {
        if (!state) {
            console.error('Player state not available');
            return;
        }
        
        const { device_id } = state;
        
        fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uris: [uri] })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to play song');
            }
            console.log('Song played successfully');
        })
        .catch(error => console.error('Error playing song:', error));
    });
}


// Function to handle liking a song
document.getElementById('like-btn').addEventListener('click', () => {
    const trackId = document.getElementById('song-details').dataset.trackId;
    likedTracks.push(trackId);
    fetchRecommendations();
});

// Function to handle disliking a song
document.getElementById('dislike-btn').addEventListener('click', () => {
    const trackId = document.getElementById('song-details').dataset.trackId;
    dislikedTracks.push(trackId);
    fetchRecommendations();
});

// Function to handle creating a Spotify playlist
document.getElementById('create-playlist-btn').addEventListener('click', () => {
    if (!accessToken) {
        alert('Please login with Spotify first');
        return;
    }
    if (likedTracks.length > 0) {
        createSpotifyPlaylist(likedTracks);
    } else {
        alert('Please like at least one song before creating a playlist.');
    }
});

// Function to create a Spotify playlist
let playlistCreated = false;

// Function to handle creating a Spotify playlist
document.getElementById('create-playlist-btn').addEventListener('click', () => {
    if (!accessToken) {
        alert('Please login with Spotify first');
        return;
    }
    if (likedTracks.length > 0 && !playlistCreated) {
        createSpotifyPlaylist(likedTracks);
    } else if (playlistCreated) {
        alert('Playlist already created');
    } else {
        alert('Please like at least one song before creating a playlist.');
    }
});

// Function to create a Spotify playlist
function createSpotifyPlaylist(trackIds) {
    const url = `https://api.spotify.com/v1/me/playlists`;
    fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: 'Liked Songs Playlist',
            description: 'A playlist created based on songs you liked.',
            public: false
        })
    })
    .then(response => response.json())
    .then(playlistData => {
        const playlistId = playlistData.id;
        // You can add variations of playlists here
        // For example, add tracks shuffled, with additional recommendations, etc.
        fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                uris: trackIds.map(id => `spotify:track:${id}`)
            })
        })
        .then(() => {
            alert('Playlist created successfully!');
            playlistCreated = true;
        })
        .catch(error => console.error('Error adding tracks to playlist:', error));
    })
    .catch(error => console.error('Error creating playlist:', error));
}


// Function to fetch song details from Spotify API
function fetchSongDetails() {
    if (!accessToken) {
        alert('Please login with Spotify first');
        return;
    }

    // API endpoint to fetch song details using the provided track ID
    const trackId = '6rqhFgbbKwnb9MLmUQDhG6'; // Replace with the provided track ID
    const url = `https://api.spotify.com/v1/tracks/${trackId}`;

    fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch song details');
        }
        return response.json();
    })
    .then(data => {
        displaySongDetails(data); // Display song details
    })
    .catch(error => {
        console.error('Error fetching song details:', error);
        alert('Failed to fetch song details. Please try again.');
    });
}

// Function to display song details
function displaySongDetails(data) {
    const songCard = document.getElementById('song-card');
    const songName = document.getElementById('song-name');
    const artistName = document.getElementById('artist-name');
    const songImg = document.querySelector('.card-img');

    // Update song name and artist name
    songName.textContent = data.name;
    artistName.textContent = data.artists[0].name;

    // Update song artwork
    if (data.album.images.length > 0) {
        songImg.src = data.album.images[0].url;
    } else {
        // Use placeholder image if no artwork is available
        songImg.src = 'placeholder-image.jpg';
    }
}

// Call the fetchSongDetails function on page load
window.onload = fetchSongDetails;



// Add event listener to login button
document.getElementById('login-btn').addEventListener('click', handleLogin);
``
