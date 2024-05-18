// script.js
const clientId = '5d6f98b8609744a9bf6a31c86322de2f';  // Your Spotify client ID
const redirectUri = 'https://spotifyplaylistmakers.netlify.app/';  // Your redirect URI

let likedTracks = [];
let dislikedTracks = [];
let accessToken = null;

document.getElementById('login-btn').addEventListener('click', () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user-top-read playlist-modify-public playlist-modify-private`;
    window.location.href = authUrl;
});

window.addEventListener('load', () => {
    accessToken = new URLSearchParams(window.location.hash.substring(1)).get('access_token');
    console.log("Access token:", accessToken); // Log the access token to the console
    if (accessToken) {
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('preferences').style.display = 'block';
        fetchRecommendations();
    }
});

document.getElementById('like-btn').addEventListener('click', () => {
    const trackId = document.getElementById('song-details').dataset.trackId;
    likedTracks.push(trackId);
    fetchRecommendations();
});

document.getElementById('dislike-btn').addEventListener('click', () => {
    const trackId = document.getElementById('song-details').dataset.trackId;
    dislikedTracks.push(trackId);
    fetchRecommendations();
});

document.getElementById('create-playlist-btn').addEventListener('click', () => {
    if (likedTracks.length > 0) {
        createSpotifyPlaylist(accessToken, likedTracks);
    } else {
        alert('Please like at least one song before creating a playlist.');
    }
});

function fetchRecommendations() {
    const seedTracks = likedTracks.concat(dislikedTracks).slice(-5); // Use the last 5 liked and disliked tracks as seeds
    const url = `https://api.spotify.com/v1/recommendations?limit=1&market=US&seed_tracks=${seedTracks.join(',')}`;
    console.log("Request URL:", url); // Log the request URL to the console
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
