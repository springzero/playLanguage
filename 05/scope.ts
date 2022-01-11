/**
 * 作用域
 */

import { AstVisitor, Block, FunctionDecl } from "./ast";
import { SymbolDumper, Symbol } from "./symbol";


export class Scope {
    // 存储
    name2symbol: Map<string, Symbol> = new Map();

    enclosingScope: Scope | null; //顶级作用域的上一级是null

    constructor(enclosingScope: Scope | null) {
        this.enclosingScope = enclosingScope;
    }

    /**
     * 将变量存储到本作用域
     * @param name 
     * @param s 
     */
    enter(name: string, s: Symbol) {
        this.name2symbol.set(name, s);
    }

    hasSymbol(name: string): boolean {
        return this.name2symbol.has(name);
    }

    getSymbol(name: string): Symbol | null {
        let s = this.name2symbol.get(name);
        if (typeof s == 'object') {
            return s;
        }
        else {
            return null;
        }
    }

    /**
     * 级联查找某个符号
     */
    getSymbolCascade(name: string): Symbol | null {
        let s = this.getSymbol(name);

        if (s != null) {
            return s;
        }
        else if (this.enclosingScope != null) {
            return this.enclosingScope.getSymbolCascade(name);
        }
        else {
            return null;
        }
    }
}

export class ScopeDumper extends AstVisitor {

    visitFunctionDecl(functionDecl:FunctionDecl, prefix: any):any {
        console.log(prefix + "Scope of function: " + functionDecl.name);
        
        // 显示本级Scope
        if (functionDecl.scope!=null) {
            this.dumpScope(functionDecl.scope, prefix);
        }
        else {
            console.log(prefix + "{null}");
        }

        // 继续遍历
        super.visitFunctionDecl(functionDecl, prefix+"  ");
    }

    visitBlock(block: Block, prefix: any) {
        console.log(prefix + "Scope of block");

        // 显示本级Scope
        if(block.scope != null) {
            this.dumpScope(block.scope, prefix);
        }
        else {
            console.log(prefix + "{null}");
        }

        super.visitBlock(block, prefix + "  ");
    }

    // 作用域 ——> 找到符号 -> 调用各符号自身方法accept()
    private dumpScope(scope: Scope, prefix: string) {
        if (scope.name2symbol.size > 0) {
            // 遍历该作用域的符号
            let symbolDumper = new SymbolDumper();
            for (let s of scope.name2symbol.values()) {
                symbolDumper.visit(s, prefix + "  ");
            }
        }
    }
}