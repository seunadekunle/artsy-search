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
    const noResults = document.getElementById('noResults');

    let currentSearchRequest = null;
    let currentDetailsRequest = null;
    let selectedCard = null;

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
        searchArtists(query, true);
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

    function resetCardColors() {
        document.querySelectorAll('.artist-card').forEach(card => {
            card.style.backgroundColor = 'var(--artist-card-bg)';
        });
    }

    async function searchArtists(query, isNewSearch = false) {
        try {
            if (currentSearchRequest) {
                currentSearchRequest.abort();
            }

            if (isNewSearch) {
                artistDetails.style.display = 'none';
                artistDetails.innerHTML = '';
            }

            loadingSearch.style.display = 'block';
            const controller = new AbortController();
            currentSearchRequest = controller;

            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
                signal: controller.signal
            });
            const data = await response.json();

            if (!data._embedded || !data._embedded.results || data._embedded.results.length === 0) {
                resultsList.innerHTML = '';
                noResults.style.display = 'block';
                resultsList.style.display = 'none';
                // if (isNewSearch) resetCardColors();
                return;
            }

            noResults.style.display = 'none';
            resultsList.style.display = 'flex';
            resultsList.innerHTML = '';

            if (isNewSearch) {
                selectedCard = null;
            }

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
                    if (selectedCard === card) return;

                    if (selectedCard) {
                        selectedCard.style.backgroundColor = 'var(--artist-card-bg)';
                    }

                    selectedCard = card;
                    card.style.backgroundColor = 'var(--artist-card-hover-bg)';

                    artistDetails.style.display = 'none';
                    artistDetails.innerHTML = '';
                    loadingDetails.style.display = 'block';

                    getArtistDetails(artistId);
                });

                resultsList.appendChild(card);
            });

            // if (isNewSearch) {
            //     resetCardColors();
            // }

        } catch (error) {
            if (error.name === 'AbortError') return;
            
            console.error('Error searching artists:', error);
            resultsList.innerHTML = '<div class="error-message">An error occurred while searching.</div>';
        } finally {
            if (currentSearchRequest && currentSearchRequest.signal.aborted) return;
            loadingSearch.style.display = 'none';
            currentSearchRequest = null;
        }
    }

    async function getArtistDetails(artistId) {
        try {
            if (currentDetailsRequest) {
                currentDetailsRequest.abort();
            }

            const controller = new AbortController();
            currentDetailsRequest = controller;

            const response = await fetch(`/api/artist/${artistId}`, {
                signal: controller.signal
            });
            const artist = await response.json();

            const birthYear = artist.birthday ? `(${artist.birthday}` : '';
            const deathYear = artist.deathday ? ` - ${artist.deathday})` : birthYear ? ' -)' : '(-)';
            const nationality = artist.nationality ? `${artist.nationality}` : '';
            const biography = artist.biography ? artist.biography : '';

            artistDetails.innerHTML = `
                <h2>${artist.name} ${birthYear}${deathYear}</h2>
                ${nationality ? `<p class="nationality">${nationality}</p>` : ''}
                ${biography ? `<p class="biography">${biography}</p>` : ''}
            `;
            artistDetails.style.display = 'block';
        } catch (error) {
            if (error.name === 'AbortError') return;
            
            console.error('Error getting artist details:', error);
            artistDetails.innerHTML = '<div class="error-message">An error occurred while fetching artist details.</div>';
            artistDetails.style.display = 'block';
        } finally {
            if (currentDetailsRequest && currentDetailsRequest.signal.aborted) return;
            loadingDetails.style.display = 'none';
            currentDetailsRequest = null;
        }
    }
}); 