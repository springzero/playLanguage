"use strict";
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
exports.__esModule = true;
exports.RefResolver = exports.Enter = exports.SymKind = exports.SymTable = void 0;
var ast_1 = require("./ast");
/**
 * 符号表
 * 保存变量、函数、类等的名称和它的类型、声明的位置（AST节点）
 */
var SymTable = /** @class */ (function () {
    function SymTable() {
        this.table = new Map();
    }
    SymTable.prototype.enter = function (name, decl, symType) {
        this.table.set(name, new Symbol(name, decl, symType));
    };
    SymTable.prototype.hasSymbol = function (name) {
        return this.table.has(name);
    };
    SymTable.prototype.getSymbol = function (name) {
        var item = this.table.get(name);
        if (typeof item == 'object') {
            return item;
        }
        else {
            return null;
        }
    };
    return SymTable;
}());
exports.SymTable = SymTable;
/**
 * 符号表条目
 */
var Symbol = /** @class */ (function () {
    function Symbol(name, decl, kind) {
        this.name = name;
        this.decl = decl;
        this.kind = kind;
    }
    return Symbol;
}());
/**
 * 符号类型
 */
var SymKind;
(function (SymKind) {
    SymKind[SymKind["Variable"] = 0] = "Variable";
    SymKind[SymKind["Function"] = 1] = "Function";
    SymKind[SymKind["Class"] = 2] = "Class";
    SymKind[SymKind["Interface"] = 3] = "Interface";
})(SymKind = exports.SymKind || (exports.SymKind = {}));
;
///////////////////////
// 建立符号表
/**
 * 把符号加入符号表
 */
var Enter = /** @class */ (function (_super) {
    __extends(Enter, _super);
    function Enter(symTable) {
        var _this = _super.call(this) || this;
        _this.symTable = symTable;
        return _this;
    }
    Enter.prototype.visitFunctionDecl = function (functionDecl) {
        if (this.symTable.hasSymbol(functionDecl.name)) {
            console.log("Dumplicate symbol: " + functionDecl.name);
        }
        this.symTable.enter(functionDecl.name, functionDecl, SymKind.Function);
    };
    Enter.prototype.visitVariableDecl = function (variableDecl) {
        if (this.symTable.hasSymbol(variableDecl.name)) {
            console.log("Dumplicate symbol: " + variableDecl.name);
        }
        this.symTable.enter(variableDecl.name, variableDecl, SymKind.Variable);
    };
    return Enter;
}(ast_1.AstVisitor));
exports.Enter = Enter;
//////////////////////
// 引用消解
// 1. 函数引用消解
// 2. 变量引用消解
/**
 * 引用消解
 * 遍历AST。如果发现函数调用和变量引用，就去找它的定义
 */
var RefResolver = /** @class */ (function (_super) {
    __extends(RefResolver, _super);
    function RefResolver(symTable) {
        var _this = _super.call(this) || this;
        _this.symTable = symTable;
        return _this;
    }
    RefResolver.prototype.visitFunctionCall = function (functionCall) {
        var symbol = this.symTable.getSymbol(functionCall.name);
        if (symbol != null && symbol.kind == SymKind.Function) {
            functionCall.decl = symbol.decl;
        }
        else {
            if (functionCall.name != "println") {
                console.log("Error: cannot find declaration of function " + functionCall.name);
            }
        }
    };
    RefResolver.prototype.visitVariable = function (variable) {
        var symbol = this.symTable.getSymbol(variable.name);
        if (symbol != null && symbol.kind == SymKind.Variable) {
            variable.decl = symbol.decl;
        }
        else {
            console.log("Error: cannot find declaration of variable " + variable.name);
        }
    };
    return RefResolver;
}(ast_1.AstVisitor));
exports.RefResolver = RefResolver;
