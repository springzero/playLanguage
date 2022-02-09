"use strict";
/**
 * 语义分析
 * 当前特性：
 * 树状的符号表
 * 简单的引用消解：没有考虑声明的先后顺序，也没有考虑闭包
 * 简单的作用域
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
exports.SemanticError = exports.SemanticAnalyer = void 0;
var console_1 = require("console");
var ast_1 = require("./ast");
var error_1 = require("./error");
var scanner_1 = require("./scanner");
var scope_1 = require("./scope");
var symbol_1 = require("./symbol");
var types_1 = require("./types");
var SemanticAnalyer = /** @class */ (function () {
    function SemanticAnalyer() {
        this.passes = [
            new Enter(),
            new RefResolver(),
            new TypeChecker(),
            new TypeConverter(),
            new LeftValueAttributor()
        ];
        this.errors = []; // 语义错误
        this.warnings = []; // 语义报警信息
    }
    SemanticAnalyer.prototype.execute = function (prog) {
        var e_1, _a;
        this.errors = [];
        this.warnings = [];
        try {
            for (var _b = __values(this.passes), _c = _b.next(); !_c.done; _c = _b.next()) {
                var pass = _c.value;
                pass.visitProg(prog);
                this.errors = this.errors.concat(pass.errors);
                this.warnings = this.warnings.concat(pass.warnings);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    return SemanticAnalyer;
}());
exports.SemanticAnalyer = SemanticAnalyer;
var SemanticError = /** @class */ (function (_super) {
    __extends(SemanticError, _super);
    function SemanticError(msg, node, isWarning) {
        if (isWarning === void 0) { isWarning = false; }
        var _this = _super.call(this, msg, node.beginPos, /* node.endPos, */ isWarning) || this;
        _this.node = node;
        return _this;
    }
    return SemanticError;
}(error_1.CompilerError));
exports.SemanticError = SemanticError;
var SemanticAstVisitor = /** @class */ (function (_super) {
    __extends(SemanticAstVisitor, _super);
    function SemanticAstVisitor() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.errors = []; //语义错误
        _this.warnings = []; //语义报警信息
        return _this;
    }
    SemanticAstVisitor.prototype.addError = function (msg, node) {
        this.errors.push(new SemanticError(msg, node));
        console.log("@" + node.beginPos.toString() + " : " + msg);
    };
    SemanticAstVisitor.prototype.addWarning = function (msg, node) {
        this.warnings.push(new SemanticError(msg, node, true));
        console.log("@" + node.beginPos.toString() + " : " + msg);
    };
    return SemanticAstVisitor;
}(ast_1.AstVisitor));
///////////////////////////////////////////////////////
// 建立符号表
/**
 * 把符号加入符号表
 */
var Enter = /** @class */ (function (_super) {
    __extends(Enter, _super);
    function Enter() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.scope = null; // 当前所属的scope
        _this.functionSym = null;
        return _this;
    }
    Enter.prototype.visitProg = function (prog) {
        var sym = new symbol_1.FunctionSymbol('main', new types_1.FunctionType(types_1.SysTypes.Integer, []));
        prog.sym = sym;
        this.functionSym = sym;
        return _super.prototype.visitProg.call(this, prog);
    };
    /**
     * 将函数声明加入符号表
     * @param functionDecl
     */
    Enter.prototype.visitFunctionDecl = function (functionDecl) {
        var e_2, _a;
        var currentScope = this.scope;
        // 创建函数的symbol
        var paramTypes = [];
        if (functionDecl.callSignature.paramList != null) {
            try {
                for (var _b = __values(functionDecl.callSignature.paramList.params), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var p = _c.value;
                    paramTypes.push(p.theType);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        var sym = new symbol_1.FunctionSymbol(functionDecl.name, new types_1.FunctionType(functionDecl.callSignature.returnType, paramTypes));
        sym.decl = functionDecl;
        functionDecl.sym = sym; // 
        // 把函数加入当前scope
        if (currentScope.hasSymbol(functionDecl.name)) {
            this.addError("Dumplicate symbol: " + functionDecl.name, functionDecl);
        }
        else {
            currentScope.enter(functionDecl.name, sym);
        }
        // ar ?这下面的动作现在是看不懂的，都将函数声明存到了当前作用域里，下面是在干什么呢
        // 修改当前的函数符号
        var lastFunctionSym = this.functionSym;
        this.functionSym = sym;
        // 创建新的Scope，用来存放参数
        var oldScope = currentScope;
        this.scope = new scope_1.Scope(oldScope, "function_debug_" + functionDecl.beginPos.line + "_" + functionDecl.endPos.line);
        functionDecl.scope = this.scope;
        // 遍历子节点
        _super.prototype.visitFunctionDecl.call(this, functionDecl);
        // 恢复当前函数
        this.functionSym = lastFunctionSym;
        // 恢复原来的Scope
        this.scope = oldScope;
    };
    /**
     * 遇到块的时候，就建立一级新的作用域
     * 支持块作用域
     * @param block
     */
    Enter.prototype.visitBlock = function (block) {
        // 创建下一级scope
        var oldScope = this.scope;
        this.scope = new scope_1.Scope(this.scope, "block_debug_" + block.beginPos.line + "_" + block.endPos.line);
        block.scope = this.scope;
        // ar ?为什么这里不直接这样写 block.scope = new Scope(this.scope);
        // 调用父类的方法，遍历所有的语句
        _super.prototype.visitBlock.call(this, block);
        // 重新设置当前的Scope
        this.scope = oldScope;
    };
    // 把变量声明加入符号表
    Enter.prototype.visitVariableDecl = function (variableDecl) {
        var _a;
        var currentScope = this.scope;
        if (currentScope.hasSymbol(variableDecl.name)) {
            this.addError("Dumplicate symbol: " + variableDecl.name, variableDecl);
        }
        // 把变量加入当前符号表
        var sym = new symbol_1.VarSymbol(variableDecl.name, variableDecl.theType);
        variableDecl.sym = sym;
        currentScope.enter(variableDecl.name, sym);
        // ar ?把本地变量也加入函数符号中，可用于后面生成代码
        (_a = this.functionSym) === null || _a === void 0 ? void 0 : _a.vars.push(sym);
    };
    /**
     * 对于for循环来说，由于可以在for的init部分声明变量，所以要新建一个Scope。
     */
    Enter.prototype.visitForStatement = function (forStmt) {
        // 创建下一级scope
        var oldScope = this.scope;
        this.scope = new scope_1.Scope(this.scope, "for_debug_" + forStmt.beginPos.line + "_" + forStmt.endPos.line);
        forStmt.scope = this.scope;
        // 调用父类的方法，遍历所有的语句
        _super.prototype.visitForStatement.call(this, forStmt);
        // 重新设置当前的Scope
        this.scope = oldScope;
    };
    return Enter;
}(SemanticAstVisitor));
////////////////////////////////////////////
// 引用消解
/**
 * 引用消解
 * 遍历AST。如果发现函数调用和变量引用，就去找它的定义
 */
var RefResolver = /** @class */ (function (_super) {
    __extends(RefResolver, _super);
    function RefResolver() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.scope = null;
        // 每个Scope已经声明了的变量的列表
        _this.declaredVarsMap = new Map();
        return _this;
    }
    RefResolver.prototype.visitFunctionDecl = function (functionDecl) {
        // 修改scope
        var oldScope = this.scope;
        this.scope = functionDecl.scope;
        console_1.assert(this.scope != null, "FunctionDecl Scope不可为null");
        // 为已声明的变量设置一个存储区域
        // ar 这里应该叫为body初始化个存储区域
        this.declaredVarsMap.set(this.scope, new Map());
        // 遍历下级节点
        _super.prototype.visitFunctionDecl.call(this, functionDecl);
        // 重新设置scope
        this.scope = oldScope;
    };
    // 对块做什么消解？
    RefResolver.prototype.visitBlock = function (block, additional) {
        // 修改scope
        var oldScope = this.scope;
        this.scope = block.scope;
        console_1.assert(this.scope != null, "Block Scope不可为null");
        // 为已声明的变量设置一个存储区域
        this.declaredVarsMap.set(this.scope, new Map());
        // 遍历下级节点
        _super.prototype.visitBlock.call(this, block);
        // 重新设置scope
        this.scope = oldScope;
    };
    RefResolver.prototype.visitForStatement = function (forStmt) {
        // 修改scope
        var oldScope = this.scope;
        this.scope = forStmt.scope;
        console_1.assert(this.scope != null, "For Scope不可为null");
        // 为已声明的变量设置一个存储区域
        this.declaredVarsMap.set(this.scope, new Map());
        // 遍历下级节点
        _super.prototype.visitForStatement.call(this, forStmt);
        // 重新设置scope
        this.scope = oldScope;
    };
    /**
     * 做函数的消解
     * 函数不需要声明在前，使用在后
     */
    RefResolver.prototype.visitFunctionCall = function (functionCall, additional) {
        var currentScope = this.scope;
        if (symbol_1.built_ins.has(functionCall.name)) {
            functionCall.sym = symbol_1.built_ins.get(functionCall.name);
        }
        else {
            functionCall.sym = currentScope.getSymbolCascade(functionCall.name);
        }
        _super.prototype.visitFunctionCall.call(this, functionCall);
    };
    /**
     * 标记变量是否已被声明
     * @param variableDecl
     * @param additional
     */
    RefResolver.prototype.visitVariableDecl = function (variableDecl, additional) {
        var currentScope = this.scope;
        var declaredSyms = this.declaredVarsMap.get(currentScope);
        // 从当前作用域里查询符号
        var sym = currentScope.getSymbol(variableDecl.name);
        if (sym != null) {
            // 然后将变量和符号的关系存在declaredVarsMap中
            declaredSyms.set(variableDecl.name, sym);
        }
        _super.prototype.visitVariableDecl.call(this, variableDecl);
    };
    /**
     * 变量引用消解
     * @param variable
     * @param additional
     */
    RefResolver.prototype.visitVariable = function (variable) {
        var currentScope = this.scope;
        var sym = this.findVariableCascade(currentScope, variable);
        variable.sym = sym;
        if (sym != null) {
            variable.theType = sym.theType;
        }
    };
    /**
     * 逐级查找变量的符号信息
     * @param scope
     * @param variable
     * @returns
     */
    RefResolver.prototype.findVariableCascade = function (scope, variable) {
        // 获取作用域中的已定义符号表
        var declaredSyms = this.declaredVarsMap.get(scope);
        // 在作用域中，根据变量名称查找符号
        var symInScope = scope.getSymbol(variable.name);
        if (symInScope != null) {
            // 如果已定义符号表中有这个变量名，则返回符号
            if (declaredSyms != undefined && declaredSyms.has(variable.name)) {
                return declaredSyms.get(variable.name);
            }
            else {
                // 如果类型是变量，则详细报错，说变量在定义之前就非法使用了
                if (symInScope.kind == symbol_1.SymKind.Variable) {
                    this.addError("Variable: '" + variable.name + "' is used before declaration.", variable);
                }
                else {
                    this.addError("We expect a variable of name: '" + variable.name + "', but find a " + symbol_1.SymKind[symInScope.kind] + ".", variable);
                }
            }
        }
        else {
            // 如果有父作用域，就继续查询
            if (scope.enclosingScope != null) {
                return this.findVariableCascade(scope.enclosingScope, variable);
            }
            else {
                // 已经是顶级作用域了，就报错，没有找到该变量
                this.addError("Cannot find a variable of name: '" + variable.name + "'", variable);
            }
        }
        return null;
    };
    return RefResolver;
}(SemanticAstVisitor));
///////////////////////////////////////////
// 属性分析
// 类型计算和检查 但现在是第5章，应该是用不上的
var LeftValueAttributor = /** @class */ (function (_super) {
    __extends(LeftValueAttributor, _super);
    function LeftValueAttributor() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.parentOperator = null;
        return _this;
    }
    /**
     * 检查赋值符号和.符号左边是否是左值
     * @param binary
     */
    LeftValueAttributor.prototype.visitBinary = function (binary) {
        if (scanner_1.Operators.isAssignOp(binary.op)) {
            var lastParentOperator = this.parentOperator;
            this.parentOperator = binary.op;
            //检查 = 的左子节点
            this.visit(binary.exp1);
            if (!binary.exp1.isLeftValue) {
                this.addError("Left child of operator " + scanner_1.Op[binary.op] + " need a left value", binary.exp1);
            }
            //恢复原来的状态信息
            this.parentOperator = lastParentOperator;
            //继续遍历右子节点
            this.visit(binary.exp2);
        }
        else {
            _super.prototype.visitBinary.call(this, binary);
        }
    };
    LeftValueAttributor.prototype.visitUnary = function (u) {
        //要求必须是个左值
        if (u.op == scanner_1.Op.Inc || u.op == scanner_1.Op.Dec) {
            var lastParentOperator = this.parentOperator;
            this.parentOperator = u.op;
            this.visit(u.exp);
            if (!u.exp.isLeftValue) {
                this.addError("Unary operator " + scanner_1.Op[u.op] + "can only be applied to a left value", u);
            }
            //恢复原来的状态信息
            this.parentOperator = lastParentOperator;
        }
        else {
            _super.prototype.visitUnary.call(this, u);
        }
    };
    /**
     * 变量都可以作为左值，除非其类型是void
     * @param v
     */
    LeftValueAttributor.prototype.visitVariable = function (v) {
        if (this.parentOperator != null) {
            var t = v.theType;
            if (!t.hasVoid()) {
                v.isLeftValue = true;
            }
        }
    };
    /**
     * 但函数调用是在.符号左边，并且返回值不为void的时候，可以作为左值
     * @param functionCall
     */
    LeftValueAttributor.prototype.visitFunctionCall = function (functionCall) {
        if (this.parentOperator == scanner_1.Op.Dot) {
            var functionType = functionCall.theType;
            if (!functionType.returnType.hasVoid()) {
                functionCall.isLeftValue = true;
            }
        }
    };
    return LeftValueAttributor;
}(SemanticAstVisitor));
var TypeChecker = /** @class */ (function (_super) {
    __extends(TypeChecker, _super);
    function TypeChecker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TypeChecker.prototype.visitVariableDecl = function (variableDecl) {
        _super.prototype.visitVariableDecl.call(this, variableDecl);
        if (variableDecl.init != null) {
            var t1 = variableDecl.theType;
            var t2 = variableDecl.init.theType;
            if (!t2.LE(t1)) {
                this.addError("Operator '=' can not be applied to '" + t1.name + "' and '" + t2.name + "'.", variableDecl);
            }
            //类型推断：对于any类型，变成=号右边的具体类型
            if (t1 === types_1.SysTypes.Any) {
                variableDecl.theType = t2; //TODO：此处要调整
                // variableDecl.inferredType = t2;
                //重点是把类型记入符号中，这样相应的变量声明就会获得准确的类型
                //由于肯定是声明在前，使用在后，所以变量引用的类型是准确的。
                variableDecl.sym.theType = t2;
            }
        }
    };
    TypeChecker.prototype.visitBinary = function (bi) {
        _super.prototype.visitBinary.call(this, bi);
        var t1 = bi.exp1.theType;
        var t2 = bi.exp2.theType;
        if (scanner_1.Operators.isAssignOp(bi.op)) {
            bi.theType = t1;
            if (!t2.LE(t1)) { //检查类型匹配
                this.addError("Operator '" + scanner_1.Op[bi.op] + "' can not be applied to '" + t1.name + "' and '" + t2.name + "'.", bi);
            }
        }
        else if (bi.op == scanner_1.Op.Plus) { //有一边是string，或者两边都是number才行。
            if (t1 == types_1.SysTypes.String || t2 == types_1.SysTypes.String) {
                bi.theType = types_1.SysTypes.String;
            }
            else if (t1.LE(types_1.SysTypes.Number) && t2.LE(types_1.SysTypes.Number)) {
                bi.theType = types_1.Type.getUpperBound(t1, t2);
            }
            else {
                this.addError("Operator '" + scanner_1.Op[bi.op] + "' can not be applied to '" + t1.name + "' and '" + t2.name + "'.", bi);
            }
        }
        else if (scanner_1.Operators.isArithmeticOp(bi.op)) {
            if (t1.LE(types_1.SysTypes.Number) && t2.LE(types_1.SysTypes.Number)) {
                bi.theType = types_1.Type.getUpperBound(t1, t2);
            }
            else {
                this.addError("Operator '" + scanner_1.Op[bi.op] + "' can not be applied to '" + t1.name + "' and '" + t2.name + "'.", bi);
            }
        }
        else if (scanner_1.Operators.isRelationOp(bi.op)) {
            if (t1.LE(types_1.SysTypes.Number) && t2.LE(types_1.SysTypes.Number)) {
                bi.theType = types_1.SysTypes.Boolean;
            }
            else {
                this.addError("Operator '" + scanner_1.Op[bi.op] + "' can not be applied to '" + t1.name + "' and '" + t2.name + "'.", bi);
            }
        }
        else if (scanner_1.Operators.isLogicalOp(bi.op)) {
            if (t1.LE(types_1.SysTypes.Boolean) && t2.LE(types_1.SysTypes.Boolean)) {
                bi.theType = types_1.SysTypes.Boolean;
            }
            else {
                this.addError("Operator '" + scanner_1.Op[bi.op] + "' can not be applied to '" + t1.name + "' and '" + t2.name + "'.", bi);
            }
        }
        else {
            this.addError("Unsupported binary operator: " + scanner_1.Op[bi.op], bi);
        }
    };
    TypeChecker.prototype.visitUnary = function (u) {
        _super.prototype.visitUnary.call(this, u);
        var t = u.exp.theType;
        //要求必须是个左值
        if (u.op == scanner_1.Op.Inc || u.op == scanner_1.Op.Dec) {
            if (t.LE(types_1.SysTypes.Number)) {
                u.theType = t;
            }
            else {
                this.addError("Unary operator " + scanner_1.Op[u.op] + "can not be applied to '" + t.name + "'.", u);
            }
        }
        else if (u.op == scanner_1.Op.Minus || u.op == scanner_1.Op.Plus) {
            if (t.LE(types_1.SysTypes.Number)) {
                u.theType = t;
            }
            else {
                this.addError("Unary operator " + scanner_1.Op[u.op] + "can not be applied to '" + t.name + "'.", u);
            }
        }
        else if (u.op == scanner_1.Op.Not) {
            if (t.LE(types_1.SysTypes.Boolean)) {
                u.theType = t;
            }
            else {
                this.addError("Unary operator " + scanner_1.Op[u.op] + "can not be applied to '" + t.name + "'.", u);
            }
        }
        else {
            this.addError("Unsupported unary operator: " + scanner_1.Op[u.op] + " applied to '" + t.name + "'.", u);
        }
    };
    /**
     * 用符号的类型（也就是变量声明的类型），来标注本节点
     * @param v
     */
    TypeChecker.prototype.visitVariable = function (v) {
        if (v.sym != null) {
            v.theType = v.sym.theType;
        }
    };
    TypeChecker.prototype.visitFunctionCall = function (functionCall) {
        if (functionCall.sym != null) {
            var functionType = functionCall.sym.theType;
            //注意：不使用函数类型，而是使用返回值的类型
            functionCall.theType = functionType.returnType;
            //检查参数数量
            if (functionCall.arguments.length != functionType.paramTypes.length) {
                this.addError("FunctionCall of " + functionCall.name + " has " + functionCall.arguments.length + " arguments, while expecting " + functionType.paramTypes.length + ".", functionCall);
            }
            //检查注意检查参数的类型
            for (var i = 0; i < functionCall.arguments.length; i++) {
                this.visit(functionCall.arguments[i]);
                if (i < functionType.paramTypes.length) {
                    var t1 = functionCall.arguments[i].theType;
                    var t2 = functionType.paramTypes[i];
                    if (!t1.LE(t2) && t2 !== types_1.SysTypes.String) {
                        this.addError("Argument " + i + " of FunctionCall " + functionCall.name + "is of Type " + t1.name + ", while expecting " + t2.name, functionCall);
                    }
                }
            }
        }
    };
    return TypeChecker;
}(SemanticAstVisitor));
var TypeConverter = /** @class */ (function (_super) {
    __extends(TypeConverter, _super);
    function TypeConverter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TypeConverter.prototype.visitBinary = function (bi) {
        _super.prototype.visitBinary.call(this, bi);
        var t1 = bi.exp1.theType;
        var t2 = bi.exp2.theType;
        if (scanner_1.Operators.isAssignOp(bi.op)) {
            if (t1 === types_1.SysTypes.String && t2 !== types_1.SysTypes.String) {
                if (t2 === types_1.SysTypes.Integer) {
                    var exp = new ast_1.FunctionCall(bi.exp2.beginPos, bi.exp2.endPos, "integer_to_string", [bi.exp2]);
                    exp.sym = symbol_1.built_ins.get("integer_to_string");
                    bi.exp2 = exp;
                }
            }
        }
        else if (bi.op == scanner_1.Op.Plus) { //有一边是string，或者两边都是number才行。
            if (t1 === types_1.SysTypes.String || t2 === types_1.SysTypes.String) {
                if (t1 === types_1.SysTypes.Integer || t1 === types_1.SysTypes.Number) {
                    var exp = new ast_1.FunctionCall(bi.exp1.beginPos, bi.exp1.endPos, "integer_to_string", [bi.exp1]);
                    exp.sym = symbol_1.built_ins.get("integer_to_string");
                    bi.exp1 = exp;
                }
                if (t2 === types_1.SysTypes.Integer || t2 === types_1.SysTypes.Number) {
                    var exp = new ast_1.FunctionCall(bi.exp2.beginPos, bi.exp2.endPos, "integer_to_string", [bi.exp2]);
                    exp.sym = symbol_1.built_ins.get("integer_to_string");
                    bi.exp2 = exp;
                }
            }
        }
    };
    TypeConverter.prototype.visitFunctionCall = function (functionCall) {
        if (functionCall.sym != null) {
            var functionType = functionCall.sym.theType;
            //看看参数有没有可以转换的。
            for (var i = 0; i < functionCall.arguments.length; i++) {
                this.visit(functionCall.arguments[i]);
                if (i < functionType.paramTypes.length) {
                    var t1 = functionCall.arguments[i].theType;
                    var t2 = functionType.paramTypes[i];
                    if ((t1 === types_1.SysTypes.Integer || t1 === types_1.SysTypes.Number) && t2 === types_1.SysTypes.String) {
                        var exp = new ast_1.FunctionCall(functionCall.arguments[i].beginPos, functionCall.arguments[i].endPos, "integer_to_string", [functionCall.arguments[i]]);
                        exp.sym = symbol_1.built_ins.get("integer_to_string");
                        functionCall.arguments[i] = exp;
                    }
                }
            }
        }
    };
    return TypeConverter;
}(SemanticAstVisitor));
