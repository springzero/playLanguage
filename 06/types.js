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
exports.TypeVisitor = exports.SysTypes = exports.UnionType = exports.FunctionType = exports.SimpleType = exports.Type = void 0;
var Type = /** @class */ (function () {
    function Type(name) {
        this.name = name;
    }
    /**
    * type1与type2的上界
    * @param type1
    * @param type2
    */
    Type.getUpperBound = function (type1, type2) {
        if (type1 == SysTypes.Any || type2 == SysTypes.Any) {
            return SysTypes.Any;
        }
        else {
            if (type1.LE(type2)) {
                return type2;
            }
            else if (type2.LE(type1)) {
                return type1;
            }
            else {
                return new UnionType([type1, type2]);
            }
        }
    };
    Type.isSimpleType = function (t) {
        return typeof t.upperTypes == 'object';
    };
    Type.isUnionType = function (t) {
        return typeof t.types == 'object';
    };
    Type.isFunctionType = function (t) {
        return typeof t.returnType == 'object';
    };
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
    SimpleType.prototype.toString = function () {
        var e_2, _a;
        var upperTypeNames = "[";
        try {
            for (var _b = __values(this.upperTypes), _c = _b.next(); !_c.done; _c = _b.next()) {
                var ut = _c.value;
                upperTypeNames += ut.name + ", ";
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        upperTypeNames += "]";
        return "SimpleType {name: " + this.name + ", upperTypes: " + upperTypeNames + "}";
    };
    /**
     * 当前类型是否小于等于type2
     * @param type2
     */
    SimpleType.prototype.LE = function (type2) {
        var e_3, _a, e_4, _b;
        if (type2 == SysTypes.Any) {
            return true;
        }
        else if (this == SysTypes.Any) {
            return false;
        }
        else if (this === type2) {
            return true;
        }
        else if (Type.isSimpleType(type2)) {
            var t = type2;
            if (this.upperTypes.indexOf(t) != -1) {
                return true;
            }
            else {
                try {
                    //看看所有的父类型中，有没有一个是type2的子类型
                    for (var _c = __values(this.upperTypes), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var upperType = _d.value;
                        if (upperType.LE(type2)) {
                            return true;
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c["return"])) _a.call(_c);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                return false;
            }
        }
        else if (Type.isUnionType(type2)) {
            var t = type2;
            if (t.types.indexOf(this) != -1) {
                return true;
            }
            else { //是联合类型中其中一个类型的子类型就行
                try {
                    for (var _e = __values(t.types), _f = _e.next(); !_f.done; _f = _e.next()) {
                        var t2 = _f.value;
                        if (this.LE(t2)) {
                            return true;
                        }
                    }
                }
                catch (e_4_1) { e_4 = { error: e_4_1 }; }
                finally {
                    try {
                        if (_f && !_f.done && (_b = _e["return"])) _b.call(_e);
                    }
                    finally { if (e_4) throw e_4.error; }
                }
                return false;
            }
        }
        else {
            return false;
        }
    };
    /**
     * visitor模式
     */
    SimpleType.prototype.accept = function (visitor) {
        return visitor.visitSimpleType(this);
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
    FunctionType.prototype.toString = function () {
        var e_5, _a;
        var paramTypeNames = "[";
        try {
            for (var _b = __values(this.paramTypes), _c = _b.next(); !_c.done; _c = _b.next()) {
                var ut = _c.value;
                paramTypeNames += ut.name + ", ";
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
        paramTypeNames += "]";
        return "FunctionType {name: " + this.name + ", returnType: " + this.returnType.name + ", paramTypes: " + paramTypeNames + "}";
    };
    /**
     * 当前类型是否小于等于type2
     * @param type2
     */
    FunctionType.prototype.LE = function (type2) {
        if (type2 == SysTypes.Any) {
            return true;
        }
        else if (this == type2) {
            return true;
        }
        else if (Type.isUnionType(type2)) {
            var t = type2;
            if (t.types.indexOf(this) != -1) {
                return true;
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    };
    /**
     * visitor模式
     */
    FunctionType.prototype.accept = function (visitor) {
        return visitor.visitFunctionType(this);
    };
    FunctionType.index = 0;
    return FunctionType;
}(Type));
exports.FunctionType = FunctionType;
var UnionType = /** @class */ (function (_super) {
    __extends(UnionType, _super);
    /**
     * TODO：该构造方法有个问题，如果types中的类型是互相有子类型关系，应该合并。
     * @param types
     */
    function UnionType(types, name) {
        if (name === void 0) { name = undefined; }
        var _this = _super.call(this, "@union") || this;
        _this.types = types;
        if (typeof name == 'string') {
            _this.name = name;
        }
        else {
            _this.name = "@union" + (UnionType.index++);
        }
        return _this;
    }
    UnionType.prototype.hasVoid = function () {
        var e_6, _a;
        try {
            for (var _b = __values(this.types), _c = _b.next(); !_c.done; _c = _b.next()) {
                var t = _c.value;
                if (t.hasVoid()) {
                    return true;
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_6) throw e_6.error; }
        }
        return false;
    };
    UnionType.prototype.toString = function () {
        var e_7, _a;
        var typeNames = "[";
        try {
            for (var _b = __values(this.types), _c = _b.next(); !_c.done; _c = _b.next()) {
                var ut = _c.value;
                typeNames += ut.name + ", ";
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_7) throw e_7.error; }
        }
        typeNames += "]";
        return "UnionType {name: " + this.name + ", types: " + typeNames + "}";
    };
    /**
     * 当前类型是否小于等于type2
     * @param type2
     */
    UnionType.prototype.LE = function (type2) {
        var e_8, _a, e_9, _b;
        if (type2 == SysTypes.Any) {
            return true;
        }
        else if (Type.isUnionType(type2)) {
            try {
                for (var _c = __values(this.types), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var t1 = _d.value;
                    var found = false;
                    try {
                        for (var _e = (e_9 = void 0, __values(type2.types)), _f = _e.next(); !_f.done; _f = _e.next()) {
                            var t2 = _f.value;
                            if (t1.LE(t2)) {
                                found = true;
                                break;
                            }
                        }
                    }
                    catch (e_9_1) { e_9 = { error: e_9_1 }; }
                    finally {
                        try {
                            if (_f && !_f.done && (_b = _e["return"])) _b.call(_e);
                        }
                        finally { if (e_9) throw e_9.error; }
                    }
                    if (!found) {
                        return false;
                    }
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c["return"])) _a.call(_c);
                }
                finally { if (e_8) throw e_8.error; }
            }
            return true;
        }
        else {
            return false;
        }
    };
    /**
     * visitor模式
     */
    UnionType.prototype.accept = function (visitor) {
        visitor.visitUnionType(this);
    };
    UnionType.index = 0; //序号，用于给UnionType命名
    return UnionType;
}(Type));
exports.UnionType = UnionType;
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
/**
 * visitor
 */
var TypeVisitor = /** @class */ (function () {
    function TypeVisitor() {
    }
    TypeVisitor.prototype.visit = function (t) {
        return t.accept(this);
    };
    return TypeVisitor;
}());
exports.TypeVisitor = TypeVisitor;
