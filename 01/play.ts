

// 定义Token的类型
enum TokenKind { Keyword, Identifier, StringLiteral, Seperator, Operator, EOF };

// 定义一个Token数据结构
interface Token {
    kind: TokenKind;
    text: string;
}

// 一个Token数组，代表了下面这段程序做完词法分析后的结果：
/*
//一个函数的声明，这个函数很简单，只打印"Hello World!"
function sayHello(){
    println("Hello World!");
}
//调用刚才声明的函数
sayHello();
*/
let tokenArray: Token[] = [
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
class Tokenizer {
    private tokens: Token[];
    private pos: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }
    next(): Token {
        if (this.pos <= this.tokens.length) {
            return this.tokens[this.pos++];
        }
        else {
            //如果已经到了末尾，总是返回EOF
            return this.tokens[this.pos];
        }
    }
    position(): number {
        return this.pos;
    }
    traceBack(newPos: number): void {
        this.pos = newPos;
    }
}

// 语法分析
// 目标获取AST

/* 定义基类 */
abstract class AstNode {
    public abstract dump(prefix: string): void
}

/* 定义语句 */
abstract class Statement extends AstNode {
    static isStatementNode(node: any): node is Statement {
        if (!node) {
            return false;
        }
        else {
            return true;
        }
    }
}

class Prog extends Statement {
    stmts: Statement[];
    constructor(stmts: Statement[]) {
        super();
        this.stmts = stmts;
    }
    public dump(prefix: string): void {
        console.log(prefix + "Prog")
        this.stmts.forEach(x => x.dump(prefix + "\t"))
    }
}

/**
 * 函数声明节点
 */
class FunctionDecl extends Statement {
    name: string;       //函数名称
    body: FunctionBody; //函数体
    constructor(name: string, body: FunctionBody) {
        super();
        this.name = name;
        this.body = body;
    }
    public dump(prefix: string): void {
        console.log(prefix + "FunctionDecl " + this.name);
        this.body.dump(prefix + "\t");
    }
}


/**
 * 函数体
 */
class FunctionBody extends AstNode {
    stmts: FunctionCall[];
    constructor(stmts: FunctionCall[]) {
        super();
        this.stmts = stmts;
    }
    static isFunctionBodyNode(node: any): node is FunctionBody {
        if (!node) {
            return false;
        }
        if (Object.getPrototypeOf(node) == FunctionBody.prototype) {
            return true;
        }
        else {
            return false;
        }
    }
    public dump(prefix: string): void {
        console.log(prefix + "FunctionBody");
        this.stmts.forEach(x => x.dump(prefix + "\t"));
    }
}

/**
 * 函数调用
 */
class FunctionCall extends Statement {
    name: string;
    parameters: string[];
    definition: FunctionDecl | null = null;  //指向函数的声明   // ar 这里没有看到这个部分是怎么初始化的
    constructor(name: string, parameters: string[]) {
        super();
        this.name = name;
        this.parameters = parameters;
    }
    static isFunctionCallNode(node: any): node is FunctionCall {
        if (!node) {
            return false;
        }
        if (Object.getPrototypeOf(node) == FunctionCall.prototype) {
            return true;
        }
        else {
            return false;
        }
    }
    public dump(prefix: string): void {
        console.log(prefix + "FunctionCall " + this.name + (this.definition != null ? ", resolved" : ", not resolved"));
        this.parameters.forEach(x => console.log(prefix + "\t" + "Parameter: " + x));
    }
}

class Parser {
    tokenizer: Tokenizer;
    constructor(tokenizer: Tokenizer) {
        this.tokenizer = tokenizer
    }

    parseProg(): Prog {
        let stmts: Statement[] = [];
        let stmt: Statement | null | void = null;
        while (true) {

            // 尝试解析函数声明
            stmt = this.parseFunctionDecl();
            if (Statement.isStatementNode(stmt)){
                stmts.push(stmt);
                continue;
            }

            // 尝试函数调用
            stmt = this.parseFunctionCall();
            if(Statement.isStatementNode(stmt)){
                stmts.push(stmt);
                continue;
            }

            if(stmt == null) {
                break;
            }


        }
        return new Prog(stmts);
    }

    /* 语法规则 functionDecl: "function" Identifier "(" ")" functionBody; */
    parseFunctionDecl(): FunctionDecl | null | void {
        let oldPos: number = this.tokenizer.position();
        let t: Token = this.tokenizer.next();
        if (t.kind == TokenKind.Keyword && t.text == "function") {
            t = this.tokenizer.next();
            if (t.kind == TokenKind.Identifier) {
                let t1 = this.tokenizer.next();
                if (t1.text == "(") {
                    let t2 = this.tokenizer.next();
                    if (t2.text == ")") {
                        let functionBody = this.parseFunctionBody();
                        if (FunctionBody.isFunctionBodyNode(functionBody)) {
                            return new FunctionDecl(t.text, functionBody);
                        }
                    } else {
                        console.log("expecting ')' in FunctionDecl, while we got a " + t.text);
                        return;
                    }
                } else {
                    console.log("expecting '(' in FunctionDecl, while we got a " + t.text);
                    return;
                }
            }
        }
        // 解析不成功，回溯
        this.tokenizer.traceBack(oldPos);
        return null;
    }

    /* 语法规则 functionBody : '{' functionCall* '}' ; */
    parseFunctionBody(): FunctionBody | null | void {
        let oldPos: number = this.tokenizer.position();
        let stmts: FunctionCall[] = [];
        let t: Token = this.tokenizer.next();
        if (t.text == "{") {
            let functionCall = this.parseFunctionCall();
            while (FunctionCall.isFunctionCallNode(functionCall)) {
                stmts.push(functionCall)
                functionCall = this.parseFunctionCall();
            }
            t = this.tokenizer.next();
            if (t.text == "}") {
                return new FunctionBody(stmts)
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
    }

    // ar 我觉得这里应该是解析语句才对
    /* 语法规则 functionCall : Identifier '(' StringLiteral [ ',' StringLiteral ] ')' */
    parseFunctionCall():FunctionCall|null|void{
        let oldPos:number = this.tokenizer.position();
        let params:string[] = [];
        let t:Token = this.tokenizer.next();
        if(t.kind == TokenKind.Identifier){
            let t1:Token = this.tokenizer.next();
            if (t1.text == "("){
                let t2:Token = this.tokenizer.next();
                while(t2.text != ")") {
                    if (t2.kind == TokenKind.StringLiteral){
                        params.push(t2.text);
                    }
                    else {
                        console.log("Expecting parameter in FunctionCall, while we got a " + t2.text);
                        return; // 这里肯定不是尝试了，所以出错了，就不回溯了
                    }
                    t2 = this.tokenizer.next();
                    if(t2.text != ")"){
                        if(t2.text == ",") {
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
                if (t2.text == ";"){
                    return new FunctionCall(t.text, params);
                }
                else{
                    console.log("Expecting a semicolon in FunctionCall, while we got a " + t2.text);
                    return;
                }
            }
        }

        this.tokenizer.traceBack(oldPos);
        return null;
    }

}

// 对AST左便利的Vistor
// 这是一个基类，定义了缺省的遍历方式。子类可以覆盖某些方法，修改遍历方式
abstract class AstVisitor{
    visitProg(prog:Prog):any{
        let retVal:any;
        for(let x of prog.stmts){
            if(typeof (x as FunctionDecl).body === 'object'){
                retVal = this.visitFunctionDecl(x as FunctionDecl);
            }
            else {

                retVal = this.visitFunctionCall(x as FunctionCall);
            }
        }
        return retVal;
    }
    visitFunctionDecl(functionDecl:FunctionDecl):any{
        return this.visitFunctionBody(functionDecl.body);
    }
    visitFunctionBody(functionBody:FunctionBody):any{
        let retVal:any;
        for(let x of functionBody.stmts){
            retVal = this.visitFunctionCall(x);
        }
        return retVal;
    }
    visitFunctionCall(functionCall:FunctionCall):any{
        return undefined;
    }
}

// ///////////////////////////////////////////////////////////////
// 语义分析
// 对函数调用左引用消解，也就是找到函数的声明。 ar 我觉得准确说应该是函数的定义

// 遍历AST 如果发现函数调用，就去找它的定义
class RefResolver extends AstVisitor {
    prog: Prog|null = null;
    visitProg(prog: Prog):any {
        this.prog = prog;
        for(let x of prog.stmts){
            let functionCall = x as FunctionCall;
            if (typeof functionCall.parameters === 'object'){
                this.resolveFunctionCall(prog, functionCall);
            } 
            else {
                this.visitFunctionDecl(x as FunctionDecl);
            }
        }
    }
    visitFunctionBody(functionBody: FunctionBody) {
        if(this.prog != null){
            for(let x of functionBody.stmts){
                return this.resolveFunctionCall(this.prog, x);
            }
        }
    }

    private resolveFunctionCall(prog: Prog, functionCall: FunctionCall){
        let functionDecl = this.findFunctionDecl(prog, functionCall.name);
        if(functionDecl != null){
            functionCall.definition = functionDecl;
        }
        else {
            if(functionCall.name != "println"){ // 系统内置函数不用报错
                console.log("Error: cannot find definition of function " + functionCall.name);
            }
        }
    }
    private findFunctionDecl(prog:Prog, name:string):FunctionDecl|null{
        for(let x of prog?.stmts){
            let functionDecl = x as FunctionDecl;
            if(typeof functionDecl.body === 'object' && functionDecl.name == name){
                return functionDecl;
            }
        }
        return null;
    }

}


/////////////////////////
// 解释器
// 遍历AST，执行函数调用
class Intepretor extends AstVisitor{
    visitProg(prog:Prog):any{
        let retVal:any;
        for(let x of prog.stmts){
            let functionCall = x as FunctionCall;
            if(typeof functionCall.parameters === 'object'){
                retVal = this.runFunction(functionCall);
            }
        };
        return retVal;
    }
    visitFunctionBody(functionBody: FunctionBody) {
        let retVal:any;
        for(let x of functionBody.stmts){
            retVal = this.runFunction(x);
        };
    }

    private runFunction(functionCall:FunctionCall){
        if(functionCall.name == "println"){
            if(functionCall.parameters.length>0){
                console.log(functionCall.parameters[0]);
            }
            else {
                console.log();
            }
            return 0;
        }
        else {
            if(functionCall.definition != null){
                this.visitFunctionBody(functionCall.definition.body);
            }
        }
    }
}

function compileAndRun(){
    let tokenizer = new Tokenizer(tokenArray);
    console.log("\n程序所使用的Token:");
    for(let token of tokenArray){
        console.log(token);
    }

    // 语法分析
    let prog:Prog = new Parser(tokenizer).parseProg();
    console.log("\n语法分析后的AST:");
    prog.dump("");

    // 语义分析
    new RefResolver().visitProg(prog);
    console.log("\n语义分析后的AST，注意自定义函数的调用已被消解:");
    prog.dump("");

    //运行程序
    console.log("\n运行当前的程序:");
    let retVal = new Intepretor().visitProg(prog);
    console.log("程序返回值：" + retVal);
}

compileAndRun();