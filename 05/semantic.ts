
/**
 * 语义分析
 * 当前特性：
 * 树状的符号表
 * 简单的引用消解：没有考虑声明的先后顺序，也没有考虑闭包
 * 简单的作用域
 */

import { AstNode, AstVisitor, Block, FunctionCall, FunctionDecl, Prog, Variable, VariableDecl } from "./ast";
import { CompilerError } from "./error";
import { Scope } from "./scope";
import { built_ins, FunctionSymbol, SymKind, VarSymbol } from "./symbol";
import { FunctionType, SysTypes, Type } from "./types";

export class SemanticAnalyer {
    passes: SemanticAstVisitor[] = [
        new Enter(),
        new RefResolver(),
        new TypeChecker(),
        new TypeConverter(),
        new LeftValueAttributor()
    ];

    errors: CompilerError[] = [];    // 语义错误
    warnings: CompilerError[] = [];   // 语义报警信息

    execute(prog: Prog): void {
        this.errors = [];
        this.warnings = [];
        for (let pass of this.passes) {
            pass.visitProg(prog);
            this.errors = this.errors.concat(pass.errors);
            this.warnings = this.warnings.concat(pass.warnings);
        }
    }

}

export class SemanticError extends CompilerError {
    node: AstNode;
    constructor(msg: string, node: AstNode, isWarning = false) {
        super(msg, node.beginPos, /* node.endPos, */ isWarning);
        this.node = node;
    }
}

abstract class SemanticAstVisitor extends AstVisitor {
    errors: CompilerError[] = [];   //语义错误
    warnings: CompilerError[] = []; //语义报警信息

    addError(msg: string, node: AstNode) {
        this.errors.push(new SemanticError(msg, node));
        console.log("@" + node.beginPos.toString() + " : " + msg);
    }

    addWarning(msg: string, node: AstNode) {
        this.warnings.push(new SemanticError(msg, node, true));
        console.log("@" + node.beginPos.toString() + " : " + msg);
    }
}


///////////////////////////////////////////////////////
// 建立符号表

/**
 * 把符号加入符号表
 */
class Enter extends SemanticAstVisitor {
    scope: Scope | null = null;    // 当前所属的scope
    functionSym: FunctionSymbol | null = null;

    visitProg(prog: Prog) {
        let sym = new FunctionSymbol('main', new FunctionType(SysTypes.Integer, []));
        prog.sym = sym;
        this.functionSym = sym;

        return super.visitProg(prog);
    }

    /**
     * 将函数声明加入符号表
     * @param functionDecl 
     */
    visitFunctionDecl(functionDecl: FunctionDecl): any {
        let currentScope = this.scope as Scope;

        // 创建函数的symbol
        let paramTypes: Type[] = [];
        if (functionDecl.callSignature.paramList != null) {
            for (let p of functionDecl.callSignature.paramList.params) {
                paramTypes.push(p.theType);
            }
        }
        let sym = new FunctionSymbol(functionDecl.name, new FunctionType(functionDecl.callSignature.returnType, paramTypes));
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
        let lastFunctionSym = this.functionSym;
        this.functionSym = sym;

        // 创建新的Scope，用来存放参数
        let oldScope = currentScope;
        this.scope = new Scope(oldScope);
        functionDecl.scope = this.scope;

        // 遍历子节点
        super.visitFunctionDecl(functionDecl);

        // 恢复当前函数
        this.functionSym = lastFunctionSym;

        // 恢复原来的Scope
        this.scope = oldScope;

    }

    /**
     * 遇到块的时候，就建立一级新的作用域
     * 支持块作用域
     * @param block 
     */
    visitBlock(block: Block): any {
        // 创建下一级scope
        let oldScope = this.scope;
        this.scope = new Scope(this.scope);
        block.scope = this.scope;
        // ar ?为什么这里不直接这样写 block.scope = new Scope(this.scope);

        // 调用父类的方法，遍历所有的语句
        super.visitBlock(block);

        // 重新设置当前的Scope
        this.scope = oldScope;

    }

    // 把变量声明加入符号表
    visitVariableDecl(variableDecl: VariableDecl, additional?: any) {
        let currentScope = this.scope as Scope;
        if (currentScope.hasSymbol(variableDecl.name)){
            this.addError("Dumplicate symbol: " + variableDecl.name, variableDecl);
        }
        // 把变量加入当前符号表
        let sym = new VarSymbol(variableDecl.name, variableDecl.theType);
        variableDecl.sym = sym;
        currentScope.enter(variableDecl.name, sym);

        // ar ?把本地变量也加入函数符号中，可用于后面生成代码
        this.functionSym?.vars.push(sym);
    }

}

////////////////////////////////////////////
// 引用消解

/**
 * 引用消解
 * 遍历AST。如果发现函数调用和变量引用，就去找它的定义
 */
class RefResolver extends SemanticAstVisitor {
    scope: Scope | null = null;

    // 每个Scope已经声明了的变量的列表
    declaredVarsMap: Map<Scope, Map<string, VarSymbol>> = new Map();
    visitFunctionDecl(functionDecl: FunctionDecl) {
        // 修改scope
        let oldScope = this.scope;
        this.scope = functionDecl.scope as Scope;

        // 为已声明的变量设置一个存储区域
        // ar 这里应该叫为body初始化个存储区域
        this.declaredVarsMap.set(this.scope, new Map());

        // 遍历下级节点
        super.visitFunctionDecl(functionDecl);

        // 重新设置scope
        this.scope = oldScope;
    }

    // 对块做什么消解？
    visitBlock(block: Block, additional?: any) {
        // 修改scope
        let oldScope = this.scope;
        this.scope = block.scope as Scope;

        // 为已声明的变量设置一个存储区域
        this.declaredVarsMap.set(this.scope, new Map());

        // 遍历下级节点
        super.visitBlock(block);

        // 重新设置scope
        this.scope = oldScope;
    }

    /**
     * 做函数的消解
     * 函数不需要声明在前，使用在后
     */
    visitFunctionCall(functionCall: FunctionCall, additional?: any) {
        let currentScope = this.scope as Scope;

        if (built_ins.has(functionCall.name)) {
            functionCall.sym = built_ins.get(functionCall.name) as FunctionSymbol;
        }
        else {
            functionCall.sym = currentScope.getSymbolCascade(functionCall.name) as FunctionSymbol|null;
        }

        super.visitFunctionCall(functionCall);
    }

    /**
     * 标记变量是否已被声明
     * @param variableDecl 
     * @param additional 
     */
    visitVariableDecl(variableDecl: VariableDecl, additional?: any) {
        let currentScope = this.scope as Scope;
        let declaredSyms = this.declaredVarsMap.get(currentScope) as Map<string, VarSymbol>;
        
        // 从当前作用域里查询符号
        let sym = currentScope.getSymbol(variableDecl.name);

        if (sym != null) {
            // 然后将变量和符号的关系存在declaredVarsMap中
            declaredSyms.set(variableDecl.name, sym as VarSymbol);
        }

        super.visitVariableDecl(variableDecl);
    }

    /**
     * 变量引用消解
     * @param variable 
     * @param additional 
     */
    visitVariable(variable: Variable) {
        let currentScope = this.scope as Scope;
        variable.sym = this.findVariableCascade(currentScope, variable);
    }

    /**
     * 逐级查找变量的符号信息
     * @param scope 
     * @param variable 
     * @returns 
     */
    private findVariableCascade(scope: Scope, variable: Variable): VarSymbol | null {
        // 获取作用域中的已定义符号表
        let declaredSyms = this.declaredVarsMap.get(scope) as Map<string, VarSymbol>;
        // 在作用域中，根据变量名称查找符号
        let symInScope = scope.getSymbol(variable.name);
        if (symInScope != null) {
            // 如果已定义符号表中有这个变量名，则返回符号
            if (declaredSyms.has(variable.name)) {
                return declaredSyms.get(variable.name) as VarSymbol;
            }
            else {
                // 如果类型是变量，则详细报错，说变量在定义之前就非法使用了
                if (symInScope.kind == SymKind.Variable) {
                    this.addError("Variable: '" + variable.name + "' is used before declaration.", variable);
                }
                else {
                    this.addError("We expect a variable of name: '" + variable.name + "', but find a " + SymKind[symInScope.kind] + ".", variable);
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
    }
}

///////////////////////////////////////////
// 属性分析
// 类型计算和检查 但现在是第5章，应该是用不上的


class LeftValueAttributor extends SemanticAstVisitor {

}

class TypeChecker extends SemanticAstVisitor {

}

class TypeConverter extends SemanticAstVisitor {

}




















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