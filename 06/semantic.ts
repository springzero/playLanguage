
/**
 * 语义分析
 * 当前特性：
 * 树状的符号表
 * 简单的引用消解：没有考虑声明的先后顺序，也没有考虑闭包
 * 简单的作用域
 */

import { assert } from "console";
import { AstNode, AstVisitor, Binary, Block, ForStatement, FunctionCall, FunctionDecl, Prog, Unary, Variable, VariableDecl } from "./ast";
import { CompilerError } from "./error";
import { Op, Operators } from "./scanner";
import { Scope } from "./scope";
import { built_ins, FunctionSymbol, SymKind, VarSymbol } from "./symbol";
import { FunctionType, SysTypes, Type } from "./types";

export class SemanticAnalyer {
    passes: SemanticAstVisitor[] = [
        new Enter(),
        new RefResolver(),
        // new TypeChecker(),
        // new TypeConverter(),
        new LeftValueAttributor()
    ];

    errors: CompilerError[] = [];    // 语义错误
    warnings: CompilerError[] = [];   // 语义报警信息

    execute(prog: Prog): void {
        this.errors = [];
        this.warnings = [];
        for (let pass of this.passes) {
            pass.visitProg(prog);
            this.errors = this.errors.concat(pass.errors);
            this.warnings = this.warnings.concat(pass.warnings);
        }
    }

}

export class SemanticError extends CompilerError {
    node: AstNode;
    constructor(msg: string, node: AstNode, isWarning = false) {
        super(msg, node.beginPos, /* node.endPos, */ isWarning);
        this.node = node;
    }
}

abstract class SemanticAstVisitor extends AstVisitor {
    errors: CompilerError[] = [];   //语义错误
    warnings: CompilerError[] = []; //语义报警信息

    addError(msg: string, node: AstNode) {
        this.errors.push(new SemanticError(msg, node));
        console.log("@" + node.beginPos.toString() + " : " + msg);
    }

    addWarning(msg: string, node: AstNode) {
        this.warnings.push(new SemanticError(msg, node, true));
        console.log("@" + node.beginPos.toString() + " : " + msg);
    }
}


///////////////////////////////////////////////////////
// 建立符号表

/**
 * 把符号加入符号表
 */
class Enter extends SemanticAstVisitor {
    scope: Scope | null = null;    // 当前所属的scope
    functionSym: FunctionSymbol | null = null;

    visitProg(prog: Prog) {
        let sym = new FunctionSymbol('main', new FunctionType(SysTypes.Integer, []));
        prog.sym = sym;
        this.functionSym = sym;

        return super.visitProg(prog);
    }

    /**
     * 将函数声明加入符号表
     * @param functionDecl 
     */
    visitFunctionDecl(functionDecl: FunctionDecl): any {
        let currentScope = this.scope as Scope;

        // 创建函数的symbol
        let paramTypes: Type[] = [];
        if (functionDecl.callSignature.paramList != null) {
            for (let p of functionDecl.callSignature.paramList.params) {
                paramTypes.push(p.theType);
            }
        }
        let sym = new FunctionSymbol(functionDecl.name, new FunctionType(functionDecl.callSignature.returnType, paramTypes));
        sym.decl = functionDecl;
        functionDecl.sym = sym; // 

        // 把函数加入当前scope
        if (currentScope.hasSymbol(functionDecl.name)) {
            this.addError("Dumplicate symbol: " + functionDecl.name, functionDecl);
        }
        else {
            currentScope.enter(functionDecl.name, sym);
        }

        // ar ?这下面的动作现在是看不懂的，都将函数声明存到了当前作用域里，下面是在干什么呢
        // 修改当前的函数符号
        let lastFunctionSym = this.functionSym;
        this.functionSym = sym;

        // 创建新的Scope，用来存放参数
        let oldScope = currentScope;
        this.scope = new Scope(oldScope, "function_debug_"+functionDecl.beginPos.line+"_"+functionDecl.endPos.line);
        functionDecl.scope = this.scope;

        // 遍历子节点
        super.visitFunctionDecl(functionDecl);

        // 恢复当前函数
        this.functionSym = lastFunctionSym;

        // 恢复原来的Scope
        this.scope = oldScope;

    }

    /**
     * 遇到块的时候，就建立一级新的作用域
     * 支持块作用域
     * @param block 
     */
    visitBlock(block: Block): any {
        // 创建下一级scope
        let oldScope = this.scope;
        this.scope = new Scope(this.scope, "block_debug_"+block.beginPos.line+"_"+block.endPos.line);
        block.scope = this.scope;
        // ar ?为什么这里不直接这样写 block.scope = new Scope(this.scope);

        // 调用父类的方法，遍历所有的语句
        super.visitBlock(block);

        // 重新设置当前的Scope
        this.scope = oldScope;

    }

    // 把变量声明加入符号表
    visitVariableDecl(variableDecl: VariableDecl) {
        let currentScope = this.scope as Scope;
        if (currentScope.hasSymbol(variableDecl.name)) {
            this.addError("Dumplicate symbol: " + variableDecl.name, variableDecl);
        }
        // 把变量加入当前符号表
        let sym = new VarSymbol(variableDecl.name, variableDecl.theType);
        variableDecl.sym = sym;
        currentScope.enter(variableDecl.name, sym);

        // ar ?把本地变量也加入函数符号中，可用于后面生成代码
        this.functionSym?.vars.push(sym);
    }

    /**
     * 对于for循环来说，由于可以在for的init部分声明变量，所以要新建一个Scope。
     */
    visitForStatement(forStmt: ForStatement): any {
        // 创建下一级scope
        let oldScope = this.scope;
        this.scope = new Scope(this.scope, "for_debug_"+forStmt.beginPos.line+"_"+forStmt.endPos.line);
        forStmt.scope = this.scope;

        // 调用父类的方法，遍历所有的语句
        super.visitForStatement(forStmt);

        // 重新设置当前的Scope
        this.scope = oldScope;
    }
}

////////////////////////////////////////////
// 引用消解

/**
 * 引用消解
 * 遍历AST。如果发现函数调用和变量引用，就去找它的定义
 */
class RefResolver extends SemanticAstVisitor {
    scope: Scope | null = null;

    // 每个Scope已经声明了的变量的列表
    declaredVarsMap: Map<Scope, Map<string, VarSymbol>> = new Map();

    visitFunctionDecl(functionDecl: FunctionDecl) {
        // 修改scope
        let oldScope = this.scope;
        this.scope = functionDecl.scope as Scope;
        assert(this.scope != null, "FunctionDecl Scope不可为null");

        // 为已声明的变量设置一个存储区域
        // ar 这里应该叫为body初始化个存储区域
        this.declaredVarsMap.set(this.scope, new Map());

        // 遍历下级节点
        super.visitFunctionDecl(functionDecl);

        // 重新设置scope
        this.scope = oldScope;
    }

    // 对块做什么消解？
    visitBlock(block: Block, additional?: any) {
        // 修改scope
        let oldScope = this.scope;
        this.scope = block.scope as Scope;
        assert(this.scope != null, "Block Scope不可为null");

        // 为已声明的变量设置一个存储区域
        this.declaredVarsMap.set(this.scope, new Map());

        // 遍历下级节点
        super.visitBlock(block);

        // 重新设置scope
        this.scope = oldScope;
    }

    visitForStatement(forStmt: ForStatement): any {
        // 修改scope
        let oldScope = this.scope;
        this.scope = forStmt.scope as Scope;
        assert(this.scope != null, "For Scope不可为null");

        // 为已声明的变量设置一个存储区域
        this.declaredVarsMap.set(this.scope, new Map());

        // 遍历下级节点
        super.visitForStatement(forStmt);

        // 重新设置scope
        this.scope = oldScope;
    }

    /**
     * 做函数的消解
     * 函数不需要声明在前，使用在后
     */
    visitFunctionCall(functionCall: FunctionCall, additional?: any) {
        let currentScope = this.scope as Scope;

        if (built_ins.has(functionCall.name)) {
            functionCall.sym = built_ins.get(functionCall.name) as FunctionSymbol;
        }
        else {
            functionCall.sym = currentScope.getSymbolCascade(functionCall.name) as FunctionSymbol | null;
        }

        super.visitFunctionCall(functionCall);
    }

    /**
     * 标记变量是否已被声明
     * @param variableDecl 
     * @param additional 
     */
    visitVariableDecl(variableDecl: VariableDecl, additional?: any) {
        let currentScope = this.scope as Scope;
        let declaredSyms = this.declaredVarsMap.get(currentScope) as Map<string, VarSymbol>;

        // 从当前作用域里查询符号
        let sym = currentScope.getSymbol(variableDecl.name);

        if (sym != null) {
            // 然后将变量和符号的关系存在declaredVarsMap中
            declaredSyms.set(variableDecl.name, sym as VarSymbol);
        }

        super.visitVariableDecl(variableDecl);
    }

    /**
     * 变量引用消解
     * @param variable 
     * @param additional 
     */
    visitVariable(variable: Variable): any {
        let currentScope = this.scope as Scope;
        let sym = this.findVariableCascade(currentScope, variable);
        variable.sym = sym;
        if (sym != null) {
            variable.theType = sym.theType;
        }
    }

    /**
     * 逐级查找变量的符号信息
     * @param scope 
     * @param variable 
     * @returns 
     */
    private findVariableCascade(scope: Scope, variable: Variable): VarSymbol | null {
        // 获取作用域中的已定义符号表
        let declaredSyms = this.declaredVarsMap.get(scope) as Map<string, VarSymbol>;
        // 在作用域中，根据变量名称查找符号
        let symInScope = scope.getSymbol(variable.name);
        if (symInScope != null) {
            // 如果已定义符号表中有这个变量名，则返回符号
            if (declaredSyms != undefined && declaredSyms.has(variable.name)) {
                return declaredSyms.get(variable.name) as VarSymbol;
            }
            else {
                // 如果类型是变量，则详细报错，说变量在定义之前就非法使用了
                if (symInScope.kind == SymKind.Variable) {
                    this.addError("Variable: '" + variable.name + "' is used before declaration.", variable);
                }
                else {
                    this.addError("We expect a variable of name: '" + variable.name + "', but find a " + SymKind[symInScope.kind] + ".", variable);
                }
            }
        }
        else {
            // 如果有父作用域，就继续查询
            if (scope.enclosingScope != null) {
                return this.findVariableCascade(scope.enclosingScope, variable);
            }
            else {
                // 已经是顶级作用域了，就报错，没有找到该变量
                this.addError("Cannot find a variable of name: '" + variable.name + "'", variable);
            }
        }

        return null;
    }
}

///////////////////////////////////////////
// 属性分析
// 类型计算和检查 但现在是第5章，应该是用不上的


class LeftValueAttributor extends SemanticAstVisitor {
    parentOperator: Op | null = null;

    /**
     * 检查赋值符号和.符号左边是否是左值
     * @param binary 
     */
    visitBinary(binary: Binary): any {
        if (Operators.isAssignOp(binary.op)) {
            let lastParentOperator = this.parentOperator;
            this.parentOperator = binary.op;

            //检查 = 的左子节点
            this.visit(binary.exp1);
            if (!binary.exp1.isLeftValue) {
                this.addError("Left child of operator " + Op[binary.op] + " need a left value", binary.exp1);
            }

            //恢复原来的状态信息
            this.parentOperator = lastParentOperator;

            //继续遍历右子节点
            this.visit(binary.exp2);
        }
        else {
            super.visitBinary(binary);
        }
    }

    visitUnary(u: Unary): any {
        //要求必须是个左值
        if (u.op == Op.Inc || u.op == Op.Dec) {
            let lastParentOperator = this.parentOperator;
            this.parentOperator = u.op;

            this.visit(u.exp);
            if (!u.exp.isLeftValue) {
                this.addError("Unary operator " + Op[u.op] + "can only be applied to a left value", u);
            }

            //恢复原来的状态信息
            this.parentOperator = lastParentOperator;
        }
        else {
            super.visitUnary(u);
        }
    }

    /**
     * 变量都可以作为左值，除非其类型是void
     * @param v 
     */
    visitVariable(v: Variable): any {
        if (this.parentOperator != null) {
            let t = v.theType as Type;
            if (!t.hasVoid()) {
                v.isLeftValue = true;
            }
        }
    }

    /**
     * 但函数调用是在.符号左边，并且返回值不为void的时候，可以作为左值
     * @param functionCall 
     */
    visitFunctionCall(functionCall: FunctionCall): any {
        if (this.parentOperator == Op.Dot) {
            let functionType = functionCall.theType as FunctionType;
            if (!functionType.returnType.hasVoid()) {
                functionCall.isLeftValue = true;
            }
        }
    }
}

class TypeChecker extends SemanticAstVisitor {

    visitVariableDecl(variableDecl: VariableDecl): any {
        super.visitVariableDecl(variableDecl);

        if (variableDecl.init != null) {
            let t1 = variableDecl.theType as Type;
            let t2 = variableDecl.init.theType as Type;
            if (!t2.LE(t1)) {
                this.addError("Operator '=' can not be applied to '" + t1.name + "' and '" + t2.name + "'.", variableDecl);
            }

            //类型推断：对于any类型，变成=号右边的具体类型
            if (t1 === SysTypes.Any) {
                variableDecl.theType = t2;   //TODO：此处要调整
                // variableDecl.inferredType = t2;
                //重点是把类型记入符号中，这样相应的变量声明就会获得准确的类型
                //由于肯定是声明在前，使用在后，所以变量引用的类型是准确的。
                (variableDecl.sym as VarSymbol).theType = t2;
            }
        }
    }

    visitBinary(bi: Binary): any {
        super.visitBinary(bi);

        let t1 = bi.exp1.theType as Type;
        let t2 = bi.exp2.theType as Type;
        if (Operators.isAssignOp(bi.op)) {
            bi.theType = t1;
            if (!t2.LE(t1)) {  //检查类型匹配
                this.addError("Operator '" + Op[bi.op] + "' can not be applied to '" + t1.name + "' and '" + t2.name + "'.", bi);
            }
        }
        else if (bi.op == Op.Plus) { //有一边是string，或者两边都是number才行。
            if (t1 == SysTypes.String || t2 == SysTypes.String) {
                bi.theType = SysTypes.String;
            }
            else if (t1.LE(SysTypes.Number) && t2.LE(SysTypes.Number)) {
                bi.theType = Type.getUpperBound(t1, t2);
            }
            else {
                this.addError("Operator '" + Op[bi.op] + "' can not be applied to '" + t1.name + "' and '" + t2.name + "'.", bi);
            }
        }
        else if (Operators.isArithmeticOp(bi.op)) {
            if (t1.LE(SysTypes.Number) && t2.LE(SysTypes.Number)) {
                bi.theType = Type.getUpperBound(t1, t2);
            }
            else {
                this.addError("Operator '" + Op[bi.op] + "' can not be applied to '" + t1.name + "' and '" + t2.name + "'.", bi);
            }
        }
        else if (Operators.isRelationOp(bi.op)) {
            if (t1.LE(SysTypes.Number) && t2.LE(SysTypes.Number)) {
                bi.theType = SysTypes.Boolean;
            }
            else {
                this.addError("Operator '" + Op[bi.op] + "' can not be applied to '" + t1.name + "' and '" + t2.name + "'.", bi);
            }
        }
        else if (Operators.isLogicalOp(bi.op)) {
            if (t1.LE(SysTypes.Boolean) && t2.LE(SysTypes.Boolean)) {
                bi.theType = SysTypes.Boolean;
            }
            else {
                this.addError("Operator '" + Op[bi.op] + "' can not be applied to '" + t1.name + "' and '" + t2.name + "'.", bi);
            }
        }
        else {
            this.addError("Unsupported binary operator: " + Op[bi.op], bi);
        }
    }

    visitUnary(u: Unary): any {
        super.visitUnary(u);

        let t = u.exp.theType as Type;
        //要求必须是个左值
        if (u.op == Op.Inc || u.op == Op.Dec) {
            if (t.LE(SysTypes.Number)) {
                u.theType = t;
            }
            else {
                this.addError("Unary operator " + Op[u.op] + "can not be applied to '" + t.name + "'.", u);
            }
        }
        else if (u.op == Op.Minus || u.op == Op.Plus) {
            if (t.LE(SysTypes.Number)) {
                u.theType = t;
            }
            else {
                this.addError("Unary operator " + Op[u.op] + "can not be applied to '" + t.name + "'.", u);
            }
        }
        else if (u.op == Op.Not) {
            if (t.LE(SysTypes.Boolean)) {
                u.theType = t;
            }
            else {
                this.addError("Unary operator " + Op[u.op] + "can not be applied to '" + t.name + "'.", u);
            }
        }
        else {
            this.addError("Unsupported unary operator: " + Op[u.op] + " applied to '" + t.name + "'.", u);
        }
    }

    /**
     * 用符号的类型（也就是变量声明的类型），来标注本节点
     * @param v 
     */
    visitVariable(v: Variable): any {
        if (v.sym != null) {
            v.theType = v.sym.theType;
        }
    }

    visitFunctionCall(functionCall: FunctionCall): any {
        if (functionCall.sym != null) {
            let functionType = functionCall.sym.theType as FunctionType;

            //注意：不使用函数类型，而是使用返回值的类型
            functionCall.theType = functionType.returnType;

            //检查参数数量
            if (functionCall.arguments.length != functionType.paramTypes.length) {
                this.addError("FunctionCall of " + functionCall.name + " has " + functionCall.arguments.length + " arguments, while expecting " + functionType.paramTypes.length + ".", functionCall);
            }

            //检查注意检查参数的类型
            for (let i = 0; i < functionCall.arguments.length; i++) {
                this.visit(functionCall.arguments[i]);
                if (i < functionType.paramTypes.length) {
                    let t1 = functionCall.arguments[i].theType as Type;
                    let t2 = functionType.paramTypes[i] as Type;
                    if (!t1.LE(t2) && t2 !== SysTypes.String) {
                        this.addError("Argument " + i + " of FunctionCall " + functionCall.name + "is of Type " + t1.name + ", while expecting " + t2.name, functionCall);
                    }
                }
            }

        }
    }
}

class TypeConverter extends SemanticAstVisitor {
    visitBinary(bi: Binary): any {
        super.visitBinary(bi);

        let t1 = bi.exp1.theType as Type;
        let t2 = bi.exp2.theType as Type;

        if (Operators.isAssignOp(bi.op)) {
            if (t1 === SysTypes.String && t2 !== SysTypes.String) {
                if (t2 === SysTypes.Integer) {
                    let exp = new FunctionCall(bi.exp2.beginPos, bi.exp2.endPos, "integer_to_string", [bi.exp2]);
                    exp.sym = built_ins.get("integer_to_string") as FunctionSymbol;
                    bi.exp2 = exp;
                }
            }
        }
        else if (bi.op == Op.Plus) { //有一边是string，或者两边都是number才行。
            if (t1 === SysTypes.String || t2 === SysTypes.String) {
                if (t1 === SysTypes.Integer || t1 === SysTypes.Number) {
                    let exp = new FunctionCall(bi.exp1.beginPos, bi.exp1.endPos, "integer_to_string", [bi.exp1]);
                    exp.sym = built_ins.get("integer_to_string") as FunctionSymbol;
                    bi.exp1 = exp;
                }
                if (t2 === SysTypes.Integer || t2 === SysTypes.Number) {
                    let exp = new FunctionCall(bi.exp2.beginPos, bi.exp2.endPos, "integer_to_string", [bi.exp2]);
                    exp.sym = built_ins.get("integer_to_string") as FunctionSymbol;
                    bi.exp2 = exp;
                }
            }
        }
    }

    visitFunctionCall(functionCall: FunctionCall): any {
        if (functionCall.sym != null) {
            let functionType = functionCall.sym.theType as FunctionType;

            //看看参数有没有可以转换的。
            for (let i = 0; i < functionCall.arguments.length; i++) {
                this.visit(functionCall.arguments[i]);
                if (i < functionType.paramTypes.length) {
                    let t1 = functionCall.arguments[i].theType as Type;
                    let t2 = functionType.paramTypes[i] as Type;
                    if ((t1 === SysTypes.Integer || t1 === SysTypes.Number) && t2 === SysTypes.String) {
                        let exp = new FunctionCall(functionCall.arguments[i].beginPos, functionCall.arguments[i].endPos, "integer_to_string", [functionCall.arguments[i]]);
                        exp.sym = built_ins.get("integer_to_string") as FunctionSymbol;
                        functionCall.arguments[i] = exp;
                    }
                }
            }

        }
    }
}

