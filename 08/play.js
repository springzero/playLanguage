"use strict";
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
var scanner_1 = require("./scanner");
var ast_1 = require("./ast");
var parser_1 = require("./parser");
//////////////////////////////
// 解释器
/**
 * 遍历AST，并执行
 */
var Intepretor = /** @class */ (function (_super) {
    __extends(Intepretor, _super);
    function Intepretor() {
        var _this = _super.call(this) || this;
        // 存储变量值的区域
        // values: Map<string, any> = new Map();
        // 调用栈
        _this.callStack = [];
        // 初始化顶层的栈桢
        _this.currentFrame = new StackFrame();
        _this.callStack.push(_this.currentFrame);
        return _this;
    }
    Intepretor.prototype.pushFrame = function (frame) {
        this.callStack.push(frame);
        this.currentFrame = frame;
    };
    Intepretor.prototype.popFrame = function () {
        if (this.callStack.length > 1) {
            var frame = this.callStack[this.callStack.length - 2]; // 获取栈顶第二个栈
            this.callStack.pop();
            this.currentFrame = frame;
        }
    };
    Intepretor.prototype.visitFunctionDecl = function (functionDecl) { };
    /**
     * 遍历一个块
     */
    Intepretor.prototype.visitBlock = function (block) {
        var e_1, _a;
        var retVal;
        try {
            for (var _b = __values(block.stmts), _c = _b.next(); !_c.done; _c = _b.next()) {
                var x = _c.value;
                retVal = this.visit(x);
                // 如果当前执行了一个返回语句，那么就直接返回，不再执行后面的语句。
                // 如果存在上一级Block，也是中断执行，直接返回
                if (typeof retVal == 'object' &&
                    ReturnValue.isReturnValue(retVal)) {
                    return retVal;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return retVal;
    };
    /**
     * 处理Return语句时，要把返回值封装成一个特殊的对象，用于中断后续程序的执行。
     */
    Intepretor.prototype.visitReturnStatement = function (returnStatement, additional) {
        var retVal;
        if (returnStatement.exp != null) {
            retVal = this.visit(returnStatement.exp);
            this.setReturnValue(retVal);
        }
        return new ReturnValue(retVal); // 这个结构是传递一个信号，让Block和for循环等停止执行
    };
    // 把返回值设置到上一级栈桢中（也就是调用者的栈桢） 
    // ar ？按照我的理解返回值不应该设置在被调用者的栈桢么。调用者可是会调多个函数的，但是被调用者栈桢用完就回抛掉的，值传到调用者具体是哪步
    // ar 具体看visitFunctionCall中的动作
    Intepretor.prototype.setReturnValue = function (retVal) {
        var frame = this.callStack[this.callStack.length - 2];
        frame.retVal = retVal;
    };
    /**
     * 执行if语句
     * @param ifStmt
     */
    Intepretor.prototype.visitIfStatement = function (ifStmt) {
        // 计算条件
        var conditionValue = this.visit(ifStmt.condition);
        // 条件为true，则执行then部分
        if (conditionValue) {
            return this.visit(ifStmt.stmt);
        }
        else if (ifStmt.elseStmt != null) {
            return this.visit(ifStmt.elseStmt);
        }
    };
    Intepretor.prototype.visitForStatement = function (forStmt) {
        if (forStmt.init != null) {
            this.visit(forStmt.init);
        }
        var isRun = forStmt.condition == null ? true : this.visit(forStmt.condition);
        while (isRun) {
            // 执行循环体
            var retVal = this.visit(forStmt.stmt);
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
    };
    /**
     * 运行函数调用
     */
    Intepretor.prototype.visitFunctionCall = function (functionCall) {
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
            var frame = new StackFrame();
            // 计算参数值，并保存到新创建的栈桢
            var functionDecl = functionCall.sym.decl;
            if (functionDecl.callSignature.paramList != null) {
                var params = functionDecl.callSignature.paramList.params;
                for (var i = 0; i < params.length; i++) {
                    var variableDecl = params[i];
                    var val = this.visit(functionCall.arguments[i]);
                    frame.values.set(variableDecl.sym, val); // 将参数设置到新frame的储存空间
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
        }
        else {
            console.log("Runtime error, cannot find declaration of " + functionCall.name + ".");
            return;
        }
    };
    /**
     * 内置函数println
     * @param functionCall
     */
    Intepretor.prototype.println = function (args) {
        if (args.length > 0) {
            var retVal = this.visit(args[0]);
            console.log(retVal);
        }
        else {
            console.log();
        }
        return 0;
    };
    /**
     * 内置函数tick
     */
    Intepretor.prototype.tick = function () {
        var date = new Date();
        var value = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
        return value;
    };
    /**
     * 把整型转成字符串
     * @param functionCall
     */
    Intepretor.prototype.integer_to_string = function (args) {
        if (args.length > 0) {
            var arg = this.visit(args[0]);
            return arg.toString();
        }
        return "";
    };
    /**
     * 变量声明
     * @param variableDecl
     * @returns
     */
    Intepretor.prototype.visitVariableDecl = function (variableDecl) {
        if (variableDecl.init != null) {
            var v = this.visit(variableDecl.init);
            // if (this.isLeftValue(v)) {  // 新版05的代码 没有这个分支了 逻辑放到了 semantic中 LeftValueAttributor的visitVariable里， 交给了
            //     v = this.getVariableValue((v as LeftValue).variable.name);
            // }
            this.setVariableValue(variableDecl.sym, v);
            return v;
        }
    };
    /**
     * 获取变量的值
     * 这里给出的是左值。左值即可以写，也可以读
     * 如果是左值，返回符号。否则，返回值
     * @param v
     * @returns
     */
    Intepretor.prototype.visitVariable = function (v) {
        if (v.isLeftValue) { // 要搞懂这个isLeftValue是怎么计算出来的，现在赋值语句是有问题
            return v.sym;
        }
        else {
            return this.getVariableValue(v.sym);
        }
    };
    Intepretor.prototype.getVariableValue = function (sym) {
        if (sym != null) {
            return this.currentFrame.values.get(sym);
        }
    };
    Intepretor.prototype.setVariableValue = function (sym, value) {
        return this.currentFrame.values.set(sym, value);
    };
    /**
     * 二元运算
     * @param bi
     * @returns
     */
    Intepretor.prototype.visitBinary = function (bi) {
        var ret;
        var v1 = this.visit(bi.exp1);
        var v2 = this.visit(bi.exp2);
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
            case scanner_1.Op.Plus: //'+'
                ret = v1 + v2;
                break;
            case scanner_1.Op.Minus: //'-'
                ret = v1 - v2;
                break;
            case scanner_1.Op.Multiply: //'*'
                ret = v1 * v2;
                break;
            case scanner_1.Op.Divide: //'/'
                ret = v1 / v2;
                break;
            case scanner_1.Op.Modulus: //'%'
                ret = v1 % v2;
                break;
            case scanner_1.Op.G: //'>'
                ret = v1 > v2;
                break;
            case scanner_1.Op.GE: //'>='
                ret = v1 >= v2;
                break;
            case scanner_1.Op.L: //'<'
                ret = v1 < v2;
                break;
            case scanner_1.Op.LE: //'<='
                ret = v1 <= v2;
                break;
            case scanner_1.Op.EQ: //'=='
                ret = v1 == v2;
                break;
            case scanner_1.Op.NE: //'!='
                ret = v1 != v2;
                break;
            case scanner_1.Op.And: //'&&'
                ret = v1 && v2;
                break;
            case scanner_1.Op.Or: //'||'
                ret = v1 || v2;
                break;
            case scanner_1.Op.Assign: //'='
                var varSymbol = v1;
                // var varSymbol = bi.exp1.sym as VarSymbol;
                this.setVariableValue(varSymbol, v2);
                break;
            default:
                console.log("Unsupported binary operation: " + scanner_1.Op[bi.op]);
        }
        return ret;
    };
    /**
     * 计算一元表达式
     */
    Intepretor.prototype.visitUnary = function (u) {
        var v = this.visit(u.exp);
        var varSymbol;
        var value;
        switch (u.op) {
            case scanner_1.Op.Inc: // '++'
                // 拿到值，计算放回存储
                varSymbol = v;
                value = this.getVariableValue(varSymbol);
                this.setVariableValue(varSymbol, value + 1);
                if (u.isPrefix) {
                    return value + 1;
                }
                else {
                    return value;
                }
            case scanner_1.Op.Dec: // '--'
                varSymbol = v;
                value = this.getVariableValue(varSymbol);
                this.setVariableValue(varSymbol, value - 1);
                if (u.isPrefix) {
                    return value - 1;
                }
                else {
                    return value;
                }
            case scanner_1.Op.Plus: // '+'
                return v;
            case scanner_1.Op.Minus: // '-'
                return -v;
            default:
                console.log("Unsupported unary op: " + scanner_1.Op[u.op]);
        }
    };
    return Intepretor;
}(ast_1.AstVisitor));
var StackFrame = /** @class */ (function () {
    function StackFrame() {
        // 存储变量的值
        this.values = new Map();
        // 返回值，当调用函数的时候，返回值放在这里
        this.retVal = undefined;
    }
    return StackFrame;
}());
var ReturnValue = /** @class */ (function () {
    function ReturnValue(value) {
        this.tag_ReturnValue = 0;
        this.value = value;
    }
    // 强转成ReturnValue,如果成员变量tag_xxx 不为undefined, 说明这个变量是ReturnValue类型
    ReturnValue.isReturnValue = function (v) {
        return typeof v.tag_ReturnValue != 'undefined';
    };
    return ReturnValue;
}());
////////////////////////
// 主程序
function compileAndRun(program) {
    console.log("源代码:");
    console.log(program);
    console.log("\n词法分析结果:");
    var scanner = new scanner_1.Scanner(new scanner_1.CharStream(program));
    while (scanner.peek().kind != scanner_1.TokenKind.EOF) {
        console.log(scanner.next().toString());
    }
    console.log("\n语法分析后的AST:");
    scanner = new scanner_1.Scanner(new scanner_1.CharStream(program));
    var parser = new parser_1.Parser(scanner);
    var prog = parser.parseProg();
    var astDumper = new ast_1.AstDumper();
    astDumper.visit(prog, "");
    console.log("\n符号表：");
    var semanticAnalyer = new semantic_1.SemanticAnalyer();
    semanticAnalyer.execute(prog);
    new scope_1.ScopeDumper().visit(prog, "");
    console.log("\n语义分析后的AST，注意变量和函数已被消解：");
    astDumper.visit(prog, "");
    if (parser.errors.length > 0 || semanticAnalyer.errors.length > 0) {
        console.log("\n共发现" + parser.errors.length + "个语法错误，" + semanticAnalyer.errors.length + "个语义错误。");
        if (parser.errors.length > 0) {
            console.log(parser.errors);
        }
        if (semanticAnalyer.errors.length > 0) {
            console.log(semanticAnalyer.errors);
        }
        // return;
    }
    // 运行程序
    console.log("\n运行当前的程序:");
    var dateStart = new Date();
    var retVal = new Intepretor().visit(prog);
    var dateEnd = new Date();
    console.log("程序返回值: " + retVal);
    console.log("耗时：" + (dateEnd.getTime() - dateStart.getTime()) / 1000 + "秒");
    // 用vm运行程序
    console.log("\n编译成字节码");
    var generator = new vm_1.BCGenerator();
    var bcModule = generator.visit(prog);
    var bcModuleDumper = new vm_1.BCModuleDumper();
    bcModuleDumper.dump(bcModule);
    // console.log()
    console.log("\n使用栈机运行程序:");
    dateStart = new Date();
    retVal = new vm_1.VM().execute(bcModule);
    dateEnd = new Date();
    console.log("程序返回值：");
    console.log("耗时：" + (dateEnd.getTime() - dateStart.getTime()) / 1000 + "秒");
}
function writeByteCode(fileName, bc) {
    var fs = require('fs');
    var buffer = Buffer.alloc(bc.length);
    for (var i = 0; i < bc.length; i++) {
        buffer[i] = bc[i];
    }
    console.log(buffer);
    try {
        fs.writeFileSync(fileName, buffer);
    }
    catch (err) {
        console.log(err);
    }
}
function readByteCode(fileName) {
    var fs = require('fs');
    var bc = [];
    var buffer;
    try {
        buffer = fs.readFileSync(fileName, buffer);
        for (var i = 0; i < buffer.length; i++) {
            bc[i] = buffer[i];
        }
    }
    catch (err) {
        console.log(err);
    }
    return bc;
}
var process = require("process");
var semantic_1 = require("./semantic");
var scope_1 = require("./scope");
var vm_1 = require("./vm");
if (process.argv.length < 3) {
    console.log("Usage: node " + process.argv[1] + ' FILENAME');
    process.exit(1);
}
var fs = require('fs');
var filename = process.argv[2];
fs.readFile(filename, 'utf8', function (err, data) {
    if (err)
        throw err;
    compileAndRun(data);
});
