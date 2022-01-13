"use strict";
exports.__esModule = true;
exports.Parser = void 0;
var ast_1 = require("./ast");
var error_1 = require("./error");
var scanner_1 = require("./scanner");
var types_1 = require("./types");
var Parser = /** @class */ (function () {
    function Parser(scanner) {
        this.errors = []; // 语法错误
        this.warnings = []; // 语法报警
        this.opPrec = new Map([
            [scanner_1.Op.Assign, 2],
            [scanner_1.Op.PlusAssign, 2],
            [scanner_1.Op.MinusAssign, 2],
            [scanner_1.Op.MultiplyAssign, 2],
            [scanner_1.Op.DivideAssign, 2],
            [scanner_1.Op.ModulusAssign, 2],
            [scanner_1.Op.BitAndAssign, 2],
            [scanner_1.Op.BitOrAssign, 2],
            [scanner_1.Op.BitXorAssign, 2],
            [scanner_1.Op.LeftShiftArithmeticAssign, 2],
            [scanner_1.Op.RightShiftArithmeticAssign, 2],
            [scanner_1.Op.RightShiftLogicalAssign, 2],
            [scanner_1.Op.Or, 4],
            [scanner_1.Op.And, 5],
            [scanner_1.Op.BitOr, 6],
            [scanner_1.Op.BitXOr, 7],
            [scanner_1.Op.BitAnd, 8],
            [scanner_1.Op.EQ, 9],
            [scanner_1.Op.IdentityEquals, 9],
            [scanner_1.Op.NE, 9],
            [scanner_1.Op.IdentityNotEquals, 9],
            [scanner_1.Op.G, 10],
            [scanner_1.Op.GE, 10],
            [scanner_1.Op.L, 10],
            [scanner_1.Op.LE, 10],
            [scanner_1.Op.LeftShiftArithmetic, 11],
            [scanner_1.Op.RightShiftArithmetic, 11],
            [scanner_1.Op.RightShiftLogical, 11],
            [scanner_1.Op.Plus, 12],
            [scanner_1.Op.Minus, 12],
            [scanner_1.Op.Divide, 13],
            [scanner_1.Op.Multiply, 13],
            [scanner_1.Op.Modulus, 13],
        ]);
        this.scanner = scanner;
    }
    Parser.prototype.addError = function (msg, pos) {
        this.errors.push(new error_1.CompilerError(msg, pos, false));
        console.log("@" + pos.toString() + ": " + msg);
    };
    Parser.prototype.addWarn = function (msg, pos) {
        this.warnings.push(new error_1.CompilerError(msg, pos, true));
        console.log("@" + pos.toString() + ": " + msg);
    };
    // prog = statementList? EOF;
    // statementList = (variableDecl | functionDecl | expressionStatement)+ ;
    Parser.prototype.parseProg = function () {
        var beginPos = this.scanner.peek().pos;
        var stmts = this.parseStatementList();
        return new ast_1.Prog(beginPos, this.scanner.getLastPos(), stmts);
    };
    // statementList = (statement)+ ;
    Parser.prototype.parseStatementList = function () {
        var stmts = [];
        var t = this.scanner.peek();
        // statementList的Follow集合里有EOF和'}'这两个元素，分别用于prog和functionBody等场景。
        while (t.kind != scanner_1.TokenKind.EOF && t.code != scanner_1.Seperator.CloseBrace) {
            // this.scanner.next();
            var stmt = this.parseStatement();
            if (stmt != null) {
                stmts.push(stmt);
            }
            t = this.scanner.peek();
        }
        return stmts;
    };
    // statement: block | expressionStatement | returnStatement | ifStatement | forStatement 
    //            | emptyStatement | functionDecl | variableDecl ;
    // expressionStatement: expression ';' ;
    Parser.prototype.parseStatement = function () {
        var t = this.scanner.peek();
        if (t.code == scanner_1.Keyword.Function) {
            return this.parseFunctionDecl();
        }
        else if (t.code == scanner_1.Keyword.Let) {
            return this.parseVariableStatement();
        }
        else if (t.code == scanner_1.Keyword.Return) {
            return this.parseReturnStatement();
        }
        else if (t.code == scanner_1.Keyword.If) {
            return this.parseIfStatement();
        }
        else if (t.code == scanner_1.Keyword.For) {
            return this.parseForStatement();
        }
        else if (t.code == scanner_1.Seperator.OpenBrace) { // '{'
            return this.parseBlock();
        }
        else if (t.kind == scanner_1.TokenKind.Identifier ||
            t.kind == scanner_1.TokenKind.DecimalLiteral ||
            t.kind == scanner_1.TokenKind.IntegerLiteral ||
            t.kind == scanner_1.TokenKind.StringLiteral ||
            t.code == scanner_1.Seperator.OpenParen) { // '('
            return this.parseExpressionStatement();
        }
        else {
            this.addError("Can not recognize a expression starting with: " + this.scanner.peek().text, this.scanner.getLastPos());
            var beginPos = this.scanner.getNextPos();
            this.skip();
            return new ast_1.ErrorStmt(beginPos, this.scanner.getLastPos());
        }
    };
    // Return 语句
    // returnStatement: 'return' expression? ';' ;
    Parser.prototype.parseReturnStatement = function () {
        var beginPos = this.scanner.getNextPos();
        var exp = null;
        this.scanner.next(); // 跳过return
        // 解析后面的表达式， 在有多个分支的情况下，用peek
        var t = this.scanner.peek();
        if (t.code != scanner_1.Seperator.SemiColon) {
            exp = this.parseExpression();
        }
        t = this.scanner.next();
        if (t.text == ';') {
        }
        else {
            this.addError("Expecting ';' while parse ReturnStatement, but we got " + t.text, this.scanner.getLastPos());
        }
        return new ast_1.ReturnStatement(beginPos, this.scanner.getLastPos(), exp);
    };
    // ifStatement : 'if' '(' expression ')' statement ('else' statement)? ;
    Parser.prototype.parseIfStatement = function () {
        var beginPos = this.scanner.getNextPos();
        var isErrorNode = false;
        // 跳过if
        this.scanner.next();
        // 解析if条件
        var condition;
        var t = this.scanner.peek();
        if (t.code == scanner_1.Seperator.OpenParen) { // '('
            this.scanner.next();
            // 解析if的条件
            condition = this.parseExpression();
            t = this.scanner.peek();
            if (t.code == scanner_1.Seperator.CloseParen) {
                this.scanner.next();
            }
            else {
                this.addError("expecting ')' after if condition.", this.scanner.getLastPos());
                this.skip();
                isErrorNode = true;
            }
        }
        else {
            this.addError("Expecting '(' after 'if' while parse ifStatement, but we got a " + t.text, this.scanner.getLastPos());
            this.skip();
            condition = new ast_1.ErrorExp(beginPos, this.scanner.getLastPos());
        }
        // 解析then语法
        var stmt = this.parseStatement();
        // 解析else语句
        var elseStmt = null;
        t = this.scanner.peek();
        if (t.code == scanner_1.Keyword.Else) {
            this.scanner.next();
            elseStmt = this.parseStatement();
        }
        return new ast_1.IfStatement(beginPos, this.scanner.getLastPos(), condition, stmt, elseStmt, isErrorNode);
    };
    // forStatement : 'for' '(' expression? ';' expression? ';' expression? ')' statement ;
    Parser.prototype.parseForStatement = function () {
        var beginPos = this.scanner.getNextPos();
        var isErrorNode = false;
        var init = null;
        var condition = null;
        var increment = null;
        this.scanner.next(); // skip for
        var t = this.scanner.peek();
        if (t.code == scanner_1.Seperator.OpenParen) { // '('
            this.scanner.next();
            // init
            t = this.scanner.peek();
            if (t.code != scanner_1.Seperator.SemiColon) { // ';'
                if (t.code == scanner_1.Keyword.Let) {
                    this.scanner.next(); // skip 'let'
                    init = this.parseVariableDecl();
                }
                else {
                    init = this.parseExpression();
                }
            }
            // 这个条件判断时，无论哪种情况，这里是分号，才是对的；否则就错了
            t = this.scanner.peek();
            if (t.code == scanner_1.Seperator.SemiColon) {
                this.scanner.next(); // skip ';'
            }
            else {
                this.addError("expecting ';' after init part of forStatement, but we got a " + t.text, this.scanner.getLastPos());
                this.skip();
                isErrorNode = true;
            }
            // condition
            t = this.scanner.peek();
            if (t.code != scanner_1.Seperator.SemiColon) {
                condition = this.parseExpression();
            }
            t = this.scanner.peek();
            if (t.code == scanner_1.Seperator.SemiColon) {
                this.scanner.next(); // skip ';'
            }
            else {
                this.addError("expecting ';' after condition part of forStatement, but we got a " + t.text, this.scanner.getLastPos());
                this.skip();
                isErrorNode = true;
            }
            // increment
            t = this.scanner.peek();
            if (t.code != scanner_1.Seperator.CloseParen) {
                increment = this.parseExpression();
            }
            t = this.scanner.peek();
            if (t.code == scanner_1.Seperator.CloseParen) {
                this.scanner.next(); // skip ')'
            }
            else {
                this.addError("expecting ')' after increment of forStatement, but we got a " + t.text, this.scanner.getLastPos());
                this.skip();
                isErrorNode = true;
            }
        }
        else {
            this.addError("Expecting '(' after 'if' while parse forStatement, but we got a " + t.text, this.scanner.getLastPos());
            this.skip();
            isErrorNode = true;
        }
        // stmt
        var stmt = this.parseStatement();
        return new ast_1.ForStatement(beginPos, this.scanner.getLastPos(), init, condition, increment, stmt, isErrorNode);
    };
    /**
     * 解析变量声明语句
     * variableStatement : 'let' variableDecl ';';
     */
    Parser.prototype.parseVariableStatement = function () {
        var beginPos = this.scanner.getNextPos();
        var isErrorNode = false;
        this.scanner.next(); // 跳过'let'
        var variableDecl = this.parseVariableDecl();
        var t = this.scanner.peek();
        if (t.code == scanner_1.Seperator.SemiColon) { // ';'
            this.scanner.next();
        }
        else {
            this.addError("Expecting ';' while parse VariableStatement, but we got " + t.text, this.scanner.getLastPos());
            this.skip();
            isErrorNode = true;
        }
        return new ast_1.VariableStatement(beginPos, this.scanner.getLastPos(), variableDecl, isErrorNode);
    };
    // 解析变量声明
    // variableDecl : Identifier typeAnnotation？ ('=' expression)? ;
    // typeAnnotation : ':' typeName;
    // expression: assignment;
    // assignment: binary (assignmentOp binary)* ;
    // binary: unary (binOp unary)* ;   // unary是什么
    // unary: primary | prefixOp unary | primary postfixOp ;
    // prefixOp = '+' | '-' | '++' | '--' | '!' | '~';
    // postfixOp = '++' | '--'; 
    // primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
    // binOp: '+' | '-' | '*' | '/' | '==' | '!=' | '<=' | '>=' | '<' | '>' | '&&'| '||'|...;
    Parser.prototype.parseVariableDecl = function () {
        var beginPos = this.scanner.getNextPos();
        var t = this.scanner.next();
        if (t.kind == scanner_1.TokenKind.Identifier) {
            var varName = t.text;
            var varType = 'any';
            var init = null;
            var isErrorNode = false;
            var t1 = this.scanner.peek();
            // 类型注解
            if (t1.code == scanner_1.Seperator.Colon) { //':'
                this.scanner.next();
                var t2 = this.scanner.peek();
                if (t2.kind == scanner_1.TokenKind.Identifier) {
                    this.scanner.next();
                    varType = t2.text;
                }
                else {
                    this.addError("Error parsing type annotation in VariableDecl", this.scanner.getLastPos());
                    this.skip(['=']); // 这里为什么传=
                    isErrorNode = true;
                }
            }
            //初始化部分
            t1 = this.scanner.peek();
            if (t1.code == scanner_1.Op.Assign) { // '='
                this.scanner.next();
                init = this.parseExpression();
            }
            return new ast_1.VariableDecl(beginPos, this.scanner.getLastPos(), varName, this.parseType(varType), init, isErrorNode);
        }
        else {
            this.addError("Expecting variable name in VariableDecl, while we got " + t.text, this.scanner.getLastPos());
            this.skip();
            return new ast_1.VariableDecl(beginPos, this.scanner.getLastPos(), "unknow", types_1.SysTypes.Any, null, true);
        }
    };
    Parser.prototype.parseType = function (typeName) {
        switch (typeName) {
            case 'any':
                return types_1.SysTypes.Any;
            case 'number':
                return types_1.SysTypes.Number;
            case 'boolean':
                return types_1.SysTypes.Boolean;
            case 'string':
                return types_1.SysTypes.String;
            case 'undefined':
                return types_1.SysTypes.Undefined;
            case 'null':
                return types_1.SysTypes.Null;
            case 'void':
                return types_1.SysTypes.Void;
            default:
                this.addError("Unrecognized type: " + typeName, this.scanner.getLastPos());
                return types_1.SysTypes.Any;
        }
    };
    // 解析函数声明
    // functionDecl: "function" Identifier callSignature block;
    // callSignature: '(' parameterList? ')' typeAnnotation? ;
    // parameterList : parameter (',' parameter)* ;
    // parameter : Identifier typeAnnotation? ;
    // block : '{' statementList? '}' ;
    Parser.prototype.parseFunctionDecl = function () {
        var beginPos = this.scanner.getNextPos();
        var isErrorNode = false;
        var t = this.scanner.peek();
        if (t.text != "function") {
            this.addError("Expecting function in FunctionDecl, while we got " + t.text, this.scanner.getLastPos());
        }
        this.scanner.next();
        t = this.scanner.next();
        if (t.kind != scanner_1.TokenKind.Identifier) {
            this.addError("Expecting a function name, while we got a " + t.text, this.scanner.getLastPos());
            this.skip();
            isErrorNode = true;
        }
        // 解析callSignature
        var callSignature;
        var t1 = this.scanner.peek();
        if (t1.code == scanner_1.Seperator.OpenParen) {
            callSignature = this.parseCallSignature();
        }
        else {
            this.addError("expecting '(' in FunctionDecl, while we got a " + t.text, this.scanner.getLastPos());
            this.skip();
            callSignature = new ast_1.CallSignature(beginPos, this.scanner.getLastPos(), null, types_1.SysTypes.Any, true);
        }
        // 解析block
        var functionBody;
        t1 = this.scanner.peek();
        if (t1.code == scanner_1.Seperator.OpenBrace) { // '{'
            functionBody = this.parseBlock();
        }
        else {
            this.addError("expecting '{' in FunctionDecl, while we got a " + t1.text, this.scanner.getLastPos());
            this.skip();
            functionBody = new ast_1.Block(beginPos, this.scanner.getLastPos(), [], true);
        }
        return new ast_1.FunctionDecl(beginPos, t.text, callSignature, functionBody, isErrorNode);
    };
    // 解析函数签名
    // callSignature: '(' parameterList? ')' typeAnnotation? ;
    Parser.prototype.parseCallSignature = function () {
        var beginPos = this.scanner.getNextPos();
        var isErrorNode = false;
        var t = this.scanner.next();
        var paramList = null;
        if (this.scanner.peek().code != scanner_1.Seperator.OpenParen) { // '('
            paramList = this.parseParameterList();
        }
        t = this.scanner.peek();
        var theType = 'any';
        if (t.code == scanner_1.Seperator.CloseParen) {
            this.scanner.next();
            if (this.scanner.peek().code == scanner_1.Seperator.Colon) {
                theType = this.parseTypeAnnotation();
            }
        }
        else {
            this.addError("expecting a ')' after for a call signature", this.scanner.getLastPos());
            isErrorNode = true;
        }
        return new ast_1.CallSignature(beginPos, this.scanner.getLastPos(), paramList, this.parseType(theType), isErrorNode);
    };
    // 解析参数列表
    // parameterList : parameter (',' parameter)* ;
    Parser.prototype.parseParameterList = function () {
        var params = [];
        var beginPos = this.scanner.getNextPos();
        var isErrorNode = false;
        var t = this.scanner.peek();
        while (t.code != scanner_1.Seperator.CloseParen && t.kind != scanner_1.TokenKind.EOF) {
            if (t.kind == scanner_1.TokenKind.Identifier) {
                this.scanner.next();
                var t1 = this.scanner.peek();
                var theType = 'any';
                if (t1.code == scanner_1.Seperator.Colon) {
                    theType = this.parseTypeAnnotation();
                }
                params.push(new ast_1.VariableDecl(beginPos, this.scanner.getLastPos(), t.text, this.parseType(theType), null));
                t = this.scanner.peek();
                if (t.code != scanner_1.Seperator.CloseParen) {
                    if (t.code == scanner_1.Op.Comma) {
                        this.scanner.next();
                        t = this.scanner.peek();
                    }
                    else {
                        this.addError("Expecting a ',' or ')' after a parameter", this.scanner.getLastPos());
                        this.skip();
                        isErrorNode = true;
                        //todo ?
                    }
                }
            }
            else {
                this.addError("expecting an identifier as name of Parameter", this.scanner.getLastPos());
                this.skip();
                isErrorNode = true;
                // todo ?
            }
        }
        return new ast_1.ParameterList(beginPos, this.scanner.getLastPos(), params, isErrorNode);
    };
    // 解析类型注解
    // typeAnnotation : ':' typeName;
    Parser.prototype.parseTypeAnnotation = function () {
        var theType = 'any';
        this.scanner.next();
        var t = this.scanner.peek();
        if (t.kind == scanner_1.TokenKind.Identifier) { // 这里如果是关键字 string,number等,即没有支持系统内置类型 应该支持parseType中所有类型
            this.scanner.next();
            theType = t.text;
        }
        else {
            this.addError("Expecting a type name in type annotation", this.scanner.getLastPos());
        }
        return theType;
    };
    // 解析代码块
    // block : '{' statementList? '}' ;
    // statementList = (variableDecl | functionDecl | expressionStatement)+ ;
    Parser.prototype.parseBlock = function () {
        var beginPos = this.scanner.getNextPos();
        var t = this.scanner.peek();
        var stmts = [];
        if (t.text == "{") {
            this.scanner.next();
            stmts = this.parseStatementList();
            t = this.scanner.next();
            if (t.text == "}") {
                return new ast_1.Block(beginPos, this.scanner.getLastPos(), stmts);
            }
            else {
                this.addError("Expecting '}' while parsing a block, but we got a " + t.text, this.scanner.getLastPos());
                this.skip();
                return new ast_1.Block(beginPos, this.scanner.getLastPos(), stmts, true);
            }
        }
        else {
            this.addError("Expectiong '{' while parsing a block, while we got a " + t.text, this.scanner.getLastPos());
            this.skip();
            return new ast_1.Block(beginPos, this.scanner.getLastPos(), stmts);
        }
    };
    // 解析表达式语句
    // expressionStatement: expression ';' ;
    Parser.prototype.parseExpressionStatement = function () {
        var exp = this.parseExpression();
        var t = this.scanner.peek();
        var stmt = new ast_1.ExpressionStatement(this.scanner.getLastPos(), exp);
        if (t.text == ";") {
            this.scanner.next();
        }
        else {
            this.addError("Expecting ';' while parse ExpressionStatement, but we got a " + t.text, this.scanner.getLastPos());
            this.skip();
            stmt.endPos = this.scanner.getLastPos();
            stmt.isErrorNode = true;
        }
        return stmt;
    };
    // 解析表达式
    // expression: assignment;
    Parser.prototype.parseExpression = function () {
        return this.parseAssignment();
    };
    // 解析赋值表达式
    // 注意： 赋值表达式是右结合的
    // assignment: binary (assignmentOp binary)* ;
    Parser.prototype.parseAssignment = function () {
        var assignPrec = this.getPrec(scanner_1.Op.Assign);
        // 先解析一个优先级更高的表达式
        var exp1 = this.parseBinary(assignPrec);
        var t = this.scanner.peek();
        var lprec = this.getPrec(t.code);
        // 存放赋值运算符两边的表达式
        var expStack = [];
        expStack.push(exp1);
        // 存放赋值运算符
        var opStack = [];
        // 解析赋值表达式
        while (t.kind == scanner_1.TokenKind.Operator && lprec == assignPrec) {
            opStack.push(t.code);
            this.scanner.next(); // 跳过运算符
            // 获取运算符优先级高于assignment的二元表达式
            exp1 = this.parseBinary(assignPrec);
            expStack.push(exp1);
            t = this.scanner.peek();
            lprec = this.getPrec(t.code);
        }
        // 组装成右结合的AST 这段没看懂。。 ？感觉有点难哈
        exp1 = expStack[expStack.length - 1];
        if (opStack.length > 0) {
            for (var i = expStack.length - 2; i >= 0; i--) {
                exp1 = new ast_1.Binary(opStack[i], expStack[i], exp1);
            }
        }
        return exp1;
    };
    // 采用运算符优先级算法，解析二元表达式
    // binary: unary (binOp unary)* ;
    // expression: primary (binOP primary)* ;
    // primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
    Parser.prototype.parseBinary = function (lprec) {
        var exp1 = this.parseUnary();
        var t = this.scanner.peek();
        var rprec = this.getPrec(t.code);
        /**
         * 下面这个循环的意思是：只要右边出现的新运算符的优先级更高
         * 那么就把右边出现的作为右子节点。
         *
         * 对于2+3*5
         * 第一次循环，遇到+号，优先级大于零，所以做一次递归的binary
         * 在递归的binary中，遇到乘号，优先级大于+号，所以最后形成3*5返回，这时自动变成的+号的右子节点
         *
         * 对于3*5+2
         * 第一次循环，遇到*号，优先级大于零，所以做一次递归的binary
         * 在递归的binary中，遇到加号，优先级小于*号，所以只返回5，和前一个节点形成3*5
         */
        while (t.kind == scanner_1.TokenKind.Operator && rprec > lprec) {
            this.scanner.next(); // 跳过运算符
            var exp2 = this.parseBinary(rprec); // 这个调用实际上是一个过程，什么过程呢，（不停的找）直到找到一个 右侧运算符 不大于 左侧运算符 的状态，这就是这段算法的临界点
            var exp = new ast_1.Binary(t.code, exp1, exp2);
            exp1 = exp;
            t = this.scanner.peek(); // 这里表示第二种例子的+号，+号将和默认值0比较
            rprec = this.getPrec(t.code);
        }
        return exp1;
    };
    // 解析一元运算
    // unary: primary | prefixOp unary | primary postfixOp ;
    Parser.prototype.parseUnary = function () {
        var beginPos = this.scanner.getNextPos();
        var t = this.scanner.peek();
        // 前缀的一元表达式
        if (t.kind == scanner_1.TokenKind.Operator) {
            this.scanner.next(); // 跳过运算符？
            var exp = this.parseUnary();
            return new ast_1.Unary(beginPos, this.scanner.getLastPos(), t.code, exp, true);
        }
        // 后缀只可能是++或--
        else {
            // 首先解析一个primary
            var exp = this.parsePrimary();
            var t1 = this.scanner.peek();
            if (t1.kind == scanner_1.TokenKind.Operator && (t1.code == scanner_1.Op.Inc || t1.code == scanner_1.Op.Dec)) {
                this.scanner.next();
                return new ast_1.Unary(beginPos, this.scanner.getLastPos(), t1.code, exp, false);
            }
            else {
                return exp;
            }
        }
    };
    // 解析基础表达式
    // primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
    // expression: assignment; 
    // assignment: binary (assignmentOp binary)* ;
    // binary: unary (binOp unary)* ;
    Parser.prototype.parsePrimary = function () {
        var beginPos = this.scanner.getNextPos();
        var t = this.scanner.peek();
        // 作者说：以Identifier开头，可能是函数调用，也可能是一个变量，所以这里要再多向后看一个Token
        // 这相当于在局部使用了LL（2）算法。
        if (t.kind == scanner_1.TokenKind.Identifier) {
            var t2 = this.scanner.peek2();
            if (t2.text == '(') {
                return this.parseFunctionCall();
            }
            else {
                this.scanner.next();
                return new ast_1.Variable(beginPos, this.scanner.getLastPos(), t.text);
            }
        }
        else if (t.kind == scanner_1.TokenKind.IntegerLiteral) {
            this.scanner.next();
            return new ast_1.IntegerLiteral(beginPos, parseInt(t.text));
        }
        else if (t.kind == scanner_1.TokenKind.DecimalLiteral) {
            this.scanner.next();
            return new ast_1.DecimalLiteral(beginPos, parseFloat(t.text));
        }
        else if (t.kind == scanner_1.TokenKind.StringLiteral) {
            this.scanner.next();
            return new ast_1.StringLiteral(beginPos, t.text);
        }
        else if (t.text == '(') {
            this.scanner.next(); // 消耗掉(
            var exp = this.parseExpression();
            var t1 = this.scanner.peek();
            if (t1.text == ')') {
                this.scanner.next();
            }
            else {
                this.addError("Expecting a ')' at the end of a primary expresson, while we got a " + t.text, this.scanner.getLastPos());
                this.skip();
            }
            return exp;
        }
        else {
            // 理论上永远不会到达这里
            this.addError("Can not recognize a primary expression starting with: " + t.text, this.scanner.getLastPos());
            var exp = new ast_1.ErrorExp(beginPos, this.scanner.getLastPos());
            return exp;
        }
    };
    // 解析函数调用
    // functionCall : Identifier '(' parameterList? ')' ;
    // parameterList : expression (',' expression)* ;
    Parser.prototype.parseFunctionCall = function () {
        var beginPos = this.scanner.getNextPos();
        var params = [];
        var name = "";
        var t = this.scanner.next(); // 获取名字
        // if (t.kind == TokenKind.Identifier) {
        name = t.text;
        var t1 = this.scanner.next(); // 获取'('
        if (t1.code == scanner_1.Seperator.OpenParen) {
            t1 = this.scanner.peek();
            while (t1.code != scanner_1.Seperator.CloseParen && t1.kind != scanner_1.TokenKind.EOF) { // ')'
                var p = this.parseExpression();
                params.push(p);
                // 如果有错误信息，可以尽量的打印出来，这样对初级的你有帮助
                if (p === null || p === void 0 ? void 0 : p.isErrorNode) {
                    console.log("Error parsing parameter for function call " + name);
                    this.addError("Error parsing parameter for function call " + name, this.scanner.getLastPos());
                }
                t1 = this.scanner.peek();
                if (t1.code != scanner_1.Seperator.CloseParen) { // ')'
                    if (t1.code == scanner_1.Op.Comma) { // ','
                        this.scanner.next(); // 消耗掉 ','
                    }
                    else { // 这里体验的语法的白名单功能，严谨（第一次写的时候，我并没有在这里报错）
                        this.addError("Expecting a comma at the end of a function call, while we got a " + t1.text, this.scanner.getLastPos());
                        this.skip();
                        return new ast_1.FunctionCall(beginPos, this.scanner.getLastPos(), name, params, true);
                    }
                }
            }
            if (t1.code == scanner_1.Seperator.CloseParen) {
                this.scanner.next(); // 消耗掉 ')'
            }
        }
        else {
            console.log("expecting ( when parseFunctionCall, but we got a " + t1.text);
        }
        // }
        return new ast_1.FunctionCall(beginPos, this.scanner.getLastPos(), name, params);
    };
    /**
     * 跳过一些Token，用于错误恢复，以便继续解析后面Token
     */
    Parser.prototype.skip = function (seperators) {
        if (seperators === void 0) { seperators = []; }
        var t = this.scanner.peek();
        while (t.kind != scanner_1.TokenKind.EOF) {
            if (t.kind == scanner_1.TokenKind.Keyword) { // 遇到关键字停止跳跃
                return;
            }
            else if (t.kind == scanner_1.TokenKind.Seperator &&
                (t.text == ',' || t.text == ';' ||
                    t.text == '{' || t.text == '}' ||
                    t.text == '(' || t.text == ')' ||
                    seperators.indexOf(t.text) != -1)) {
                return;
            }
            else {
                this.scanner.next();
                t = this.scanner.peek();
            }
        }
    };
    Parser.prototype.getPrec = function (op) {
        var ret = this.opPrec.get(op);
        if (typeof ret == 'undefined') {
            return -1;
        }
        else {
            return ret;
        }
    };
    return Parser;
}());
exports.Parser = Parser;
