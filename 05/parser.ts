import { Binary, Block, CallSignature, DecimalLiteral, ErrorExp, ErrorStmt, Expression, ExpressionStatement, FunctionCall, FunctionDecl, IntegerLiteral, ParameterList, Prog, ReturnStatement, Statement, StringLiteral, Unary, Variable, VariableDecl, VariableStatement } from "./ast";
import { CompilerError } from "./error";
import { Keyword, Op, Position, Scanner, Seperator, Token, TokenKind } from "./scanner";
import { SysTypes, Type } from "./types";


export class Parser {
    scanner: Scanner;
    constructor(scanner: Scanner) {
        this.scanner = scanner;
    }

    errors: CompilerError[] = [];    // 语法错误
    warnings: CompilerError[] = [];  // 语法报警

    addError(msg: string, pos: Position) {
        this.errors.push(new CompilerError(msg, pos, false));
        console.log("@" + pos.toString() + ": " + msg);
    }

    addWarn(msg: string, pos: Position) {
        this.warnings.push(new CompilerError(msg, pos, true));
        console.log("@" + pos.toString() + ": " + msg);
    }


    // prog = statementList? EOF;
    // statementList = (variableDecl | functionDecl | expressionStatement)+ ;
    parseProg(): Prog {
        let beginPos = this.scanner.peek().pos;
        let stmts = this.parseStatementList();

        return new Prog(beginPos, this.scanner.getLastPos(), stmts);
    }

    // statementList = (statement)+ ;
    parseStatementList(): Statement[] {
        let stmts: Statement[] = [];
        let t = this.scanner.peek();
        // statementList的Follow集合里有EOF和'}'这两个元素，分别用于prog和functionBody等场景。
        while (t.kind != TokenKind.EOF && t.code != Seperator.CloseBrace) {
            // this.scanner.next();
            let stmt = this.parseStatement();
            if (stmt != null) {
                stmts.push(stmt);
            }
            t = this.scanner.peek();
        }
        return stmts;
    }

    // statement: functionDecl ｜ variableDecl | expressionStatement;
    // expressionStatement: expression ';' ;
    parseStatement(): Statement | null {
        let t = this.scanner.peek();
        if (t.kind == TokenKind.Keyword && t.code == Keyword.Function) {
            return this.parseFunctionDecl();
        }
        else if (t.kind == TokenKind.Keyword && t.code == Keyword.Return) {
            return this.parseReturnStatement();
        }
        else if (t.code == Keyword.Let) {
            return this.parseVariableStatement();
        }
        else if (t.code == Seperator.OpenBrace) {   // '{'
            return this.parseBlock();
        }
        else if (t.kind == TokenKind.Identifier ||
            t.kind == TokenKind.DecimalLiteral ||
            t.kind == TokenKind.IntegerLiteral ||
            t.kind == TokenKind.StringLiteral ||
            t.code == Seperator.OpenParen) {    // '('
            return this.parseExpressionStatement();
        }
        else {
            this.addError("Can not recognize a expression starting with: " + this.scanner.peek().text, this.scanner.getLastPos());
            let beginPos = this.scanner.getNextPos();
            this.skip();
            return new ErrorStmt(beginPos, this.scanner.getLastPos());
        }
    }

    // Return 语句
    // returnStatement: 'return' expression? ';' ;
    parseReturnStatement(): Statement | null {
        let beginPos = this.scanner.getNextPos();
        let exp: Expression | null = null;
        this.scanner.next();    // 跳过return

        // 解析后面的表达式， 在有多个分支的情况下，用peek
        let t = this.scanner.peek();
        if (t.code != Seperator.SemiColon) {
            exp = this.parseExpression();
        }

        t = this.scanner.next();
        if (t.text == ';') {

        }
        else {
            this.addError("Expecting ';' while parse ReturnStatement, but we got " + t.text, this.scanner.getLastPos());
        }
        return new ReturnStatement(beginPos, this.scanner.getLastPos(), exp);
    }

    /**
     * 解析变量声明语句
     * variableStatement : 'let' variableDecl ';';
     */
    parseVariableStatement(): VariableStatement {
        let beginPos = this.scanner.getNextPos();
        let isErrorNode = false;

        this.scanner.next(); // 跳过'let'

        let variableDecl = this.parseVariableDecl();
        let t = this.scanner.peek();
        if (t.code == Seperator.SemiColon) {    // ';'
            this.scanner.next();
        }
        else {
            this.addError("Expecting ';' while parse VariableStatement, but we got " + t.text, this.scanner.getLastPos());
            this.skip();
            isErrorNode = true;
        }
        return new VariableStatement(beginPos, this.scanner.getLastPos(), variableDecl, isErrorNode);
    }

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
    parseVariableDecl(): VariableDecl {
        let beginPos = this.scanner.getNextPos();
        let t = this.scanner.next();
        if (t.kind == TokenKind.Identifier) {
            let varName: string = t.text;

            let varType: string = 'any';
            let init: Expression | null = null;
            let isErrorNode = false;

            let t1 = this.scanner.peek();
            // 类型注解
            if (t1.text == ':') {
                this.scanner.next();
                let t2 = this.scanner.peek();
                if (t2.kind == TokenKind.Identifier || t2.kind == TokenKind.Keyword) {
                    this.scanner.next();
                    varType = t2.text;
                }
                else {
                    this.addError("Error parsing type annotation in VariableDecl", this.scanner.getLastPos());
                    this.skip(['=']);   // 这里为什么传=
                    isErrorNode = true;
                }
            }

            //初始化部分
            t1 = this.scanner.peek();
            if (t1.text == '=') {
                this.scanner.next();
                init = this.parseExpression();
            }
            return new VariableDecl(beginPos, this.scanner.getLastPos(), varName, this.parseType(varType), init, isErrorNode);
        }
        else {
            this.addError("Expecting variable name in VariableDecl, while we got " + t.text, this.scanner.getLastPos());
            this.skip();
            return new VariableDecl(beginPos, this.scanner.getLastPos(), "unknow", SysTypes.Any, null, true);
        }
    }

    private parseType(typeName: string): Type {
        switch (typeName) {
            case 'any':
                return SysTypes.Any;
            case 'number':
                return SysTypes.Number;
            case 'boolean':
                return SysTypes.Boolean;
            case 'string':
                return SysTypes.String;
            case 'undefined':
                return SysTypes.Undefined
            case 'null':
                return SysTypes.Null;
            case 'void':
                return SysTypes.Void;
            default:
                this.addError("Unrecognized type: " + typeName, this.scanner.getLastPos());
                return SysTypes.Any;
        }
    }

    // 解析函数声明
    // functionDecl: "function" Identifier callSignature block;
    // callSignature: '(' parameterList? ')' typeAnnotation? ;
    // parameterList : parameter (',' parameter)* ;
    // parameter : Identifier typeAnnotation? ;
    // block : '{' statementList? '}' ;
    parseFunctionDecl(): FunctionDecl {
        let beginPos = this.scanner.getNextPos();
        let isErrorNode = false;

        let t = this.scanner.peek();
        if (t.text != "function") {
            this.addError("Expecting function in FunctionDecl, while we got " + t.text, this.scanner.getLastPos());
        }
        this.scanner.next();

        t = this.scanner.next();
        if (t.kind != TokenKind.Identifier) {
            this.addError("Expecting a function name, while we got a " + t.text, this.scanner.getLastPos());
            this.skip();
            isErrorNode = true;
        }

        // 解析callSignature
        let callSignature: CallSignature;
        let t1 = this.scanner.peek();
        if (t1.code == Seperator.OpenParen) {
            callSignature = this.parseCallSignature();
        }
        else {
            this.addError("expecting '(' in FunctionDecl, while we got a " + t.text, this.scanner.getLastPos());
            this.skip();
            callSignature = new CallSignature(beginPos, this.scanner.getLastPos(), null, SysTypes.Any, true);
        }

        // 解析block
        let functionBody: Block;
        t1 = this.scanner.peek();
        if (t1.code == Seperator.OpenBrace) { // '{'
            functionBody = this.parseBlock();
        }
        else {
            this.addError("expecting '{' in FunctionDecl, while we got a " + t1.text, this.scanner.getLastPos());
            this.skip();
            functionBody = new Block(beginPos, this.scanner.getLastPos(), [], true);
        }
        return new FunctionDecl(beginPos, t.text, callSignature, functionBody, isErrorNode);
    }

    // 解析函数签名
    // callSignature: '(' parameterList? ')' typeAnnotation? ;
    parseCallSignature(): CallSignature {
        let beginPos = this.scanner.getNextPos();
        let isErrorNode = false;
        let t = this.scanner.next();

        let paramList = null;
        if (this.scanner.peek().code != Seperator.OpenParen) { // '('
            paramList = this.parseParameterList();
        }

        t = this.scanner.peek();
        let theType: string = 'any';
        if (t.code == Seperator.CloseParen) {
            this.scanner.next();
            if (this.scanner.peek().code == Seperator.Colon) {
                theType = this.parseTypeAnnotation();
            }
        }
        else {
            this.addError("expecting a ')' after for a call signature", this.scanner.getLastPos());
            isErrorNode = true
        }
        return new CallSignature(beginPos, this.scanner.getLastPos(), paramList, this.parseType(theType), isErrorNode);
    }

    // 解析参数列表
    // parameterList : parameter (',' parameter)* ;
    parseParameterList(): ParameterList {
        let params: VariableDecl[] = []
        let beginPos = this.scanner.getNextPos();
        let isErrorNode = false;
        let t = this.scanner.peek();
        while (t.code != Seperator.CloseParen && t.kind != TokenKind.EOF) {
            if (t.kind == TokenKind.Identifier) {
                this.scanner.next();
                let t1 = this.scanner.peek();
                let theType: string = 'any';
                if (t1.code == Seperator.Colon) {
                    theType = this.parseTypeAnnotation();
                }
                params.push(new VariableDecl(beginPos, this.scanner.getLastPos(), t.text, this.parseType(theType), null));

                t = this.scanner.peek();
                if (t.code != Seperator.CloseParen) {
                    if (t.code == Op.Comma) {
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
                this.skip()
                isErrorNode = true;
                // todo ?
            }
        }
        return new ParameterList(beginPos, this.scanner.getLastPos(), params, isErrorNode);
    }

    // 解析类型注解
    // typeAnnotation : ':' typeName;
    parseTypeAnnotation(): string {
        let theType = 'any';

        this.scanner.next();

        let t = this.scanner.peek();
        if (t.kind == TokenKind.Identifier) {   // 这里如果是关键字 string,number等,即没有支持系统内置类型 应该支持parseType中所有类型
            this.scanner.next();
            theType = t.text;
        }
        else {
            this.addError("Expecting a type name in type annotation", this.scanner.getLastPos());
        }

        return theType;
    }

    // 解析代码块
    // block : '{' statementList? '}' ;
    // statementList = (variableDecl | functionDecl | expressionStatement)+ ;
    parseBlock(): Block {
        let beginPos = this.scanner.getNextPos();
        let t: Token = this.scanner.peek();
        let stmts: Statement[] = [];
        if (t.text == "{") {
            this.scanner.next();
            stmts = this.parseStatementList();
            t = this.scanner.next();
            if (t.text == "}") {
                return new Block(beginPos, this.scanner.getLastPos(), stmts);
            }
            else {
                this.addError("Expecting '}' while parsing a block, but we got a " + t.text, this.scanner.getLastPos());
                this.skip();
                return new Block(beginPos, this.scanner.getLastPos(), stmts, true);
            }
        }
        else {
            this.addError("Expectiong '{' while parsing a block, while we got a " + t.text, this.scanner.getLastPos());
            this.skip();
            return new Block(beginPos, this.scanner.getLastPos(), stmts);
        }
    }

    // 解析表达式语句
    // expressionStatement: expression ';' ;
    parseExpressionStatement(): ExpressionStatement {
        let exp = this.parseExpression();
        let t = this.scanner.peek();
        let stmt = new ExpressionStatement(this.scanner.getLastPos(), exp);
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
    }

    // 解析表达式
    // expression: assignment;
    parseExpression(): Expression {
        return this.parseAssignment();
    }

    // 解析赋值表达式
    // 注意： 赋值表达式是右结合的
    // assignment: binary (assignmentOp binary)* ;
    parseAssignment(): Expression {
        let assignPrec = this.getPrec(Op.Assign);
        // 先解析一个优先级更高的表达式
        let exp1 = this.parseBinary(assignPrec);

        let t = this.scanner.peek();
        let lprec = this.getPrec(t.code as Op);

        // 存放赋值运算符两边的表达式
        let expStack: Expression[] = [];
        expStack.push(exp1);

        // 存放赋值运算符
        let opStack: Op[] = [];

        // 解析赋值表达式
        while (t.kind == TokenKind.Operator && lprec == assignPrec) {
            opStack.push(t.code as Op);
            this.scanner.next();    // 跳过运算符
            // 获取运算符优先级高于assignment的二元表达式
            exp1 = this.parseBinary(assignPrec);
            expStack.push(exp1);
            t = this.scanner.peek();
            lprec = this.getPrec(t.code as Op);
        }

        // 组装成右结合的AST 这段没看懂。。 ？感觉有点难哈
        exp1 = expStack[expStack.length - 1];
        if (opStack.length > 0) {
            for (let i: number = expStack.length - 2; i >= 0; i--) {
                exp1 = new Binary(opStack[i], expStack[i], exp1);
            }
        }
        return exp1;
    }

    // 采用运算符优先级算法，解析二元表达式
    // binary: unary (binOp unary)* ;
    // expression: primary (binOP primary)* ;
    // primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
    parseBinary(lprec: number): Expression {
        let exp1 = this.parseUnary();
        let t = this.scanner.peek();
        let rprec = this.getPrec(t.code as Op);

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
        while (t.kind == TokenKind.Operator && rprec > lprec) {
            this.scanner.next();    // 跳过运算符
            let exp2 = this.parseBinary(rprec); // 这个调用实际上是一个过程，什么过程呢，（不停的找）直到找到一个 右侧运算符 不大于 左侧运算符 的状态，这就是这段算法的临界点

            let exp: Binary = new Binary(t.code as Op, exp1, exp2);
            exp1 = exp;
            t = this.scanner.peek();    // 这里表示第二种例子的+号，+号将和默认值0比较
            rprec = this.getPrec(t.code as Op);
        }
        return exp1;
    }

    // 解析一元运算
    // unary: primary | prefixOp unary | primary postfixOp ;
    parseUnary(): Expression {
        let beginPos = this.scanner.getNextPos();
        let t = this.scanner.peek();

        // 前缀的一元表达式
        if (t.kind == TokenKind.Operator) {
            this.scanner.next();    // 跳过运算符？
            let exp = this.parseUnary();
            return new Unary(beginPos, this.scanner.getLastPos(), t.code as Op, exp, true);
        }
        // 后缀只可能是++或--
        else {
            // 首先解析一个primary
            let exp = this.parsePrimary();
            let t1 = this.scanner.peek();
            if (t1.kind == TokenKind.Operator && (t1.code == Op.Inc || t1.code == Op.Dec)) {
                this.scanner.next();
                return new Unary(beginPos, this.scanner.getLastPos(), t1.code as Op, exp, false);
            }
            else {
                return exp;
            }
        }
    }

    // 解析基础表达式
    // primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
    // expression: assignment; 
    // assignment: binary (assignmentOp binary)* ;
    // binary: unary (binOp unary)* ;
    parsePrimary(): Expression {
        let beginPos = this.scanner.getNextPos();
        let t = this.scanner.peek();

        // 作者说：以Identifier开头，可能是函数调用，也可能是一个变量，所以这里要再多向后看一个Token
        // 这相当于在局部使用了LL（2）算法。
        if (t.kind == TokenKind.Identifier) {
            let t2 = this.scanner.peek2();
            if (t2.text == '(') {
                return this.parseFunctionCall();
            }
            else {
                this.scanner.next();
                return new Variable(beginPos, this.scanner.getLastPos(), t.text);
            }
        }
        else if (t.kind == TokenKind.IntegerLiteral) {
            this.scanner.next();
            return new IntegerLiteral(beginPos, parseInt(t.text));
        }
        else if (t.kind == TokenKind.DecimalLiteral) {
            this.scanner.next();
            return new DecimalLiteral(beginPos, parseFloat(t.text));
        }
        else if (t.kind == TokenKind.StringLiteral) {
            this.scanner.next();
            return new StringLiteral(beginPos, t.text);
        }
        else if (t.text == '(') {
            this.scanner.next(); // 消耗掉(
            let exp = this.parseExpression();
            let t1 = this.scanner.peek();
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
            let exp = new ErrorExp(beginPos, this.scanner.getLastPos());
            return exp;
        }
    }

    // 解析函数调用
    // functionCall : Identifier '(' parameterList? ')' ;
    // parameterList : expression (',' expression)* ;
    parseFunctionCall(): FunctionCall {
        let beginPos = this.scanner.getNextPos();
        let params: Expression[] = [];
        let name = "";
        let t: Token = this.scanner.next(); // 获取名字
        // if (t.kind == TokenKind.Identifier) {
        name = t.text;

        let t1 = this.scanner.next();   // 获取'('

        if (t1.text == '(') {
            t1 = this.scanner.peek();
            while (t1.text != ')' && t1.kind != TokenKind.EOF) {
                let p = this.parseExpression();
                params.push(p);

                // 如果有错误信息，可以尽量的打印出来，这样对初级的你有帮助
                if (p?.isErrorNode){
                    console.log("Error parsing parameter for function call "+name);
                    this.addError("Error parsing parameter for function call "+name, this.scanner.getLastPos());
                }

                t1 = this.scanner.peek();
                if (t1.text != ')') {
                    if (t1.text == ',') {
                        this.scanner.next(); // 消耗掉 ','
                    }
                    else {  // 这里体验的语法的白名单功能，严谨（第一次写的时候，我并没有在这里报错）
                        this.addError("Expecting a comma at the end of a function call, while we got a " + t1.text, this.scanner.getLastPos());
                        this.skip();
                        return new FunctionCall(beginPos, this.scanner.getLastPos(), name, params, true);
                    }
                }
            }
            if (t1.code == Seperator.CloseParen) {
                this.scanner.next(); // 消耗掉 ')'
            }
        } else {
            console.log("expecting ( when parseFunctionCall, but we got a " + t1.text)
        }
        // }
        return new FunctionCall(beginPos, this.scanner.getLastPos(), name, params);
    }

    /**
     * 跳过一些Token，用于错误恢复，以便继续解析后面Token
     */
    private skip(seperators: string[] = []) {
        let t = this.scanner.peek();
        while (t.kind != TokenKind.EOF) {
            if (t.kind == TokenKind.Keyword) {  // 遇到关键字停止跳跃
                return;
            }
            else if (t.kind == TokenKind.Seperator &&
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
    }

    private opPrec = new Map([
        [Op.Assign, 2],
        [Op.PlusAssign, 2],
        [Op.MinusAssign, 2],
        [Op.MultiplyAssign, 2],
        [Op.DivideAssign, 2],
        [Op.ModulusAssign, 2],
        [Op.BitAndAssign, 2],
        [Op.BitOrAssign, 2],
        [Op.BitXorAssign, 2],
        [Op.LeftShiftArithmeticAssign, 2],
        [Op.RightShiftArithmeticAssign, 2],
        [Op.RightShiftLogicalAssign, 2],
        [Op.Or, 4],
        [Op.And, 5],
        [Op.BitOr, 6],
        [Op.BitXOr, 7],
        [Op.BitAnd, 8],
        [Op.EQ, 9],
        [Op.IdentityEquals, 9],
        [Op.NE, 9],
        [Op.IdentityNotEquals, 9],
        [Op.G, 10],
        [Op.GE, 10],
        [Op.L, 10],
        [Op.LE, 10],
        [Op.LeftShiftArithmetic, 11],
        [Op.RightShiftArithmetic, 11],
        [Op.RightShiftLogical, 11],
        [Op.Plus, 12],
        [Op.Minus, 12],
        [Op.Divide, 13],
        [Op.Multiply, 13],
        [Op.Modulus, 13],
    ]);

    private getPrec(op: Op): number {
        let ret = this.opPrec.get(op);
        if (typeof ret == 'undefined') {
            return -1;
        }
        else {
            return ret;
        }
    }

}