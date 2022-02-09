/**
 * 符号表和作用域
 */

import { FunctionDecl } from "./ast";
import { FunctionType, SysTypes, Type } from "./types";

/**
 * 符号
 */
export abstract class Symbol {
    name: string;
    theType: Type = SysTypes.Any;
    kind: SymKind;
    constructor(name: string, theType: Type, kind: SymKind) {
        this.name = name;
        this.theType = theType;
        this.kind = kind;
    }

    abstract accept(visitor:SymbolVisitor, additional: any):any;
}

/**
 * 符号种类
 */
export enum SymKind { Variable, Function, Class, Interface, Parameter, Prog };

// 变量符号
export class VarSymbol extends Symbol {
    constructor(name:string, theType: Type) {
        super(name, theType, SymKind.Variable);
        this.theType = theType;
    }

    accept(visitor: SymbolVisitor, additional: any) {
        visitor.visitVarSymbol(this, additional);
    }
}

// 函数符号
export class FunctionSymbol extends Symbol {
    vars:VarSymbol[] = [];  // 本地变量的列表。 参数也算本地变量
    opStackSize:number = 40;    // 操作数的大小  ？？操作数 what mean？ 递归限制么
    byteCode:number[]|null = null;  // 存放生成的字节码
    decl:FunctionDecl|null = null;  // 存放AST，作为代码来运行

    constructor(name: string, theType: FunctionType, vars: VarSymbol[] = []) {
        super(name, theType, SymKind.Function);
        this.vars = vars;
        this.theType = theType;
    }

    accept(visitor: SymbolVisitor, additional: any) {
        visitor.visitFuncionSymbol(this, additional);
    }

    getNumParams():number {
        return (this.theType as FunctionType).paramTypes.length;
    }
}

///////////////
// 一些系统内置的符号
export let FUN_println = new FunctionSymbol("println", new FunctionType(SysTypes.Void, [SysTypes.String]), [new VarSymbol("a", SysTypes.String)]);
export let FUN_tick = new FunctionSymbol("tick", new FunctionType(SysTypes.Integer, []), []);
export let FUN_integer_to_string = new FunctionSymbol("integer_to_string", new FunctionType(SysTypes.String, [SysTypes.Integer]), [new VarSymbol("a", SysTypes.Integer)]);

export let built_ins:Map<string, FunctionSymbol> = new Map([
    ["println", FUN_println],
    ["tick", FUN_tick],
    ["integer_to_string", FUN_integer_to_string],
])

let FUN_string_create_by_str = new FunctionSymbol("string_create_by_str", new FunctionType(SysTypes.String,[SysTypes.String]),[new VarSymbol("a", SysTypes.String)]);
let FUN_string_concat = new FunctionSymbol("string_concat", new FunctionType(SysTypes.String,[SysTypes.String,SysTypes.String]),[new VarSymbol("str1", SysTypes.String), new VarSymbol("str2", SysTypes.String)]);

export let intrinsics:Map<string, FunctionSymbol> = new Map([
    ["string_create_by_str", FUN_string_create_by_str],
    ["string_concat", FUN_string_concat],
]);


//////////////////////////////
// visitor

export abstract class SymbolVisitor {
    abstract visitVarSymbol(sym: VarSymbol, additional:any):any;
    abstract visitFuncionSymbol(sym: FunctionSymbol, additional:any):any;
}

export class SymbolDumper extends SymbolVisitor {

    visit(s: Symbol, addtional:any) {
        return s.accept(this, addtional);
    }

    // 输出VarSymbol的调试信息
    visitVarSymbol(sym: VarSymbol, additional:any):any{
        console.log(additional + sym.name + "{" + SymKind[sym.kind] + "}");
    }

    visitFuncionSymbol(sym: FunctionSymbol, additional:any):any{
        console.log(additional + sym.name + "{" + SymKind[sym.kind] + ", local var count:" + sym.vars.length + "}");

    }

}