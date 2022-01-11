"use strict";
/**
 * 作用域
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
exports.__esModule = true;
exports.ScopeDumper = exports.Scope = void 0;
var ast_1 = require("./ast");
var symbol_1 = require("./symbol");
var Scope = /** @class */ (function () {
    function Scope(enclosingScope) {
        // 存储
        this.name2symbol = new Map();
        this.enclosingScope = enclosingScope;
    }
    /**
     * 将变量存储到本作用域
     * @param name
     * @param s
     */
    Scope.prototype.enter = function (name, s) {
        this.name2symbol.set(name, s);
    };
    Scope.prototype.hasSymbol = function (name) {
        return this.name2symbol.has(name);
    };
    Scope.prototype.getSymbol = function (name) {
        var s = this.name2symbol.get(name);
        if (typeof s == 'object') {
            return s;
        }
        else {
            return null;
        }
    };
    /**
     * 级联查找某个符号
     */
    Scope.prototype.getSymbolCascade = function (name) {
        var s = this.getSymbol(name);
        if (s != null) {
            return s;
        }
        else if (this.enclosingScope != null) {
            return this.enclosingScope.getSymbolCascade(name);
        }
        else {
            return null;
        }
    };
    return Scope;
}());
exports.Scope = Scope;
var ScopeDumper = /** @class */ (function (_super) {
    __extends(ScopeDumper, _super);
    function ScopeDumper() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ScopeDumper.prototype.visitFunctionDecl = function (functionDecl, prefix) {
        console.log(prefix + "Scope of function: " + functionDecl.name);
        // 显示本级Scope
        if (functionDecl.scope != null) {
            this.dumpScope(functionDecl.scope, prefix);
        }
        else {
            console.log(prefix + "{null}");
        }
        // 继续遍历
        _super.prototype.visitFunctionDecl.call(this, functionDecl, prefix + "  ");
    };
    ScopeDumper.prototype.visitBlock = function (block, prefix) {
        console.log(prefix + "Scope of block");
        // 显示本级Scope
        if (block.scope != null) {
            this.dumpScope(block.scope, prefix);
        }
        else {
            console.log(prefix + "{null}");
        }
        _super.prototype.visitBlock.call(this, block, prefix + "  ");
    };
    // 作用域 ——> 找到符号 -> 调用各符号自身方法accept()
    ScopeDumper.prototype.dumpScope = function (scope, prefix) {
        var e_1, _a;
        if (scope.name2symbol.size > 0) {
            // 遍历该作用域的符号
            var symbolDumper = new symbol_1.SymbolDumper();
            try {
                for (var _b = __values(scope.name2symbol.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var s = _c.value;
                    symbolDumper.visit(s, prefix + "  ");
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
    };
    return ScopeDumper;
}(ast_1.AstVisitor));
exports.ScopeDumper = ScopeDumper;
