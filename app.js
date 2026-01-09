// Configuration
const CONFIG = {
    STORAGE_KEY: 'mozilla_fosdem2026_feedback',
    CHAR_LIMIT: 500,
    // Replace this with your Google Apps Script Web App URL
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzwdH40aQlNyR551U6ooySV8Lk0q3vP9W2J2Uy3phOSEx-huWrMu7YSIQH3wcpLdTGr/exec'
};

// State
let currentVideo = null;
let submittedFeedback = new Set();

// Load submitted feedback from localStorage
function loadSubmittedFeedback() {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (stored) {
        try {
            submittedFeedback = new Set(JSON.parse(stored));
        } catch (e) {
            console.error('Error loading submitted feedback:', e);
        }
    }
}

// Save submitted feedback to localStorage
function saveSubmittedFeedback() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify([...submittedFeedback]));
}

// Check if feedback already submitted for a video
function hasSubmittedFeedback(videoId) {
    return submittedFeedback.has(videoId);
}

// Mark feedback as submitted
function markFeedbackSubmitted(videoId) {
    submittedFeedback.add(videoId);
    saveSubmittedFeedback();
}

// Load videos from JSON
async function loadVideos() {
    try {
        const response = await fetch('videos.json');
        const videos = await response.json();
        renderVideoCards(videos);
    } catch (error) {
        console.error('Error loading videos:', error);
        document.getElementById('videoGrid').innerHTML = `
            <p style="grid-column: 1/-1; text-align: center; color: var(--text-light); padding: 3rem;">
                Error loading demo videos. Please refresh the page or contact booth staff.
            </p>
        `;
    }
}

// Render video cards
function renderVideoCards(videos) {
    const grid = document.getElementById('videoGrid');
    grid.innerHTML = videos.map(video => `
        <div class="video-card" 
             tabindex="0" 
             role="button"
             data-video-id="${video.id}"
             data-video-title="${video.title}"
             data-video-url="${video.videoUrl}"
             data-poster-url="${video.posterUrl || ''}"
             aria-label="Watch ${video.title}">
            <div class="card-header">
                <h2 class="card-title">${video.title}</h2>
                <p class="card-speakers">${Array.isArray(video.speakers) ? video.speakers.join(', ') : video.speakers}</p>
            </div>
            <div class="card-body">
                ${video.tags ? `
                    <div class="card-tags">
                        ${video.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                ${video.duration ? `<p class="card-duration">${video.duration}</p>` : ''}
            </div>
        </div>
    `).join('');

    // Add click listeners
    document.querySelectorAll('.video-card').forEach(card => {
        card.addEventListener('click', () => openModal(card));
        card.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openModal(card);
            }
        });
    });
}

// Open modal
function openModal(card) {
    currentVideo = {
        id: card.dataset.videoId,
        title: card.dataset.videoTitle,
        videoUrl: card.dataset.videoUrl,
        posterUrl: card.dataset.posterUrl
    };

    const modal = document.getElementById('videoModal');
    const player = document.getElementById('videoPlayer');
    const source = document.getElementById('videoSource');
    const feedbackPanel = document.getElementById('feedbackPanel');
    const overlay = document.getElementById('videoOverlay');

    // Set video source
    source.src = currentVideo.videoUrl;
    if (currentVideo.posterUrl) {
        player.poster = currentVideo.posterUrl;
    }
    player.load();

    // Show feedback panel immediately
    feedbackPanel.style.display = 'block';
    overlay.classList.add('visible');

    // Always show feedback form (allow multiple submissions)
    showFeedbackForm();

    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Add video event listeners
    player.addEventListener('play', onVideoPlay);
    player.addEventListener('ended', onVideoEnded);

    // Focus trap
    modal.focus();

    // Analytics
    logEvent('demo_opened', { demoId: currentVideo.id });
}

// Handle video play
function onVideoPlay() {
    const overlay = document.getElementById('videoOverlay');
    overlay.classList.remove('visible');
    
    logEvent('demo_started', { demoId: currentVideo.id });
}

// Handle video end
function onVideoEnded() {
    const feedbackPanel = document.getElementById('feedbackPanel');
    
    if (!hasSubmittedFeedback(currentVideo.id)) {
        feedbackPanel.style.display = 'block';
        showFeedbackForm();
    } else {
        feedbackPanel.style.display = 'block';
        showThankYouState();
    }
    
    logEvent('demo_completed', { demoId: currentVideo.id });
}

// Show feedback form
function showFeedbackForm() {
    document.getElementById('feedbackForm').style.display = 'block';
    document.getElementById('thankYouMessage').style.display = 'none';
    
    // Populate hidden fields
    document.getElementById('feedbackVideoId').value = currentVideo.id;
    document.getElementById('feedbackVideoTitle').value = currentVideo.title;
    document.getElementById('feedbackTimestamp').value = new Date().toISOString();
    
    // Reset form
    const form = document.getElementById('feedbackFormElement');
    form.reset();
    document.querySelectorAll('.thumb-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('email').style.display = 'none';
    document.getElementById('charCount').textContent = '0';
}

// Show thank you state
function showThankYouState() {
    document.getElementById('feedbackForm').style.display = 'none';
    document.getElementById('thankYouMessage').style.display = 'block';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('videoModal');
    const player = document.getElementById('videoPlayer');
    const source = document.getElementById('videoSource');
    
    player.pause();
    source.src = '';
    player.load();
    
    modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Remove event listeners
    player.removeEventListener('play', onVideoPlay);
    player.removeEventListener('ended', onVideoEnded);
    
    currentVideo = null;
}

// Thumbs button handling
function initializeThumbsButtons() {
    document.querySelectorAll('.thumb-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.thumb-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            document.getElementById('sentimentValue').value = this.dataset.sentiment;
        });
    });
}

// Play button handling
function initializePlayButton() {
    document.getElementById('playButton').addEventListener('click', () => {
        const player = document.getElementById('videoPlayer');
        player.play();
    });
}

// Character count
function initializeCharCount() {
    const textarea = document.getElementById('comment');
    const charCount = document.getElementById('charCount');
    
    textarea.addEventListener('input', function() {
        charCount.textContent = this.value.length;
        if (this.value.length > CONFIG.CHAR_LIMIT) {
            this.value = this.value.substring(0, CONFIG.CHAR_LIMIT);
            charCount.textContent = CONFIG.CHAR_LIMIT;
        }
    });
}

// Contact consent handling
function initializeContactConsent() {
    const checkbox = document.getElementById('contactConsent');
    const emailField = document.getElementById('email');

    checkbox.addEventListener('change', function() {
        emailField.style.display = this.checked ? 'block' : 'none';
        // Email is optional even if consent is checked
        emailField.required = false;
        if (!this.checked) {
            emailField.value = '';
        }
    });
}

// Form submission (Google Sheets with localStorage fallback)
function initializeFormSubmission() {
    const form = document.getElementById('feedbackFormElement');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Validate sentiment
        if (!document.getElementById('sentimentValue').value) {
            alert('Please select thumbs up or down before submitting.');
            return;
        }

        const submitBtn = form.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            // Submit to Google Sheets
            await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors', // Required for Google Apps Script
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            // no-cors mode doesn't return response, so we assume success
            console.log('Feedback submitted to Google Sheets');

            markFeedbackSubmitted(currentVideo.id);
            showThankYouState();
            logEvent('feedback_submitted', {
                demoId: currentVideo.id,
                sentiment: data.sentiment
            });

        } catch (error) {
            console.error('Error submitting to Google Sheets, using localStorage fallback:', error);

            // Fallback to localStorage
            const localFeedback = JSON.parse(localStorage.getItem('mozilla_fosdem_feedback_data') || '[]');
            localFeedback.push({
                ...data,
                id: `feedback-${Date.now()}`,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('mozilla_fosdem_feedback_data', JSON.stringify(localFeedback));

            console.log('Feedback saved locally:', data);
            console.log('All local feedback:', localFeedback);

            markFeedbackSubmitted(currentVideo.id);
            showThankYouState();
            logEvent('feedback_submitted', {
                demoId: currentVideo.id,
                sentiment: data.sentiment
            });
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Feedback';
        }
    });
}

// Analytics with GA4 + localStorage backup
function logEvent(eventName, data = {}) {
    const eventData = {
        event: eventName,
        ...data,
        timestamp: new Date().toISOString()
    };
    
    console.log(`[Analytics] ${eventName}:`, eventData);
    
    // Send to GA4
    if (window.gtag) {
        gtag('event', eventName, {
            event_category: 'booth_demo',
            event_label: data.demoId || 'unknown',
            ...data
        });
    }
    
    // Backup to localStorage
    const analytics = JSON.parse(localStorage.getItem('mozilla_fosdem_analytics') || '[]');
    analytics.push(eventData);
    localStorage.setItem('mozilla_fosdem_analytics', JSON.stringify(analytics));
}

// Export analytics from console
window.exportAnalytics = function() {
    const analytics = JSON.parse(localStorage.getItem('mozilla_fosdem_analytics') || '[]');
    
    const byDemo = {};
    analytics.forEach(event => {
        if (event.demoId) {
            if (!byDemo[event.demoId]) {
                byDemo[event.demoId] = { views: 0, starts: 0, completions: 0, feedback: 0 };
            }
            if (event.event === 'demo_opened') byDemo[event.demoId].views++;
            if (event.event === 'demo_started') byDemo[event.demoId].starts++;
            if (event.event === 'demo_completed') byDemo[event.demoId].completions++;
            if (event.event === 'feedback_submitted') byDemo[event.demoId].feedback++;
        }
    });
    
    Object.keys(byDemo).forEach(demoId => {
        const demo = byDemo[demoId];
        demo.completionRate = demo.starts > 0 ? ((demo.completions / demo.starts) * 100).toFixed(1) + '%' : '0%';
        demo.feedbackRate = demo.completions > 0 ? ((demo.feedback / demo.completions) * 100).toFixed(1) + '%' : '0%';
    });
    
    console.table(byDemo);
    
    const blob = new Blob([JSON.stringify({ summary: byDemo, events: analytics }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fosdem-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    return byDemo;
};

// Modal close handlers
function initializeModalHandlers() {
    const modal = document.getElementById('videoModal');
    const closeBtn = document.querySelector('.modal-close');
    const watchAnotherBtn = document.getElementById('watchAnotherBtn');
    const submitAnotherBtn = document.getElementById('submitAnotherBtn');

    closeBtn.addEventListener('click', closeModal);
    watchAnotherBtn.addEventListener('click', closeModal);
    submitAnotherBtn.addEventListener('click', showFeedbackForm);

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadSubmittedFeedback();
    loadVideos();
    initializeThumbsButtons();
    initializePlayButton();
    initializeCharCount();
    initializeContactConsent();
    initializeFormSubmission();
    initializeModalHandlers();
});