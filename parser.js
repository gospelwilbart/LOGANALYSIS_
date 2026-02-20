/**
 * Parser - File parsing logic
 * Contains: CSV, LOG, TXT parsing functions
 */

/**
 * Parse a file based on its extension
 * @param {File} file - The file to parse
 * @returns {Promise<Array>} - Array of parsed events
 */
async function parseFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const content = await readFileContent(file);
    
    switch (extension) {
        case 'csv':
            return parseCSV(content, file.name);
        case 'log':
        case 'txt':
            return parseLog(content, file.name);
        case 'evtx':
            // EVTX files need special handling - simulate for now
            return parseEVTX(content, file.name);
        default:
            return parseLog(content, file.name);
    }
}

/**
 * Read file content as text
 */
async function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

/**
 * Parse CSV content
 * Expected format: timestamp,source,severity,event,detail
 */
function parseCSV(content, filename) {
    const lines = content.split('\n').filter(line => line.trim());
    const events = [];
    let id = getNextId();
    
    // Skip header if it exists
    const startIndex = lines[0].toLowerCase().includes('timestamp') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parsing (handles basic commas)
        const parts = parseCSVLine(line);
        
        if (parts.length >= 2) {
            const event = {
                id: id++,
                time: parts[0] || formatCurrentTime(),
                source: parts[1] || filename,
                sourceType: detectSourceType(filename),
                type: 'csv',
                severity: detectSeverity(parts[2] || parts.join(' ')),
                event: parts[3] || parts.slice(2).join(' - '),
                detail: parts[4] || '',
                annotation: '',
                raw: line
            };
            events.push(event);
        }
    }
    
    return events;
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line) {
    const parts = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current.trim());
    
    return parts;
}

/**
 * Parse LOG/TXT content
 * Handles various log formats
 */
function parseLog(content, filename) {
    const lines = content.split('\n').filter(line => line.trim());
    const events = [];
    let id = getNextId();
    
    for (const line of lines) {
        if (!line.trim() || line.length < 5) continue;
        
        // Try to extract timestamp
        const timestamp = parseTimestamp(line) || formatCurrentTime();
        
        // Extract host/source
        const host = extractHost(line) || filename;
        
        // Detect severity
        const severity = detectSeverity(line);
        
        // Clean up event description
        let eventDesc = line
            .replace(/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}[^\s]*\s*/, '')
            .replace(/^[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\S+\s+/, '')
            .trim();
        
        if (!eventDesc) {
            eventDesc = line.substring(0, 100);
        }
        
        const event = {
            id: id++,
            time: timestamp,
            source: host,
            sourceType: detectSourceType(filename),
            type: 'log',
            severity: severity,
            event: eventDesc,
            detail: '',
            annotation: '',
            raw: line
        };
        
        events.push(event);
    }
    
    return events;
}

/**
 * Parse EVTX content (simulated)
 * EVTX files are binary, so we simulate parsing
 */
function parseEVTX(content, filename) {
    // EVTX files are binary - we'll create sample events
    // In production, you'd use a library like node-evtx
    const events = [];
    let id = getNextId();
    
    // Check if content looks like it has log data
    const lines = content.split('\n').filter(l => l.trim());
    
    if (lines.length > 0) {
        return parseLog(content, filename);
    }
    
    // Create sample Windows security events
    const sampleEvents = [
        { event: 'Event 4625 - An account failed to log on', severity: 'critical' },
        { event: 'Event 4624 - An account was successfully logged on', severity: 'info' },
        { event: 'Event 4672 - Special privileges assigned to new logon', severity: 'high' },
        { event: 'Event 4648 - A logon was attempted using explicit credentials', severity: 'medium' },
        { event: 'Event 4634 - An account was logged off', severity: 'info' }
    ];
    
    for (let i = 0; i < sampleEvents.length; i++) {
        events.push({
            id: id++,
            time: addMinutesToTime('2025-02-15 03:12:47 UTC', i * 15),
            source: 'DC-02',
            sourceType: 'windows',
            type: 'evtx',
            severity: sampleEvents[i].severity,
            event: sampleEvents[i].event,
            detail: `Event ID: ${4625 + i}`,
            annotation: '',
            raw: `EVTX Record #${i + 1}`
        });
    }
    
    return events;
}

/**
 * Format current time
 */
function formatCurrentTime() {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
}

/**
 * Add minutes to a timestamp
 */
function addMinutesToTime(timeStr, minutes) {
    const [datePart, timePart] = timeStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
    
    const date = new Date(year, month - 1, day, hour, minute, second);
    date.setMinutes(date.getMinutes() + minutes);
    
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    const newDay = String(date.getDate()).padStart(2, '0');
    const newHour = String(date.getHours()).padStart(2, '0');
    const newMinute = String(date.getMinutes()).padStart(2, '0');
    const newSecond = String(date.getSeconds()).padStart(2, '0');
    
    return `${newYear}-${newMonth}-${newDay} ${newHour}:${newMinute}:${newSecond} UTC`;
}

