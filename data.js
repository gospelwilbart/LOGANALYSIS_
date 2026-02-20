/**
 * Data - Timeline data management
 * Contains: sample data, loaded files tracking, filters
 */

// Sample timeline data (for demo) - removed for production
const sampleTimelineData = [];

// Timeline data (combines sample + loaded)
let timelineData = [...sampleTimelineData];

// Loaded files tracking
let loadedFiles = [];

// Active filters - empty by default, populated when files are loaded
let activeFilters = {
    keywords: [],
    severities: ['critical', 'high', 'medium', 'low', 'info'],
    hosts: []
};

// Get next event ID
function getNextId() {
    return Math.max(...timelineData.map(i => i.id), 0) + 1;
}

// Add new events from parsed file
function addEvents(events) {
    timelineData = [...timelineData, ...events];
    return events.length;
}

// Get all unique hosts from data
function getAllHosts() {
    const hosts = new Set(timelineData.map(i => i.source.toLowerCase()));
    return Array.from(hosts);
}

// Get events count by severity
function getSeverityCounts() {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    timelineData.forEach(item => {
        if (counts[item.severity] !== undefined) {
            counts[item.severity]++;
        }
    });
    return counts;
}

// Filter events based on active filters
function filterEvents(keyword = '') {
    const searchTerm = keyword.toLowerCase();
    
    // If no keyword entered and no active keyword filters, show all events
    const hasActiveKeywordFilters = activeFilters.keywords.length > 0;
    
    return timelineData.filter(item => {
        // Keyword filter - only apply if there are active keyword filters OR user entered a search term
        let hasKeyword = true;
        if (hasActiveKeywordFilters || searchTerm) {
            hasKeyword = activeFilters.keywords.some(k => 
                item.event.toLowerCase().includes(k.toLowerCase())
            ) || item.detail.toLowerCase().includes(searchTerm) ||
              item.event.toLowerCase().includes(searchTerm);
        }
        
        // Severity filter
        const hasSeverity = activeFilters.severities.includes(item.severity);
        
        // Host filter - if no hosts configured, show all hosts
        const hasHost = activeFilters.hosts.length === 0 || activeFilters.hosts.some(h => 
            item.source.toLowerCase() === h.toLowerCase() || 
            item.source.toLowerCase().includes(h.toLowerCase())
        );
        
        return hasKeyword && hasSeverity && hasHost;
    });
}

// Reset timeline data
function resetTimeline() {
    timelineData = [...sampleTimelineData];
    loadedFiles = [];
}

// Clear all data
function clearAllData() {
    timelineData = [];
    loadedFiles = [];
}

