
import { Token, TokenKind, Scanner, CharStream } from './scanner';
import { AstVisitor, AstNode, Block, Prog, VariableDecl, FunctionDecl, FunctionCall, Statement, Expression, ExpressionStatement, Binary, IntegerLiteral, DecimalLiteral, StringLiteral, Variable } from './ast';
import { Parser } from './parser';
import { SymTable, SymKind, Enter, RefResolver } from './semantic';

//////////////////////////////
// 解释器

/**
 * 遍历AST，并执行
 */
class Intepretor extends AstVisitor {
    // 存储变量值的区域
    values: Map<string, any> = new Map();


    visitFunctionDecl(functionDecl: FunctionDecl) {

    }

    /**
     * 运行函数调用
     */
    visitFunctionCall(functionCall: FunctionCall) {
        if (functionCall.name == "println") {
            if (functionCall.parameters.length > 0) {
                let retVal = this.visit(functionCall.parameters[0]);
                if (typeof (retVal as LeftValue).variable == 'object') {
                    retVal = this.getVariableValue((retVal as LeftValue).variable.name);
                }
                console.log(retVal);
            }
            else {
                console.log();
            }
            return 0;
        }
        else {  // 如果函数定义存在，就遍历函数体
            if (functionCall.decl != null) {
                this.visitBlock(functionCall.decl.body);
            }
        }
    }

    /**
     * 变量声明
     * @param variableDecl 
     * @returns 
     */
    visitVariableDecl(variableDecl: VariableDecl) {
        if (variableDecl.init != null) {
            let v = this.visit(variableDecl.init);
            if (this.isLeftValue(v)) {
                v = this.getVariableValue((v as LeftValue).variable.name);
            }
            this.setVariableValue(variableDecl.name, v);
            return v;
        }
    }

    /**
     * 获取变量的值
     * 这里给出的是左值。左值即可以写，也可以读
     * @param v 
     * @returns 
     */
    visitVariable(v: Variable): any {
        return new LeftValue(v);
    }

    private getVariableValue(varName: string) {
        return this.values.get(varName);
    }

    private setVariableValue(varName: string, value: any) {
        return this.values.set(varName, value);

    }

    private isLeftValue(v: any): boolean {
        return typeof (v as LeftValue).variable == 'object';
    }

    visitBinary(bi: Binary) {
        let ret: any;
        let v1 = this.visit(bi.exp1);
        let v2 = this.visit(bi.exp2);
        let v1left: LeftValue | null = null;
        let v2left: LeftValue | null = null;
        if (this.isLeftValue(v1)) {
            v1left = v1 as LeftValue;
            v1 = this.getVariableValue(v1left.variable.name);
            console.log("value of " + v1left.variable.name + " : " + v1);
        }
        if (this.isLeftValue(v2)) {
            v2left = v2 as LeftValue;
            v2 = this.getVariableValue(v2left.variable.name);
        }
        switch (bi.op) {
            case '+':
                ret = v1 + v2;
                break;
            case '-':
                ret = v1 - v2;
                break;
            case '*':
                ret = v1 * v2;
                break;
            case '/':
                ret = v1 / v2;
                break;
            case '%':
                ret = v1 % v2;
                break;
            case '>':
                ret = v1 > v2;
                break;
            case '>=':
                ret = v1 >= v2;
                break;
            case '<':
                ret = v1 < v2;
                break;
            case '<=':
                ret = v1 <= v2;
            case '&&':
                ret = v1 && v2;
                break;
            case '||':
                ret = v1 || v2;
                break;
            case '=':
                if (v1left != null) {
                    this.setVariableValue(v1left.variable.name, v2);
                }
                else {
                    console.log("Assignment need a left value, not ", v1)
                }
                break;
            default:
                console.log("Unsupported binary operation: " + bi.op);
        }
        return ret;
    }

}

/**
 * 左值
 * 目前先只是指变量。
 */
class LeftValue {
    variable: Variable;
    constructor(variable: Variable) {
        this.variable = variable;
    }
}


////////////////////////
// 主程序

function compileAndRun(program: string) {
    console.log("源代码:");
    console.log(program);

    console.log("\n词法分析结果:");
    let tokenizer = new Scanner(new CharStream(program));
    while (tokenizer.peek().kind != TokenKind.EOF) {
        console.log(tokenizer.next());
    }
    
    console.log("\n语法分析后的AST:");
    tokenizer = new Scanner(new CharStream(program));
    let prog: Prog = new Parser(tokenizer).parseProg();
    prog.dump("");

    console.log("\n语义分析后的AST，注意变量和函数已被消解:");
    let symTable = new SymTable();
    new Enter(symTable).visit(prog);    // 建立符号表
    new RefResolver(symTable).visit(prog);  // 消解函数引用
    prog.dump("");

    console.log("\n运行当前的程序:");
    let retVal = new Intepretor().visit(prog);
    console.log("程序返回值: " + retVal);

}

import * as process from 'process'

if (process.argv.length < 3) {
    console.log("Usage: node " + process.argv[1] + ' FILENAME');
    process.exit(1);
}

let fs = require('fs');
let filename = process.argv[2];
fs.readFile(filename, 'utf8',
    function (err: any, data: string) {
        if (err) throw err;
        compileAndRun(data);
    }
);