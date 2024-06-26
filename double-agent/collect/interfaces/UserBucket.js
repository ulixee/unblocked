"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBucket = void 0;
var UserBucket;
(function (UserBucket) {
    UserBucket["IP"] = "IP Address";
    UserBucket["TLS"] = "TLS Fingerprint";
    UserBucket["Browser"] = "Cross-Session Browser Fingerprint";
    UserBucket["BrowserSingleSession"] = "Single-Session Browser Fingerprint";
    UserBucket["Font"] = "Fonts Fingerprint";
    UserBucket["IpAndPortRange"] = "IP Address & Port Range";
    UserBucket["UserAgent"] = "UserAgent";
    UserBucket["UserCookie"] = "UserCookie";
})(UserBucket || (UserBucket = {}));
const values = Object.values(UserBucket);
function getUserBucket(type) {
    if (values.includes(type))
        return type;
    return null;
}
exports.getUserBucket = getUserBucket;
exports.default = UserBucket;
//# sourceMappingURL=UserBucket.js.map