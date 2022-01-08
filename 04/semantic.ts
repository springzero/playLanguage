import { AstVisitor, Decl, FunctionCall, FunctionDecl, Variable, VariableDecl } from "./ast";

/**
 * 符号表
 * 保存变量、函数、类等的名称和它的类型、声明的位置（AST节点）
 */
export class SymTable {
    table: Map<string, Symbol> = new Map();

    enter(name: string, decl: Decl, symType: SymKind): void {
        this.table.set(name, new Symbol(name, decl, symType));
    }

    hasSymbol(name:string):boolean{
        return this.table.has(name);
    }

    getSymbol(name:string):Symbol|null{
        let item = this.table.get(name);
        if(typeof item == 'object'){
            return item;
        }
        else {
            return null;
        }
    }
}

/**
 * 符号表条目
 */
class Symbol {
    name: string;
    decl: Decl;
    kind: SymKind;
    constructor(name: string, decl: Decl, kind: SymKind) {
        this.name = name;
        this.decl = decl;
        this.kind = kind;
    }
}

/**
 * 符号类型
 */
export enum SymKind { Variable, Function, Class, Interface };

///////////////////////
// 建立符号表

/**
 * 把符号加入符号表
 */
export class Enter extends AstVisitor{
    symTable: SymTable;
    constructor(symTable:SymTable){
        super();
        this.symTable = symTable;
    }

    visitFunctionDecl(functionDecl: FunctionDecl):any{
        if (this.symTable.hasSymbol(functionDecl.name)){
            console.log("Dumplicate symbol: " + functionDecl.name);
        }
        this.symTable.enter(functionDecl.name, functionDecl, SymKind.Function);
    }

    visitVariableDecl(variableDecl: VariableDecl):any{
        if(this.symTable.hasSymbol(variableDecl.name)){
            console.log("Dumplicate symbol: " + variableDecl.name);
        }
        this.symTable.enter(variableDecl.name, variableDecl, SymKind.Variable);
    }

}

//////////////////////
// 引用消解
// 1. 函数引用消解
// 2. 变量引用消解

/**
 * 引用消解
 * 遍历AST。如果发现函数调用和变量引用，就去找它的定义
 */
export class RefResolver extends AstVisitor{
    symTable:SymTable;
    constructor(symTable: SymTable){
        super();
        this.symTable = symTable;
    }

    visitFunctionCall(functionCall:FunctionCall):any{
        let symbol = this.symTable.getSymbol(functionCall.name);
        if (symbol != null && symbol.kind == SymKind.Function){
            functionCall.decl = symbol.decl as FunctionDecl;
        }
        else {
            if (functionCall.name != "println"){
                console.log("Error: cannot find declaration of function " + functionCall.name);
            }
        }
    }

    visitVariable(variable: Variable) {
        let symbol = this.symTable.getSymbol(variable.name);
        if (symbol != null && symbol.kind == SymKind.Variable){
            variable.decl = symbol.decl as VariableDecl;
        }
        else {
            console.log("Error: cannot find declaration of variable " + variable.name);
        }
    }
}