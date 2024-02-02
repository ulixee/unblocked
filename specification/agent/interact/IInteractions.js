"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMousePositionXY = exports.MouseButton = exports.InteractionCommand = void 0;
var InteractionCommand;
(function (InteractionCommand) {
    InteractionCommand["move"] = "move";
    InteractionCommand["scroll"] = "scroll";
    InteractionCommand["willDismissDialog"] = "willDismissDialog";
    InteractionCommand["click"] = "click";
    InteractionCommand["clickDown"] = "clickDown";
    InteractionCommand["clickUp"] = "clickUp";
    InteractionCommand["doubleclick"] = "doubleclick";
    InteractionCommand["type"] = "type";
    InteractionCommand["waitForMillis"] = "waitForMillis";
})(InteractionCommand || (exports.InteractionCommand = InteractionCommand = {}));
// Mouse-specific Types
var MouseButton;
(function (MouseButton) {
    MouseButton["left"] = "left";
    MouseButton["middle"] = "middle";
    MouseButton["right"] = "right";
})(MouseButton || (exports.MouseButton = MouseButton = {}));
function isMousePositionXY(mousePosition) {
    return (Array.isArray(mousePosition) &&
        mousePosition.length === 2 &&
        typeof mousePosition[0] === 'number' &&
        typeof mousePosition[1] === 'number');
}
exports.isMousePositionXY = isMousePositionXY;
//# sourceMappingURL=IInteractions.js.map