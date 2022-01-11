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
var ast_1 = require("./ast");
var error_1 = require("./error");
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
        this.scope = new scope_1.Scope(oldScope);
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
        this.scope = new scope_1.Scope(this.scope);
        block.scope = this.scope;
        // ar ?为什么这里不直接这样写 block.scope = new Scope(this.scope);
        // 调用父类的方法，遍历所有的语句
        _super.prototype.visitBlock.call(this, block);
        // 重新设置当前的Scope
        this.scope = oldScope;
    };
    // 把变量声明加入符号表
    Enter.prototype.visitVariableDecl = function (variableDecl, additional) {
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
        // 为已声明的变量设置一个存储区域
        this.declaredVarsMap.set(this.scope, new Map());
        // 遍历下级节点
        _super.prototype.visitBlock.call(this, block);
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
        variable.sym = this.findVariableCascade(currentScope, variable);
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
            if (declaredSyms.has(variable.name)) {
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
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return LeftValueAttributor;
}(SemanticAstVisitor));
var TypeChecker = /** @class */ (function (_super) {
    __extends(TypeChecker, _super);
    function TypeChecker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return TypeChecker;
}(SemanticAstVisitor));
var TypeConverter = /** @class */ (function (_super) {
    __extends(TypeConverter, _super);
    function TypeConverter() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return TypeConverter;
}(SemanticAstVisitor));
// import { AstVisitor, Decl, FunctionCall, FunctionDecl, Variable, VariableDecl } from "./ast";
// /**
//  * 符号表
//  * 保存变量、函数、类等的名称和它的类型、声明的位置（AST节点）
//  */
// export class SymTable {
//     table: Map<string, Symbol> = new Map();
//     enter(name: string, decl: Decl, symType: SymKind): void {
//         this.table.set(name, new Symbol(name, decl, symType));
//     }
//     hasSymbol(name:string):boolean{
//         return this.table.has(name);
//     }
//     getSymbol(name:string):Symbol|null{
//         let item = this.table.get(name);
//         if(typeof item == 'object'){
//             return item;
//         }
//         else {
//             return null;
//         }
//     }
// }
// /**
//  * 符号表条目
//  */
// class Symbol {
//     name: string;
//     decl: Decl;
//     kind: SymKind;
//     constructor(name: string, decl: Decl, kind: SymKind) {
//         this.name = name;
//         this.decl = decl;
//         this.kind = kind;
//     }
// }
// /**
//  * 符号种类
//  */
// export enum SymKind { Variable, Function, Class, Interface };
// ///////////////////////
// // 建立符号表
// /**
//  * 把符号加入符号表
//  */
// export class Enter extends AstVisitor{
//     symTable: SymTable;
//     constructor(symTable:SymTable){
//         super();
//         this.symTable = symTable;
//     }
//     visitFunctionDecl(functionDecl: FunctionDecl):any{
//         if (this.symTable.hasSymbol(functionDecl.name)){
//             console.log("Dumplicate symbol: " + functionDecl.name);
//         }
//         this.symTable.enter(functionDecl.name, functionDecl, SymKind.Function);
//     }
//     visitVariableDecl(variableDecl: VariableDecl):any{
//         if(this.symTable.hasSymbol(variableDecl.name)){
//             console.log("Dumplicate symbol: " + variableDecl.name);
//         }
//         this.symTable.enter(variableDecl.name, variableDecl, SymKind.Variable);
//     }
// }
// //////////////////////
// // 引用消解
// // 1. 函数引用消解
// // 2. 变量引用消解
// /**
//  * 引用消解
//  * 遍历AST。如果发现函数调用和变量引用，就去找它的定义
//  */
// export class RefResolver extends AstVisitor{
//     symTable:SymTable;
//     constructor(symTable: SymTable){
//         super();
//         this.symTable = symTable;
//     }
//     visitFunctionCall(functionCall:FunctionCall):any{
//         let symbol = this.symTable.getSymbol(functionCall.name);
//         if (symbol != null && symbol.kind == SymKind.Function){
//             functionCall.decl = symbol.decl as FunctionDecl;
//         }
//         else {
//             if (functionCall.name != "println"){
//                 console.log("Error: cannot find declaration of function " + functionCall.name);
//             }
//         }
//     }
//     visitVariable(variable: Variable) {
//         let symbol = this.symTable.getSymbol(variable.name);
//         if (symbol != null && symbol.kind == SymKind.Variable){
//             variable.decl = symbol.decl as VariableDecl;
//         }
//         else {
//             console.log("Error: cannot find declaration of variable " + variable.name);
//         }
//     }
// }
