// script.js
const clientId = 'YOUR_SPOTIFY_CLIENT_ID';  // Replace with your Spotify client ID
const redirectUri = 'http://localhost:5500';  // Replace with your redirect URI

document.getElementById('login-btn').addEventListener('click', () => {
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user-top-read playlist-modify-public playlist-modify-private`;
    window.location.href = authUrl;
});

window.addEventListener('load', () => {
    const accessToken = new URLSearchParams(window.location.hash.substring(1)).get('access_token');
    if (accessToken) {
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('preferences').style.display = 'block';

        fetch('https://api.spotify.com/v1/me/top/tracks', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        })
        .then(response => response.json())
        .then(data => {
            const tracksContainer = document.getElementById('tracks-container');
            data.items.forEach(track => {
                const trackElement = document.createElement('div');
                trackElement.classList.add('track');
                trackElement.textContent = `${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`;
                trackElement.dataset.trackId = track.id;
                trackElement.addEventListener('click', () => {
                    trackElement.classList.toggle('selected');
                });
                tracksContainer.appendChild(trackElement);
            });
        })
        .catch(error => console.error('Error fetching top tracks:', error));

        document.getElementById('create-playlist-btn').addEventListener('click', () => {
            const selectedTracks = document.querySelectorAll('.track.selected');
            const trackUris = Array.from(selectedTracks).map(track => `spotify:track:${track.dataset.trackId}`);

            if (trackUris.length > 0) {
                createSpotifyPlaylist(accessToken, trackUris);
            } else {
                alert('Please select at least one track.');
            }
        });
    }
});

function createSpotifyPlaylist(accessToken, trackUris) {
    fetch('https://api.spotify.com/v1/me', {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })
    .then(response => response.json())
    .then(userData => {
        const userId = userData.id;
        fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'My Custom Playlist',
                description: 'A playlist created based on my likes and dislikes.',
                public: false
            })
        })
        .then(response => response.json())
        .then(playlistData => {
            const playlistId = playlistData.id;
            fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uris: trackUris
                })
            })
            .then(response => response.json())
            .then(() => {
                alert('Playlist created successfully!');
            })
            .catch(error => console.error('Error adding tracks to playlist:', error));
        })
        .catch(error => console.error('Error creating playlist:', error));
    })
    .catch(error => console.error('Error fetching user data:', error));
}
