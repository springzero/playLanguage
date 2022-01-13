
import { Token, TokenKind, Scanner, CharStream, Op } from './scanner';
import { AstVisitor, AstNode, Block, Prog, VariableDecl, FunctionDecl, FunctionCall, Statement, Expression, ExpressionStatement, Binary, IntegerLiteral, DecimalLiteral, StringLiteral, Variable, ReturnStatement, IfStatement, ForStatement, Unary, AstDumper, LeftValue } from './ast';
import { Parser } from './parser';
import { Symbol, VarSymbol } from './symbol';

//////////////////////////////
// 解释器

/**
 * 遍历AST，并执行
 */
class Intepretor extends AstVisitor {
    // 存储变量值的区域
    // values: Map<string, any> = new Map();

    // 调用栈
    callStack: StackFrame[] = [];

    // 当前栈桢
    currentFrame: StackFrame;

    private pushFrame(frame: StackFrame) {
        this.callStack.push(frame);
        this.currentFrame = frame;
    }

    private popFrame() {
        if (this.callStack.length > 1) {
            let frame = this.callStack[this.callStack.length - 2];    // 获取栈顶第二个栈
            this.callStack.pop();
            this.currentFrame = frame;
        }
    }

    constructor() {
        super();
        // 初始化顶层的栈桢
        this.currentFrame = new StackFrame();
        this.callStack.push(this.currentFrame);
    }


    visitFunctionDecl(functionDecl: FunctionDecl) { }

    /**
     * 遍历一个块 
     */
    visitBlock(block: Block): any {
        let retVal: any;
        for (let x of block.stmts) {
            retVal = this.visit(x);

            // 如果当前执行了一个返回语句，那么就直接返回，不再执行后面的语句。
            // 如果存在上一级Block，也是中断执行，直接返回
            if (typeof retVal == 'object' &&
                ReturnValue.isReturnValue(retVal)) {
                return retVal;
            }
        }
        return retVal;
    }

    /**
     * 处理Return语句时，要把返回值封装成一个特殊的对象，用于中断后续程序的执行。
     */
    visitReturnStatement(returnStatement: ReturnStatement, additional?: any) {
        let retVal: any;
        if (returnStatement.exp != null) {
            retVal = this.visit(returnStatement.exp);
            this.setReturnValue(retVal);
        }
        return new ReturnValue(retVal); // 这个结构是传递一个信号，让Block和for循环等停止执行
    }

    // 把返回值设置到上一级栈桢中（也就是调用者的栈桢） 
    // ar？？按照我的理解返回值不应该设置在被调用者的栈桢么。调用者可是会调多个函数的，但是被调用者栈桢用完就回抛掉的，值传到调用者具体是哪步
    // ar 具体看visitFunctionCall中的动作
    private setReturnValue(retVal: any) {
        let frame = this.callStack[this.callStack.length - 2];
        frame.retVal = retVal;
    }

    /**
     * 执行if语句
     * @param ifStmt 
     */
    visitIfStatement(ifStmt: IfStatement): any {
        // 计算条件
        let conditionValue = this.visit(ifStmt.condition);
        // 条件为true，则执行then部分
        if (conditionValue) {
            return this.visit(ifStmt.stmt);
        }
        else if (ifStmt.elseStmt != null) {
            return this.visit(ifStmt.elseStmt);
        }
    }


    visitForStatement(forStmt: ForStatement): any {
        if (forStmt.init != null) {
            this.visit(forStmt.init);
        }

        let isRun = forStmt.condition == null ? true : this.visit(forStmt.condition);
        while (isRun) {
            // 执行循环体
            let retVal = this.visit(forStmt.stmt);
            // 处理循环体中的Return语句
            if (typeof retVal == 'object' && ReturnValue.isReturnValue(retVal)) {
                return retVal;
            }

            if (forStmt.increment != null) {
                this.visit(forStmt.increment);
            }

            // 执行循环判断
            isRun = forStmt.condition == null ? true : this.visit(forStmt.condition);
        }
    }


    /**
     * 运行函数调用
     */
    visitFunctionCall(functionCall: FunctionCall) {
        if (functionCall.name == "println") { //内置函数
            return this.println(functionCall.arguments);
        }
        else if (functionCall.name == "tick") {
            return this.tick();
        }
        else if (functionCall.name == "integer_to_string") {
            return this.integer_to_string(functionCall.arguments);
        }


        if (functionCall.sym != null) {
            // 清空返回值
            // ar 这么说来 那个返回值那里，确实是设置到调用者栈桢的这里，这里就是栈桢的边界
            this.currentFrame.retVal = undefined;

            // 创建新栈桢
            let frame = new StackFrame();
            // 计算参数值，并保存到新创建的栈桢
            let functionDecl = functionCall.sym.decl as FunctionDecl;
            if (functionDecl.callSignature.paramList != null) {
                let params = functionDecl.callSignature.paramList.params;
                for (let i = 0; i < params.length; i++) {
                    let variableDecl = params[i];
                    let val = this.visit(functionCall.arguments[i]);
                    frame.values.set(variableDecl.sym as Symbol, val);  // 将参数设置到新frame的储存空间
                }
            }

            // 把新栈桢入栈
            this.pushFrame(frame);

            // 执行函数
            this.visit(functionDecl.body);

            // 弹出当前栈桢
            this.popFrame();

            // 函数的返回值
            return this.currentFrame.retVal;
        } else {
            console.log("Runtime error, cannot find declaration of " + functionCall.name + ".");
            return;
        }

    }

    /**
     * 内置函数println
     * @param functionCall 
     */
    private println(args: Expression[]): any {
        if (args.length > 0) {
            let retVal = this.visit(args[0]);
            console.log(retVal);
        }
        else {
            console.log();
        }
        return 0;
    }

    /**
     * 内置函数tick
     */
    private tick(): number {
        let date = new Date();
        let value = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
        return value;
    }

    /**
     * 把整型转成字符串
     * @param functionCall 
     */
    private integer_to_string(args: Expression[]): string {
        if (args.length > 0) {
            let arg = this.visit(args[0]);
            return arg.toString();
        }
        return "";
    }

    /**
     * 变量声明
     * @param variableDecl 
     * @returns 
     */
    visitVariableDecl(variableDecl: VariableDecl) {
        if (variableDecl.init != null) {
            let v = this.visit(variableDecl.init);
            // if (this.isLeftValue(v)) {  // 新版05的代码 没有这个分支了 逻辑放到了 semantic中 LeftValueAttributor的visitVariable里， 交给了
            //     v = this.getVariableValue((v as LeftValue).variable.name);
            // }
            this.setVariableValue(variableDecl.sym as VarSymbol, v);
            return v;
        }
    }

    /**
     * 获取变量的值
     * 这里给出的是左值。左值即可以写，也可以读
     * 如果是左值，返回符号。否则，返回值
     * @param v 
     * @returns 
     */
    visitVariable(v: Variable): any {
        if (v.isLeftValue) {    // 要搞懂这个isLeftValue是怎么计算出来的，现在赋值语句是有问题
            return v.sym;
        }
        else {
            return this.getVariableValue(v.sym as VarSymbol);
        }
    }

    private getVariableValue(sym: VarSymbol|null) {
        if (sym != null) {
            return this.currentFrame.values.get(sym);
        }
    }

    private setVariableValue(sym: VarSymbol, value: any) {
        return this.currentFrame.values.set(sym, value);

    }



    /**
     * 二元运算
     * @param bi 
     * @returns 
     */
    visitBinary(bi: Binary) {
        let ret: any;
        let v1 = this.visit(bi.exp1);
        let v2 = this.visit(bi.exp2);
        // let v1left: LeftValue | null = null;
        // let v2left: LeftValue | null = null;
        // if (this.isLeftValue(v1)) {     // 如果是左值，那就是符号，要去取一下值，但是现在不需要的 都在visitVariable里
        //     v1left = v1 as LeftValue;
        //     v1 = this.getVariableValue(v1left.variable.sym);
        //     console.log("value of " + v1left.variable.name + " : " + v1);
        // }
        // if (this.isLeftValue(v2)) {
        //     v2left = v2 as LeftValue;
        //     v2 = this.getVariableValue(v2left.variable.sym);
        // }
        switch (bi.op) {
            case Op.Plus: //'+'
                ret = v1 + v2;
                break;
            case Op.Minus: //'-'
                ret = v1 - v2;
                break;
            case Op.Multiply: //'*'
                ret = v1 * v2;
                break;
            case Op.Divide: //'/'
                ret = v1 / v2;
                break;
            case Op.Modulus: //'%'
                ret = v1 % v2;
                break;
            case Op.G: //'>'
                ret = v1 > v2;
                break;
            case Op.GE: //'>='
                ret = v1 >= v2;
                break;
            case Op.L: //'<'
                ret = v1 < v2;
                break;
            case Op.LE: //'<='
                ret = v1 <= v2;
                break;
            case Op.EQ: //'=='
                ret = v1 == v2;
                break;
            case Op.NE: //'!='
                ret = v1 != v2;
                break;
            case Op.And: //'&&'
                ret = v1 && v2;
                break;
            case Op.Or: //'||'
                ret = v1 || v2;
                break;
            case Op.Assign: //'='
                let varSymbol = v1 as VarSymbol;
                // var varSymbol = bi.exp1.sym as VarSymbol;
                this.setVariableValue(varSymbol, v2);

                break;
            default:
                console.log("Unsupported binary operation: " + Op[bi.op]);
        }
        return ret;
    }

    /**
     * 计算一元表达式
     */
    visitUnary(u: Unary): any {
        let v = this.visit(u.exp);
        let varSymbol: VarSymbol;
        let value: any;

        switch (u.op) {
            case Op.Inc:    // '++'
                // 拿到值，计算放回存储
                varSymbol = v as VarSymbol;
                value = this.getVariableValue(varSymbol);
                this.setVariableValue(varSymbol, value + 1);
                if (u.isPrefix) {
                    return value + 1;
                }
                else {
                    return value;
                }
            case Op.Dec: // '--'
                varSymbol = v as VarSymbol;
                value = this.getVariableValue(varSymbol);
                this.setVariableValue(varSymbol, value - 1);
                if (u.isPrefix) {
                    return value - 1;
                } else {
                    return value;
                }
            case Op.Plus:   // '+'
                return v;
            case Op.Minus:  // '-'
                return -v;
            default:
                console.log("Unsupported unary op: " + Op[u.op]);
        }
    }
}


class StackFrame {
    // 存储变量的值
    values: Map<Symbol, any> = new Map();

    // 返回值，当调用函数的时候，返回值放在这里
    retVal: any = undefined;
}

class ReturnValue {
    tag_ReturnValue: number = 0;
    value: any;
    constructor(value: any) {
        this.value = value;
    }

    // 强转成ReturnValue,如果成员变量tag_xxx 不为undefined, 说明这个变量是ReturnValue类型
    static isReturnValue(v: any) {
        return typeof (v as ReturnValue).tag_ReturnValue != 'undefined';
    }
}

////////////////////////
// 主程序

function compileAndRun(program: string) {
    console.log("源代码:");
    console.log(program);

    console.log("\n词法分析结果:");
    let scanner = new Scanner(new CharStream(program));
    while (scanner.peek().kind != TokenKind.EOF) {
        console.log(scanner.next().toString());
    }

    console.log("\n语法分析后的AST:");
    scanner = new Scanner(new CharStream(program));
    let parser = new Parser(scanner);
    let prog: Prog = parser.parseProg();
    let astDumper = new AstDumper();
    astDumper.visit(prog, "");

    console.log("\n符号表：");
    let semanticAnalyer = new SemanticAnalyer();
    semanticAnalyer.execute(prog);
    new ScopeDumper().visit(prog, "");
    console.log("\n语义分析后的AST，注意变量和函数已被消解：");
    astDumper.visit(prog, "");

    if (parser.errors.length > 0 || semanticAnalyer.errors.length>0){
        console.log("\n共发现" + parser.errors.length + "个语法错误，" + semanticAnalyer.errors.length + "个语义错误。");
        if(parser.errors.length > 0) {
            console.log(parser.errors)
        }
        if(semanticAnalyer.errors.length > 0){
            console.log(semanticAnalyer.errors);
        }
        // return;
    }

    console.log("\n运行当前的程序:");
    let retVal = new Intepretor().visit(prog);
    console.log("程序返回值: " + retVal);

}

import * as process from 'process'
import { SemanticAnalyer } from './semantic';
import { ScopeDumper } from './scope';
import { parse } from 'path/posix';

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