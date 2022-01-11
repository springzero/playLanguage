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
exports.AstDumper = exports.AstVisitor = exports.ErrorStmt = exports.ErrorExp = exports.BooleanLiteral = exports.NullLiteral = exports.DecimalLiteral = exports.IntegerLiteral = exports.StringLiteral = exports.Variable = exports.FunctionCall = exports.Unary = exports.Binary = exports.Expression = exports.ForStatement = exports.IfStatement = exports.ReturnStatement = exports.ExpressionStatement = exports.VariableDecl = exports.VariableStatement = exports.Prog = exports.Block = exports.ParameterList = exports.CallSignature = exports.FunctionDecl = exports.Decl = exports.Statement = exports.AstNode = void 0;
var scanner_1 = require("./scanner");
var symbol_1 = require("./symbol");
/////////////////////////////////
/**
 * AST基类
 */
var AstNode = /** @class */ (function () {
    function AstNode(beginPos, endPos, isErrorNode) {
        this.beginPos = beginPos;
        this.endPos = endPos;
        this.isErrorNode = isErrorNode;
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
// /**
//  * 语句
//  * 其子类包括函数声明、表达式语句
//  */
// export abstract class Expression extends AstNode {
// }
/**
 * 声明
 * 所有声明都会对应一个符号。
 */
var Decl = /** @class */ (function (_super) {
    __extends(Decl, _super);
    function Decl(beginPos, endPos, name, isErrorNode) {
        var _this = _super.call(this, beginPos, endPos, isErrorNode) || this;
        _this.name = name;
        return _this;
    }
    return Decl;
}(AstNode));
exports.Decl = Decl;
//////////////////////////////////////////
// 语句
/**
 * 函数声明节点  ar 原来函数声明是这样定义的 里面包含 body，其实我认为应该叫函数定义
 */
var FunctionDecl = /** @class */ (function (_super) {
    __extends(FunctionDecl, _super);
    function FunctionDecl(beginPos, name, callSignature, body, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, beginPos, body.endPos, name, isErrorNode) || this;
        _this.scope = null; // 该函数对应Scope
        _this.sym = null;
        _this.callSignature = callSignature;
        _this.body = body;
        return _this;
    }
    FunctionDecl.prototype.accept = function (visitor, additional) {
        return visitor.visitFunctionDecl(this, additional);
    };
    return FunctionDecl;
}(Decl));
exports.FunctionDecl = FunctionDecl;
/**
 * 调用签名  我以为会叫函数签名
 */
var CallSignature = /** @class */ (function (_super) {
    __extends(CallSignature, _super);
    function CallSignature(beginPos, endPos, paramList, returnType, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, beginPos, endPos, isErrorNode) || this;
        _this.paramList = paramList;
        _this.returnType = returnType;
        return _this;
    }
    CallSignature.prototype.accept = function (visitor, additional) {
        return visitor.visitCallSignature(this, additional);
    };
    CallSignature.prototype.dump = function (prefix) {
        console.log(prefix + "CallSignature");
        // todo
    };
    return CallSignature;
}(AstNode));
exports.CallSignature = CallSignature;
var ParameterList = /** @class */ (function (_super) {
    __extends(ParameterList, _super);
    function ParameterList(beginPos, endPos, params, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, beginPos, endPos, isErrorNode) || this;
        _this.params = params;
        return _this;
    }
    ParameterList.prototype.accept = function (visitor, additional) {
        return visitor.visitParameterList(this, additional);
    };
    return ParameterList;
}(AstNode));
exports.ParameterList = ParameterList;
var Block = /** @class */ (function (_super) {
    __extends(Block, _super);
    function Block(beginPos, endPos, stmts, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, beginPos, endPos, isErrorNode) || this;
        _this.scope = null; // 添加了作用域
        _this.stmts = stmts;
        return _this;
    }
    Block.prototype.accept = function (visitor, additional) {
        return visitor.visitBlock(this, additional);
    };
    return Block;
}(Statement));
exports.Block = Block;
/**
 * 程序
 */
var Prog = /** @class */ (function (_super) {
    __extends(Prog, _super);
    function Prog(beginPos, endPos, stmts) {
        var _this = _super.call(this, beginPos, endPos, stmts, false) || this;
        _this.sym = null; // ar 没看出这个有什么作用，一个孤单的函数符号
        _this.stmts = stmts;
        return _this;
    }
    Prog.prototype.accept = function (visitor, additional) {
        return visitor.visitProg(this, additional);
    };
    return Prog;
}(Block));
exports.Prog = Prog;
// 变量声明语句
var VariableStatement = /** @class */ (function (_super) {
    __extends(VariableStatement, _super);
    function VariableStatement(beginPos, endPos, variableDecl, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, beginPos, endPos, isErrorNode) || this;
        _this.variableDecl = variableDecl;
        return _this;
    }
    VariableStatement.prototype.accept = function (visitor, additional) {
        return visitor.visitVariableStatement(this, additional);
    };
    return VariableStatement;
}(Statement));
exports.VariableStatement = VariableStatement;
/**
 * 变量声明节点
 */
var VariableDecl = /** @class */ (function (_super) {
    __extends(VariableDecl, _super);
    function VariableDecl(beginPos, endPos, name, theType, init, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, beginPos, endPos, name, isErrorNode) || this;
        _this.sym = null;
        _this.inferredType = null; // 推测出的类型？ 
        _this.theType = theType;
        _this.init = init;
        return _this;
    }
    VariableDecl.prototype.accept = function (visitor, additional) {
        return visitor.visitVariableDecl(this, additional);
    };
    return VariableDecl;
}(Decl));
exports.VariableDecl = VariableDecl;
/**
 * 表达式语句
 * 就是在表达式后面加个分号
 */
var ExpressionStatement = /** @class */ (function (_super) {
    __extends(ExpressionStatement, _super);
    function ExpressionStatement(endPos, exp, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, exp.beginPos, endPos, isErrorNode) || this;
        _this.exp = exp;
        return _this;
    }
    ExpressionStatement.prototype.accept = function (visitor, additional) {
        return visitor.visitExpressionStatement(this, additional);
    };
    return ExpressionStatement;
}(Statement));
exports.ExpressionStatement = ExpressionStatement;
var ReturnStatement = /** @class */ (function (_super) {
    __extends(ReturnStatement, _super);
    function ReturnStatement(beginPos, endPos, exp, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, beginPos, endPos, isErrorNode) || this;
        _this.exp = null;
        _this.exp = exp;
        return _this;
    }
    ReturnStatement.prototype.accept = function (visitor, additional) {
        return visitor.visitReturnStatement(this, additional);
    };
    return ReturnStatement;
}(Statement));
exports.ReturnStatement = ReturnStatement;
/**
 * if语句
 */
var IfStatement = /** @class */ (function (_super) {
    __extends(IfStatement, _super);
    function IfStatement(beginPos, endPos, condition, stmt, elseStmt, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, beginPos, endPos, isErrorNode) || this;
        _this.elseStmt = null;
        _this.condition = condition;
        _this.stmt = stmt;
        _this.elseStmt = elseStmt;
        return _this;
    }
    IfStatement.prototype.accept = function (visitor, additional) {
        return visitor.visitIfStatement(this, additional);
    };
    return IfStatement;
}(Statement));
exports.IfStatement = IfStatement;
/**
 * For语句
 */
var ForStatement = /** @class */ (function (_super) {
    __extends(ForStatement, _super);
    function ForStatement(beginPos, endPos, init, termination, increment, stmt, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, beginPos, endPos, isErrorNode) || this;
        _this.init = null;
        _this.condition = null;
        _this.increment = null;
        _this.scope = null;
        _this.init = init;
        _this.condition = termination;
        _this.increment = increment;
        _this.stmt = stmt;
        return _this;
    }
    ForStatement.prototype.accept = function (visitor, additional) {
        return visitor.visitForStatement(this, additional);
    };
    return ForStatement;
}(Statement));
exports.ForStatement = ForStatement;
///////////////////////////////////
// 表达式
var Expression = /** @class */ (function (_super) {
    __extends(Expression, _super);
    function Expression() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.theType = null;
        _this.shouldBeLeftValue = false; // 当前位置需要一个左值。赋值符号、点符号的左边，需要左值
        _this.isLeftValue = false;
        _this.constValue = undefined; // 本表达式的常量值。在常量折叠、流程分析等时候有用
        // 推断出来的类型。
        // 这个类型一般是theType的子类型
        _this.inferredType = null;
        return _this;
    }
    return Expression;
}(AstNode));
exports.Expression = Expression;
/**
 * 二元表达式
 */
var Binary = /** @class */ (function (_super) {
    __extends(Binary, _super);
    function Binary(op, exp1, exp2, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, exp1.beginPos, exp1.endPos, isErrorNode) || this;
        _this.op = op;
        _this.exp1 = exp1;
        _this.exp2 = exp2;
        return _this;
    }
    Binary.prototype.accept = function (visitor, additional) {
        return visitor.visitBinary(this, additional);
    };
    return Binary;
}(Expression));
exports.Binary = Binary;
var Unary = /** @class */ (function (_super) {
    __extends(Unary, _super);
    function Unary(beginPos, endPos, op, exp, isPrefix, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, beginPos, endPos, isErrorNode) || this;
        _this.op = op;
        _this.exp = exp;
        _this.isPrefix = isPrefix;
        return _this;
    }
    Unary.prototype.accept = function (visitor, additional) {
        return visitor.visitUnary(this, additional);
    };
    return Unary;
}(Expression));
exports.Unary = Unary;
/**
 * 函数调用
 */
var FunctionCall = /** @class */ (function (_super) {
    __extends(FunctionCall, _super);
    function FunctionCall(beginPos, endPos, name, parameters, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, beginPos, endPos, isErrorNode) || this;
        // decl: FunctionDecl | null = null; // 指向函数的声明   ar 这里我一直认为应该是函数的定义。。
        _this.sym = null; // 现在要将函数的定义存在符号里
        _this.name = name;
        _this.arguments = parameters;
        return _this;
    }
    FunctionCall.prototype.accept = function (visitor, additional) {
        return visitor.visitFunctionCall(this, additional);
    };
    return FunctionCall;
}(Expression));
exports.FunctionCall = FunctionCall;
/**
 * 变量引用
 */
var Variable = /** @class */ (function (_super) {
    __extends(Variable, _super);
    // decl: VariableDecl | null = null; //指向变量声明
    function Variable(beginPos, endPos, name, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, beginPos, endPos, isErrorNode) || this;
        _this.sym = null; // 替代了之前decl，说明符号里肯定有变量的声明信息
        _this.name = name;
        return _this;
    }
    Variable.prototype.accept = function (visitor, additional) {
        return visitor.visitVariable(this, additional);
    };
    return Variable;
}(Expression));
exports.Variable = Variable;
/**
 * 字符串字面量
 */
var StringLiteral = /** @class */ (function (_super) {
    __extends(StringLiteral, _super);
    function StringLiteral(pos, value, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, pos, pos, isErrorNode) || this;
        _this.value = value;
        return _this;
    }
    StringLiteral.prototype.accept = function (visitor, additional) {
        return visitor.visitStringLiteral(this, additional);
    };
    return StringLiteral;
}(Expression));
exports.StringLiteral = StringLiteral;
/**
 * 整型字面量
 */
var IntegerLiteral = /** @class */ (function (_super) {
    __extends(IntegerLiteral, _super);
    function IntegerLiteral(pos, value, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, pos, pos, isErrorNode) || this;
        _this.value = value;
        return _this;
    }
    IntegerLiteral.prototype.accept = function (visitor, additional) {
        return visitor.visitIntegerLiteral(this, additional);
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
    function DecimalLiteral(pos, value, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, pos, pos, isErrorNode) || this;
        _this.value = value;
        return _this;
    }
    DecimalLiteral.prototype.accept = function (visitor, additional) {
        return visitor.visitDecimalLiteral(this, additional);
    };
    return DecimalLiteral;
}(Expression));
exports.DecimalLiteral = DecimalLiteral;
/**
 * null字面量
 */
var NullLiteral = /** @class */ (function (_super) {
    __extends(NullLiteral, _super);
    function NullLiteral(pos, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, pos, pos, isErrorNode) || this;
        _this.value = null;
        return _this;
    }
    NullLiteral.prototype.accept = function (visitor, additional) {
        return visitor.visitNullLiteral(this, additional);
    };
    return NullLiteral;
}(Expression));
exports.NullLiteral = NullLiteral;
/**
 * Boolean字面量
 */
var BooleanLiteral = /** @class */ (function (_super) {
    __extends(BooleanLiteral, _super);
    function BooleanLiteral(pos, value, isErrorNode) {
        if (isErrorNode === void 0) { isErrorNode = false; }
        var _this = _super.call(this, pos, pos, isErrorNode) || this;
        _this.value = value;
        return _this;
    }
    BooleanLiteral.prototype.accept = function (visitor, additional) {
        return visitor.visitBooleanLiteral(this, additional);
    };
    return BooleanLiteral;
}(Expression));
exports.BooleanLiteral = BooleanLiteral;
/**
 * 代表一个错误的表达式
 */
var ErrorExp = /** @class */ (function (_super) {
    __extends(ErrorExp, _super);
    function ErrorExp(beginPos, endPos) {
        var _this = _super.call(this, beginPos, endPos, true) || this;
        _this.isErrorNode = true;
        return _this;
    }
    ErrorExp.prototype.accept = function (visitor, additional) {
        return visitor.visitErrorExp(this, additional);
    };
    return ErrorExp;
}(Expression));
exports.ErrorExp = ErrorExp;
/**
 * 代表了一个错误的语句。
 */
var ErrorStmt = /** @class */ (function (_super) {
    __extends(ErrorStmt, _super);
    function ErrorStmt(beginPos, endPos) {
        var _this = _super.call(this, beginPos, endPos, true) || this;
        _this.isErrorNode = true;
        return _this;
    }
    ErrorStmt.prototype.accept = function (visitor, additional) {
        return visitor.visitErrorStmt(this, additional);
    };
    return ErrorStmt;
}(Statement));
exports.ErrorStmt = ErrorStmt;
////////////////////////////////////////////////////////////////////////////////
//Visitor
/**
 * 对AST做遍历的Vistor。
 * 这是一个基类，定义了缺省的遍历方式。子类可以覆盖某些方法，修改遍历方式。
 * 语义分析、解释器 都是通过这个基类 展开分析或解释的
 */
var AstVisitor = /** @class */ (function () {
    function AstVisitor() {
    }
    //对抽象类的访问。
    //相应的具体类，会调用visitor合适的具体方法。
    AstVisitor.prototype.visit = function (node, additional) {
        if (additional === void 0) { additional = undefined; }
        return node.accept(this, additional);
    };
    AstVisitor.prototype.visitProg = function (prog, additional) {
        if (additional === void 0) { additional = undefined; }
        return this.visitBlock(prog, additional);
    };
    AstVisitor.prototype.visitVariableStatement = function (variableStmt, additional) {
        if (additional === void 0) { additional = undefined; }
        return this.visit(variableStmt.variableDecl, additional);
    };
    AstVisitor.prototype.visitVariableDecl = function (variableDecl, additional) {
        if (additional === void 0) { additional = undefined; }
        if (variableDecl.init != null) {
            return this.visit(variableDecl.init, additional);
        }
    };
    AstVisitor.prototype.visitFunctionDecl = function (functionDecl, additional) {
        if (additional === void 0) { additional = undefined; }
        this.visit(functionDecl.callSignature, additional);
        return this.visit(functionDecl.body, additional);
    };
    AstVisitor.prototype.visitCallSignature = function (callSinature, additional) {
        if (additional === void 0) { additional = undefined; }
        if (callSinature.paramList != null) {
            return this.visit(callSinature.paramList, additional);
        }
    };
    AstVisitor.prototype.visitParameterList = function (paramList, additional) {
        var e_1, _a;
        if (additional === void 0) { additional = undefined; }
        var retVal;
        try {
            for (var _b = __values(paramList.params), _c = _b.next(); !_c.done; _c = _b.next()) {
                var x = _c.value;
                retVal = this.visit(x, additional);
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
    AstVisitor.prototype.visitBlock = function (Block, additional) {
        var e_2, _a;
        if (additional === void 0) { additional = undefined; }
        var retVal;
        try {
            for (var _b = __values(Block.stmts), _c = _b.next(); !_c.done; _c = _b.next()) {
                var x = _c.value;
                retVal = this.visit(x, additional);
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
    AstVisitor.prototype.visitExpressionStatement = function (stmt, additional) {
        if (additional === void 0) { additional = undefined; }
        return this.visit(stmt.exp, additional);
    };
    AstVisitor.prototype.visitReturnStatement = function (stmt, additional) {
        if (additional === void 0) { additional = undefined; }
        if (stmt.exp != null) {
            return this.visit(stmt.exp, additional);
        }
    };
    AstVisitor.prototype.visitIfStatement = function (stmt, additional) {
        if (additional === void 0) { additional = undefined; }
        this.visit(stmt.condition, additional);
        this.visit(stmt.stmt, additional);
        if (stmt.elseStmt != null) {
            this.visit(stmt.elseStmt, additional);
        }
    };
    AstVisitor.prototype.visitForStatement = function (stmt, additional) {
        if (additional === void 0) { additional = undefined; }
        if (stmt.init != null) {
            this.visit(stmt.init, additional);
        }
        if (stmt.condition != null) {
            this.visit(stmt.condition, additional);
        }
        if (stmt.increment != null) {
            this.visit(stmt.increment, additional);
        }
        this.visit(stmt.stmt, additional);
    };
    AstVisitor.prototype.visitBinary = function (exp, additional) {
        if (additional === void 0) { additional = undefined; }
        this.visit(exp.exp1, additional);
        this.visit(exp.exp2, additional);
    };
    AstVisitor.prototype.visitUnary = function (exp, additional) {
        if (additional === void 0) { additional = undefined; }
        this.visit(exp.exp, additional);
    };
    AstVisitor.prototype.visitIntegerLiteral = function (exp, additional) {
        if (additional === void 0) { additional = undefined; }
        return exp.value;
    };
    AstVisitor.prototype.visitDecimalLiteral = function (exp, additional) {
        if (additional === void 0) { additional = undefined; }
        return exp.value;
    };
    AstVisitor.prototype.visitStringLiteral = function (exp, additional) {
        if (additional === void 0) { additional = undefined; }
        return exp.value;
    };
    AstVisitor.prototype.visitNullLiteral = function (exp, additional) {
        if (additional === void 0) { additional = undefined; }
        return exp.value;
    };
    AstVisitor.prototype.visitBooleanLiteral = function (exp, additional) {
        if (additional === void 0) { additional = undefined; }
        return exp.value;
    };
    AstVisitor.prototype.visitVariable = function (variable, additional) {
        if (additional === void 0) { additional = undefined; }
        return undefined;
    };
    AstVisitor.prototype.visitFunctionCall = function (functionCall, additional) {
        var e_3, _a;
        if (additional === void 0) { additional = undefined; }
        try {
            // console.log("in AstVisitor.visitFunctionCall "+ functionCall.name);
            for (var _b = __values(functionCall.arguments), _c = _b.next(); !_c.done; _c = _b.next()) {
                var param = _c.value;
                // console.log("in AstVisitor.visitFunctionCall, visiting param: "+ param.dump(""));
                this.visit(param, additional);
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return undefined;
    };
    AstVisitor.prototype.visitErrorExp = function (errorNode, additional) {
        if (additional === void 0) { additional = undefined; }
        return undefined;
    };
    AstVisitor.prototype.visitErrorStmt = function (errorStmt, additional) {
        if (additional === void 0) { additional = undefined; }
        return undefined;
    };
    return AstVisitor;
}());
exports.AstVisitor = AstVisitor;
/**
 * 打印AST调试信息
 * 作者将之前的dump功能，也通过AstVisitor 来实现了
 */
var AstDumper = /** @class */ (function (_super) {
    __extends(AstDumper, _super);
    function AstDumper() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AstDumper.prototype.visitProg = function (prog, prefix) {
        var e_4, _a;
        console.log(prefix + "Prog" + (prog.isErrorNode ? " **E** " : ""));
        try {
            for (var _b = __values(prog.stmts), _c = _b.next(); !_c.done; _c = _b.next()) {
                var x = _c.value;
                this.visit(x, prefix + "   ");
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
    };
    AstDumper.prototype.visitVariableStatement = function (variableStmt, prefix) {
        console.log(prefix + "VariableStatement " + (variableStmt.isErrorNode ? " **E** " : ""));
        this.visit(variableStmt.variableDecl, prefix + "   ");
    };
    AstDumper.prototype.visitVariableDecl = function (variableDecl, prefix) {
        console.log(prefix + "VariableDecl " + variableDecl.name + (variableDecl.theType == null ? "" : "(" + variableDecl.theType.name + ")") + (variableDecl.isErrorNode ? " **E** " : ""));
        if (variableDecl.init == null) {
            console.log(prefix + "no initialization.");
        }
        else {
            this.visit(variableDecl.init, prefix + "   ");
        }
    };
    AstDumper.prototype.visitFunctionDecl = function (functionDecl, prefix) {
        console.log(prefix + "FunctionDecl " + functionDecl.name + (functionDecl.isErrorNode ? " **E** " : ""));
        this.visit(functionDecl.callSignature, prefix + "    ");
        this.visit(functionDecl.body, prefix + "    ");
    };
    AstDumper.prototype.visitCallSignature = function (callSinature, prefix) {
        console.log(prefix + (callSinature.isErrorNode ? " **E** " : "") + "Return type: " + callSinature.returnType.name);
        if (callSinature.paramList != null) {
            this.visit(callSinature.paramList, prefix + "    ");
        }
    };
    AstDumper.prototype.visitParameterList = function (paramList, prefix) {
        var e_5, _a;
        console.log(prefix + "ParamList:" + (paramList.isErrorNode ? " **E** " : "") + (paramList.params.length == 0 ? "none" : ""));
        try {
            for (var _b = __values(paramList.params), _c = _b.next(); !_c.done; _c = _b.next()) {
                var x = _c.value;
                this.visit(x, prefix + "    ");
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
    };
    // visitParameter(parameter: Parameter):any{
    //     return undefined;
    // }
    AstDumper.prototype.visitBlock = function (block, prefix) {
        var e_6, _a;
        if (block.isErrorNode) {
            console.log(prefix + "Block" + (block.isErrorNode ? " **E** " : ""));
        }
        try {
            for (var _b = __values(block.stmts), _c = _b.next(); !_c.done; _c = _b.next()) {
                var x = _c.value;
                this.visit(x, prefix + "    ");
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_6) throw e_6.error; }
        }
    };
    AstDumper.prototype.visitExpressionStatement = function (stmt, prefix) {
        console.log(prefix + "ExpressionStatement" + (stmt.isErrorNode ? " **E** " : ""));
        return this.visit(stmt.exp, prefix + "    ");
    };
    AstDumper.prototype.visitReturnStatement = function (stmt, prefix) {
        console.log(prefix + "ReturnStatement" + (stmt.isErrorNode ? " **E** " : ""));
        if (stmt.exp != null) {
            return this.visit(stmt.exp, prefix + "    ");
        }
    };
    AstDumper.prototype.visitIfStatement = function (stmt, prefix) {
        console.log(prefix + "IfStatement" + (stmt.isErrorNode ? " **E** " : ""));
        console.log(prefix + "    Condition:");
        this.visit(stmt.condition, prefix + "    ");
        console.log(prefix + "    Then:");
        this.visit(stmt.stmt, prefix + "    ");
        if (stmt.elseStmt != null) {
            console.log(prefix + "    Else:");
            this.visit(stmt.elseStmt, prefix + "    ");
        }
    };
    AstDumper.prototype.visitForStatement = function (stmt, prefix) {
        console.log(prefix + "ForStatement" + (stmt.isErrorNode ? " **E** " : ""));
        if (stmt.init != null) {
            console.log(prefix + "    Init:");
            this.visit(stmt.init, prefix + "    ");
        }
        if (stmt.condition != null) {
            console.log(prefix + "    Condition:");
            this.visit(stmt.condition, prefix + "    ");
        }
        if (stmt.increment != null) {
            console.log(prefix + "    Increment:");
            this.visit(stmt.increment, prefix + "    ");
        }
        console.log(prefix + "    Body:");
        this.visit(stmt.stmt, prefix + "    ");
    };
    AstDumper.prototype.visitBinary = function (exp, prefix) {
        console.log(prefix + "Binary:" + scanner_1.Op[exp.op] + (exp.theType == null ? "" : "(" + exp.theType.name + ")") + (exp.isErrorNode ? " **E** " : ""));
        this.visit(exp.exp1, prefix + "    ");
        this.visit(exp.exp2, prefix + "    ");
    };
    AstDumper.prototype.visitUnary = function (exp, prefix) {
        console.log(prefix + (exp.isPrefix ? "Prefix " : "PostFix ") + "Unary:" + scanner_1.Op[exp.op] + (exp.theType == null ? "" : "(" + exp.theType.name + ")") + (exp.isErrorNode ? " **E** " : ""));
        this.visit(exp.exp, prefix + "    ");
    };
    AstDumper.prototype.visitIntegerLiteral = function (exp, prefix) {
        console.log(prefix + exp.value + (exp.theType == null ? "" : "(" + exp.theType.name + ")") + (exp.isErrorNode ? " **E** " : ""));
    };
    AstDumper.prototype.visitDecimalLiteral = function (exp, prefix) {
        console.log(prefix + exp.value + (exp.theType == null ? "" : "(" + exp.theType.name + ")") + (exp.isErrorNode ? " **E** " : ""));
    };
    AstDumper.prototype.visitStringLiteral = function (exp, prefix) {
        console.log(prefix + exp.value + (exp.theType == null ? "" : "(" + exp.theType.name + ")") + (exp.isErrorNode ? " **E** " : ""));
    };
    AstDumper.prototype.visitNullLiteral = function (exp, prefix) {
        console.log(prefix + exp.value + (exp.theType == null ? "" : "(" + exp.theType.name + ")") + (exp.isErrorNode ? " **E** " : ""));
    };
    AstDumper.prototype.visitBooleanLiteral = function (exp, prefix) {
        console.log(prefix + exp.value + (exp.theType == null ? "" : "(" + exp.theType.name + ")") + (exp.isErrorNode ? " **E** " : ""));
    };
    AstDumper.prototype.visitVariable = function (variable, prefix) {
        console.log(prefix + "Variable: " + (variable.isErrorNode ? " **E** " : "") + variable.name + (variable.theType == null ? "" : "(" + variable.theType.name + ")") + (variable.isLeftValue ? ", LeftValue" : "") + (variable.sym != null ? ", resolved" : ", not resolved"));
    };
    AstDumper.prototype.visitFunctionCall = function (functionCall, prefix) {
        var e_7, _a;
        console.log(prefix + "FunctionCall " + (functionCall.theType == null ? "" : "(" + functionCall.theType.name + ")") + (functionCall.isErrorNode ? " **E** " : "") + functionCall.name +
            (symbol_1.built_ins.has(functionCall.name) ? ', built-in' :
                (functionCall.sym != null ? ", resolved" : ", not resolved")));
        try {
            for (var _b = __values(functionCall.arguments), _c = _b.next(); !_c.done; _c = _b.next()) {
                var param = _c.value;
                this.visit(param, prefix + "    ");
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_7) throw e_7.error; }
        }
    };
    AstDumper.prototype.visitErrorExp = function (errorNode, prefix) {
        console.log(prefix + "Error Expression **E**");
    };
    AstDumper.prototype.visitErrorStmt = function (errorStmt, prefix) {
        console.log(prefix + "Error Statement **E**");
    };
    return AstDumper;
}(AstVisitor));
exports.AstDumper = AstDumper;
