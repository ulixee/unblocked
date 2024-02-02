declare function toSeconds(millis: any): number;
interface PerformanceEntry {
    loadEventEnd: number;
    responseStart: number;
    domContentLoadedEventEnd: number;
    type: string;
    nextHopProtocol: string;
}
declare const loadTimeConversion: {
    requestTime(): number;
    startLoadTime(): number;
    commitLoadTime(): number;
    finishDocumentLoadTime(): number;
    finishLoadTime(): number;
    firstPaintTime(): number;
    navigationType(): "Other" | "BackForward" | "Reload";
    wasFetchedViaSpdy(): boolean;
    wasNpnNegotiated(): boolean;
    connectionInfo(): string;
};
declare const csiConversion: {
    startE(): number;
    onloadT(): number;
    pageT(): number;
    tran(): 6 | 15 | 16;
};
declare const polyfill: any;
declare const prevProperty: any, property: any;
declare const descriptor: PropertyDescriptor;
