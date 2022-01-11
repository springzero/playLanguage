"use strict";
/**
 * 符号表和作用域
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
exports.__esModule = true;
exports.SymbolDumper = exports.SymbolVisitor = exports.intrinsics = exports.built_ins = exports.FUN_integer_to_string = exports.FUN_tick = exports.FUN_println = exports.FunctionSymbol = exports.VarSymbol = exports.SymKind = exports.Symbol = void 0;
var types_1 = require("./types");
/**
 * 符号
 */
var Symbol = /** @class */ (function () {
    function Symbol(name, theType, kind) {
        this.theType = types_1.SysTypes.Any;
        this.name = name;
        this.theType = theType;
        this.kind = kind;
    }
    return Symbol;
}());
exports.Symbol = Symbol;
/**
 * 符号种类
 */
var SymKind;
(function (SymKind) {
    SymKind[SymKind["Variable"] = 0] = "Variable";
    SymKind[SymKind["Function"] = 1] = "Function";
    SymKind[SymKind["Class"] = 2] = "Class";
    SymKind[SymKind["Interface"] = 3] = "Interface";
    SymKind[SymKind["Parameter"] = 4] = "Parameter";
    SymKind[SymKind["Prog"] = 5] = "Prog";
})(SymKind = exports.SymKind || (exports.SymKind = {}));
;
// 变量符号
var VarSymbol = /** @class */ (function (_super) {
    __extends(VarSymbol, _super);
    function VarSymbol(name, theType) {
        var _this = _super.call(this, name, theType, SymKind.Variable) || this;
        _this.theType = theType;
        return _this;
    }
    VarSymbol.prototype.accept = function (visitor, additional) {
        visitor.visitVarSymbol(this, additional);
    };
    return VarSymbol;
}(Symbol));
exports.VarSymbol = VarSymbol;
// 函数符号
var FunctionSymbol = /** @class */ (function (_super) {
    __extends(FunctionSymbol, _super);
    function FunctionSymbol(name, theType, vars) {
        if (vars === void 0) { vars = []; }
        var _this = _super.call(this, name, theType, SymKind.Function) || this;
        _this.vars = []; // 本地变量的列表。 参数也算本地变量
        _this.opStackSize = 10; // 操作数的大小  ？？操作数 what mean？ 递归限制么
        _this.byteCode = null; // 存放生成的字节码
        _this.decl = null; // 存放AST，作为代码来运行
        _this.vars = vars;
        _this.theType = theType;
        return _this;
    }
    FunctionSymbol.prototype.accept = function (visitor, additional) {
        visitor.visitFuncionSymbol(this, additional);
    };
    FunctionSymbol.prototype.getNumParams = function () {
        return this.theType.paramTypes.length;
    };
    return FunctionSymbol;
}(Symbol));
exports.FunctionSymbol = FunctionSymbol;
///////////////
// 一些系统内置的符号
exports.FUN_println = new FunctionSymbol("println", new types_1.FunctionType(types_1.SysTypes.Void, [types_1.SysTypes.String]), [new VarSymbol("a", types_1.SysTypes.String)]);
exports.FUN_tick = new FunctionSymbol("tick", new types_1.FunctionType(types_1.SysTypes.Integer, []), []);
exports.FUN_integer_to_string = new FunctionSymbol("integer_to_string", new types_1.FunctionType(types_1.SysTypes.String, [types_1.SysTypes.Integer]), [new VarSymbol("a", types_1.SysTypes.Integer)]);
exports.built_ins = new Map([
    ["println", exports.FUN_println],
    ["tick", exports.FUN_tick],
    ["integer_to_string", exports.FUN_integer_to_string],
]);
var FUN_string_create_by_str = new FunctionSymbol("string_create_by_str", new types_1.FunctionType(types_1.SysTypes.String, [types_1.SysTypes.String]), [new VarSymbol("a", types_1.SysTypes.String)]);
var FUN_string_concat = new FunctionSymbol("string_concat", new types_1.FunctionType(types_1.SysTypes.String, [types_1.SysTypes.String, types_1.SysTypes.String]), [new VarSymbol("str1", types_1.SysTypes.String), new VarSymbol("str2", types_1.SysTypes.String)]);
exports.intrinsics = new Map([
    ["string_create_by_str", FUN_string_create_by_str],
    ["string_concat", FUN_string_concat],
]);
//////////////////////////////
// visitor
var SymbolVisitor = /** @class */ (function () {
    function SymbolVisitor() {
    }
    return SymbolVisitor;
}());
exports.SymbolVisitor = SymbolVisitor;
var SymbolDumper = /** @class */ (function (_super) {
    __extends(SymbolDumper, _super);
    function SymbolDumper() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SymbolDumper.prototype.visit = function (s, addtional) {
        return s.accept(this, addtional);
    };
    // 输出VarSymbol的调试信息
    SymbolDumper.prototype.visitVarSymbol = function (sym, additional) {
        console.log(additional + sym.name + "{" + SymKind[sym.kind] + "}");
    };
    SymbolDumper.prototype.visitFuncionSymbol = function (sym, additional) {
        console.log(additional + sym.name + "{" + SymKind[sym.kind] + ", local var count:" + sym.vars.length + "}");
    };
    return SymbolDumper;
}(SymbolVisitor));
exports.SymbolDumper = SymbolDumper;
