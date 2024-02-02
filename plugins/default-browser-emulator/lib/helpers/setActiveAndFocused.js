"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function setActiveAndFocused(emulationProfile, devtools) {
    await devtools.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(err => err);
}
exports.default = setActiveAndFocused;
//# sourceMappingURL=setActiveAndFocused.js.map