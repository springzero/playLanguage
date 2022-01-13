"use strict";
exports.__esModule = true;
exports.CompilerError = void 0;
var CompilerError = /** @class */ (function () {
    function CompilerError(msg, beginPos, isWarning) {
        if (isWarning === void 0) { isWarning = false; }
        this.msg = msg;
        this.beginPos = beginPos;
        this.isWarning = isWarning;
    }
    return CompilerError;
}());
exports.CompilerError = CompilerError;
