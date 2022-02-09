"use strict";
/**
 * 虚拟机
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
exports.BCModuleReader = exports.BCModuleWriter = exports.BCGenerator = exports.VM = exports.BCModuleDumper = exports.BCModule = void 0;
var console_1 = require("console");
var ast_1 = require("./ast");
var scanner_1 = require("./scanner");
var symbol_1 = require("./symbol");
var types_1 = require("./types");
var OpCode;
(function (OpCode) {
    // 参考JVM
    // Contants
    OpCode[OpCode["iconst_0"] = 3] = "iconst_0";
    OpCode[OpCode["iconst_1"] = 4] = "iconst_1";
    OpCode[OpCode["iconst_2"] = 5] = "iconst_2";
    OpCode[OpCode["iconst_3"] = 6] = "iconst_3";
    OpCode[OpCode["iconst_4"] = 7] = "iconst_4";
    OpCode[OpCode["iconst_5"] = 8] = "iconst_5";
    OpCode[OpCode["bipush"] = 16] = "bipush";
    OpCode[OpCode["sipush"] = 17] = "sipush";
    OpCode[OpCode["ldc"] = 18] = "ldc";
    // Loads
    OpCode[OpCode["iload"] = 21] = "iload";
    OpCode[OpCode["iload_0"] = 26] = "iload_0";
    OpCode[OpCode["iload_1"] = 27] = "iload_1";
    OpCode[OpCode["iload_2"] = 28] = "iload_2";
    OpCode[OpCode["iload_3"] = 29] = "iload_3";
    // Store
    OpCode[OpCode["istore"] = 54] = "istore";
    OpCode[OpCode["istore_0"] = 59] = "istore_0";
    OpCode[OpCode["istore_1"] = 60] = "istore_1";
    OpCode[OpCode["istore_2"] = 61] = "istore_2";
    OpCode[OpCode["istore_3"] = 62] = "istore_3";
    // Math
    OpCode[OpCode["iadd"] = 96] = "iadd";
    OpCode[OpCode["isub"] = 100] = "isub";
    OpCode[OpCode["imul"] = 104] = "imul";
    OpCode[OpCode["idiv"] = 108] = "idiv";
    OpCode[OpCode["iinc"] = 132] = "iinc";
    // Comparisons
    OpCode[OpCode["lcmp"] = 148] = "lcmp";
    OpCode[OpCode["ifeq"] = 153] = "ifeq";
    OpCode[OpCode["ifne"] = 154] = "ifne";
    OpCode[OpCode["iflt"] = 155] = "iflt";
    OpCode[OpCode["ifge"] = 156] = "ifge";
    OpCode[OpCode["ifgt"] = 157] = "ifgt";
    OpCode[OpCode["ifle"] = 158] = "ifle";
    OpCode[OpCode["if_icmpeq"] = 159] = "if_icmpeq";
    OpCode[OpCode["if_icmpne"] = 160] = "if_icmpne";
    OpCode[OpCode["if_icmplt"] = 161] = "if_icmplt";
    OpCode[OpCode["if_icmpge"] = 162] = "if_icmpge";
    OpCode[OpCode["if_icmpgt"] = 163] = "if_icmpgt";
    OpCode[OpCode["if_icmple"] = 164] = "if_icmple";
    // Control
    OpCode[OpCode["goto"] = 167] = "goto";
    OpCode[OpCode["ireturn"] = 172] = "ireturn";
    OpCode[OpCode["return"] = 177] = "return";
    // References
    OpCode[OpCode["invokestatic"] = 184] = "invokestatic";
    OpCode[OpCode["sadd"] = 97] = "sadd";
    OpCode[OpCode["sldc"] = 19] = "sldc";
})(OpCode || (OpCode = {}));
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
var OpCodeStr = new Map([
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
    [OpCode["return"], "return"],
    [OpCode.invokestatic, "invokestatic"],
    [OpCode.sadd, "sadd"],
    [OpCode.sldc, "sldc"]
]);
function Debug(key) {
    var val = OpCodeStr.get(key);
    if (val == undefined) {
        return key;
    }
    else {
        return val;
    }
}
/**
 * 字节码模块 image
 */
var BCModule = /** @class */ (function () {
    function BCModule() {
        var e_1, _a;
        // 常量
        this.consts = [];
        // 入口函数
        this._main = null;
        try {
            // 初始化系统函数
            for (var _b = __values(symbol_1.built_ins.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var fun = _c.value;
                this.consts.push(fun);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    return BCModule;
}());
exports.BCModule = BCModule;
/**
 * 打印调试信息
 */
var BCModuleDumper = /** @class */ (function () {
    function BCModuleDumper() {
    }
    BCModuleDumper.prototype.dump = function (bcModule) {
        var e_2, _a;
        var symbolDumper = new symbol_1.SymbolDumper();
        try {
            for (var _b = __values(bcModule.consts), _c = _b.next(); !_c.done; _c = _b.next()) {
                var x = _c.value;
                if (typeof x == 'number') {
                    console.log("Number: " + x);
                }
                else if (typeof x == 'string') {
                    console.log("String: " + x);
                }
                else if (typeof x.kind == 'number') {
                    symbolDumper.visit(x, "");
                }
                else {
                    console.log("unknown const:");
                    console.log(x);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    return BCModuleDumper;
}());
exports.BCModuleDumper = BCModuleDumper;
/**
 * 栈桢
 */
var StackFrame = /** @class */ (function () {
    function StackFrame(functionSym) {
        // 返回地址
        this.returnIndex = 0;
        // 操作数栈
        this.oprandStack = [];
        this.functionSym = functionSym;
        this.localVars = new Array(functionSym.vars.length);
    }
    return StackFrame;
}());
/**
 * 虚拟机
 */
var VM = /** @class */ (function () {
    function VM() {
        this.callStack = [];
    }
    VM.prototype.execute = function (bcModule) {
        // 寻找入口函数
        var functionSym;
        if (bcModule._main == null) {
            console.log("Can not find main function.");
            return -1;
        }
        else {
            functionSym = bcModule._main;
        }
        // 初始化栈桢
        var frame = new StackFrame(functionSym);
        this.callStack.push(frame);
        // 当前运行的代码
        var code = [];
        if (functionSym.byteCode != null) {
            code = functionSym.byteCode;
        }
        else {
            console.log("Can not find code for function@" + frame.functionSym.name);
            return -1;
        }
        // 当前代码的位置
        var curIndex = 0;
        // 获取第一个代码
        var opCode = code[curIndex];
        var byte1 = 0;
        var byte2 = 0;
        var constIndex = 0;
        var numValue = 0;
        var strValue = "";
        var vleft;
        var vright;
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
                case OpCode.ldc: // 从常量池加载
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
                case OpCode.iinc: // 给某个变量加个offset
                    var varIndex = code[++curIndex];
                    var offset = code[++curIndex];
                    frame.localVars[varIndex] = frame.localVars[varIndex] + offset;
                    opCode = code[++curIndex];
                    continue;
                case OpCode.invokestatic:
                    // 从常量池找到被调用的函数 前面两个字节是函数符号
                    byte1 = code[++curIndex];
                    byte2 = code[++curIndex];
                    var functionSym_1 = bcModule.consts[byte1 << 8 | byte2];
                    // 对于内置函数特殊处理
                    if (functionSym_1.name == 'println') {
                        // 取出一个参数
                        // ar ? 这固定一个参数？
                        var param = frame.oprandStack.pop();
                        opCode = code[++curIndex];
                        console.log(param);
                    }
                    else if (functionSym_1.name == 'tick') {
                        opCode = code[++curIndex];
                        var date = new Date();
                        var value = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
                        frame.oprandStack.push(value);
                    }
                    else if (functionSym_1.name == 'integer_to_string') {
                        opCode = code[++curIndex];
                        numValue = frame.oprandStack.pop();
                        frame.oprandStack.push(numValue.toString());
                    }
                    else {
                        // 设置返回地址，值为函数调用的下一跳指令
                        frame.returnIndex = curIndex + 1;
                        // 创建新的栈桢 为函数调用做准备
                        var lastFrame = frame;
                        frame = new StackFrame(functionSym_1);
                        this.callStack.push(frame);
                        // 传递参数
                        var paramCount = functionSym_1.theType.paramTypes.length;
                        for (var i = paramCount - 1; i >= 0; i--) {
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
                case OpCode["return"]:
                    // 确定返回值
                    var retValue = undefined;
                    if (opCode == OpCode.ireturn) { // 意思是返回值被压到了栈顶
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
                    if (frame.oprandStack.pop() == 0) { // ar ？ 这地址计算 估计得和指令生成那里对照着看 现在不怎么清楚
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
    };
    return VM;
}());
exports.VM = VM;
/**
 * 字节码生成程序
 */
var BCGenerator = /** @class */ (function (_super) {
    __extends(BCGenerator, _super);
    function BCGenerator() {
        var _this = _super.call(this) || this;
        // 当前的函数，用于查询本地变量的下标
        // ar 拿到这个就拿到了作用域，所以可以访问到本地变量
        _this.functionSym = null;
        // 当前节点是否属于表达式的一部分。主要用于判断一元运算符应该如何生成指令
        // ar ? 哦 对我来说 是陌生的
        _this.inExpression = false;
        _this.m = new BCModule();
        return _this;
    }
    /**
     * 主函数
     */
    BCGenerator.prototype.visitProg = function (prog) {
        this.functionSym = prog.sym;
        if (this.functionSym != null) {
            this.m.consts.push(this.functionSym); // 将prog符号 加到 代码image 的常量数组里
            this.m._main = this.functionSym; // 设置代码image的入口函数为 prog符号
            this.functionSym.byteCode = this.visitBlock(prog);
        }
        return this.m;
    };
    /**
     * 函数声明
     */
    BCGenerator.prototype.visitFunctionDecl = function (functionDecl) {
        // 1. 设置当前的函数符号，并将符号加到 代码image
        var lastFunctionSym = this.functionSym;
        this.functionSym = functionDecl.sym;
        this.m.consts.push(this.functionSym);
        // 2. 为函数体生成代码
        var code1 = this.visit(functionDecl.callSignature);
        var code2 = this.visit(functionDecl.body);
        this.addOffsetToJumpOp(code2, code1.length);
        if (this.functionSym != null) {
            this.functionSym.byteCode = code1.concat(code2);
        }
        // 3. 恢复当前函数
        this.functionSym = lastFunctionSym;
    };
    /**
     * 遍历一个块，把每个语句产生的代码拼起来
     */
    BCGenerator.prototype.visitBlock = function (block) {
        var e_3, _a;
        var ret = [];
        try {
            for (var _b = __values(block.stmts), _c = _b.next(); !_c.done; _c = _b.next()) {
                var x = _c.value;
                this.inExpression = false; // 每个语句开始的时候，重置
                var code = this.visit(x);
                if (typeof code == "object") { // 在visitFunctionDecl的时候，会返回undefined
                    this.addOffsetToJumpOp(code, ret.length);
                    ret = ret.concat(code);
                }
            }
        }
        catch (e_3_1) { e_3 = { error: e_3_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_3) throw e_3.error; }
        }
        return ret;
    };
    /**
     * 如果变量声明时有初始化部分，就要有变量赋值操作
     * @param variableDecl
     */
    BCGenerator.prototype.visitVariableDecl = function (variableDecl) {
        var code = [];
        if (variableDecl.init != null) {
            // 获取初始化部分的Code
            var ret = this.visit(variableDecl.init);
            code = code.concat(ret);
            // 生成变量赋值的指令
            code = code.concat(this.setVariableValue(variableDecl.sym));
        }
        return code;
    };
    BCGenerator.prototype.visitReturnStatement = function (returnStatement) {
        var code = [];
        // 为return后面的表达式生成代码
        if (returnStatement.exp != null) {
            var code1 = this.visit(returnStatement.exp);
            code = code.concat(code1);
            // 生成ireturn代码
            code.push(OpCode.ireturn);
            return code;
        }
        else {
            // 生成return代码，返回值是void
            code.push(OpCode["return"]);
            return code;
        }
    };
    BCGenerator.prototype.visitFunctionCall = function (functionCall) {
        var e_4, _a;
        var code = [];
        try {
            // 1. 依次生成与参数计算有关的指令，也就是把参数压到计算栈里
            for (var _b = __values(functionCall.arguments), _c = _b.next(); !_c.done; _c = _b.next()) {
                var param = _c.value;
                var code1 = this.visit(param);
                code = code.concat(code1);
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
        // 2. 生成invoke指令
        // ar ? const中符号的索引 就是函数的地址， 这个要看invokestatic 指令是怎么处理函数符号索引的
        var index = this.m.consts.indexOf(functionCall.sym);
        console_1.assert(index != -1, "生成字节码时，在模块中查找函数失败");
        code.push(OpCode.invokestatic);
        code.push(index >> 8);
        code.push(index);
        return code;
    };
    /**
     * 为if语句生成字节码
     * 难度 分支语句的跳转地址需要修改
     * ar 我看看。。
     */
    BCGenerator.prototype.visitIfStatement = function (ifstmt) {
        var code = [];
        // ar 这说明inExpression在visit过程中，使用了inExpression——当前节点是否属于表达式的一部分。主要用于判断一元运算符应该如何生成指令
        var code_condition = this.visit(ifstmt.condition);
        this.inExpression = false;
        var code_ifBlock = this.visit(ifstmt.stmt);
        this.inExpression = false;
        var code_elseBlock = (ifstmt.elseStmt == null) ? [] : this.visit(ifstmt.elseStmt);
        this.inExpression = false;
        // ar 看懂常量为什么是3，6，我应该就懂了
        var offset_ifBlock = code_condition.length + 3;
        var offset_elseBlock = code_condition.length + code_ifBlock.length + 6;
        var offset_nextStmt = offset_elseBlock + code_elseBlock.length;
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
    };
    BCGenerator.prototype.visitForStatement = function (forStmt) {
        var code = [];
        var code_init = (forStmt.init == null) ? [] : this.visit(forStmt.init);
        this.inExpression = false;
        var code_condition = (forStmt.condition == null) ? [] : this.visit(forStmt.condition);
        this.inExpression = false;
        var code_increment = (forStmt.increment == null) ? [] : this.visit(forStmt.increment);
        this.inExpression = false;
        var code_stmt = (forStmt.stmt == null) ? [] : this.visit(forStmt.stmt);
        this.inExpression = false;
        var offset_condition = code_init.length;
        var offset_stmt = offset_condition + code_condition.length + (code_condition.length > 0 ? 3 : 0);
        var offset_increment = offset_stmt + code_stmt.length;
        var offset_nextStmt = offset_increment + code_increment.length + 3;
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
    };
    /**
     * 在跳转地址上添加偏移量
     * code是新生成的代码
     * offset是当前block中以加入code的代码的长度？这个offset也不一定会用上，发生了跳转才用？
     */
    BCGenerator.prototype.addOffsetToJumpOp = function (code, offset) {
        if (offset === void 0) { offset = 0; }
        if (offset == 0)
            return code;
        var codeIndex = 0;
        var dealCode = 0;
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
                case OpCode["return"]:
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
                    var byte1 = code[codeIndex + 1];
                    var byte2 = code[codeIndex + 2];
                    // 在原来地址的基础上 加个offset，再存储到code里
                    var address = byte1 << 8 | byte2 + offset;
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
    };
    /**
     * 生成获取本地变量值的指令
     * @param sym
     */
    BCGenerator.prototype.getVariableValue = function (sym) {
        var _a;
        var code = [];
        if (sym != null) {
            // 本地变量的下标
            var index = (_a = this.functionSym) === null || _a === void 0 ? void 0 : _a.vars.indexOf(sym);
            console_1.assert(index != -1, "生成字节码时（获取变量的值），在函数符号中获取本地变量下标失败！");
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
                    code.push(index);
            }
        }
        return code;
    };
    BCGenerator.prototype.setVariableValue = function (sym) {
        var _a;
        var code = [];
        if (sym != null) {
            var index = (_a = this.functionSym) === null || _a === void 0 ? void 0 : _a.vars.indexOf(sym);
            console_1.assert(index != -1, "生成字节码时（设置变量值），在函数符号中查找变量失败！");
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
                    code.push(index);
            }
        }
        return code;
    };
    BCGenerator.prototype.visitBinary = function (bi) {
        this.inExpression = true;
        var code;
        var code1 = this.visit(bi.exp1);
        var code2 = this.visit(bi.exp2);
        var address1 = 0;
        var address2 = 0;
        var tempCode = 0;
        // 1.处理赋值
        if (bi.op == scanner_1.Op.Assign) {
            var VarSymbol_1 = code1;
            console.log("varSymbol:");
            console.log(VarSymbol_1);
            // 加入右子树的代码
            code = code2;
            // 加入istore代码
            code = code.concat(this.setVariableValue(VarSymbol_1));
        }
        // 2.处理其他二元运算
        else {
            // 加入左子树的代码
            code = code1;
            // 加入右子树的代码
            code = code.concat(code2);
            // 加入运算符的代码
            switch (bi.op) {
                case scanner_1.Op.Plus:
                    if (bi.theType == types_1.SysTypes.String) {
                        code.push(OpCode.sadd);
                    }
                    else {
                        code.push(OpCode.iadd);
                    }
                    break;
                case scanner_1.Op.Minus:
                    code.push(OpCode.isub);
                    break;
                case scanner_1.Op.Multiply:
                    code.push(OpCode.imul);
                    break;
                case scanner_1.Op.Divide:
                    code.push(OpCode.idiv);
                    break;
                case scanner_1.Op.G: // '>'
                case scanner_1.Op.GE: // '>='
                case scanner_1.Op.L: // '<'
                case scanner_1.Op.LE: // '<='
                case scanner_1.Op.EQ: // '=='
                case scanner_1.Op.NE: // '!='
                    if (bi.op == scanner_1.Op.G) {
                        tempCode = OpCode.if_icmple;
                    }
                    else if (bi.op == scanner_1.Op.GE) {
                        tempCode = OpCode.if_icmplt;
                    }
                    else if (bi.op == scanner_1.Op.L) {
                        tempCode = OpCode.if_icmpge;
                    }
                    else if (bi.op == scanner_1.Op.LE) {
                        tempCode = OpCode.if_icmpgt;
                    }
                    else if (bi.op == scanner_1.Op.EQ) {
                        tempCode = OpCode.if_icmpne;
                    }
                    else if (bi.op == scanner_1.Op.NE) {
                        tempCode = OpCode.if_icmpeq;
                    }
                    address1 = code.length + 7;
                    address2 = address1 + 1;
                    code.push(tempCode);
                    code.push(address1 >> 8);
                    code.push(address1);
                    // ar 这里的iconst_1 是用来干什么的 添加常数1？ 是的，添加立即数1
                    code.push(OpCode.iconst_1);
                    code.push(OpCode.goto);
                    code.push(address2 >> 8);
                    code.push(address2);
                    code.push(OpCode.iconst_0);
                    break;
                default:
                    console.log("Unsupported binary operation: " + bi.op);
                    return [];
            }
        }
        return code;
    };
    BCGenerator.prototype.visitUnary = function (u) {
        var _a, _b;
        var code = [];
        var v = this.visit(u.exp);
        var varSymbol;
        var varIndex;
        if (u.op == scanner_1.Op.Inc) {
            varSymbol = v;
            varIndex = (_a = this.functionSym) === null || _a === void 0 ? void 0 : _a.vars.indexOf(varSymbol);
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
        else if (u.op == scanner_1.Op.Dec) {
            varSymbol = v;
            varIndex = (_b = this.functionSym) === null || _b === void 0 ? void 0 : _b.vars.indexOf(varSymbol);
            if (u.isPrefix) {
                code.push(OpCode.iinc);
                code.push(varIndex);
                code.push(-1);
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
                code.push(-1);
            }
        }
        else {
            console.log("Unsupported unary oprator :" + u.op);
        }
        return code;
    };
    /**
     * 如果是左值，就返回符号。否则，生成iload指令
     */
    BCGenerator.prototype.visitVariable = function (v) {
        if (v.isLeftValue) {
            return v.sym;
        }
        else {
            return this.getVariableValue(v.sym);
        }
    };
    /**
     * 生成数值入栈的指令
     */
    BCGenerator.prototype.visitIntegerLiteral = function (intergerLiteral) {
        var ret = [];
        var value = intergerLiteral.value;
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
    };
    /**
     * 生成字符串入栈的指令
     */
    BCGenerator.prototype.visitStringLiteral = function (stringLiteral) {
        var ret = [];
        var value = stringLiteral.value;
        this.m.consts.push(value);
        ret.push(OpCode.sldc);
        ret.push(this.m.consts.length - 1);
        return ret;
    };
    return BCGenerator;
}(ast_1.AstVisitor));
exports.BCGenerator = BCGenerator;
/**
 * 从BCModule生成字节码
 */
var BCModuleWriter = /** @class */ (function () {
    function BCModuleWriter() {
        this.types = [];
    }
    BCModuleWriter.prototype.write = function (bcModule) {
        var e_5, _a, e_6, _b;
        var bc2 = [];
        this.types = [];
        // 写入常量
        var numConst = 0;
        try {
            for (var _c = __values(bcModule.consts), _d = _c.next(); !_d.done; _d = _c.next()) {
                var c = _d.value;
                if (typeof c == 'number') {
                    bc2.push(1); // 代表接下来是一个number
                    bc2.push(c);
                    numConst++;
                }
                else if (typeof c == 'string') {
                    bc2.push(2); // 代表接下来是一个string
                    this.writeString(bc2, c);
                    numConst++;
                }
                else if (typeof c == 'object') {
                    var functionSym = c;
                    if (!symbol_1.built_ins.has(functionSym.name)) {
                        bc2.push(3); // 代表接下来是一个FunctionSymbol
                        bc2 = bc2.concat(this.writeFunctionSymbol(functionSym));
                        numConst++;
                    }
                }
                else {
                    console.log("Unsupported const in BCModuleWriter.");
                    console.log(c);
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c["return"])) _a.call(_c);
            }
            finally { if (e_5) throw e_5.error; }
        }
        // 写入类型
        var bc1 = [];
        this.writeString(bc1, "types");
        bc1.push(this.types.length);
        try {
            for (var _e = __values(this.types), _f = _e.next(); !_f.done; _f = _e.next()) {
                var t = _f.value;
                if (types_1.Type.isFunctionType(t)) {
                    bc1 = bc1.concat(this.writeFunctionType(t));
                }
                else if (types_1.Type.isSimpleType(t)) {
                    bc1 = bc1.concat(this.writeSimpleType(t));
                }
                else if (types_1.Type.isUnionType(t)) {
                    bc1 = bc1.concat(this.writeUnionType(t));
                }
                else {
                    console.log("Unsupported type in BCModuleWriter");
                    console.log(t);
                }
            }
        }
        catch (e_6_1) { e_6 = { error: e_6_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e["return"])) _b.call(_e);
            }
            finally { if (e_6) throw e_6.error; }
        }
        this.writeString(bc1, "consts");
        bc1.push(numConst);
        return bc1.concat(bc2);
    };
    BCModuleWriter.prototype.writeVarSymbol = function (sym) {
        var bc = [];
        // 写入类型名称
        this.writeString(bc, sym.name);
        // 写入类型名称
        this.writeString(bc, sym.theType.name);
        if (!types_1.SysTypes.isSysType(sym.theType) && this.types.indexOf(sym.theType) == -1) {
            this.types.push(sym.theType);
        }
        return bc;
    };
    BCModuleWriter.prototype.writeFunctionSymbol = function (sym) {
        var e_7, _a;
        var bc = [];
        // 写入函数名称
        this.writeString(bc, sym.name);
        // 写入类型名称
        this.writeString(bc, sym.theType.name);
        if (!types_1.SysTypes.isSysType(sym.theType) && this.types.indexOf(sym.theType) == -1) {
            this.types.push(sym.theType);
        }
        // 写入操作数栈最大的大小
        bc.push(sym.opStackSize);
        // 写入本地变量个数
        bc.push(sym.vars.length);
        try {
            for (var _b = __values(sym.vars), _c = _b.next(); !_c.done; _c = _b.next()) {
                var v = _c.value;
                bc = bc.concat(this.writeVarSymbol(v));
            }
        }
        catch (e_7_1) { e_7 = { error: e_7_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_7) throw e_7.error; }
        }
        // 写入函数函数体的字节码
        if (sym.byteCode == null) { // 内置函数
            bc.push(0);
        }
        else {
            bc.push(sym.byteCode.length);
            bc = bc.concat(sym.byteCode);
        }
        return bc;
    };
    BCModuleWriter.prototype.writeSimpleType = function (t) {
        var e_8, _a;
        var bc = [];
        if (types_1.SysTypes.isSysType(t)) { // 内置类型不用添加
            return bc;
        }
        bc.push(1); // 代表SimpleType
        // 写入类型名称
        this.writeString(bc, t.name);
        // 写入父类型的数量
        bc.push(t.upperTypes.length);
        try {
            for (var _b = __values(t.upperTypes), _c = _b.next(); !_c.done; _c = _b.next()) {
                var ut = _c.value;
                this.writeString(bc, ut.name);
                if (!types_1.SysTypes.isSysType(ut) && this.types.indexOf(ut) == -1) {
                    this.types.push(ut);
                }
            }
        }
        catch (e_8_1) { e_8 = { error: e_8_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_8) throw e_8.error; }
        }
        return bc;
    };
    BCModuleWriter.prototype.writeFunctionType = function (t) {
        var e_9, _a;
        var bc = [];
        bc.push(2); // 代表FunctionType
        // 写入类型名称
        this.writeString(bc, t.name);
        // 写入返回值民称
        this.writeString(bc, t.returnType.name);
        // 写入参数数量
        bc.push(t.paramTypes.length);
        try {
            // 写入参数的类型名称
            for (var _b = __values(t.paramTypes), _c = _b.next(); !_c.done; _c = _b.next()) {
                var pt = _c.value;
                this.writeString(bc, pt.name);
                if (this.types.indexOf(pt) == -1) {
                    this.types.push(pt);
                }
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_9) throw e_9.error; }
        }
        return bc;
    };
    BCModuleWriter.prototype.writeUnionType = function (t) {
        var e_10, _a;
        var bc = [];
        bc.push(3); // 代表UnionType
        // 写入类型名称
        this.writeString(bc, t.name);
        try {
            // 写入联合的各类型名称
            for (var _b = __values(t.types), _c = _b.next(); !_c.done; _c = _b.next()) {
                var ut = _c.value;
                this.writeString(bc, ut.name);
                if (this.types.indexOf(ut) == -1) {
                    this.types.push(ut);
                }
            }
        }
        catch (e_10_1) { e_10 = { error: e_10_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_10) throw e_10.error; }
        }
        return bc;
    };
    BCModuleWriter.prototype.writeString = function (bc, str) {
        // 写入字符串的长度
        bc.push(str.length);
        for (var i = 0; i < str.length; i++) {
            bc.push(str.charCodeAt(i));
        }
    };
    return BCModuleWriter;
}());
exports.BCModuleWriter = BCModuleWriter;
/**
 * 从字节码生成BCModule
 */
var BCModuleReader = /** @class */ (function () {
    function BCModuleReader() {
        // 读取字节码时的下标
        this.index = 0;
        // 解析出来的所有类型
        this.types = new Map();
        this.typeInfos = new Map();
    }
    /**
     * 从字节码生成BCModule
     * @param bc
     */
    BCModuleReader.prototype.read = function (bc) {
        // 重置状态变量
        this.index = 0;
        this.types.clear();
        var bcModule = new BCModule();
        // 1.读取类型
        // 1.1加入系统内置类型
        this.addSystemTypes();
        // 1.2从字节码中读取类型
        var str = this.readString(bc);
        console_1.assert(str == "types", "从字节码中读取的字符串不是'types'");
        var numTypes = bc[this.index++];
        for (var i = 0; i < numTypes; i++) {
            var typeKind = bc[this.index++];
            switch (typeKind) {
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
        console_1.assert(str == "consts", "从字节码中读取的字符串不是'consts'");
        var numConsts = bc[this.index++];
        for (var i = 0; i < numConsts; i++) {
            var constType = bc[this.index++];
            if (constType == 1) {
                bcModule.consts.push(bc[this.index++]);
            }
            else if (constType == 2) {
                var str_1 = this.readString(bc);
                bcModule.consts.push(str_1);
            }
            else if (constType == 3) {
                var functionSym = this.readFunctionSymbol(bc);
                bcModule.consts.push(functionSym);
                if (functionSym.name == "main") {
                    bcModule._main = functionSym;
                }
            }
            else {
                console.log("Unsupported const type: " + constType);
            }
        }
        return bcModule;
    };
    BCModuleReader.prototype.readString = function (bc) {
        var len = bc[this.index++];
        var str = "";
        for (var i = 0; i < len; i++) {
            str += String.fromCharCode(bc[this.index++]);
        }
        return str;
    };
    BCModuleReader.prototype.readSimpleType = function (bc) {
        var typeName = this.readString(bc);
        var numUpperTypes = bc[this.index++];
        var upperTypes = [];
        for (var i = 0; i < numUpperTypes; i++) {
            upperTypes.push(this.readString(bc));
        }
        var t = new types_1.SimpleType(typeName, []);
        this.types.set(typeName, t);
        this.typeInfos.set(typeName, upperTypes);
    };
    BCModuleReader.prototype.readFunctionType = function (bc) {
        var typeName = this.readString(bc);
        var returnType = this.readString(bc);
        var numParams = bc[this.index++];
        var paramTypes = [];
        for (var i = 0; i < numParams; i++) {
            paramTypes.push(this.readString(bc));
        }
        var t = new types_1.FunctionType(types_1.SysTypes.Any, [], typeName);
        this.types.set(typeName, t);
        this.typeInfos.set(typeName, { returnType: returnType, paramTypes: paramTypes });
    };
    BCModuleReader.prototype.readUnionType = function (bc) {
        var typeName = this.readString(bc);
        var numTypes = bc[this.index++];
        var unionTypes = [];
        for (var i = 0; i < numTypes; i++) {
            unionTypes.push(this.readString(bc));
        }
        var t = new types_1.UnionType([], typeName);
        this.types.set(typeName, t);
        this.typeInfos.set(typeName, unionTypes);
    };
    BCModuleReader.prototype.addSystemTypes = function () {
        this.types.set('any', types_1.SysTypes.Any);
        this.types.set('number', types_1.SysTypes.Number);
        this.types.set('string', types_1.SysTypes.String);
        this.types.set('integer', types_1.SysTypes.Integer);
        this.types.set('decimal', types_1.SysTypes.Decimal);
        this.types.set('boolean', types_1.SysTypes.Boolean);
        this.types.set('null', types_1.SysTypes.Null);
        this.types.set('undefined', types_1.SysTypes.Undefined);
        this.types.set('void', types_1.SysTypes.Void);
    };
    /**
     * 生成类型，并建立类型之间正确的引用关系
     */
    BCModuleReader.prototype.buildTypes = function () {
        var e_11, _a, e_12, _b, e_13, _c, e_14, _d;
        try {
            for (var _e = __values(this.typeInfos.keys()), _f = _e.next(); !_f.done; _f = _e.next()) {
                var typeName = _f.value;
                var t = this.types.get(typeName);
                if (types_1.Type.isSimpleType(t)) {
                    var simpleType = t;
                    var upperTypes = this.typeInfos.get(typeName);
                    try {
                        for (var upperTypes_1 = (e_12 = void 0, __values(upperTypes)), upperTypes_1_1 = upperTypes_1.next(); !upperTypes_1_1.done; upperTypes_1_1 = upperTypes_1.next()) {
                            var utName = upperTypes_1_1.value;
                            var ut = this.types.get(utName);
                            simpleType.upperTypes.push(ut);
                        }
                    }
                    catch (e_12_1) { e_12 = { error: e_12_1 }; }
                    finally {
                        try {
                            if (upperTypes_1_1 && !upperTypes_1_1.done && (_b = upperTypes_1["return"])) _b.call(upperTypes_1);
                        }
                        finally { if (e_12) throw e_12.error; }
                    }
                }
                else if (types_1.Type.isFunctionType(t)) {
                    var functionType = t;
                    var returnType = this.typeInfos.get(typeName).returnType;
                    var paramTypes = this.typeInfos.get(typeName).paramTypes;
                    functionType.returnType = this.types.get(returnType);
                    try {
                        for (var paramTypes_1 = (e_13 = void 0, __values(paramTypes)), paramTypes_1_1 = paramTypes_1.next(); !paramTypes_1_1.done; paramTypes_1_1 = paramTypes_1.next()) {
                            var utName = paramTypes_1_1.value;
                            var ut = this.types.get(utName);
                            functionType.paramTypes.push(ut);
                        }
                    }
                    catch (e_13_1) { e_13 = { error: e_13_1 }; }
                    finally {
                        try {
                            if (paramTypes_1_1 && !paramTypes_1_1.done && (_c = paramTypes_1["return"])) _c.call(paramTypes_1);
                        }
                        finally { if (e_13) throw e_13.error; }
                    }
                }
                else if (types_1.Type.isUnionType(t)) {
                    var unionType = t;
                    var types = this.typeInfos.get(typeName);
                    try {
                        for (var types_2 = (e_14 = void 0, __values(types)), types_2_1 = types_2.next(); !types_2_1.done; types_2_1 = types_2.next()) {
                            var utName = types_2_1.value;
                            var ut = this.types.get(utName);
                            unionType.types.push(ut);
                        }
                    }
                    catch (e_14_1) { e_14 = { error: e_14_1 }; }
                    finally {
                        try {
                            if (types_2_1 && !types_2_1.done && (_d = types_2["return"])) _d.call(types_2);
                        }
                        finally { if (e_14) throw e_14.error; }
                    }
                }
                else {
                    console.log("Unsupported type in BCModuleReader.");
                    console.log(t);
                }
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_a = _e["return"])) _a.call(_e);
            }
            finally { if (e_11) throw e_11.error; }
        }
        this.typeInfos.clear();
    };
    /**
     * 从字节码中读取FunctionSymbol
     * @param bc
     */
    BCModuleReader.prototype.readFunctionSymbol = function (bc) {
        var functionName = this.readString(bc);
        // 读取类型名称
        var typeName = this.readString(bc);
        var functionType = this.types.get(typeName);
        // 操作数栈的大小
        var opStackSize = bc[this.index++];
        // 变量个数
        var numVars = bc[this.index++];
        // 读取变量
        var vars = [];
        for (var i = 0; i < numVars; i++) {
            vars.push(this.readVarSymbol(bc));
        }
        // 读取函数体的字节码
        var numByteCodes = bc[this.index++];
        var byteCodes;
        if (numByteCodes == 0) {
            byteCodes = null;
        }
        else {
            byteCodes = bc.slice(this.index, this.index + numByteCodes);
            this.index += numByteCodes;
        }
        // 创建函数符号
        var functionSym = new symbol_1.FunctionSymbol(functionName, functionType);
        functionSym.vars = vars;
        functionSym.opStackSize = opStackSize;
        functionSym.byteCode = byteCodes;
        return functionSym;
    };
    BCModuleReader.prototype.readVarSymbol = function (bc) {
        // 变量名称
        var varName = this.readString(bc);
        // 类型名称
        var typeName = this.readString(bc);
        var varType = this.types.get(typeName);
        return new symbol_1.VarSymbol(varName, varType);
    };
    return BCModuleReader;
}());
exports.BCModuleReader = BCModuleReader;
