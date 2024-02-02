function toSeconds(millis) {
    let entry = (millis / 1000).toFixed(3);
    if (entry.endsWith('0'))
        entry = entry.substr(0, entry.length - 1);
    return parseFloat(entry);
}
const loadTimeConversion = {
    requestTime() {
        const ntEntry = performance.getEntriesByType('navigation')[0];
        const start = ntEntry ? ntEntry.startTime : 0;
        return toSeconds(start + performance.timeOrigin);
    },
    startLoadTime() {
        const ntEntry = performance.getEntriesByType('navigation')[0];
        const start = ntEntry ? ntEntry.startTime : 0;
        return toSeconds(start + performance.timeOrigin);
    },
    commitLoadTime() {
        const ntEntry = performance.getEntriesByType('navigation')[0];
        const start = ntEntry ? ntEntry.responseStart : 0;
        return toSeconds(start + performance.timeOrigin);
    },
    finishDocumentLoadTime() {
        const ntEntry = performance.getEntriesByType('navigation')[0];
        const start = ntEntry ? ntEntry.domContentLoadedEventEnd : 0;
        return toSeconds(start + performance.timeOrigin);
    },
    finishLoadTime() {
        const ntEntry = performance.getEntriesByType('navigation')[0];
        const start = ntEntry ? ntEntry.loadEventEnd : 0;
        return toSeconds(start + performance.timeOrigin);
    },
    firstPaintTime() {
        let fpEntry = performance.getEntriesByType('paint')[0];
        if (!fpEntry) {
            const ntEntry = performance.getEntriesByType('navigation')[0];
            const start = ntEntry ? ntEntry.loadEventEnd : 0;
            fpEntry = { startTime: start + Math.random() * 85 };
        }
        return toSeconds(fpEntry.startTime + performance.timeOrigin);
    },
    navigationType() {
        const ntEntry = performance.getEntriesByType('navigation')[0];
        if (!ntEntry)
            return 'Other';
        switch (ntEntry.type) {
            case 'back_forward':
                return 'BackForward';
            case 'reload':
                return 'Reload';
            case 'prerender':
            case 'navigate':
            default:
                return 'Other';
        }
    },
    wasFetchedViaSpdy() {
        const ntEntry = performance.getEntriesByType('navigation')[0];
        if (!ntEntry)
            return true;
        return ['h2', 'hq'].includes(ntEntry.nextHopProtocol);
    },
    wasNpnNegotiated() {
        const ntEntry = performance.getEntriesByType('navigation')[0];
        if (!ntEntry)
            return true;
        return ['h2', 'hq'].includes(ntEntry.nextHopProtocol);
    },
    connectionInfo() {
        const ntEntry = performance.getEntriesByType('navigation')[0];
        if (!ntEntry)
            return 'h2';
        return ntEntry.nextHopProtocol;
    },
};
const csiConversion = {
    startE() {
        const ntEntry = performance.getEntriesByType('navigation')[0];
        const start = ntEntry ? ntEntry.loadEventEnd : 0;
        return parseInt((start + performance.timeOrigin), 10);
    },
    onloadT() {
        const ntEntry = performance.getEntriesByType('navigation')[0];
        const load = ntEntry ? ntEntry.domContentLoadedEventEnd : 0;
        return parseInt((load + performance.timeOrigin), 10);
    },
    pageT() {
        return parseFloat(performance.now().toFixed(3));
    },
    tran() {
        const ntEntry = performance.getEntriesByType('navigation')[0];
        const type = ntEntry ? ntEntry.type : 'navigate';
        switch (type) {
            case 'back_forward':
                return 6;
            case 'reload':
                return 16;
            case 'prerender':
            case 'navigate':
            default:
                return 15;
        }
    },
};
const polyfill = args.polyfill;
const { prevProperty, property } = polyfill;
if (args.updateLoadTimes) {
    for (const [name, func] of Object.entries(loadTimeConversion)) {
        property.loadTimes['new()'][name]['_$$value()'] = func;
    }
    for (const [name, func] of Object.entries(csiConversion)) {
        property.csi['new()'][name]['_$$value()'] = func;
    }
}
const descriptor = buildDescriptor(property, 'self.chrome');
addDescriptorAfterProperty('self', prevProperty, 'chrome', descriptor);
