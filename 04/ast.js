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
exports.AstVisitor = exports.BooleanLiteral = exports.NullLiteral = exports.DecimalLiteral = exports.IntegerLiteral = exports.StringLiteral = exports.Variable = exports.FunctionCall = exports.ExpressionStatement = exports.Binary = exports.VariableDecl = exports.Prog = exports.Block = exports.FunctionDecl = exports.Decl = exports.Expression = exports.Statement = exports.AstNode = void 0;
var AstNode = /** @class */ (function () {
    function AstNode() {
    }
    return AstNode;
}());
exports.AstNode = AstNode;
/**
 * 语句
 * 其子嘞包含函数声明、表达式语句   从概念上来讲 表达式是属于语句
 */
var Statement = /** @class */ (function (_super) {
    __extends(Statement, _super);
    function Statement() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Statement;
}(AstNode));
exports.Statement = Statement;
/**
 * 语句
 * 其子类包括函数声明、表达式语句
 */
var Expression = /** @class */ (function (_super) {
    __extends(Expression, _super);
    function Expression() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Expression;
}(AstNode));
exports.Expression = Expression;
/**
 * 声明
 * 所有声明都会对应一个符号。
 */
var Decl = /** @class */ (function () {
    function Decl(name) {
        this.name = name;
    }
    return Decl;
}());
exports.Decl = Decl;
/**
 * 函数声明节点  ar 原来函数声明是这样定义的 里面包含 body，其实我认为应该叫函数定义
 */
var FunctionDecl = /** @class */ (function (_super) {
    __extends(FunctionDecl, _super);
    function FunctionDecl(name, body) {
        var _this = _super.call(this, name) || this;
        _this.body = body;
        return _this;
    }
    FunctionDecl.prototype.accept = function (visitor) {
        return visitor.visitFunctionDecl(this);
    };
    FunctionDecl.prototype.dump = function (prefix) {
        console.log(prefix + "FunctionDecl " + this.name);
        this.body.dump(prefix + "    ");
    };
    return FunctionDecl;
}(Decl));
exports.FunctionDecl = FunctionDecl;
var Block = /** @class */ (function (_super) {
    __extends(Block, _super);
    function Block(stmts) {
        var _this = _super.call(this) || this;
        _this.stmts = stmts;
        return _this;
    }
    Block.prototype.accept = function (visitor) {
        return visitor.visitBlock(this);
    };
    Block.prototype.dump = function (prefix) {
        console.log(prefix + "Block");
        this.stmts.forEach(function (x) { return x.dump(prefix + "   "); });
    };
    return Block;
}(AstNode));
exports.Block = Block;
var Prog = /** @class */ (function (_super) {
    __extends(Prog, _super);
    function Prog() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Prog.prototype.accept = function (visitor) {
        return visitor.visitProg(this);
    };
    Prog.prototype.dump = function (prefix) {
        console.log(prefix + "Prog");
        this.stmts.forEach(function (x) { return x.dump(prefix + "   "); });
    };
    return Prog;
}(Block));
exports.Prog = Prog;
/**
 * 变量声明节点
 */
var VariableDecl = /** @class */ (function (_super) {
    __extends(VariableDecl, _super);
    function VariableDecl(name, varType, init) {
        var _this = _super.call(this, name) || this;
        _this.varType = varType;
        _this.init = init;
        return _this;
    }
    VariableDecl.prototype.accept = function (visitor) {
        return visitor.visitVariableDecl(this);
    };
    VariableDecl.prototype.dump = function (prefix) {
        console.log(prefix + "VariableDecl " + this.name + ", type: " + this.varType);
        if (this.init == null) {
            console.log(prefix + "no initialization.");
        }
        else {
            this.init.dump(prefix + "    ");
        }
    };
    return VariableDecl;
}(Decl));
exports.VariableDecl = VariableDecl;
/**
 * 二元表达式
 */
var Binary = /** @class */ (function (_super) {
    __extends(Binary, _super);
    function Binary(op, exp1, exp2) {
        var _this = _super.call(this) || this;
        _this.op = op;
        _this.exp1 = exp1;
        _this.exp2 = exp2;
        return _this;
    }
    Binary.prototype.accept = function (visitor) {
        return visitor.visitBinary(this);
    };
    Binary.prototype.dump = function (prefix) {
        console.log(prefix + "Binary:" + this.op);
        this.exp1.dump(prefix + "    ");
        this.exp2.dump(prefix + "    ");
    };
    return Binary;
}(Expression));
exports.Binary = Binary;
/**
 * 表达式语句
 * 就是在表达式后面加个分号
 */
var ExpressionStatement = /** @class */ (function (_super) {
    __extends(ExpressionStatement, _super);
    function ExpressionStatement(exp) {
        var _this = _super.call(this) || this;
        _this.exp = exp;
        return _this;
    }
    ExpressionStatement.prototype.accept = function (visitor) {
        return visitor.visitExpressionStatement(this);
    };
    ExpressionStatement.prototype.dump = function (prefix) {
        console.log(prefix + "ExpressionStatement");
        this.exp.dump(prefix + "    ");
    };
    return ExpressionStatement;
}(Statement));
exports.ExpressionStatement = ExpressionStatement;
/**
 * 函数调用
 */
var FunctionCall = /** @class */ (function (_super) {
    __extends(FunctionCall, _super);
    function FunctionCall(name, parameters) {
        var _this = _super.call(this) || this;
        _this.decl = null; // 指向函数的声明   ar 这里我一直认为应该是函数的定义。。
        _this.name = name;
        _this.parameters = parameters;
        return _this;
    }
    FunctionCall.prototype.accept = function (visitor) {
        return visitor.visitFunctionCall(this);
    };
    FunctionCall.prototype.dump = function (prefix) {
        console.log(prefix + "FunctionCall " + this.name + (this.decl != null ? ", resolved" : ", not resolved"));
        this.parameters.forEach(function (x) { return x.dump(prefix + "    "); });
    };
    return FunctionCall;
}(AstNode));
exports.FunctionCall = FunctionCall;
/**
 * 变量引用
 */
var Variable = /** @class */ (function (_super) {
    __extends(Variable, _super);
    function Variable(name) {
        var _this = _super.call(this) || this;
        _this.decl = null; //指向变量声明
        _this.name = name;
        return _this;
    }
    Variable.prototype.accept = function (visitor) {
        return visitor.visitVariable(this);
    };
    Variable.prototype.dump = function (prefix) {
        console.log(prefix + "Variable: " + this.name + (this.decl != null ? ", resolved" : ", not resolved"));
    };
    return Variable;
}(Expression));
exports.Variable = Variable;
/**
 * 字符串字面量
 */
var StringLiteral = /** @class */ (function (_super) {
    __extends(StringLiteral, _super);
    function StringLiteral(value) {
        var _this = _super.call(this) || this;
        _this.value = value;
        return _this;
    }
    StringLiteral.prototype.accept = function (visitor) {
        return visitor.visitStringLiteral(this);
    };
    StringLiteral.prototype.dump = function (prefix) {
        console.log(prefix + this.value);
    };
    return StringLiteral;
}(Expression));
exports.StringLiteral = StringLiteral;
/**
 * 整型字面量
 */
var IntegerLiteral = /** @class */ (function (_super) {
    __extends(IntegerLiteral, _super);
    function IntegerLiteral(value) {
        var _this = _super.call(this) || this;
        _this.value = value;
        return _this;
    }
    IntegerLiteral.prototype.accept = function (visitor) {
        return visitor.visitIntegerLiteral(this);
    };
    IntegerLiteral.prototype.dump = function (prefix) {
        console.log(prefix + this.value);
    };
    return IntegerLiteral;
}(Expression));
exports.IntegerLiteral = IntegerLiteral;
/**
 * 实数字面量
 */
var DecimalLiteral = /** @class */ (function (_super) {
    __extends(DecimalLiteral, _super);
    function DecimalLiteral(value) {
        var _this = _super.call(this) || this;
        _this.value = value;
        return _this;
    }
    DecimalLiteral.prototype.accept = function (visitor) {
        return visitor.visitDecimalLiteral(this);
    };
    DecimalLiteral.prototype.dump = function (prefix) {
        console.log(prefix + this.value);
    };
    return DecimalLiteral;
}(Expression));
exports.DecimalLiteral = DecimalLiteral;
/**
 * null字面量
 */
var NullLiteral = /** @class */ (function (_super) {
    __extends(NullLiteral, _super);
    function NullLiteral() {
        var _this = _super.call(this) || this;
        _this.value = null;
        return _this;
    }
    NullLiteral.prototype.accept = function (visitor) {
        return visitor.visitNullLiteral(this);
    };
    NullLiteral.prototype.dump = function (prefix) {
        console.log(prefix + this.value);
    };
    return NullLiteral;
}(Expression));
exports.NullLiteral = NullLiteral;
/**
 * Boolean字面量
 */
var BooleanLiteral = /** @class */ (function (_super) {
    __extends(BooleanLiteral, _super);
    function BooleanLiteral(value) {
        var _this = _super.call(this) || this;
        _this.value = value;
        return _this;
    }
    BooleanLiteral.prototype.accept = function (visitor) {
        return visitor.visitBooleanLiteral(this);
    };
    BooleanLiteral.prototype.dump = function (prefix) {
        console.log(prefix + this.value);
    };
    return BooleanLiteral;
}(Expression));
exports.BooleanLiteral = BooleanLiteral;
////////////////////////////////////////////////////////////////////////////////
//Visitor
/**
 * 对AST做遍历的Vistor。
 * 这是一个基类，定义了缺省的遍历方式。子类可以覆盖某些方法，修改遍历方式。
 */
var AstVisitor = /** @class */ (function () {
    function AstVisitor() {
    }
    //对抽象类的访问。
    //相应的具体类，会调用visitor合适的具体方法。
    AstVisitor.prototype.visit = function (node) {
        return node.accept(this);
    };
    AstVisitor.prototype.visitProg = function (prog) {
        var e_1, _a;
        var retVal;
        try {
            for (var _b = __values(prog.stmts), _c = _b.next(); !_c.done; _c = _b.next()) {
                var x = _c.value;
                retVal = this.visit(x);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return retVal;
    };
    AstVisitor.prototype.visitVariableDecl = function (variableDecl) {
        if (variableDecl.init != null) {
            return this.visit(variableDecl.init);
        }
    };
    AstVisitor.prototype.visitFunctionDecl = function (functionDecl) {
        return this.visitBlock(functionDecl.body);
    };
    AstVisitor.prototype.visitBlock = function (Block) {
        var e_2, _a;
        var retVal;
        try {
            for (var _b = __values(Block.stmts), _c = _b.next(); !_c.done; _c = _b.next()) {
                var x = _c.value;
                retVal = this.visit(x);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return retVal;
    };
    AstVisitor.prototype.visitExpressionStatement = function (stmt) {
        return this.visit(stmt.exp);
    };
    AstVisitor.prototype.visitBinary = function (exp) {
        this.visit(exp.exp1);
        this.visit(exp.exp2);
    };
    AstVisitor.prototype.visitIntegerLiteral = function (exp) {
        return exp.value;
    };
    AstVisitor.prototype.visitDecimalLiteral = function (exp) {
        return exp.value;
    };
    AstVisitor.prototype.visitStringLiteral = function (exp) {
        return exp.value;
    };
    AstVisitor.prototype.visitNullLiteral = function (exp) {
        return exp.value;
    };
    AstVisitor.prototype.visitBooleanLiteral = function (exp) {
        return exp.value;
    };
    AstVisitor.prototype.visitVariable = function (variable) {
        return undefined;
    };
    AstVisitor.prototype.visitFunctionCall = function (functionCall) {
        return undefined;
    };
    return AstVisitor;
}());
exports.AstVisitor = AstVisitor;
