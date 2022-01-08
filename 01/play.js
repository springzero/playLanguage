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
// 定义Token的类型
var TokenKind;
(function (TokenKind) {
    TokenKind[TokenKind["Keyword"] = 0] = "Keyword";
    TokenKind[TokenKind["Identifier"] = 1] = "Identifier";
    TokenKind[TokenKind["StringLiteral"] = 2] = "StringLiteral";
    TokenKind[TokenKind["Seperator"] = 3] = "Seperator";
    TokenKind[TokenKind["Operator"] = 4] = "Operator";
    TokenKind[TokenKind["EOF"] = 5] = "EOF";
})(TokenKind || (TokenKind = {}));
;
// 一个Token数组，代表了下面这段程序做完词法分析后的结果：
/*
//一个函数的声明，这个函数很简单，只打印"Hello World!"
function sayHello(){
    println("Hello World!");
}
//调用刚才声明的函数
sayHello();
*/
var tokenArray = [
    { kind: TokenKind.Keyword, text: 'function' },
    { kind: TokenKind.Identifier, text: 'sayHello' },
    { kind: TokenKind.Seperator, text: '(' },
    { kind: TokenKind.Seperator, text: ')' },
    { kind: TokenKind.Seperator, text: '{' },
    { kind: TokenKind.Identifier, text: 'println' },
    { kind: TokenKind.Seperator, text: '(' },
    { kind: TokenKind.StringLiteral, text: 'Hello World!' },
    { kind: TokenKind.Seperator, text: ')' },
    { kind: TokenKind.Seperator, text: ';' },
    { kind: TokenKind.Seperator, text: '}' },
    { kind: TokenKind.Identifier, text: 'sayHello' },
    { kind: TokenKind.Seperator, text: '(' },
    { kind: TokenKind.Seperator, text: ')' },
    { kind: TokenKind.Seperator, text: ';' },
    { kind: TokenKind.EOF, text: '' }
];
/**
 * 简化的词法分析器
 * 语法分析器从这里获取Token。
 */
var Tokenizer = /** @class */ (function () {
    function Tokenizer(tokens) {
        this.pos = 0;
        this.tokens = tokens;
    }
    Tokenizer.prototype.next = function () {
        if (this.pos <= this.tokens.length) {
            return this.tokens[this.pos++];
        }
        else {
            //如果已经到了末尾，总是返回EOF
            return this.tokens[this.pos];
        }
    };
    Tokenizer.prototype.position = function () {
        return this.pos;
    };
    Tokenizer.prototype.traceBack = function (newPos) {
        this.pos = newPos;
    };
    return Tokenizer;
}());
// 语法分析
// 目标获取AST
/* 定义基类 */
var AstNode = /** @class */ (function () {
    function AstNode() {
    }
    return AstNode;
}());
/* 定义语句 */
var Statement = /** @class */ (function (_super) {
    __extends(Statement, _super);
    function Statement() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Statement.isStatementNode = function (node) {
        if (!node) {
            return false;
        }
        else {
            return true;
        }
    };
    return Statement;
}(AstNode));
var Prog = /** @class */ (function (_super) {
    __extends(Prog, _super);
    function Prog(stmts) {
        var _this = _super.call(this) || this;
        _this.stmts = stmts;
        return _this;
    }
    Prog.prototype.dump = function (prefix) {
        console.log(prefix + "Prog");
        this.stmts.forEach(function (x) { return x.dump(prefix + "\t"); });
    };
    return Prog;
}(Statement));
/**
 * 函数声明节点
 */
var FunctionDecl = /** @class */ (function (_super) {
    __extends(FunctionDecl, _super);
    function FunctionDecl(name, body) {
        var _this = _super.call(this) || this;
        _this.name = name;
        _this.body = body;
        return _this;
    }
    FunctionDecl.prototype.dump = function (prefix) {
        console.log(prefix + "FunctionDecl " + this.name);
        this.body.dump(prefix + "\t");
    };
    return FunctionDecl;
}(Statement));
/**
 * 函数体
 */
var FunctionBody = /** @class */ (function (_super) {
    __extends(FunctionBody, _super);
    function FunctionBody(stmts) {
        var _this = _super.call(this) || this;
        _this.stmts = stmts;
        return _this;
    }
    FunctionBody.isFunctionBodyNode = function (node) {
        if (!node) {
            return false;
        }
        if (Object.getPrototypeOf(node) == FunctionBody.prototype) {
            return true;
        }
        else {
            return false;
        }
    };
    FunctionBody.prototype.dump = function (prefix) {
        console.log(prefix + "FunctionBody");
        this.stmts.forEach(function (x) { return x.dump(prefix + "\t"); });
    };
    return FunctionBody;
}(AstNode));
/**
 * 函数调用
 */
var FunctionCall = /** @class */ (function (_super) {
    __extends(FunctionCall, _super);
    function FunctionCall(name, parameters) {
        var _this = _super.call(this) || this;
        _this.definition = null; //指向函数的声明   // ar 这里没有看到这个部分是怎么初始化的
        _this.name = name;
        _this.parameters = parameters;
        return _this;
    }
    FunctionCall.isFunctionCallNode = function (node) {
        if (!node) {
            return false;
        }
        if (Object.getPrototypeOf(node) == FunctionCall.prototype) {
            return true;
        }
        else {
            return false;
        }
    };
    FunctionCall.prototype.dump = function (prefix) {
        console.log(prefix + "FunctionCall " + this.name + (this.definition != null ? ", resolved" : ", not resolved"));
        this.parameters.forEach(function (x) { return console.log(prefix + "\t" + "Parameter: " + x); });
    };
    return FunctionCall;
}(Statement));
var Parser = /** @class */ (function () {
    function Parser(tokenizer) {
        this.tokenizer = tokenizer;
    }
    Parser.prototype.parseProg = function () {
        var stmts = [];
        var stmt = null;
        while (true) {
            // 尝试解析函数声明
            stmt = this.parseFunctionDecl();
            if (Statement.isStatementNode(stmt)) {
                stmts.push(stmt);
                continue;
            }
            // 尝试函数调用
            stmt = this.parseFunctionCall();
            if (Statement.isStatementNode(stmt)) {
                stmts.push(stmt);
                continue;
            }
            if (stmt == null) {
                break;
            }
        }
        return new Prog(stmts);
    };
    /* 语法规则 functionDecl: "function" Identifier "(" ")" functionBody; */
    Parser.prototype.parseFunctionDecl = function () {
        var oldPos = this.tokenizer.position();
        var t = this.tokenizer.next();
        if (t.kind == TokenKind.Keyword && t.text == "function") {
            t = this.tokenizer.next();
            if (t.kind == TokenKind.Identifier) {
                var t1 = this.tokenizer.next();
                if (t1.text == "(") {
                    var t2 = this.tokenizer.next();
                    if (t2.text == ")") {
                        var functionBody = this.parseFunctionBody();
                        if (FunctionBody.isFunctionBodyNode(functionBody)) {
                            return new FunctionDecl(t.text, functionBody);
                        }
                    }
                    else {
                        console.log("expecting ')' in FunctionDecl, while we got a " + t.text);
                        return;
                    }
                }
                else {
                    console.log("expecting '(' in FunctionDecl, while we got a " + t.text);
                    return;
                }
            }
        }
        // 解析不成功，回溯
        this.tokenizer.traceBack(oldPos);
        return null;
    };
    /* 语法规则 functionBody : '{' functionCall* '}' ; */
    Parser.prototype.parseFunctionBody = function () {
        var oldPos = this.tokenizer.position();
        var stmts = [];
        var t = this.tokenizer.next();
        if (t.text == "{") {
            var functionCall = this.parseFunctionCall();
            while (FunctionCall.isFunctionCallNode(functionCall)) {
                stmts.push(functionCall);
                functionCall = this.parseFunctionCall();
            }
            t = this.tokenizer.next();
            if (t.text == "}") {
                return new FunctionBody(stmts);
            }
            else {
                console.log("Excepcting '}' in FunctionBody, while we got a " + t.text);
                // return;
            }
        }
        else {
            console.log("Excepcting '{' in FunctionBody, while we got a " + t.text);
            // return;
        }
        this.tokenizer.traceBack(oldPos);
        return null;
    };
    // ar 我觉得这里应该是解析语句才对
    /* 语法规则 functionCall : Identifier '(' StringLiteral [ ',' StringLiteral ] ')' */
    Parser.prototype.parseFunctionCall = function () {
        var oldPos = this.tokenizer.position();
        var params = [];
        var t = this.tokenizer.next();
        if (t.kind == TokenKind.Identifier) {
            var t1 = this.tokenizer.next();
            if (t1.text == "(") {
                var t2 = this.tokenizer.next();
                while (t2.text != ")") {
                    if (t2.kind == TokenKind.StringLiteral) {
                        params.push(t2.text);
                    }
                    else {
                        console.log("Expecting parameter in FunctionCall, while we got a " + t2.text);
                        return; // 这里肯定不是尝试了，所以出错了，就不回溯了
                    }
                    t2 = this.tokenizer.next();
                    if (t2.text != ")") {
                        if (t2.text == ",") {
                            t2 = this.tokenizer.next();
                        }
                        else {
                            console.log("Expecting comma in FunctionCall, while we got a " + t2.text);
                            return;
                        }
                    }
                }
                //消化掉一个分号：;
                t2 = this.tokenizer.next();
                if (t2.text == ";") {
                    return new FunctionCall(t.text, params);
                }
                else {
                    console.log("Expecting a semicolon in FunctionCall, while we got a " + t2.text);
                    return;
                }
            }
        }
        this.tokenizer.traceBack(oldPos);
        return null;
    };
    return Parser;
}());
// 对AST左便利的Vistor
// 这是一个基类，定义了缺省的遍历方式。子类可以覆盖某些方法，修改遍历方式
var AstVisitor = /** @class */ (function () {
    function AstVisitor() {
    }
    AstVisitor.prototype.visitProg = function (prog) {
        var retVal;
        for (var _i = 0, _a = prog.stmts; _i < _a.length; _i++) {
            var x = _a[_i];
            if (typeof x.body === 'object') {
                retVal = this.visitFunctionDecl(x);
            }
            else {
                retVal = this.visitFunctionCall(x);
            }
        }
        return retVal;
    };
    AstVisitor.prototype.visitFunctionDecl = function (functionDecl) {
        return this.visitFunctionBody(functionDecl.body);
    };
    AstVisitor.prototype.visitFunctionBody = function (functionBody) {
        var retVal;
        for (var _i = 0, _a = functionBody.stmts; _i < _a.length; _i++) {
            var x = _a[_i];
            retVal = this.visitFunctionCall(x);
        }
        return retVal;
    };
    AstVisitor.prototype.visitFunctionCall = function (functionCall) {
        return undefined;
    };
    return AstVisitor;
}());
// ///////////////////////////////////////////////////////////////
// 语义分析
// 对函数调用左引用消解，也就是找到函数的声明。 ar 我觉得准确说应该是函数的定义
// 遍历AST 如果发现函数调用，就去找它的定义
var RefResolver = /** @class */ (function (_super) {
    __extends(RefResolver, _super);
    function RefResolver() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.prog = null;
        return _this;
    }
    RefResolver.prototype.visitProg = function (prog) {
        this.prog = prog;
        for (var _i = 0, _a = prog.stmts; _i < _a.length; _i++) {
            var x = _a[_i];
            var functionCall = x;
            if (typeof functionCall.parameters === 'object') {
                this.resolveFunctionCall(prog, functionCall);
            }
            else {
                this.visitFunctionDecl(x);
            }
        }
    };
    RefResolver.prototype.visitFunctionBody = function (functionBody) {
        if (this.prog != null) {
            for (var _i = 0, _a = functionBody.stmts; _i < _a.length; _i++) {
                var x = _a[_i];
                return this.resolveFunctionCall(this.prog, x);
            }
        }
    };
    RefResolver.prototype.resolveFunctionCall = function (prog, functionCall) {
        var functionDecl = this.findFunctionDecl(prog, functionCall.name);
        if (functionDecl != null) {
            functionCall.definition = functionDecl;
        }
        else {
            if (functionCall.name != "println") { // 系统内置函数不用报错
                console.log("Error: cannot find definition of function " + functionCall.name);
            }
        }
    };
    RefResolver.prototype.findFunctionDecl = function (prog, name) {
        for (var _i = 0, _a = prog === null || prog === void 0 ? void 0 : prog.stmts; _i < _a.length; _i++) {
            var x = _a[_i];
            var functionDecl = x;
            if (typeof functionDecl.body === 'object' && functionDecl.name == name) {
                return functionDecl;
            }
        }
        return null;
    };
    return RefResolver;
}(AstVisitor));
/////////////////////////
// 解释器
// 遍历AST，执行函数调用
var Intepretor = /** @class */ (function (_super) {
    __extends(Intepretor, _super);
    function Intepretor() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Intepretor.prototype.visitProg = function (prog) {
        var retVal;
        for (var _i = 0, _a = prog.stmts; _i < _a.length; _i++) {
            var x = _a[_i];
            var functionCall = x;
            if (typeof functionCall.parameters === 'object') {
                retVal = this.runFunction(functionCall);
            }
        }
        ;
        return retVal;
    };
    Intepretor.prototype.visitFunctionBody = function (functionBody) {
        var retVal;
        for (var _i = 0, _a = functionBody.stmts; _i < _a.length; _i++) {
            var x = _a[_i];
            retVal = this.runFunction(x);
        }
        ;
    };
    Intepretor.prototype.runFunction = function (functionCall) {
        if (functionCall.name == "println") {
            if (functionCall.parameters.length > 0) {
                console.log(functionCall.parameters[0]);
            }
            else {
                console.log();
            }
            return 0;
        }
        else {
            if (functionCall.definition != null) {
                this.visitFunctionBody(functionCall.definition.body);
            }
        }
    };
    return Intepretor;
}(AstVisitor));
function compileAndRun() {
    var tokenizer = new Tokenizer(tokenArray);
    console.log("\n程序所使用的Token:");
    for (var _i = 0, tokenArray_1 = tokenArray; _i < tokenArray_1.length; _i++) {
        var token = tokenArray_1[_i];
        console.log(token);
    }
    // 语法分析
    var prog = new Parser(tokenizer).parseProg();
    console.log("\n语法分析后的AST:");
    prog.dump("");
    // 语义分析
    new RefResolver().visitProg(prog);
    console.log("\n语义分析后的AST，注意自定义函数的调用已被消解:");
    prog.dump("");
    //运行程序
    console.log("\n运行当前的程序:");
    var retVal = new Intepretor().visitProg(prog);
    console.log("程序返回值：" + retVal);
}
compileAndRun();
