"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanDomains = exports.addPageIndexToUrl = exports.addSessionIdToUrl = exports.isRecognizedDomain = exports.getDomainType = exports.DomainType = void 0;
const url_1 = require("url");
const index_1 = require("@double-agent/config/index");
const { CrossDomain, MainDomain, SubDomain, TlsDomain } = index_1.default.collect.domains;
var DomainType;
(function (DomainType) {
    DomainType["MainDomain"] = "MainDomain";
    DomainType["SubDomain"] = "SubDomain";
    DomainType["TlsDomain"] = "TlsDomain";
    DomainType["CrossDomain"] = "CrossDomain";
})(DomainType || (exports.DomainType = DomainType = {}));
function getDomainType(url) {
    const host = typeof url === 'string' ? url : url.host;
    const domain = extractDomainFromHost(host);
    if (domain === MainDomain || domain === DomainType.MainDomain.toLowerCase()) {
        return DomainType.MainDomain;
    }
    if (domain === CrossDomain || domain === DomainType.CrossDomain.toLowerCase()) {
        return DomainType.CrossDomain;
    }
    if (domain === SubDomain || domain === DomainType.SubDomain.toLowerCase()) {
        return DomainType.SubDomain;
    }
    if (domain === TlsDomain || domain === DomainType.TlsDomain.toLowerCase()) {
        return DomainType.TlsDomain;
    }
    throw new Error(`Unknown domain type: ${domain}`);
}
exports.getDomainType = getDomainType;
function isRecognizedDomain(host, recognizedDomains) {
    const domain = extractDomainFromHost(host);
    return recognizedDomains.some((x) => x === domain);
}
exports.isRecognizedDomain = isRecognizedDomain;
function addSessionIdToUrl(url, sessionId) {
    if (!url)
        return url;
    const startUrl = new url_1.URL(url);
    startUrl.searchParams.set('sessionId', sessionId);
    return startUrl.href;
}
exports.addSessionIdToUrl = addSessionIdToUrl;
function addPageIndexToUrl(url, pageIndex) {
    if (!url)
        return url;
    const startUrl = new url_1.URL(url);
    startUrl.searchParams.set('pageIndex', pageIndex.toString());
    return startUrl.href;
}
exports.addPageIndexToUrl = addPageIndexToUrl;
function cleanDomains(url) {
    if (!url)
        return url;
    return url
        .replace(RegExp(SubDomain, 'g'), 'SubDomain')
        .replace(RegExp(MainDomain, 'g'), 'MainDomain')
        .replace(RegExp(CrossDomain, 'g'), 'CrossDomain');
}
exports.cleanDomains = cleanDomains;
function extractDomainFromHost(host) {
    return host.split(':')[0];
}
//# sourceMappingURL=DomainUtils.js.map