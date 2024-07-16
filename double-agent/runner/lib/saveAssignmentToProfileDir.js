"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Path = require("path");
const AssignmentsClient_1 = require("./AssignmentsClient");
async function saveAssignmentToProfileDir(assignment, baseDir) {
    const userId = assignment.id;
    const filesDir = Path.join(baseDir, userId);
    await new AssignmentsClient_1.default(userId).downloadAssignmentProfiles(assignment.id, filesDir);
    return filesDir;
}
exports.default = saveAssignmentToProfileDir;
//# sourceMappingURL=saveAssignmentToProfileDir.js.map