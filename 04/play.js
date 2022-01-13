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
exports.__esModule = true;
var scanner_1 = require("./scanner");
var ast_1 = require("./ast");
var parser_1 = require("./parser");
var semantic_1 = require("./semantic");
//////////////////////////////
// 解释器
/**
 * 遍历AST，并执行
 */
var Intepretor = /** @class */ (function (_super) {
    __extends(Intepretor, _super);
    function Intepretor() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        // 存储变量值的区域
        _this.values = new Map();
        return _this;
    }
    Intepretor.prototype.visitFunctionDecl = function (functionDecl) {
    };
    /**
     * 运行函数调用
     */
    Intepretor.prototype.visitFunctionCall = function (functionCall) {
        if (functionCall.name == "println") {
            if (functionCall.parameters.length > 0) {
                var retVal = this.visit(functionCall.parameters[0]);
                if (typeof retVal.variable == 'object') {
                    retVal = this.getVariableValue(retVal.variable.name);
                }
                console.log(retVal);
            }
            else {
                console.log();
            }
            return 0;
        }
        else { // 如果函数定义存在，就遍历函数体
            if (functionCall.decl != null) {
                this.visitBlock(functionCall.decl.body);
            }
        }
    };
    /**
     * 变量声明
     * @param variableDecl
     * @returns
     */
    Intepretor.prototype.visitVariableDecl = function (variableDecl) {
        if (variableDecl.init != null) {
            var v = this.visit(variableDecl.init);
            if (this.isLeftValue(v)) {
                v = this.getVariableValue(v.variable.name);
            }
            this.setVariableValue(variableDecl.name, v);
            return v;
        }
    };
    /**
     * 获取变量的值
     * 这里给出的是左值。左值即可以写，也可以读
     * @param v
     * @returns
     */
    Intepretor.prototype.visitVariable = function (v) {
        return new LeftValue(v);
    };
    Intepretor.prototype.getVariableValue = function (varName) {
        return this.values.get(varName);
    };
    Intepretor.prototype.setVariableValue = function (varName, value) {
        return this.values.set(varName, value);
    };
    Intepretor.prototype.isLeftValue = function (v) {
        return typeof v.variable == 'object';
    };
    Intepretor.prototype.visitBinary = function (bi) {
        var ret;
        var v1 = this.visit(bi.exp1);
        var v2 = this.visit(bi.exp2);
        var v1left = null;
        var v2left = null;
        if (this.isLeftValue(v1)) {
            v1left = v1;
            v1 = this.getVariableValue(v1left.variable.name);
            console.log("value of " + v1left.variable.name + " : " + v1);
        }
        if (this.isLeftValue(v2)) {
            v2left = v2;
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
                    console.log("Assignment need a left value, not ", v1);
                }
                break;
            default:
                console.log("Unsupported binary operation: " + bi.op);
        }
        return ret;
    };
    return Intepretor;
}(ast_1.AstVisitor));
/**
 * 左值
 * 目前先只是指变量。
 */
var LeftValue = /** @class */ (function () {
    function LeftValue(variable) {
        this.variable = variable;
    }
    return LeftValue;
}());
////////////////////////
// 主程序
function compileAndRun(program) {
    console.log("源代码:");
    console.log(program);
    console.log("\n词法分析结果:");
    var tokenizer = new scanner_1.Scanner(new scanner_1.CharStream(program));
    while (tokenizer.peek().kind != scanner_1.TokenKind.EOF) {
        console.log(tokenizer.next());
    }
    console.log("\n语法分析后的AST:");
    tokenizer = new scanner_1.Scanner(new scanner_1.CharStream(program));
    var prog = new parser_1.Parser(tokenizer).parseProg();
    prog.dump("");
    console.log("\n语义分析后的AST，注意变量和函数已被消解:");
    var symTable = new semantic_1.SymTable();
    new semantic_1.Enter(symTable).visit(prog); // 建立符号表
    new semantic_1.RefResolver(symTable).visit(prog); // 消解函数引用
    prog.dump("");
    console.log("\n运行当前的程序:");
    var retVal = new Intepretor().visit(prog);
    console.log("程序返回值: " + retVal);
}
var process = require("process");
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
