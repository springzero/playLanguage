
export abstract class AstNode {

    public abstract dump(prefix: string): void;

    // visitor模式中，用于接收vistor的访问
    public abstract accept(visitor: AstVisitor): any;
}

/**
 * 语句
 * 其子嘞包含函数声明、表达式语句   从概念上来讲 表达式是属于语句
 */
export abstract class Statement extends AstNode {

}

/**
 * 语句
 * 其子类包括函数声明、表达式语句
 */
export abstract class Expression extends AstNode {
}

/**
 * 声明
 * 所有声明都会对应一个符号。
 */
export abstract class Decl {
    name: string;
    constructor(name: string) {
        this.name = name;
    }
}

/**
 * 函数声明节点  ar 原来函数声明是这样定义的 里面包含 body，其实我认为应该叫函数定义
 */
 export class FunctionDecl extends Decl {
    body: Block; //函数体
    constructor(name: string, body: Block) {
        super(name);
        this.body = body;
    }
    public accept(visitor: AstVisitor): any {
        return visitor.visitFunctionDecl(this);
    }
    public dump(prefix: string): void {
        console.log(prefix + "FunctionDecl " + this.name);
        this.body.dump(prefix + "    ");
    }
}


export class Block extends AstNode {
    stmts: Statement[];
    constructor(stmts: Statement[]) {
        super();
        this.stmts = stmts;
    }
    public accept(visitor: AstVisitor) {
        return visitor.visitBlock(this);
    }
    public dump(prefix: string): void {
        console.log(prefix + "Block");
        this.stmts.forEach(x => x.dump(prefix + "   "));
    }
}


export class Prog extends Block{
    public accept(visitor: AstVisitor) {
        return visitor.visitProg(this);
    }
    public dump(prefix:string):void{
        console.log(prefix+"Prog");
        this.stmts.forEach(x => x.dump(prefix + "   "))
    }
}

/**
 * 变量声明节点
 */
export class VariableDecl extends Decl {
    varType: string;       //变量类型
    init: Expression | null; //变量初始化所使用的表达式
    constructor(name: string, varType: string, init: Expression | null) {
        super(name);
        this.varType = varType;
        this.init = init;
    }
    public accept(visitor: AstVisitor): any {
        return visitor.visitVariableDecl(this);
    }
    public dump(prefix: string): void {
        console.log(prefix + "VariableDecl " + this.name + ", type: " + this.varType);
        if (this.init == null) {
            console.log(prefix + "no initialization.");
        }
        else {
            this.init.dump(prefix + "    ");
        }
    }
}




/**
 * 二元表达式
 */
export class Binary extends Expression {
    op: string;      //运算符
    exp1: Expression; //左边的表达式
    exp2: Expression; //右边的表达式
    constructor(op: string, exp1: Expression, exp2: Expression) {
        super();
        this.op = op;
        this.exp1 = exp1;
        this.exp2 = exp2;
    }
    public accept(visitor: AstVisitor): any {
        return visitor.visitBinary(this);
    }
    public dump(prefix: string): void {
        console.log(prefix + "Binary:" + this.op);
        this.exp1.dump(prefix + "    ");
        this.exp2.dump(prefix + "    ");
    }
}


/**
 * 表达式语句
 * 就是在表达式后面加个分号
 */
export class ExpressionStatement extends Statement {
    exp: Expression;
    constructor(exp: Expression) {
        super();
        this.exp = exp;
    }
    public accept(visitor: AstVisitor): any {
        return visitor.visitExpressionStatement(this);
    }
    public dump(prefix: string): void {
        console.log(prefix + "ExpressionStatement");
        this.exp.dump(prefix + "    ");
    }
}

/**
 * 函数调用
 */
export class FunctionCall extends AstNode {
    name: string;
    parameters: Expression[];
    decl: FunctionDecl | null = null; // 指向函数的声明   ar 这里我一直认为应该是函数的定义。。
    constructor(name: string, parameters: Expression[]) {
        super();
        this.name = name;
        this.parameters = parameters;
    }
    public accept(visitor: AstVisitor) {
        return visitor.visitFunctionCall(this);
    }
    public dump(prefix: string): void {
        console.log(prefix + "FunctionCall " + this.name + (this.decl != null ? ", resolved" : ", not resolved"));
        this.parameters.forEach(x => x.dump(prefix + "    "));
    }
}

/**
 * 变量引用
 */
export class Variable extends Expression {
    name: string;
    decl: VariableDecl | null = null; //指向变量声明
    constructor(name: string) {
        super();
        this.name = name;
    }
    public accept(visitor: AstVisitor): any {
        return visitor.visitVariable(this);
    }
    public dump(prefix: string): void {
        console.log(prefix + "Variable: " + this.name + (this.decl != null ? ", resolved" : ", not resolved"));
    }
}

/**
 * 字符串字面量
 */
export class StringLiteral extends Expression {
    value: string;
    constructor(value: string) {
        super();
        this.value = value;
    }
    public accept(visitor: AstVisitor): any {
        return visitor.visitStringLiteral(this);
    }
    public dump(prefix: string): void {
        console.log(prefix + this.value);
    }
}

/**
 * 整型字面量
 */
export class IntegerLiteral extends Expression {
    value: number;
    constructor(value: number) {
        super();
        this.value = value;
    }
    public accept(visitor: AstVisitor): any {
        return visitor.visitIntegerLiteral(this);
    }
    public dump(prefix: string): void {
        console.log(prefix + this.value);
    }
}

/**
 * 实数字面量
 */
export class DecimalLiteral extends Expression {
    value: number;
    constructor(value: number) {
        super();
        this.value = value;
    }
    public accept(visitor: AstVisitor): any {
        return visitor.visitDecimalLiteral(this);
    }
    public dump(prefix: string): void {
        console.log(prefix + this.value);
    }
}

/**
 * null字面量
 */
export class NullLiteral extends Expression {
    value: null = null;
    constructor() {
        super();
    }
    public accept(visitor: AstVisitor): any {
        return visitor.visitNullLiteral(this);
    }
    public dump(prefix: string): void {
        console.log(prefix + this.value);
    }
}

/**
 * Boolean字面量
 */
export class BooleanLiteral extends Expression {
    value: boolean;
    constructor(value: boolean) {
        super();
        this.value = value;
    }
    public accept(visitor: AstVisitor): any {
        return visitor.visitBooleanLiteral(this);
    }
    public dump(prefix: string): void {
        console.log(prefix + this.value);
    }
}

////////////////////////////////////////////////////////////////////////////////
//Visitor

/**
 * 对AST做遍历的Vistor。
 * 这是一个基类，定义了缺省的遍历方式。子类可以覆盖某些方法，修改遍历方式。
 */
export abstract class AstVisitor {
    //对抽象类的访问。
    //相应的具体类，会调用visitor合适的具体方法。
    visit(node: AstNode): any {
        return node.accept(this);
    }

    visitProg(prog: Prog): any {
        let retVal: any;
        for (let x of prog.stmts) {
            retVal = this.visit(x);
        }
        return retVal;
    }

    visitVariableDecl(variableDecl: VariableDecl): any {
        if (variableDecl.init != null) {
            return this.visit(variableDecl.init);
        }
    }

    visitFunctionDecl(functionDecl: FunctionDecl): any {
        return this.visitBlock(functionDecl.body);
    }

    visitBlock(Block: Block): any {
        let retVal: any;
        for (let x of Block.stmts) {
            retVal = this.visit(x);
        }
        return retVal;
    }

    visitExpressionStatement(stmt: ExpressionStatement): any {
        return this.visit(stmt.exp);
    }

    visitBinary(exp: Binary): any {
        this.visit(exp.exp1);
        this.visit(exp.exp2);
    }

    visitIntegerLiteral(exp: IntegerLiteral): any {
        return exp.value;
    }

    visitDecimalLiteral(exp: DecimalLiteral): any {
        return exp.value;
    }

    visitStringLiteral(exp: StringLiteral): any {
        return exp.value;
    }

    visitNullLiteral(exp: NullLiteral): any {
        return exp.value;
    }

    visitBooleanLiteral(exp: BooleanLiteral): any {
        return exp.value;
    }

    visitVariable(variable: Variable): any {
        return undefined;
    }

    visitFunctionCall(functionCall: FunctionCall): any {
        return undefined;
    }
} 