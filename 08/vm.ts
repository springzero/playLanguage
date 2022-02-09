/**
 * 虚拟机
 */

import { assert } from "console";
import { off } from "process";
import { AstVisitor, Binary, Block, ForStatement, FunctionCall, FunctionDecl, IfStatement, IntegerLiteral, Prog, ReturnStatement, StringLiteral, Unary, Variable, VariableDecl } from "./ast";
import { Op } from "./scanner";
import { built_ins, FunctionSymbol, SymbolDumper, VarSymbol, Symbol } from "./symbol";
import { FunctionType, SimpleType, SysTypes, Type, UnionType } from "./types";



enum OpCode {
    // 参考JVM
    // Contants
    iconst_0 = 0x03,    //3
    iconst_1 = 0x04,    //4
    iconst_2 = 0x05,    //5
    iconst_3 = 0x06,    //6
    iconst_4 = 0x07,    //7
    iconst_5 = 0x08,    //8
    bipush = 0x10,      //16 //8位整数入栈
    sipush = 0x11,      //17 //16位整数入栈
    ldc = 0x12,         //18 //从常量池加载，load const

    // Loads
    iload = 0x15,       //21  //本地变量入栈
    iload_0 = 0x1a,     //26
    iload_1 = 0x1b,     //27
    iload_2 = 0x1c,     //28
    iload_3 = 0x1d,     //29

    // Store
    istore = 0x36,      //54
    istore_0 = 0x3b,    //59
    istore_1 = 0x3c,    //60
    istore_2 = 0x3d,    //61
    istore_3 = 0x3e,    //62

    // Math
    iadd = 0x60,    //96
    isub = 0x64,    //100
    imul = 0x68,    //104
    idiv = 0x6c,    //108
    iinc = 0x84,    //132 // 自增？

    // Comparisons
    lcmp = 0x94,    //148
    ifeq = 0x99,    //153
    ifne = 0x9a,    //154
    iflt = 0x9b,    //155
    ifge = 0x9c,    //156
    ifgt = 0x9d,    //157
    ifle = 0x9e,    //158
    if_icmpeq = 0x9f,   //159
    if_icmpne = 0xa0,   //160
    if_icmplt = 0xa1,   //161
    if_icmpge = 0xa2,   //162
    if_icmpgt = 0xa3,   //163
    if_icmple = 0xa4,   //164

    // Control
    goto = 0xa7,    //167
    ireturn = 0xac, //172
    return = 0xb1,  //177

    // References
    invokestatic = 0xb8,    //184    //调用函数

    sadd = 0x61,    // 字符串连接
    sldc = 0x13,    // 把字符串常量入栈。字符串放在常量区，用两个操作数记录下标。

}

/**
 * 根据
 * let i2:number = 100;
 * if(i2>50) {
 *     println("i2 > 50")
 * } else {
 *     println("i2 < 50")
 * }
 * 生成代码
 * 第一句：[16,100,59] -> [bipush, 100, istore_0]
 * 第二句：[26,16,50,164,0,10,4,167,0,11,3]   (0,10)组成if的address1:10  (0,11)组成if的address2:11 
 * -> [iload_0, bipush, 50, if_icmple, 0,10, iconst_1, goto, 0,11, iconst_0]
 * 第三句：[19,4,184,0,0] -> 
 * 第四句：[19,5,184,0,0] ->
 */

const OpCodeStr = new Map([
    [OpCode.iconst_0, "iconst_0"],
    [OpCode.iconst_1, "iconst_1"],
    [OpCode.iconst_2, "iconst_2"],
    [OpCode.iconst_3, "iconst_3"],
    [OpCode.iconst_4, "iconst_4"],
    [OpCode.iconst_5, "iconst_5"],
    [OpCode.bipush, "bipush"],
    [OpCode.sipush, "sipush"],
    [OpCode.ldc, "ldc"],
    [OpCode.iload, "iload"],
    [OpCode.iload_0, "iload_0"],
    [OpCode.iload_1, "iload_1"],
    [OpCode.iload_2, "iload_2"],
    [OpCode.iload_3, "iload_3"],
    [OpCode.istore, "istore"],
    [OpCode.istore_0, "istore_0"],
    [OpCode.istore_1, "istore_1"],
    [OpCode.istore_2, "istore_2"],
    [OpCode.istore_3, "istore_3"],
    [OpCode.iadd, "iadd"],
    [OpCode.isub, "isub"],
    [OpCode.imul, "imul"],
    [OpCode.idiv, "idiv"],
    [OpCode.iinc, "iinc"],
    [OpCode.lcmp, "lcmp"],
    [OpCode.ifeq, "ifeq"],
    [OpCode.ifne, "ifne"],
    [OpCode.iflt, "iflt"],
    [OpCode.ifge, "ifge"],
    [OpCode.ifgt, "ifgt"],
    [OpCode.ifle, "ifle"],
    [OpCode.if_icmpeq, "if_icmpeq"],
    [OpCode.if_icmpne, "if_icmpne"],
    [OpCode.if_icmplt, "if_icmplt"],
    [OpCode.if_icmpge, "if_icmpge"],
    [OpCode.if_icmpgt, "if_icmpgt"],
    [OpCode.if_icmple, "if_icmple"],
    [OpCode.goto, "goto"],
    [OpCode.ireturn, "ireturn"],
    [OpCode.return, "return"],
    [OpCode.invokestatic, "invokestatic"],
    [OpCode.sadd, "sadd"],
    [OpCode.sldc, "sldc"]
])

function Debug(key: any) {
    let val = OpCodeStr.get(key);
    if (val == undefined) {
        return key
    }
    else {
        return val;
    }
}

/**
 * 字节码模块 image
 */
export class BCModule {
    // 常量
    consts: any[] = [];

    // 入口函数
    _main: FunctionSymbol | null = null;

    constructor() {
        // 初始化系统函数
        for (let fun of built_ins.values()) {
            this.consts.push(fun);
        }
    }
}

/**
 * 打印调试信息
 */
export class BCModuleDumper {
    dump(bcModule: BCModule) {
        let symbolDumper = new SymbolDumper();
        for (let x of bcModule.consts) {
            if (typeof x == 'number'){
                console.log("Number: "+ x);
            }
            else if (typeof x == 'string'){
                console.log("String: "+ x);
            }
            else if (typeof (x as Symbol).kind == 'number'){
                symbolDumper.visit(x,"");
            }
            else{
                console.log("unknown const:");
                console.log(x);
            }
        }
    }
}

/**
 * 栈桢
 */
class StackFrame {
    // 对应函数，用开找到代码
    // ar 作用不是特别清楚
    functionSym: FunctionSymbol;

    // 本地变量
    localVars: number[];

    // 返回地址
    returnIndex: number = 0;

    // 操作数栈
    oprandStack: any[] = [];

    constructor(functionSym: FunctionSymbol) {
        this.functionSym = functionSym;
        this.localVars = new Array(functionSym.vars.length);
    }
}

/**
 * 虚拟机
 */
export class VM {
    callStack: StackFrame[] = [];

    constructor() {

    }

    execute(bcModule: BCModule): number {
        // 寻找入口函数
        let functionSym: FunctionSymbol;
        if (bcModule._main == null) {
            console.log("Can not find main function.");
            return -1;
        } else {
            functionSym = bcModule._main;
        }

        // 初始化栈桢
        let frame = new StackFrame(functionSym);
        this.callStack.push(frame);

        // 当前运行的代码
        let code: number[] = [];
        if (functionSym.byteCode != null) {
            code = functionSym.byteCode;
        }
        else {
            console.log("Can not find code for function@" + frame.functionSym.name);
            return -1;
        }

        // 当前代码的位置
        let curIndex = 0;

        // 获取第一个代码
        let opCode = code[curIndex];

        let byte1: number = 0;
        let byte2: number = 0;
        let constIndex: number = 0;
        let numValue: number = 0;
        let strValue: string = "";
        let vleft: any;
        let vright: any;

        while (true) {
            switch (opCode) {
                case OpCode.iconst_0:
                    frame.oprandStack.push(0);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.iconst_1:
                    frame.oprandStack.push(1);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.iconst_2:
                    frame.oprandStack.push(2);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.iconst_3:
                    frame.oprandStack.push(3);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.iconst_4:
                    frame.oprandStack.push(4);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.iconst_5:
                    frame.oprandStack.push(5);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.bipush: // 取出1个字节
                    frame.oprandStack.push(code[++curIndex]);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.sipush: // 取出2个字节
                    byte1 = code[++curIndex];
                    byte2 = code[++curIndex];
                    frame.oprandStack.push(byte1 << 8 | byte2);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.ldc:    // 从常量池加载
                    constIndex = code[++curIndex];
                    numValue = bcModule.consts[constIndex];
                    frame.oprandStack.push(numValue);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.sldc:
                    constIndex = code[++curIndex];
                    strValue = bcModule.consts[constIndex];
                    frame.oprandStack.push(strValue);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.iload:
                    frame.oprandStack.push(frame.localVars[code[++curIndex]]);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.iload_0:
                    frame.oprandStack.push(frame.localVars[0]);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.iload_1:
                    frame.oprandStack.push(frame.localVars[1]);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.iload_2:
                    frame.oprandStack.push(frame.localVars[2]);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.iload_3:
                    frame.oprandStack.push(frame.localVars[3]);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.istore:
                    frame.localVars[code[++curIndex]] = frame.oprandStack.pop();
                    opCode = code[++curIndex];
                    continue;
                case OpCode.istore_0:
                    frame.localVars[0] = frame.oprandStack.pop();
                    opCode = code[++curIndex];
                    continue;
                case OpCode.istore_1:
                    frame.localVars[1] = frame.oprandStack.pop();
                    opCode = code[++curIndex];
                    continue;
                case OpCode.istore_2:
                    frame.localVars[2] = frame.oprandStack.pop();
                    opCode = code[++curIndex];
                    continue;
                case OpCode.istore_3:
                    frame.localVars[3] = frame.oprandStack.pop();
                    opCode = code[++curIndex];
                    continue;
                case OpCode.iadd:
                case OpCode.sadd:
                    vright = frame.oprandStack.pop();
                    vleft = frame.oprandStack.pop();
                    frame.oprandStack.push(vleft + vright);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.isub:
                    vright = frame.oprandStack.pop();
                    vleft = frame.oprandStack.pop();
                    frame.oprandStack.push(vleft - vright);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.imul:
                    frame.oprandStack.push(frame.oprandStack.pop() * frame.oprandStack.pop());
                    opCode = code[++curIndex];
                    continue;
                case OpCode.idiv:
                    vright = frame.oprandStack.pop();
                    vleft = frame.oprandStack.pop();
                    frame.oprandStack.push(vleft / vright);
                    opCode = code[++curIndex];
                    continue;
                case OpCode.iinc:   // 给某个变量加个offset
                    let varIndex = code[++curIndex];
                    let offset = code[++curIndex];
                    frame.localVars[varIndex] = frame.localVars[varIndex] + offset;
                    opCode = code[++curIndex];
                    continue;
                case OpCode.invokestatic:
                    // 从常量池找到被调用的函数 前面两个字节是函数符号
                    byte1 = code[++curIndex];
                    byte2 = code[++curIndex];
                    let functionSym = bcModule.consts[byte1 << 8 | byte2] as FunctionSymbol;

                    // 对于内置函数特殊处理
                    if (functionSym.name == 'println') {
                        // 取出一个参数
                        // ar ? 这固定一个参数？
                        let param = frame.oprandStack.pop();
                        opCode = code[++curIndex];
                        console.log(param);
                    }
                    else if (functionSym.name == 'tick') {
                        opCode = code[++curIndex];
                        let date = new Date();
                        let value = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
                        frame.oprandStack.push(value);
                    }
                    else if (functionSym.name == 'integer_to_string') {
                        opCode = code[++curIndex];
                        numValue = frame.oprandStack.pop();
                        frame.oprandStack.push(numValue.toString());
                    }
                    else {
                        // 设置返回地址，值为函数调用的下一跳指令
                        frame.returnIndex = curIndex + 1;

                        // 创建新的栈桢 为函数调用做准备
                        let lastFrame = frame;
                        frame = new StackFrame(functionSym);
                        this.callStack.push(frame);

                        // 传递参数
                        let paramCount = (functionSym.theType as FunctionType).paramTypes.length;
                        for (let i = paramCount - 1; i >= 0; i--) {
                            frame.localVars[i] = lastFrame.oprandStack.pop();
                        }

                        // 设置新的code、curIndex和opCode
                        if (frame.functionSym.byteCode != null) {
                            // 切换到被调用函数的代码
                            code = frame.functionSym.byteCode;
                            // 代码指针归零
                            curIndex = 0;
                            opCode = code[curIndex];
                        }
                        else {
                            console.log("Can not find code for function@" + frame.functionSym.name);
                            return -1;
                        }

                    }
                    continue;
                case OpCode.ireturn:
                case OpCode.return:
                    // 确定返回值
                    let retValue = undefined;
                    if (opCode == OpCode.ireturn) {  // 意思是返回值被压到了栈顶
                        retValue = frame.oprandStack.pop();
                    }

                    // 弹出栈桢，返回到上一级函数，继续执行
                    this.callStack.pop();
                    if (this.callStack.length == 0) { // 主程序返回，结束运行
                        return 0;
                    }
                    else { // 返回到上一级调用者
                        // 第一步 先获取到顶部的栈桢
                        frame = this.callStack[this.callStack.length - 1];

                        if (opCode == OpCode.ireturn) {
                            frame.oprandStack.push(retValue);
                        }

                        // 设置新的code、curIndex和opCode
                        if (frame.functionSym.byteCode != null) {
                            // 切换到调用者的代码
                            code = frame.functionSym.byteCode;
                            // 设置指令指针 为返回地址，也就是调用该函数的下一条指令
                            curIndex = frame.returnIndex;
                            opCode = code[curIndex];
                        }
                        else {
                            console.log("Can not find code for function@" + frame.functionSym.name);
                            return -1;
                        }
                        continue;
                    }
                case OpCode.ifeq:
                    byte1 = code[++curIndex];
                    byte2 = code[++curIndex];
                    if (frame.oprandStack.pop() == 0) {  // ar ？ 这地址计算 估计得和指令生成那里对照着看 现在不怎么清楚
                        curIndex = byte1 << 8 | byte2;
                        opCode = code[curIndex];
                    }
                    else {
                        opCode = code[++curIndex];
                    }
                    continue;
                case OpCode.ifne:
                    byte1 = code[++curIndex];
                    byte2 = code[++curIndex];
                    if (frame.oprandStack.pop() != 0) {
                        curIndex = byte1 << 8 | byte2;
                        opCode = code[curIndex];
                    }
                    else {
                        opCode = code[++curIndex];
                    }
                    continue;
                case OpCode.if_icmplt:
                    byte1 = code[++curIndex];
                    byte2 = code[++curIndex];
                    vright = frame.oprandStack.pop();
                    vleft = frame.oprandStack.pop();
                    if (vleft < vright) {
                        curIndex = byte1 << 8 | byte2;
                        opCode = code[curIndex];
                    }
                    else {
                        opCode = code[++curIndex];
                    }
                    continue;
                case OpCode.if_icmpge:
                    byte1 = code[++curIndex];
                    byte2 = code[++curIndex];
                    vright = frame.oprandStack.pop();
                    vleft = frame.oprandStack.pop();
                    if (vleft >= vright) {
                        curIndex = byte1 << 8 | byte2;
                        opCode = code[curIndex];
                    }
                    else {
                        opCode = code[++curIndex];
                    }
                    continue;
                case OpCode.if_icmpgt:
                    byte1 = code[++curIndex];
                    byte2 = code[++curIndex];
                    vright = frame.oprandStack.pop();
                    vleft = frame.oprandStack.pop();
                    if (vleft > vright) {
                        curIndex = byte1 << 8 | byte2;
                        opCode = code[curIndex];
                    }
                    else {
                        opCode = code[++curIndex];
                    }
                    continue;
                case OpCode.if_icmple:
                    byte1 = code[++curIndex];
                    byte2 = code[++curIndex];
                    vright = frame.oprandStack.pop();
                    vleft = frame.oprandStack.pop();
                    if (vleft <= vright) {
                        curIndex = byte1 << 8 | byte2;
                        opCode = code[curIndex];
                    }
                    else {
                        opCode = code[++curIndex];
                    }
                    continue;
                case OpCode.goto:
                    byte1 = code[++curIndex];
                    byte2 = code[++curIndex];
                    curIndex = byte1 << 8 | byte2;
                    opCode = code[curIndex];
                    continue;

                default:
                    console.log("Unknow op code: " + opCode.toString(16));
                    return -2;
            }
        }
    }


}

/**
 * 字节码生成程序
 */
export class BCGenerator extends AstVisitor {
    // 编译后生成的模型
    m: BCModule;

    // 当前的函数，用于查询本地变量的下标
    // ar 拿到这个就拿到了作用域，所以可以访问到本地变量
    functionSym: FunctionSymbol | null = null;

    // 当前节点是否属于表达式的一部分。主要用于判断一元运算符应该如何生成指令
    // ar ? 哦 对我来说 是陌生的
    inExpression: boolean = false;

    constructor() {
        super();
        this.m = new BCModule();
    }

    /**
     * 主函数
     */
    visitProg(prog: Prog): any {
        this.functionSym = prog.sym;
        if (this.functionSym != null) {
            this.m.consts.push(this.functionSym);   // 将prog符号 加到 代码image 的常量数组里
            this.m._main = this.functionSym;    // 设置代码image的入口函数为 prog符号
            this.functionSym.byteCode = this.visitBlock(prog) as number[];
        }

        return this.m;
    }




    /**
     * 函数声明
     */
    visitFunctionDecl(functionDecl: FunctionDecl) {
        // 1. 设置当前的函数符号，并将符号加到 代码image
        let lastFunctionSym = this.functionSym;
        this.functionSym = functionDecl.sym;

        this.m.consts.push(this.functionSym);

        // 2. 为函数体生成代码
        let code1 = this.visit(functionDecl.callSignature);
        let code2 = this.visit(functionDecl.body);

        this.addOffsetToJumpOp(code2, code1.length);

        if (this.functionSym != null) {
            this.functionSym.byteCode = code1.concat(code2);
        }

        // 3. 恢复当前函数
        this.functionSym = lastFunctionSym;
    }


    /**
     * 遍历一个块，把每个语句产生的代码拼起来 
     */
    visitBlock(block: Block): any {
        let ret: number[] = [];
        for (let x of block.stmts) {
            this.inExpression = false; // 每个语句开始的时候，重置
            let code = this.visit(x);
            if (typeof code == "object") {   // 在visitFunctionDecl的时候，会返回undefined
                this.addOffsetToJumpOp(code, ret.length);
                ret = ret.concat(code);
            }
        }
        return ret;
    }

    /**
     * 如果变量声明时有初始化部分，就要有变量赋值操作
     * @param variableDecl 
     */
    visitVariableDecl(variableDecl: VariableDecl): any {
        let code: number[] = [];
        if (variableDecl.init != null) {
            // 获取初始化部分的Code
            let ret = this.visit(variableDecl.init) as number[];
            code = code.concat(ret);
            // 生成变量赋值的指令
            code = code.concat(this.setVariableValue(variableDecl.sym));
        }
        return code;
    }

    visitReturnStatement(returnStatement: ReturnStatement) {
        let code: number[] = [];
        // 为return后面的表达式生成代码
        if (returnStatement.exp != null) {
            let code1 = this.visit(returnStatement.exp) as number[];
            code = code.concat(code1);
            // 生成ireturn代码
            code.push(OpCode.ireturn);
            return code;
        }
        else {
            // 生成return代码，返回值是void
            code.push(OpCode.return);
            return code;
        }
    }

    visitFunctionCall(functionCall: FunctionCall) {
        let code: number[] = [];
        // 1. 依次生成与参数计算有关的指令，也就是把参数压到计算栈里
        for (let param of functionCall.arguments) {
            let code1 = this.visit(param);
            code = code.concat(code1 as number[])
        }

        // 2. 生成invoke指令
        // ar ? const中符号的索引 就是函数的地址， 这个要看invokestatic 指令是怎么处理函数符号索引的
        let index = this.m.consts.indexOf(functionCall.sym);
        assert(index != -1, "生成字节码时，在模块中查找函数失败");
        code.push(OpCode.invokestatic);
        code.push(index >> 8);
        code.push(index);

        return code;
    }

    /**
     * 为if语句生成字节码
     * 难度 分支语句的跳转地址需要修改
     * ar 我看看。。
     */
    visitIfStatement(ifstmt: IfStatement) {
        let code: number[] = [];

        // ar 这说明inExpression在visit过程中，使用了inExpression——当前节点是否属于表达式的一部分。主要用于判断一元运算符应该如何生成指令
        let code_condition: number[] = this.visit(ifstmt.condition);
        this.inExpression = false;

        let code_ifBlock: number[] = this.visit(ifstmt.stmt);
        this.inExpression = false;

        let code_elseBlock: number[] = (ifstmt.elseStmt == null) ? [] : this.visit(ifstmt.elseStmt);
        this.inExpression = false;

        // ar 看懂常量为什么是3，6，我应该就懂了
        let offset_ifBlock: number = code_condition.length + 3;
        let offset_elseBlock: number = code_condition.length + code_ifBlock.length + 6;
        let offset_nextStmt: number = offset_elseBlock + code_elseBlock.length;

        this.addOffsetToJumpOp(code_ifBlock, offset_ifBlock);
        this.addOffsetToJumpOp(code_elseBlock, offset_elseBlock);

        // 条件
        code = code.concat(code_condition);

        // 跳转：去执行else语句块
        code.push(OpCode.ifeq);
        code.push(offset_elseBlock >> 8);
        code.push(offset_elseBlock);

        // 条件为true时执行的语句
        code = code.concat(code_ifBlock);

        // 跳转：到整个if语句之后的语句
        code.push(OpCode.goto);
        code.push(offset_nextStmt >> 8);
        code.push(offset_nextStmt);

        // 条件为false时执行的语句
        code = code.concat(code_elseBlock);

        return code;
    }


    visitForStatement(forStmt: ForStatement) {
        let code: number[] = [];
        let code_init: number[] = (forStmt.init == null) ? [] : this.visit(forStmt.init);
        this.inExpression = false;

        let code_condition: number[] = (forStmt.condition == null) ? [] : this.visit(forStmt.condition);
        this.inExpression = false;

        let code_increment: number[] = (forStmt.increment == null) ? [] : this.visit(forStmt.increment);
        this.inExpression = false;

        let code_stmt: number[] = (forStmt.stmt == null) ? [] : this.visit(forStmt.stmt);
        this.inExpression = false;

        let offset_condition = code_init.length;
        let offset_stmt = offset_condition + code_condition.length + (code_condition.length > 0 ? 3 : 0);
        let offset_increment = offset_stmt + code_stmt.length;
        let offset_nextStmt = offset_increment + code_increment.length + 3;

        this.addOffsetToJumpOp(code_condition, offset_condition);
        this.addOffsetToJumpOp(code_increment, offset_increment);
        this.addOffsetToJumpOp(code_stmt, offset_stmt);

        // 初始化部分
        code = code.concat(code_init);

        // 循环条件
        if (code_condition.length > 0) { // 如果循环条件为空，直接往下走
            code = code.concat(code_condition);
            // 根据条件的值跳转
            code.push(OpCode.ifeq);
            code.push(offset_nextStmt >> 8);
            code.push(offset_nextStmt);
        }

        // 循环体
        code = code.concat(code_stmt);

        // 递增的部分
        code = code.concat(code_increment);

        // 跳转回循环条件
        code.push(OpCode.goto);
        code.push(offset_condition >> 8);
        code.push(offset_condition);

        return code;
    }

    /**
     * 在跳转地址上添加偏移量
     * code是新生成的代码
     * offset是当前block中以加入code的代码的长度？这个offset也不一定会用上，发生了跳转才用？
     */
    private addOffsetToJumpOp(code: number[], offset: number = 0): number[] {
        if (offset == 0) return code;

        let codeIndex = 0;
        let dealCode = 0;
        while (codeIndex < code.length) {
            dealCode = code[codeIndex];
            console.log(Debug(dealCode));
            switch (code[codeIndex]) {
                // 纯指令，后面不带操作数
                case OpCode.iadd:
                case OpCode.sadd:
                case OpCode.isub:
                case OpCode.imul:
                case OpCode.idiv:
                case OpCode.iconst_0:
                case OpCode.iconst_1:
                case OpCode.iconst_2:
                case OpCode.iconst_3:
                case OpCode.iconst_4:
                case OpCode.iconst_5:
                case OpCode.istore_0:
                case OpCode.istore_1:
                case OpCode.istore_2:
                case OpCode.istore_3:
                case OpCode.iload_0:
                case OpCode.iload_1:
                case OpCode.iload_2:
                case OpCode.iload_3:
                case OpCode.ireturn:
                case OpCode.return:
                case OpCode.lcmp:
                    codeIndex++;
                    continue;

                // 指令后面带1个字节的操作数
                case OpCode.iload:
                case OpCode.istore:
                case OpCode.bipush:
                case OpCode.ldc:
                case OpCode.sldc:
                    codeIndex += 2;
                    continue;

                // 指令后面带2个字节的操作数
                case OpCode.iinc:
                case OpCode.invokestatic:
                case OpCode.sipush:
                    codeIndex += 3;
                    continue;

                // 跳转语句，需要给跳转指令加上offset
                case OpCode.if_icmpeq:
                case OpCode.if_icmpne:
                case OpCode.if_icmpge:
                case OpCode.if_icmpgt:
                case OpCode.if_icmple:
                case OpCode.if_icmplt:
                case OpCode.ifeq:
                case OpCode.ifne:
                case OpCode.ifge:
                case OpCode.ifgt:
                case OpCode.ifle:
                case OpCode.iflt:
                case OpCode.goto:
                    // 这些指令后面紧跟着的是[两个字节大小的地址]
                    let byte1 = code[codeIndex + 1];
                    let byte2 = code[codeIndex + 2];
                    // 在原来地址的基础上 加个offset，再存储到code里
                    let address = byte1 << 8 | byte2 + offset;
                    code[codeIndex + 1] = address >> 8;
                    code[codeIndex + 2] = address;
                    codeIndex += 3;
                    continue;

                default:
                    console.log("unrecognized Op Code in addOffsetToJumpOp: " + OpCode[code[codeIndex]]);
                    return code;

            }
        }
        return code;
    }

    /**
     * 生成获取本地变量值的指令
     * @param sym 
     */
    private getVariableValue(sym: VarSymbol | null): any {
        let code: number[] = [];
        if (sym != null) {
            // 本地变量的下标
            let index = this.functionSym?.vars.indexOf(sym);
            assert(index != -1, "生成字节码时（获取变量的值），在函数符号中获取本地变量下标失败！");
            // 根据不同的下标生成指令，尽量生成压缩指令
            switch (index) {
                case 0:
                    code.push(OpCode.iload_0);
                    break;
                case 1:
                    code.push(OpCode.iload_1);
                    break;
                case 2:
                    code.push(OpCode.iload_2);
                    break;
                case 3:
                    code.push(OpCode.iload_3);
                    break;
                default:
                    code.push(OpCode.iload);
                    code.push(index as number);
            }
        }
        return code;
    }

    private setVariableValue(sym: VarSymbol | null): any {
        let code: number[] = [];
        if (sym != null) {
            let index = this.functionSym?.vars.indexOf(sym);
            assert(index != -1, "生成字节码时（设置变量值），在函数符号中查找变量失败！");
            switch (index) {
                case 0:
                    code.push(OpCode.istore_0);
                    break;
                case 1:
                    code.push(OpCode.istore_1);
                    break;
                case 2:
                    code.push(OpCode.istore_2);
                    break;
                case 3:
                    code.push(OpCode.istore_3);
                    break;
                default:
                    code.push(OpCode.istore);
                    code.push(index as number);
            }
        }
        return code;
    }

    visitBinary(bi: Binary): any {
        this.inExpression = true;

        let code: number[];
        let code1 = this.visit(bi.exp1);
        let code2 = this.visit(bi.exp2);

        let address1: number = 0;
        let address2: number = 0;
        let tempCode: number = 0;

        // 1.处理赋值
        if (bi.op == Op.Assign) {
            let VarSymbol = code1 as VarSymbol;
            console.log("varSymbol:");
            console.log(VarSymbol);
            // 加入右子树的代码
            code = code2;
            // 加入istore代码
            code = code.concat(this.setVariableValue(VarSymbol));

        }

        // 2.处理其他二元运算
        else {
            // 加入左子树的代码
            code = code1;
            // 加入右子树的代码
            code = code.concat(code2);
            // 加入运算符的代码
            switch (bi.op) {
                case Op.Plus:
                    if (bi.theType == SysTypes.String) {
                        code.push(OpCode.sadd);
                    }
                    else {
                        code.push(OpCode.iadd);
                    }
                    break;
                case Op.Minus:
                    code.push(OpCode.isub);
                    break;
                case Op.Multiply:
                    code.push(OpCode.imul);
                    break;
                case Op.Divide:
                    code.push(OpCode.idiv);
                    break;
                case Op.G:  // '>'
                case Op.GE: // '>='
                case Op.L:  // '<'
                case Op.LE: // '<='
                case Op.EQ: // '=='
                case Op.NE: // '!='
                    if (bi.op == Op.G) {
                        tempCode = OpCode.if_icmple;
                    }
                    else if (bi.op == Op.GE) {
                        tempCode = OpCode.if_icmplt;
                    }
                    else if (bi.op == Op.L) {
                        tempCode = OpCode.if_icmpge;
                    }
                    else if (bi.op == Op.LE) {
                        tempCode = OpCode.if_icmpgt;
                    }
                    else if (bi.op == Op.EQ) {
                        tempCode = OpCode.if_icmpne;
                    }
                    else if (bi.op == Op.NE) {
                        tempCode = OpCode.if_icmpeq;
                    }

                    address1 = code.length + 7;
                    address2 = address1 + 1;

                    code.push(tempCode);
                    code.push(address1>>8);
                    code.push(address1);

                    // ar 这里的iconst_1 是用来干什么的 添加常数1？ 是的，添加立即数1
                    code.push(OpCode.iconst_1);
                    code.push(OpCode.goto);
                    code.push(address2>>8);
                    code.push(address2);
                    code.push(OpCode.iconst_0);
                    break;
                default:
                    console.log("Unsupported binary operation: " + bi.op);
                    return [];
            }
        }
        return code;
    }

    visitUnary(u: Unary): any {
        let code:number[] = [];
        let v = this.visit(u.exp);
        let varSymbol:VarSymbol;
        let varIndex:number;

        if (u.op == Op.Inc) {
            varSymbol = v as VarSymbol;
            varIndex = this.functionSym?.vars.indexOf(varSymbol) as number;
            if (u.isPrefix) {
                code.push(OpCode.iinc);
                code.push(varIndex);
                code.push(1);
                if (this.inExpression) {
                    code = code.concat(this.getVariableValue(varSymbol));
                }
            }
            else {
                if (this.inExpression) {
                    code = code.concat(this.getVariableValue(varSymbol));
                }
                code.push(OpCode.iinc);
                code.push(varIndex);
                code.push(1);
            }
        }
        else if (u.op == Op.Dec) {
            varSymbol = v as VarSymbol;
            varIndex = this.functionSym?.vars.indexOf(varSymbol) as number;
            if (u.isPrefix) {
                code.push(OpCode.iinc);
                code.push(varIndex);
                code.push(-1);
                if (this.inExpression) {
                    code = code.concat(this.getVariableValue(varSymbol));
                }
            }
            else {
                if (this.inExpression){
                    code = code.concat(this.getVariableValue(varSymbol));
                }
                code.push(OpCode.iinc);
                code.push(varIndex);
                code.push(-1);
            }
        }
        else {
            console.log("Unsupported unary oprator :" + u.op);
        }
        return code;
    }

    /**
     * 如果是左值，就返回符号。否则，生成iload指令
     */
    visitVariable(v: Variable): any {
        if (v.isLeftValue) {
            return v.sym;
        }
        else {
            return this.getVariableValue(v.sym);
        }
    }

    /**
     * 生成数值入栈的指令
     */
    visitIntegerLiteral(intergerLiteral: IntegerLiteral) {
        let ret: number[] = [];
        let value = intergerLiteral.value;
        if (value >= 0 && value <= 5) {
            switch (value) {
                case 0:
                    ret.push(OpCode.iconst_0);
                    break;
                case 1:
                    ret.push(OpCode.iconst_1);
                    break;
                case 2:
                    ret.push(OpCode.iconst_2);
                    break;
                case 3:
                    ret.push(OpCode.iconst_3);
                    break;
                case 4:
                    ret.push(OpCode.iconst_4);
                    break;
                case 5:
                    ret.push(OpCode.iconst_5);
                    break;
            }
        }

        // 如果是8位整数，用bipush指令，直接放在后面的一个字节的操作数里就行了了
        else if (value >= -128 && value < 128) {
            ret.push(OpCode.bipush);
            ret.push(value);
        }

        else if (value >= -32768 && value < 32768) {
            ret.push(OpCode.sipush);
            ret.push(value >> 8);
            ret.push(value & 0x00ff);
        }

        // 大于16位的，采用ldc指令，从常量池中去取
        else {
            ret.push(OpCode.ldc);
            // 把 value 值放入常量池
            this.m.consts.push(value);
            ret.push(this.m.consts.length - 1);
        }
        return ret;
    }

    /**
     * 生成字符串入栈的指令
     */
    visitStringLiteral(stringLiteral: StringLiteral) {
        let ret: number[] = [];
        let value = stringLiteral.value;
        this.m.consts.push(value);
        ret.push(OpCode.sldc);
        ret.push(this.m.consts.length - 1);
        return ret;
    }

}


/**
 * 从BCModule生成字节码
 */
export class BCModuleWriter {
    private types:Type[] = [];

    write(bcModule:BCModule):number[]{
        let bc2:number[] = [];
        this.types = [];

        // 写入常量
        let numConst = 0;
        for(let c of bcModule.consts) {
            if (typeof c == 'number') {
                bc2.push(1);    // 代表接下来是一个number
                bc2.push(c);
                numConst++;
            }
            else if (typeof c == 'string') {
                bc2.push(2);    // 代表接下来是一个string
                this.writeString(bc2, c);
                numConst++;
            }
            else if (typeof c == 'object') {
                let functionSym = c as FunctionSymbol;
                if (!built_ins.has(functionSym.name)){
                    bc2.push(3);    // 代表接下来是一个FunctionSymbol
                    bc2 = bc2.concat(this.writeFunctionSymbol(functionSym));
                    numConst++;
                }
            }
            else {
                console.log("Unsupported const in BCModuleWriter.");
                console.log(c);
            }
        }

        // 写入类型
        let bc1:number[] = [];
        this.writeString(bc1, "types");
        bc1.push(this.types.length);
        for (let t of this.types) {
            if (Type.isFunctionType(t)) {
                bc1 = bc1.concat(this.writeFunctionType(t as FunctionType))
            }
            else if (Type.isSimpleType(t)) {
                bc1 = bc1.concat(this.writeSimpleType(t as SimpleType));
            }
            else if (Type.isUnionType(t)) {
                bc1 = bc1.concat(this.writeUnionType(t as UnionType));
            }
            else {
                console.log("Unsupported type in BCModuleWriter");
                console.log(t);
            }
        }

        this.writeString(bc1, "consts");
        bc1.push(numConst);

        return bc1.concat(bc2);
    }

    private writeVarSymbol(sym:VarSymbol):number[]{
        let bc:number[] = [];

        // 写入类型名称
        this.writeString(bc, sym.name);

        // 写入类型名称
        this.writeString(bc, sym.theType.name);
        if (!SysTypes.isSysType(sym.theType) && this.types.indexOf(sym.theType) == -1) {
            this.types.push(sym.theType);
        }

        return bc;
    }

    writeFunctionSymbol(sym:FunctionSymbol):number[]{
        let bc:number[] = [];

        // 写入函数名称
        this.writeString(bc, sym.name);

        // 写入类型名称
        this.writeString(bc, sym.theType.name);
        if (!SysTypes.isSysType(sym.theType) && this.types.indexOf(sym.theType) == -1) {
            this.types.push(sym.theType);
        }

        // 写入操作数栈最大的大小
        bc.push(sym.opStackSize);

        // 写入本地变量个数
        bc.push(sym.vars.length);

        for (let v of sym.vars) {
            bc = bc.concat(this.writeVarSymbol(v));
        }

        // 写入函数函数体的字节码
        if(sym.byteCode == null) { // 内置函数
            bc.push(0);
        }
        else {
            bc.push((sym.byteCode as number[]).length);
            bc = bc.concat(sym.byteCode as number[]);
        }

        return bc;
    }

    writeSimpleType(t:SimpleType):number[]{
        let bc:number[] = [];
        if (SysTypes.isSysType(t)) { // 内置类型不用添加
            return bc;
        }

        bc.push(1); // 代表SimpleType

        // 写入类型名称
        this.writeString(bc, t.name);

        // 写入父类型的数量
        bc.push(t.upperTypes.length);
        for (let ut of t.upperTypes) {
            this.writeString(bc, ut.name);
            if (!SysTypes.isSysType(ut) && this.types.indexOf(ut) == -1) {
                this.types.push(ut);
            }
        }

        return bc;
    }

    writeFunctionType(t:FunctionType):number[]{
        let bc:number[] = [];

        bc.push(2); // 代表FunctionType

        // 写入类型名称
        this.writeString(bc, t.name);

        // 写入返回值民称
        this.writeString(bc, t.returnType.name);

        // 写入参数数量
        bc.push(t.paramTypes.length);

        // 写入参数的类型名称
        for (let pt of t.paramTypes) {
            this.writeString(bc, pt.name);
            if (this.types.indexOf(pt) == -1) {
                this.types.push(pt);
            }
        }

        return bc;
    }

    writeUnionType(t:UnionType):number[]{
        let bc:number[] = [];

        bc.push(3); // 代表UnionType

        // 写入类型名称
        this.writeString(bc, t.name);

        // 写入联合的各类型名称
        for (let ut of t.types) {
            this.writeString(bc, ut.name);
            if (this.types.indexOf(ut) == -1) {
                this.types.push(ut);
            }
        }

        return bc;
    }

    private writeString(bc:number[], str:string) {
        // 写入字符串的长度
        bc.push(str.length);
        for (let i = 0; i < str.length; i++) {
            bc.push(str.charCodeAt(i))
        }
    }
}

/**
 * 从字节码生成BCModule
 */
export class BCModuleReader {
    // 读取字节码时的下标
    private index:number = 0;

    // 解析出来的所有类型
    private types:Map<string, Type> = new Map();

    private typeInfos:Map<string, any> = new Map();

    /**
     * 从字节码生成BCModule
     * @param bc 
     */
    read(bc:number[]):BCModule{
        // 重置状态变量
        this.index = 0;
        this.types.clear();

        let bcModule = new BCModule();

        // 1.读取类型
        // 1.1加入系统内置类型
        this.addSystemTypes();

        // 1.2从字节码中读取类型
        let str = this.readString(bc);
        assert(str == "types", "从字节码中读取的字符串不是'types'");
        let numTypes = bc[this.index++];
        for (let i = 0; i < numTypes; i++){
            let typeKind = bc[this.index++];
            switch(typeKind){
                case 1:
                    this.readSimpleType(bc);
                    break;
                case 2:
                    this.readFunctionType(bc);
                    break;
                case 3:
                    this.readUnionType(bc);
                    break;
                default:
                    console.log("Unsupported type kind: " + typeKind);
            }
        }
        this.buildTypes();

        // 2.读取常量
        str = this.readString(bc);
        assert(str == "consts", "从字节码中读取的字符串不是'consts'");
        let numConsts = bc[this.index++];
        for (let i = 0; i < numConsts; i++){
            let constType = bc[this.index++];
            if (constType == 1){
                bcModule.consts.push(bc[this.index++]);
            }
            else if (constType == 2){
                let str = this.readString(bc);
                bcModule.consts.push(str);
            }
            else if (constType == 3){
                let functionSym = this.readFunctionSymbol(bc);
                bcModule.consts.push(functionSym);
                if (functionSym.name == "main"){
                    bcModule._main = functionSym;
                }
            }
            else {
                console.log("Unsupported const type: " + constType);
            }
        }

        return bcModule;
    }

    private readString(bc:number[]):string{
        let len = bc[this.index++];
        let str = "";
        for (let i = 0; i < len; i++) {
            str += String.fromCharCode(bc[this.index++]);
        }
        return str;
    }

    private readSimpleType(bc:number[]){
        let typeName = this.readString(bc);
        let numUpperTypes = bc[this.index++];
        let upperTypes:string[] = [];
        for (let i = 0; i < numUpperTypes; i++) {
            upperTypes.push(this.readString(bc));
        }

        let t = new SimpleType(typeName, []);
        this.types.set(typeName, t);
        this.typeInfos.set(typeName, upperTypes);
    }

    private readFunctionType(bc:number[]){
        let typeName = this.readString(bc);
        let returnType = this.readString(bc);
        let numParams = bc[this.index++];
        let paramTypes:string[] = [];
        for (let i = 0; i < numParams; i++) {
            paramTypes.push(this.readString(bc));
        }

        let t = new FunctionType(SysTypes.Any, [], typeName);
        this.types.set(typeName, t);
        this.typeInfos.set(typeName, {returnType: returnType, paramTypes: paramTypes});
    }

    private readUnionType(bc:number[]){
        let typeName = this.readString(bc);
        let numTypes = bc[this.index++];
        let unionTypes:string[] = [];
        for (let i = 0; i < numTypes; i++) {
            unionTypes.push(this.readString(bc));
        }

        let t = new UnionType([], typeName);
        this.types.set(typeName, t);
        this.typeInfos.set(typeName, unionTypes);
    }

    private addSystemTypes(){
        this.types.set('any', SysTypes.Any);
        this.types.set('number', SysTypes.Number);
        this.types.set('string', SysTypes.String);
        this.types.set('integer', SysTypes.Integer);
        this.types.set('decimal', SysTypes.Decimal);
        this.types.set('boolean', SysTypes.Boolean);
        this.types.set('null', SysTypes.Null);
        this.types.set('undefined', SysTypes.Undefined);
        this.types.set('void', SysTypes.Void);
    }

    /**
     * 生成类型，并建立类型之间正确的引用关系
     */
    private buildTypes(){
        for(let typeName of this.typeInfos.keys()){
            let t = this.types.get(typeName) as Type;
            if (Type.isSimpleType(t)){
                let simpleType = t as SimpleType;
                let upperTypes = this.typeInfos.get(typeName) as string[];
                for (let utName of upperTypes){
                    let ut = this.types.get(utName) as Type;
                    simpleType.upperTypes.push(ut);
                }
            }
            else if (Type.isFunctionType(t)){
                let functionType = t as FunctionType;
                let returnType = this.typeInfos.get(typeName).returnType as string;
                let paramTypes = this.typeInfos.get(typeName).paramTypes as string[];
                functionType.returnType = this.types.get(returnType) as Type;
                for (let utName of paramTypes) {
                    let ut = this.types.get(utName) as Type;
                    functionType.paramTypes.push(ut);
                }
            }
            else if (Type.isUnionType(t)) {
                let unionType = t as UnionType;
                let types = this.typeInfos.get(typeName) as string[];
                for (let utName of types) {
                    let ut = this.types.get(utName) as Type;
                    unionType.types.push(ut);
                }
            }
            else {
                console.log("Unsupported type in BCModuleReader.");
                console.log(t);
            }
        }

        this.typeInfos.clear();
    }

    /**
     * 从字节码中读取FunctionSymbol
     * @param bc 
     */
    private readFunctionSymbol(bc:number[]):FunctionSymbol{
        let functionName = this.readString(bc);

        // 读取类型名称
        let typeName = this.readString(bc);
        let functionType = this.types.get(typeName) as FunctionType;

        // 操作数栈的大小
        let opStackSize = bc[this.index++];

        // 变量个数
        let numVars = bc[this.index++];

        // 读取变量
        let vars:VarSymbol[] = [];
        for (let i:number = 0; i < numVars; i++) {
            vars.push(this.readVarSymbol(bc));
        }

        // 读取函数体的字节码
        let numByteCodes = bc[this.index++];
        let byteCodes:number[]|null;
        if (numByteCodes == 0) {
            byteCodes = null;
        }
        else {
            byteCodes = bc.slice(this.index, this.index + numByteCodes);
            this.index += numByteCodes;
        }

        // 创建函数符号
        let functionSym = new FunctionSymbol(functionName, functionType);
        functionSym.vars = vars;
        functionSym.opStackSize = opStackSize;
        functionSym.byteCode = byteCodes;

        return functionSym;
    }

    private readVarSymbol(bc:number[]):VarSymbol{
        // 变量名称
        let varName = this.readString(bc);

        // 类型名称
        let typeName = this.readString(bc);
        let varType = this.types.get(typeName) as Type;

        return new VarSymbol(varName, varType);
    }

}