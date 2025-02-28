document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const searchIcon = document.getElementById('searchIcon');
    const searchBar = searchInput.closest('.search-bar');
    const clearIcon = document.getElementById('clearIcon');
    const loadingSearch = document.getElementById('loadingSearch');
    const loadingDetails = document.getElementById('loadingDetails');
    const resultsList = document.getElementById('resultsList');
    const artistDetails = document.getElementById('artistDetails');
    const errorTooltip = document.getElementById('errorTooltip');

    let currentSearchRequest = null;
    let currentDetailsRequest = null;
    let errorTimeout = null;

    document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target)) {
            searchInput.blur(); 
            searchBar.classList.remove('error');
        }
    });

    function validateAndSearch() {
        if (!searchForm.checkValidity()) {
            searchBar.classList.add('error');
            return false;
        }

        searchBar.classList.remove('error');
        const query = searchInput.value.trim();
        searchArtists(query);
        return true;
    }

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        validateAndSearch();
    });

    searchInput.addEventListener('input', () => {
        if (searchInput.validity.valid) {
            searchBar.classList.remove('error');
        } else {
            searchBar.classList.add('error');
        }
    });

    searchInput.addEventListener('blur', () => {
        if (searchInput.validity.valid) {
            searchBar.classList.remove('error');
        } else {
            searchBar.classList.add('error');
        }
    });

    clearIcon.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
        searchBar.classList.remove('error');
        clearIcon.style.display = 'none';
    });
    
    // Function to perform artist search
    async function searchArtists(query) {
        try {
            // Cancel any ongoing search request
            if (currentSearchRequest) {
                currentSearchRequest.abort();
            }

            // Show loading and keep existing results until new ones arrive
            loadingSearch.style.display = 'block';
            
            // Create new AbortController for this request
            const controller = new AbortController();
            currentSearchRequest = controller;

            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                signal: controller.signal
            });
            const data = await response.json();

            // Clear results
            resultsList.innerHTML = '';

            if (!data._embedded || !data._embedded.results || data._embedded.results.length === 0) {
                document.getElementById('noResults').style.display = 'block';
                resultsList.style.display = 'none';
                return;
            }

            // Show results list and hide no results message
            document.getElementById('noResults').style.display = 'none';
            resultsList.style.display = 'grid';

            const artists = data._embedded.results;
            artists.forEach(artist => {
                const artistId = artist._links.self.href.split('/').pop();
                const imageUrl = artist._links.thumbnail.href.includes('missing_image.png')
                    ? '/static/images/artsy_logo.svg'
                    : artist._links.thumbnail.href;

                const card = document.createElement('div');
                card.className = 'artist-card';
                card.innerHTML = `
                    <img src="${imageUrl}" alt="${artist.title}" class="artist-image">
                    <h3 class="artist-name">${artist.title}</h3>
                `;

                card.addEventListener('click', () => {
                    document.querySelectorAll('.artist-card').forEach(c => c.classList.remove('active'));
                    card.classList.add('active');
                    getArtistDetails(artistId);
                });

                resultsList.appendChild(card);
            });
        } catch (error) {
            if (error.name === 'AbortError') {
                return; // Request was aborted, do nothing
            }
            console.error('Error searching artists:', error);
            document.getElementById('noResults').style.display = 'none';
            resultsList.style.display = 'none';
            resultsList.innerHTML = '<div class="error-message">An error occurred while searching.</div>';
        } finally {
            if (currentSearchRequest && currentSearchRequest.signal.aborted) {
                return; // Don't hide loading if request was aborted
            }
            loadingSearch.style.display = 'none';
            currentSearchRequest = null;
        }
    }

    // Function to get artist details
    async function getArtistDetails(artistId) {
        try {
            // Cancel any ongoing details request
            if (currentDetailsRequest) {
                currentDetailsRequest.abort();
            }

            // Hide existing details but keep the selected card state
            artistDetails.innerHTML = '';
            loadingDetails.style.display = 'block';

            // Create new AbortController for this request
            const controller = new AbortController();
            currentDetailsRequest = controller;

            const response = await fetch(`/api/artist/${artistId}`, {
                signal: controller.signal
            });
            const artist = await response.json();

            const birthYear = artist.birthday ? artist.birthday : '';
            const deathYear = artist.deathday ? ` - ${artist.deathday}` : '';
            const nationality = artist.nationality ? `${artist.nationality}` : '';
            const biography = artist.biography ? artist.biography : '';

            artistDetails.innerHTML = `
                <h2>${artist.name}${birthYear}${deathYear}</h2>
                ${nationality ? `<p>${nationality}</p>` : ''}
                ${biography ? `<p>${biography}</p>` : ''}
            `;
        } catch (error) {
            if (error.name === 'AbortError') {
                return; // Request was aborted, do nothing
            }
            console.error('Error getting artist details:', error);
            artistDetails.innerHTML = '<div class="error-message">An error occurred while fetching artist details.</div>';
        } finally {
            if (currentDetailsRequest && currentDetailsRequest.signal.aborted) {
                return; // Don't hide loading if request was aborted
            }
            loadingDetails.style.display = 'none';
            currentDetailsRequest = null;
        }
    }

}); 