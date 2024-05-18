const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const CLIENT_ID = '5d6f98b8609744a9bf6a31c86322de2f';
const REDIRECT_URI = 'https://spotifyplaylistmakers.netlify.app/';
const RESPONSE_TYPE = 'token';
const SCOPES = 'user-top-read playlist-modify-public playlist-modify-private';

let likedTracks = [];
let dislikedTracks = [];
let accessToken = localStorage.getItem('spotify_access_token');

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
        fetchRecommendations();
    }
}

// Call the extractAccessToken function on page load
window.onload = extractAccessToken;

// Function to fetch recommendations from Spotify
function fetchRecommendations() {
    if (!accessToken) {
        alert('Please login with Spotify first');
        return;
    }

    const seedTracks = likedTracks.slice(-5).concat(dislikedTracks.slice(-5)); // Use the last 5 liked and disliked tracks as seeds
    const url = `https://api.spotify.com/v1/recommendations?limit=1&market=US&seed_tracks=${seedTracks.join(',')}`;
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch recommendations');
        }
        return response.json();
    })
    .then(data => {
        const track = data.tracks[0];
        const songDetails = document.getElementById('song-details');
        songDetails.textContent = `${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`;
        songDetails.dataset.trackId = track.id;
    })
    .catch(error => console.error('Error fetching recommendations:', error));
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
        createSpotifyPlaylist(accessToken, likedTracks);
    } else {
        alert('Please like at least one song before creating a playlist.');
    }
});

// Function to create a Spotify playlist
function createSpotifyPlaylist(accessToken, trackIds) {
    fetch('https://api.spotify.com/v1/me', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        return response.json();
    })
    .then(userData => {
        const userId = userData.id;
        fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
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
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to create playlist');
            }
            return response.json();
        })
        .then(playlistData => {
            const playlistId = playlistData.id;
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
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to add tracks to playlist');
                }
                return response.json();
            })
            .then(() => {
                alert('Playlist created successfully!');
            })
            .catch(error => console.error('Error adding tracks to playlist:', error));
        })
        .catch(error => console.error('Error creating playlist:', error));
    })
    .catch(error => console.error('Error fetching user data:', error));
}

// Add event listener to login button
document.getElementById('login-btn').addEventListener('click', handleLogin);
