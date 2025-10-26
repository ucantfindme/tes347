// Eigen Trails page functionality
document.addEventListener('DOMContentLoaded', function() {
    loadLeaderboard();
    setupFormSubmission();
    setupFileUpload();
});

// API endpoints
const API_BASE_URL = 'https://us-central1-exalted-tempo-322013.cloudfunctions.net';
const SUBMIT_ENDPOINT = `${API_BASE_URL}/submit-challenge`;
const LEADERBOARD_ENDPOINT = `${API_BASE_URL}/get-leaderboard`;

function loadLeaderboard() {
    const loadingElement = document.getElementById('leaderboard-loading');
    const tableElement = document.getElementById('leaderboard-table');
    const bodyElement = document.getElementById('leaderboard-body');

    // Trail mapping
    const trailMap = {
        'day1-ghz-basic': 'T1',
        'day2-ghz-advanced': 'T2', 
        'day3-algorithms': 'T3',
        'day4-optimization': 'T4',
        'day5-ml': 'T5',
        'day6-final': 'T6'
    };

    // Fetch leaderboard from API
    fetch(LEADERBOARD_ENDPOINT)
        .then(response => response.json())
        .then(data => {
            loadingElement.style.display = 'none';
            tableElement.style.display = 'block';
            
            const leaderboardData = data.leaderboard || [];
            
            bodyElement.innerHTML = '';
            
            leaderboardData.forEach((participant, index) => {
                const row = document.createElement('tr');
                
                const rank = index + 1;
                const timeAgo = getTimeAgo(participant.lastSubmission);
                const finishTime = participant.finishTime || "00:00";  // Use actual finish time from backend
                
                // Get rank class for styling
                let rankClass = 'rank-cell';
                if (rank === 1) rankClass += ' gold';
                else if (rank === 2) rankClass += ' silver';
                else if (rank === 3) rankClass += ' bronze';
                
                // Process trails - convert array to object for easy lookup
                const trailsCompleted = {};
                const trailTimes = participant.challengeTimes || {};
                if (Array.isArray(participant.challenges)) {
                    participant.challenges.forEach(challenge => {
                        trailsCompleted[challenge] = true;
                    });
                }
                
                // Generate trail cells
                const trailCells = ['day1-ghz-basic', 'day2-ghz-advanced', 'day3-algorithms', 'day4-optimization', 'day5-ml', 'day6-final']
                    .map(challenge => {
                        const isCompleted = trailsCompleted[challenge];
                        const trailTime = trailTimes[challenge] || "00:00";
                        if (isCompleted) {
                            return `<td class="challenge-cell">
                                <span class="challenge-solved">✓</span>
                                <div class="challenge-time">${trailTime}</div>
                            </td>`;
                        } else {
                            return `<td class="challenge-cell">
                                <span class="challenge-unsolved">—</span>
                            </td>`;
                        }
                    }).join('');
                
                row.innerHTML = `
                    <td class="${rankClass}">${rank}</td>
                    <td class="name-cell">${participant.name}</td>
                    <td class="score-cell">${participant.score}</td>
                    <td class="time-cell">${finishTime}</td>
                    ${trailCells}
                `;
                
                bodyElement.appendChild(row);
            });
            
            if (leaderboardData.length === 0) {
                const emptyRow = document.createElement('tr');
                emptyRow.innerHTML = '<td colspan="10" style="text-align: center; padding: 2rem; color: var(--color-muted);">No submissions yet. Be the first to embark on a trail!</td>';
                bodyElement.appendChild(emptyRow);
            }
        })
        .catch(error => {
            console.error('Error loading leaderboard:', error);
            loadingElement.innerHTML = 'Failed to load leaderboard. Please try again later.';
        });
}

function getRankIcon(rank) {
    const icons = {
        1: '🥇',
        2: '🥈',
        3: '🥉'
    };
    return `<span class="rank-icon">${icons[rank]}</span><span class="rank-number">${rank}</span>`;
}

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
        return 'just now';
    } else if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        // For older submissions, show the actual date
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

function getFinishTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

function getRandomTime() {
    // Generate a random completion time for demonstration
    const minutes = Math.floor(Math.random() * 59);
    const seconds = Math.floor(Math.random() * 59);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function maskEmail(email) {
    const [username, domain] = email.split('@');
    const maskedUsername = username.length > 2 
        ? username.substring(0, 2) + '*'.repeat(username.length - 2)
        : username;
    return `${maskedUsername}@${domain}`;
}

function setupFormSubmission() {
    const form = document.getElementById('challenge-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    const resultDiv = document.getElementById('submission-result');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading state
        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        resultDiv.style.display = 'none';

        // Get form data
        const formData = new FormData(form);
        const challengeSelect = document.getElementById('challenge-select');
        const email = document.getElementById('email');
        const fileInput = document.getElementById('qpy-file');

        // Validate file
        if (!validateFile(fileInput.files[0])) {
            showSubmissionResult('error', 'Please upload a valid .qpy file (max 10MB)');
            resetSubmitButton();
            return;
        }

        try {
            // Submit to API
            const response = await simulateSubmission(formData);
            
            showSubmissionResult('success', `Trail solution submitted successfully! Your submission for "${challengeSelect.options[challengeSelect.selectedIndex].text}" has been received. Score: ${response.score?.toFixed(1) || 'N/A'}/100`);
            
            // Reset form
            form.reset();
            
            // Reload leaderboard after successful submission
            setTimeout(loadLeaderboard, 1000);
            
        } catch (error) {
            const errorMessage = error.error || error.message || 'Failed to submit solution. Please try again.';
            showSubmissionResult('error', errorMessage);
        } finally {
            resetSubmitButton();
        }
    });

    function resetSubmitButton() {
        submitBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
    }
}

function validateFile(file) {
    if (!file) return false;
    
    // Check file extension
    if (!file.name.toLowerCase().endsWith('.qpy')) {
        return false;
    }
    
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
        return false;
    }
    
    return true;
}

function setupFileUpload() {
    const fileInput = document.getElementById('qpy-file');
    const container = fileInput.closest('.file-upload-container');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        // Remove any existing file info
        const existingInfo = container.querySelector('.file-selected-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        if (file) {
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-selected-info';
            fileInfo.innerHTML = `
                <p><strong>Selected:</strong> ${file.name}</p>
                <p><strong>Size:</strong> ${formatFileSize(file.size)}</p>
                <p class="${validateFile(file) ? 'valid' : 'invalid'}">
                    ${validateFile(file) ? '✓ Valid .qpy file' : '✗ Invalid file or too large'}
                </p>
            `;
            container.appendChild(fileInfo);
        }
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function simulateSubmission(formData) {
    return new Promise((resolve, reject) => {
        // Make actual API call to submit trail solution
        fetch(SUBMIT_ENDPOINT, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => Promise.reject(err));
            }
            return response.json();
        })
        .then(data => {
            resolve(data);
        })
        .catch(error => {
            console.error('Submission error:', error);
            reject(error);
        });
    });
}

function showSubmissionResult(type, message) {
    const resultDiv = document.getElementById('submission-result');
    resultDiv.className = `submission-result ${type}`;
    resultDiv.innerHTML = `
        <div class="result-icon">
            ${type === 'success' ? '✓' : '✗'}
        </div>
        <div class="result-message">
            ${message}
        </div>
    `;
    resultDiv.style.display = 'block';
    
    // Scroll to result
    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}