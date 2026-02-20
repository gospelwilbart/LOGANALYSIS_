/**
 * Utils - Utility functions
 * Contains: hashing, formatting, and helper functions
 */

// Compute SHA-256 hash of a file
async function computeSHA256(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Truncate hash for display
function truncateHash(hash) {
    if (!hash || hash.length < 8) return hash || '...';
    return hash.substring(0, 4) + '...' + hash.substring(hash.length - 4);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get source type icon
function getSourceIcon(sourceType) {
    const icons = {
        windows: '<i class="fa-brands fa-windows"></i>',
        linux: '<i class="fa-brands fa-linux"></i>',
        csv: '<i class="fa-solid fa-file-csv"></i>',
        log: '<i class="fa-solid fa-file-lines"></i>'
    };
    return icons[sourceType] || '<i class="fa-solid fa-file"></i>';
}

// Get severity CSS class
function getSeverityClass(severity) {
    const map = {
        critical: 'critical',
        high: 'high',
        medium: 'medium',
        low: 'low',
        info: 'info'
    };
    return map[severity] || '';
}

// Detect severity based on keywords in text
function detectSeverity(text) {
    const lowerText = text.toLowerCase();
    
    // Critical keywords
    if (/failed|error|critical|alert|attack|breach|hack|malware|intrusion|unauthorized|denied|threat/i.test(lowerText)) {
        return 'critical';
    }
    // High severity keywords
    if (/warning|warn|suspicious|failed|failure|deny|block|exploit|privilege/i.test(lowerText)) {
        return 'high';
    }
    // Medium severity keywords
    if (/notice|notice|moderate|attention/i.test(lowerText)) {
        return 'medium';
    }
    // Low severity keywords
    if (/info|information|debug|verbose/i.test(lowerText)) {
        return 'low';
    }
    // Default to info
    return 'info';
}

// Detect source type from filename
function detectSourceType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const lowerName = filename.toLowerCase();
    
    if (ext === 'evtx' || /security|system|application|event/i.test(lowerName)) {
        return 'windows';
    }
    if (ext === 'csv' || lowerName.includes('csv')) {
        return 'csv';
    }
    if (ext === 'log' || /syslog|auth|apache|nginx|audit/i.test(lowerName)) {
        return 'log';
    }
    if (ext === 'txt' || lowerName.includes('log') || lowerName.includes('output')) {
        return 'log';
    }
    return 'log';
}

// Extract hostname from log line
function extractHost(line) {
    // Try to find IP address
    const ipMatch = line.match(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/);
    if (ipMatch) return ipMatch[1];
    
    // Try to find hostname patterns
    const hostMatch = line.match(/(?:host|server|source|from)[:\s=]+([a-zA-Z0-9\-_]+)/i);
    if (hostMatch) return hostMatch[1];
    
    return 'unknown';
}

// Parse timestamp from various formats
function parseTimestamp(line) {
    // ISO format: 2025-02-15T03:12:47
    let match = line.match(/(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/);
    if (match) return match[1].replace('T', ' ') + ' UTC';
    
    // Common log format: Feb 15 03:12:47
    match = line.match(/([A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})/);
    if (match) return '2025-' + match[1] + ' UTC';
    
    // US format: 02/15/2025 03:12:47
    match = line.match(/(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/);
    if (match) {
        const [date, time] = match[1].split(' ');
        const [m, d, y] = date.split('/');
        return `${y}-${m}-${d} ${time} UTC`;
    }
    
    return null;
}

// Show toast notification
function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
        document.getElementById('toastMessage').textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }
}

