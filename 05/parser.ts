import { Binary, Block, DecimalLiteral, Expression, ExpressionStatement, FunctionCall, FunctionDecl, IntegerLiteral, Prog, Statement, StringLiteral, Variable, VariableDecl } from "./ast";
import { Scanner, Token, TokenKind } from "./scanner";


export class Parser {
    scanner: Scanner;
    constructor(scanner: Scanner) {
        this.scanner = scanner;
    }

    // prog = statementList? EOF;
    parseProg(): Prog {
        return new Prog(this.parseStatementList());
    }

    // statementList = (statement)+ ;
    parseStatementList(): Statement[] {
        let stmts: Statement[] = [];
        let t = this.scanner.peek();
        // statementList的Follow集合里有EOF和'}'这两个元素，分别用于prog和functionBody等场景。
        while (t.kind != TokenKind.EOF && t.text != '}') {
            let stmt = this.parseStatement();
            if (stmt != null) {
                stmts.push(stmt);
            }
            else {

            }
            t = this.scanner.peek();
        }
        return stmts;
    }

    // statement: functionDecl ｜ variableDecl | expressionStatement;
    // statement: variableDecl | functionDecl | expressionStatement;
    // expressionStatement: expression ';' ;
    parseStatement(): Statement | null {
        let t = this.scanner.peek();
        if (t.kind == TokenKind.Keyword && t.text == 'function') {
            return this.parseFunctionDecl();
        }
        else if (t.kind == TokenKind.Keyword && t.text == 'return') {
            return this.parseReturnStatement();
        }
        else if (t.text == 'let') {
            return this.parseVariableDecl();
        }
        else if (t.kind == TokenKind.Identifier ||
            t.kind == TokenKind.DecimalLiteral ||
            t.kind == TokenKind.IntegerLiteral ||
            t.kind == TokenKind.StringLiteral ||
            t.text == '(') {
            return this.parseExpressionStatement();
        }
        else {
            console.log("Can not recognize a expression starting with: " + this.scanner.peek().text);
            return null;
        }
    }

    // returnStatement: 'return' expression? ';' ;
    parseReturnStatement(): Statement | null {
        this.scanner.next();
        let exp = this.parseExpression();
        if (exp != null){
            
        }
        else {
            exp = new IntegerLiteral(0);
        }
        let t = this.scanner.next();
        if (t.text == ';'){
            return exp;
        }
        else {
            console.log("Expecting ';' in ReturnStatement, while we got " + t.text);
            return null;
        }
    }

    // variableDecl : 'let' Identifier typeAnnotation？ ('=' expression) ';';
    // typeAnnotation : ':' typeName;
    // expression: primary (binOP primary)* ;
    parseVariableDecl(): VariableDecl | null {
        let t = this.scanner.peek();
        if (t.text != 'let') {
            console.log("Expecting let in VariableDecl, while we got " + t.text);
            return null;
        }
        this.scanner.next();    // 跳过let

        t = this.scanner.next();
        if (t.kind == TokenKind.Identifier){
            let varName:string = t.text;

            let varType:string = 'any';
            let init:Expression|null = null;
            
            let t1 = this.scanner.peek();
            // 类型标注
            if (t1.text == ':'){
                this.scanner.next();
                let t2 = this.scanner.next();
                if (t2.kind == TokenKind.Identifier) {
                    varType = t2.text;
                }
                else {
                    console.log("Error parsing type annotation in VariableDecl");
                    return null
                }
                t1 = this.scanner.peek();
            }

            //初始化部分
            if (t1.text == '='){
                this.scanner.next();
                init = this.parseExpression();
            }

            //分号
            t1 = this.scanner.peek();
            if (t1.text == ';'){
                this.scanner.next();
                return new VariableDecl(varName, varType, init);
            }
            else {
                console.log("Expecting ; at the end of variable declaration, while we got " + t1.text);
                return null;
            }
        }
        else {
            console.log("Expecting variable name in VariableDecl, while we got " + t.text);
            return null;
        }
    }

    // functionDecl: "function" Identifier "(" ")"  functionBody;
    parseFunctionDecl(): FunctionDecl | null {
        let t = this.scanner.peek();
        if (t.text != "function"){
            console.log("Expecting function in FunctionDecl, while we got " + t.text);
            return null;
        }
        this.scanner.next();

        t = this.scanner.next();
        if (t.kind == TokenKind.Identifier){
            let funcName = t.text;
            t = this.scanner.next()
            if (t.text == '('){
                t = this.scanner.next();
                if (t.text == ')'){
                    let body = this.parseFunctionBody();
                    if (body != null) {
                        return new FunctionDecl(funcName, body);
                    }
                    else {
                        console.log("Error parsing FunctionBody in FunctionDecl");
                        return null;
                    }
                }
                else {
                    console.log("Expecting ) in FunctionDecl, while we got " + t.text);
                    return null;
                }
            }
            else {
                console.log("Expecting ( in functionDecl, while we got " + t.text);
            }
        }
        else {
            console.log("Expecting a function name in functionDecl, while we got a " + t.text);
            return null;
        }
        return null;
    }

    // functionBody : '{' statementList? '}' ;
    // statementList = (variableDecl | functionDecl | expressionStatement)+ ;
    // statement: variableDecl | functionDecl | expressionStatement;
    parseFunctionBody(): Block | null {
        let t:Token = this.scanner.peek();
        if(t.text == "{"){
            this.scanner.next();
            let stmts:Statement[] = this.parseStatementList();
            t = this.scanner.next();
            if (t.text == "}"){
                return new Block(stmts);
            }
            else {
                console.log("Expecting } in FunctionBody, while we got a " + t.text);
                return null;
            }
        }
        else {
            console.log("Expectiong { in FunctionBody, while we got a " + t.text);
            return null;
        }
    }

    // expressionStatement: expression ';' ;
    // expression: primary (binOP primary)* ;
    // primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
    parseExpressionStatement(): ExpressionStatement | null {
        let exp = this.parseExpression();
        if (exp != null){
            let t = this.scanner.next();
            if(t.text == ";"){
                return new ExpressionStatement(exp);
            }
            else {
                console.log("Expecting ';' in ExpressionStatement, while we got a " + t.text);
                return null;
            }
        }
        else {
            console.log("Error parsing ExpressionStatement");
        }
        return null;
    }

    // expression: primary (binOP primary)* ;
    // primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
    parseExpression(): Expression | null {
        return this.parseBinary(0); // ar 那么Binary 其实和Expression等价？
    }

    // expression: primary (binOP primary)* ;
    // primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
    parseBinary(lprec: number): Expression | null {
        let exp1 = this.parsePrimary();
        if (exp1 != null){
            let t = this.scanner.peek();
            let rprec = this.getPrec(t.text);

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
            while(t.kind == TokenKind.Operator && rprec > lprec){
                this.scanner.next();    // 跳过运算符
                let exp2 = this.parseBinary(rprec); // 这个调用实际上是一个过程，什么过程呢，（不停的找）直到找到一个 右侧运算符 不大于 左侧运算符 的状态，这就是这段算法的临界点
                if (exp2 != null){
                    let exp:Binary = new Binary(t.text, exp1, exp2);
                    exp1 = exp;
                    t = this.scanner.peek();    // 这里表示第二种例子的+号，+号将和默认值0比较
                    rprec = this.getPrec(t.text);
                }
                else {
                    console.log("Can not recognize a expression starting with: " + t.text);
                }
            }
            return exp1;
        }
        else {
            console.log("Can not recognize a expression starting with: " + this.scanner.peek().text);
        }
        return null;
    }

    // primary: StringLiteral | DecimalLiteral | IntegerLiteral | functionCall | '(' expression ')' ;
    // expression: primary (binOP primary)* ;
    parsePrimary(): Expression | null {
        let t = this.scanner.peek();
        console.log("parsePrimary: " + t.text);

        // 作者说：以Identifier开头，可能是函数调用，也可能是一个变量，所以这里要再多向后看一个Token
        // 这相当于在局部使用了LL（2）算法。
        // ar ? 这里我感到疑惑的是 这里不可以是个赋值语句么 还是说 赋值语句一定要走 产生式：expression: primary (binOP primary)* 
        
        if (t.kind == TokenKind.Identifier){
            let t2 = this.scanner.peek2();
            if(t2.text == '('){
                return this.parseFunctionCall();
            }
            // else if(t2.text == '='){    // 这里为什么不可能 是赋值语句
                // this.parseExpression();
            // }
            else {
                this.scanner.next();
                return new Variable(t.text);
            }
        }
        else if (t.kind == TokenKind.IntegerLiteral){
            this.scanner.next();
            return new IntegerLiteral(parseInt(t.text));
        }
        else if (t.kind == TokenKind.DecimalLiteral){
            this.scanner.next();
            return new DecimalLiteral(parseFloat(t.text));
        }
        else if (t.kind == TokenKind.StringLiteral){
            this.scanner.next();
            return new StringLiteral(t.text);
        }
        else if (t.text == '('){
            this.scanner.next(); // 消耗掉(
            let exp = this.parseExpression();
            let t1 = this.scanner.peek();
            if (t1.text == ')'){
                this.scanner.next();
                return exp;
            }
            else{
                console.log("Expecting a ')' at the end of a primary expresson, while we got a " + t.text);
                return null;
            }
        }
        else {
            console.log("Can not recognize a primary expression starting with: " + t.text);
            return null;
        }
    }

    // functionCall : Identifier '(' parameterList? ')' ;
    // parameterList : expression (',' expression)* ;
    parseFunctionCall(): FunctionCall | null {
        let params:Expression[] = [];
        let t:Token = this.scanner.next();
        if(t.kind == TokenKind.Identifier) {
            let t1 = this.scanner.next();
            if (t1.text == '(') {
                t1 = this.scanner.peek();

                while(t1.text != ')') {
                    let p = this.parseExpression();
                    if (p != null){
                        params.push(p);
                    }
                    else {
                        console.log("Error parsing parameter in function call");
                        return null;
                    }
                    t1 = this.scanner.peek();
                    if(t1.text != ')') {
                        if(t1.text == ',') {
                            this.scanner.next(); // 消耗掉 ','
                        }
                        else {  // 这里体验的语法的白名单功能，严谨（第一次写的时候，我并没有在这里报错）
                            console.log("Expecting a comma at the end of a function call, while we got a " + t1.text)
                            return null;
                        }
                    }
                    
                }
                this.scanner.next(); // 消耗掉 ')'
                return new FunctionCall(t.text, params);
            }
            else {
                console.log("Expecting ( in FunctionCall, we got a " + t.text);
                return null;
            }
        }
        return null;
    }

    private opPrec = new Map([
        ['=', 2],
        ['+=', 2],
        ['-=', 2],
        ['*=', 2],
        ['-=', 2],
        ['%=', 2],
        ['&=', 2],
        ['|=', 2],
        ['^=', 2],
        ['~=', 2],
        ['<<=', 2],
        ['>>=', 2],
        ['>>>=', 2],
        ['||', 4],
        ['&&', 5],
        ['|', 6],
        ['^', 7],
        ['&', 8],
        ['==', 9],
        ['===', 9],
        ['!=', 9],
        ['!==', 9],
        ['>', 10],
        ['>=', 10],
        ['<', 10],
        ['<=', 10],
        ['<<', 11],
        ['>>', 11],
        ['>>>', 11],
        ['+', 12],
        ['-', 12],
        ['*', 13],
        ['/', 13],
        ['%', 13],
    ]);

    private getPrec(op: string): number {
        let ret = this.opPrec.get(op);
        if (typeof ret == 'undefined') {
            return -1;
        }
        else {
            return ret;
        }
    }

}