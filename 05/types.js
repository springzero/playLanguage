"use strict";
/**
 * 类型体系
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
exports.SysTypes = exports.FunctionType = exports.SimpleType = exports.Type = void 0;
var Type = /** @class */ (function () {
    function Type(name) {
        this.name = name;
    }
    return Type;
}());
exports.Type = Type;
/**
 * 简单的类型， 可以有一到多个父类型
 */
var SimpleType = /** @class */ (function (_super) {
    __extends(SimpleType, _super);
    function SimpleType(name, upperTypes) {
        if (upperTypes === void 0) { upperTypes = []; }
        var _this = _super.call(this, name) || this;
        _this.upperTypes = upperTypes;
        return _this;
    }
    SimpleType.prototype.hasVoid = function () {
        var e_1, _a;
        if (this === SysTypes.Void) {
            return true;
        }
        else {
            try {
                // todo 需要检查循环引用
                for (var _b = __values(this.upperTypes), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var t = _c.value;
                    if (t.hasVoid()) {
                        return true;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return false;
        }
    };
    return SimpleType;
}(Type));
exports.SimpleType = SimpleType;
var FunctionType = /** @class */ (function (_super) {
    __extends(FunctionType, _super);
    function FunctionType(returnType, paramTypes, name) {
        if (returnType === void 0) { returnType = SysTypes.Void; }
        if (paramTypes === void 0) { paramTypes = []; }
        if (name === void 0) { name = undefined; }
        var _this = _super.call(this, "@function") || this;
        _this.returnType = returnType;
        _this.paramTypes = paramTypes;
        if (typeof name == 'string') {
            _this.name = name;
        }
        else {
            _this.name = "@function" + (FunctionType.index++);
        }
        return _this;
    }
    FunctionType.prototype.hasVoid = function () {
        return this.returnType.hasVoid();
    };
    FunctionType.index = 0;
    return FunctionType;
}(Type));
exports.FunctionType = FunctionType;
/**
 * 内置类型
 */
var SysTypes = /** @class */ (function () {
    function SysTypes() {
    }
    SysTypes.isSysType = function (t) {
        return t === SysTypes.Any || t === SysTypes.String || t === SysTypes.Number ||
            t === SysTypes.Boolean || t === SysTypes.Null || t === SysTypes.Undefined ||
            t === SysTypes.Void || t === SysTypes.Integer || t === SysTypes.Decimal;
    };
    // 所有类型的父类型
    SysTypes.Any = new SimpleType("any", []);
    // 基础类型
    SysTypes.String = new SimpleType("string", [SysTypes.Any]);
    SysTypes.Number = new SimpleType("number", [SysTypes.Any]);
    SysTypes.Boolean = new SimpleType("boolean", [SysTypes.Any]);
    // 所有类型的子类型
    SysTypes.Null = new SimpleType("null");
    SysTypes.Undefined = new SimpleType("undefined");
    SysTypes.Void = new SimpleType("void");
    SysTypes.Integer = new SimpleType("integer", [SysTypes.Number]);
    SysTypes.Decimal = new SimpleType("decimal", [SysTypes.Number]);
    return SysTypes;
}());
exports.SysTypes = SysTypes;
