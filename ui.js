/**
 * UI - Rendering and Event Handlers
 * Contains: timeline rendering, modals, file upload handlers
 */

// ============================================
// RENDERING FUNCTIONS
// ============================================

/**
 * Render timeline entries
 */
function renderTimeline() {
    const container = document.getElementById('timelineContainer');
    const keyword = document.getElementById('keywordInput').value.toLowerCase();
    
    const filtered = filterEvents(keyword);

    // Check if there's no data at all
    if (timelineData.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fa-solid fa-cloud-arrow-up"></i>
                <p>No events loaded</p>
                <p style="font-size: 0.85rem; color: #5b6b91;">Upload log files (.evtx, .log, .csv, .txt) to get started</p>
            </div>`;
        return;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <i class="fa-solid fa-magnifying-glass"></i>
                <p>No events match your filters</p>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(item => `
        <div class="timeline-entry ${getSeverityClass(item.severity)}" data-id="${item.id}">
            <div class="time-col">${item.time}</div>
            <div class="source-tag">${getSourceIcon(item.sourceType)} ${item.source}</div>
            <div class="event-desc">
                <strong>${item.event}</strong> <small>${item.detail}</small>
            </div>
            ${item.annotation ? `<div class="annotation-badge"><i class="fa-regular fa-note-sticky"></i> ${item.annotation}</div>` : '<div class="annotation-badge"></div>'}
            <div class="action-icons">
                <i class="fa-regular fa-pen-to-square" title="Annotate" onclick="openAnnotation(${item.id})"></i>
                <i class="fa-regular fa-clock" title="Raw timestamp"></i>
                <i class="fa-solid fa-eye" title="View details" onclick="openDetails(${item.id})"></i>
            </div>
        </div>
    `).join('') + 
    `<div style="color:#51648b; text-align:center; padding:10px;"> — end of timeline (${filtered.length} events) — </div>`;

    updateStats(filtered.length, filtered);
    updateHostFilter();
}

/**
 * Update statistics display
 */
function updateStats(count, filteredEvents = []) {
    // Update total count
    document.getElementById('severityCount').textContent = `(${count})`;
    
    // Update individual severity counts from filtered events
    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    
    // Count from filtered events if provided, otherwise from all timeline data
    const eventsToCount = filteredEvents.length > 0 ? filteredEvents : timelineData;
    
    eventsToCount.forEach(item => {
        if (severityCounts[item.severity] !== undefined) {
            severityCounts[item.severity]++;
        }
    });
    
    // Update each severity count in the sidebar
    const severityItems = document.querySelectorAll('#severityList .severity-item');
    severityItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        const countSpan = item.querySelector('.event-count');
        if (checkbox && countSpan) {
            const severity = checkbox.value;
            countSpan.textContent = severityCounts[severity] || 0;
        }
    });
    
    const annotations = timelineData.filter(i => i.annotation).length;
    document.getElementById('annotationCount').textContent = annotations;
    document.getElementById('auditTrail').textContent = `audit trail: analyst GA · ${annotations} annotations`;
}

/**
 * Update host filter with dynamically loaded hosts
 */
function updateHostFilter() {
    const hosts = getAllHosts();
    const hostList = document.getElementById('hostList');
    
    // Only update if there are new hosts
    const existingHosts = Array.from(document.querySelectorAll('#hostList input'))
        .map(i => i.value.toLowerCase());
    
    const newHosts = hosts.filter(h => !existingHosts.includes(h.toLowerCase()));
    
    if (newHosts.length > 0) {
        const currentHTML = hostList.innerHTML;
        const newOptions = newHosts.map(host => `
            <label class="host-item">
                <input type="checkbox" value="${host}" checked> ${host}
            </label>
        `).join('');
        
        hostList.innerHTML = currentHTML + newOptions;
        
        // Re-attach event listeners
        attachHostListeners();
    }
}

// ============================================
// ANNOTATION FUNCTIONS
// ============================================

let currentAnnotationId = null;

/**
 * Open annotation modal
 */
function openAnnotation(id) {
    currentAnnotationId = id;
    const item = timelineData.find(i => i.id === id);
    document.getElementById('annotationText').value = item.annotation || '';
    document.getElementById('annotationModal').classList.remove('hidden');
}

/**
 * Close annotation modal
 */
function closeAnnotationModal() {
    document.getElementById('annotationModal').classList.add('hidden');
    currentAnnotationId = null;
}

/**
 * Save annotation
 */
function saveAnnotation() {
    if (currentAnnotationId) {
        const item = timelineData.find(i => i.id === currentAnnotationId);
        item.annotation = document.getElementById('annotationText').value;
        renderTimeline();
        showToast('Annotation saved!');
    }
    closeAnnotationModal();
}

// ============================================
// DETAILS MODAL FUNCTIONS
// ============================================

let currentDetailId = null;
let viewHistory = [];

/**
 * Open details modal
 */
function openDetails(id) {
    currentDetailId = id;
    const item = timelineData.find(i => i.id === id);
    if (!item) return;

    const now = new Date();
    const viewedAt = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    
    // Record view history
    viewHistory.push({
        id: id,
        event: item.event,
        viewedAt: viewedAt
    });

    // Populate modal fields
    document.getElementById('detailTime').textContent = item.time;
    document.getElementById('detailNormalizedTime').textContent = item.time;
    document.getElementById('detailSource').textContent = item.source;
    document.getElementById('detailSourceType').textContent = item.sourceType.charAt(0).toUpperCase() + item.sourceType.slice(1);
    document.getElementById('detailType').textContent = item.type.toUpperCase();
    document.getElementById('detailSeverity').textContent = item.severity.charAt(0).toUpperCase() + item.severity.slice(1);
    document.getElementById('detailEvent').textContent = item.event.replace(/<[^>]*>/g, '');
    document.getElementById('detailDetail').textContent = item.detail || '-';
    document.getElementById('detailAnnotation').textContent = item.annotation || '-';
    document.getElementById('detailEventId').textContent = '#' + item.id;
    document.getElementById('viewedAtTime').textContent = viewedAt;

    // Show raw data
    const rawData = item.raw || generateRawData(item);
    document.getElementById('detailRawData').textContent = rawData;

    // Show loaded files if any
    const fileInfoSection = document.getElementById('fileInfoSection');
    const loadedFilesList = document.getElementById('loadedFilesList');
    if (loadedFiles.length > 0) {
        fileInfoSection.style.display = 'block';
        loadedFilesList.innerHTML = loadedFiles.map(f => `
            <div class="details-row">
                <span class="details-label">${f.name}</span>
                <span class="details-value">${formatFileSize(f.size)}</span>
            </div>
            <div class="details-row">
                <span class="details-label">SHA256</span>
                <span class="details-value" style="font-size: 0.75rem;">${truncateHash(f.hash)}</span>
            </div>
        `).join('');
    } else {
        fileInfoSection.style.display = 'none';
    }

    document.getElementById('detailsModal').classList.remove('hidden');
    console.log(`[VIEW] Event #${id} viewed at ${viewedAt}`);
}

/**
 * Generate mock raw data
 */
function generateRawData(item) {
    const sourceTypes = {
        'windows': `[${item.time}] Microsoft-Windows-Security-Auditing\nEvent ID: ${item.detail || '4625'}\nAccount Name: admin\n`,
        'linux': `[${item.time}] ${item.source} sudo: ${item.event.replace(/<[^>]*>/g, '')}\n`,
        'csv': `[${item.time}] ${item.sourceType.toUpperCase()} | ${item.event.replace(/<[^>]*>/g, '')} | ${item.detail}`,
        'log': `[${item.time}] [${item.source}] INFO: ${item.event.replace(/<[^>]*>/g, '')}`
    };
    return sourceTypes[item.sourceType] || sourceTypes['log'];
}

/**
 * Close details modal
 */
function closeDetailsModal() {
    document.getElementById('detailsModal').classList.add('hidden');
    currentDetailId = null;
}

/**
 * Copy details to clipboard
 */
function copyDetails() {
    if (!currentDetailId) return;
    
    const item = timelineData.find(i => i.id === currentDetailId);
    if (!item) return;

    const detailsText = `FLTR Event Details
========================
Event ID: #${item.id}
Time: ${item.time}
Source: ${item.source} (${item.sourceType})
Type: ${item.type.toUpperCase()}
Severity: ${item.severity}
Event: ${item.event.replace(/<[^>]*>/g, '')}
Detail: ${item.detail}
Annotation: ${item.annotation || 'None'}
========================
Viewed at: ${document.getElementById('viewedAtTime').textContent}
SHA256: ${document.getElementById('forensicHash').textContent}`;

    navigator.clipboard.writeText(detailsText).then(() => {
        showToast('Details copied to clipboard!');
    }).catch(() => {
        showToast('Failed to copy details');
    });
}

// ============================================
// FILE UPLOAD HANDLERS
// ============================================

/**
 * Process uploaded file
 */
async function processFile(file) {
    const progressIndicator = document.getElementById('progressIndicator');
    const hashDisplay = document.getElementById('hashDisplay');
    const displayHash = document.getElementById('displayHash');
    const forensicHash = document.getElementById('forensicHash');
    const fileCount = document.getElementById('fileCount');

    progressIndicator.classList.remove('hidden');
    hashDisplay.classList.add('hidden');

    try {
        // Compute hash
        const hash = await computeSHA256(file);
        
        // Parse file content
        const events = await parseFile(file);
        
        // Add events to timeline
        addEvents(events);
        
        // Auto-add new hosts to active filters
        events.forEach(event => {
            const hostExists = activeFilters.hosts.some(h => 
                h.toLowerCase() === event.source.toLowerCase()
            );
            if (!hostExists) {
                activeFilters.hosts.push(event.source);
            }
        });
        
        // Track loaded file
        loadedFiles.push({ name: file.name, size: file.size, hash: hash });
        
        // Update UI
        displayHash.textContent = truncateHash(hash);
        forensicHash.textContent = truncateHash(hash);
        fileCount.textContent = loadedFiles.length + ' file' + (loadedFiles.length !== 1 ? 's' : '');

        progressIndicator.classList.add('hidden');
        hashDisplay.classList.remove('hidden');

        // Render updated timeline
        renderTimeline();
        
        showToast(`Loaded ${events.length} events from ${file.name}`);
    } catch (error) {
        console.error('Error processing file:', error);
        progressIndicator.classList.add('hidden');
        hashDisplay.classList.remove('hidden');
        showToast('Error processing file');
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export to CSV
 */
function exportToCSV() {
    const headers = ['Time', 'Source', 'Severity', 'Event', 'Detail', 'Annotation'];
    const rows = timelineData.map(i => [
        i.time, 
        i.source, 
        i.severity, 
        i.event.replace(/<[^>]*>/g, ''), 
        i.detail, 
        i.annotation
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fltr_timeline_export.csv';
    a.click();
    showToast('CSV exported successfully!');
}

/**
 * Export to PDF (simulated)
 */
function exportToPDF() {
    showToast('PDF export started... (Prototype simulation)');
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Keyword input
    document.getElementById('keywordInput').addEventListener('input', renderTimeline);

    // Severity checkboxes
    document.querySelectorAll('#severityList input').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            activeFilters.severities = Array.from(document.querySelectorAll('#severityList input:checked'))
                .map(i => i.value);
            renderTimeline();
        });
    });

    // Host checkboxes
    attachHostListeners();

    // Select all hosts
    document.getElementById('selectAllHosts').addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('#hostList input');
        const allChecked = Array.from(checkboxes).every(i => i.checked);
        checkboxes.forEach(i => i.checked = !allChecked);
        activeFilters.hosts = Array.from(checkboxes).filter(i => i.checked).map(i => i.value);
        renderTimeline();
    });

    // Tags removal
    document.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-tag') || e.target.classList.contains('fa-xmark')) {
                const keyword = tag.dataset.keyword;
                activeFilters.keywords = activeFilters.keywords.filter(k => k !== keyword);
                tag.remove();
                renderTimeline();
            }
        });
    });

    // File upload - click
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    
    dropzone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            for (const file of files) {
                await processFile(file);
            }
            fileInput.value = '';
        }
    });

    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    
    dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            for (const file of files) {
                await processFile(file);
            }
        }
    });

    // Annotation modal
    document.getElementById('cancelAnnotation').addEventListener('click', closeAnnotationModal);
    document.getElementById('saveAnnotation').addEventListener('click', saveAnnotation);

    // Details modal - close on overlay click
    document.getElementById('detailsModal').addEventListener('click', (e) => {
        if (e.target.classList.contains('details-modal-overlay')) {
            closeDetailsModal();
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDetailsModal();
            closeAnnotationModal();
        }
    });

    // Copy details button
    document.getElementById('copyDetailsBtn').addEventListener('click', copyDetails);

    // Export buttons
    document.getElementById('exportCsv').addEventListener('click', exportToCSV);
    document.getElementById('exportPdf').addEventListener('click', exportToPDF);
}

/**
 * Attach host list event listeners
 */
function attachHostListeners() {
    document.querySelectorAll('#hostList input').forEach(checkbox => {
        checkbox.onchange = () => {
            activeFilters.hosts = Array.from(document.querySelectorAll('#hostList input:checked'))
                .map(i => i.value);
            renderTimeline();
        };
    });
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the application
 */
function initApp() {
    setupEventListeners();
    renderTimeline();
    console.log('FLTR Prototype initialized');
}

// Run on DOM ready
document.addEventListener('DOMContentLoaded', initApp);

