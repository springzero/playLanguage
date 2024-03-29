// 词法分析器

//Token的类型
export enum TokenKind { Keyword, Identifier, StringLiteral, IntegerLiteral, DecimalLiteral, NullLiteral, BooleanLiteral, Seperator, Operator, EOF };

// 代表一个Token的数据结构
export class Token {
    kind: TokenKind;
    text: string;
    code: Op | Seperator | Keyword | null;
    pos: Position;

    constructor(kind: TokenKind, text: string, pos: Position, code: Op | Seperator | Keyword | null = null) {
        this.kind = kind;
        this.text = text;
        this.pos = pos;
        this.code = code;
    }

    toString(): string {
        return "Token" + "@" + this.pos.toString() + "\t" + TokenKind[this.kind] + " \t'" + this.text + "'";
    }

}

// 代码位置
export class Position {
    begin: number;
    end: number;
    line: number;
    col: number;

    constructor(begin: number, end: number, line: number, col: number) {
        this.begin = begin;
        this.end = end;
        this.line = line;
        this.col = col;
    }

    toString(): string {
        return "(ln:" + this.line + ", col:" + this.col + ", pos:" + this.begin + ")";
    }
}

/**
 * 一个字符串流。其操作为：
 * peek():预读下一个字符，但不移动指针；
 * next():读取下一个字符，并且移动指针；
 * eof():判断是否已经到了结尾。
 */
export class CharStream {
    data: string;
    pos: number = 0;
    line: number = 1;
    col: number = 1;
    constructor(data: string) {
        this.data = data;
    }
    peek(): string {
        return this.data.charAt(this.pos);
    }
    next(): string {
        let ch = this.data.charAt(this.pos++);
        if (ch == '\n') {
            this.line++;
            this.col = 0;
        } else {
            this.col++;
        }
        return ch;
    }
    eof(): boolean {
        return this.peek() == '';
    }
    getPosition(): Position {
        return new Position(this.pos + 1, this.pos + 1, this.line, this.col);
    }
}


export class Scanner {
    tokens: Array<Token> = new Array<Token>();   // 采用一个array， 能预存多个Token
    stream: CharStream;
    private lastPos: Position = new Position(0, 0, 0, 0);

    // private static KeyWords: Set<string> = new Set(
    //     [
    //         "function", "class", "break", "delete", "return",
    //         "case", "do", "if", "switch", "var",
    //         "catch", "else", "in", "this", "void",
    //         "continue", "false", "instanceof", "throw", "while",
    //         "debugger", "finally", "new", "true", "with",
    //         "default", "for", "null", "try", "typeof",
    //         //下面这些用于严格模式
    //         "implements", "let", "private", "public", "yield",
    //         "interface", "package", "protected", "static",
    //         // 类型
    //         "number", "string", "boolean", "any", "symbol",
    //         // 值
    //         "undefined"
    //     ]
    // );

    private KeywordMap: Map<string, Keyword> = new Map([
        ["function", Keyword.Function],
        ["class", Keyword.Class],
        ["break", Keyword.Break],
        ["delete", Keyword.Delete],
        ["return", Keyword.Return],
        ["case", Keyword.Case],
        ["do", Keyword.Do],
        ["if", Keyword.If],
        ["switch", Keyword.Switch],
        ["var", Keyword.Var],
        ["catch", Keyword.Catch],
        ["else", Keyword.Else],
        ["in", Keyword.In],
        ["this", Keyword.This],
        ["void", Keyword.Void],
        ["continue", Keyword.Continue],
        ["false", Keyword.False],
        ["instanceof", Keyword.Instanceof],
        ["throw", Keyword.Throw],
        ["while", Keyword.While],
        ["debugger", Keyword.Debugger],
        ["finally", Keyword.Finally],
        ["new", Keyword.New],
        ["true", Keyword.True],
        ["with", Keyword.With],
        ["default", Keyword.Default],
        ["for", Keyword.For],
        ["null", Keyword.Null],
        ["try", Keyword.Try],
        ["typeof", Keyword.Typeof],
        //下面这些用于严格模式
        ["implements", Keyword.Implements],
        ["let", Keyword.Let],
        ["private", Keyword.Private],
        ["public", Keyword.Public],
        ["yield", Keyword.Yield],
        ["interface", Keyword.Interface],
        ["package", Keyword.Package],
        ["protected", Keyword.Protected],
        ["static", Keyword.Static],
        //类型  注释掉这部分 使类型能正常工作
        // ["number", Keyword.Number],
        // ["string", Keyword.String],
        // ["boolean", Keyword.Boolean],
        // ["any", Keyword.Any],
        // ["symbol", Keyword.Symbol],
        // //值
        // ["undefined", Keyword.Undefined],
    ])

    constructor(stream: CharStream) {
        this.stream = stream;
    }

    next(): Token {
        let t: Token | undefined = this.tokens.shift();
        if (typeof t == 'undefined') {
            return this.getAToken()
        }
        this.lastPos = t.pos;
        return t;
    }

    peek(): Token {
        let t: Token | undefined = this.tokens[0];
        if (typeof t == 'undefined') {
            t = this.getAToken();
            this.tokens.push(t);
        }
        return t;
    }

    peek2(): Token {
        let t: Token | undefined = this.tokens[1];
        while (typeof t == 'undefined') {
            this.tokens.push(this.getAToken());
            t = this.tokens[1];
        }
        return t;
    }

    // 获取接下来的Token的位置
    getNextPos(): Position {
        return this.peek().pos;
    }

    // 获取前一个Token的position？ 看来这个值是必需的
    getLastPos(): Position {
        return this.lastPos;
    }


    //从字符串流中获取一个新Token。
    private getAToken(): Token {
        this.skipWhiteSpaces();
        let pos = this.stream.getPosition();
        if (this.stream.eof()) {
            return new Token(TokenKind.EOF, "EOF", pos);
        }
        else {
            let ch: string = this.stream.peek();
            if (this.isLetter(ch) || ch == '_') {
                return this.parseIdentifer();
            }
            else if (ch == '"') {
                return this.parseStringLiteral();
            }
            else if (ch == '(') {
                this.stream.next();
                return new Token(TokenKind.Seperator, ch, pos, Seperator.OpenParen);
            }
            else if (ch == ')') {
                this.stream.next();
                return new Token(TokenKind.Seperator, ch, pos, Seperator.CloseParen);
            }
            else if (ch == '{') {
                this.stream.next();
                return new Token(TokenKind.Seperator, ch, pos, Seperator.OpenBrace);
            }
            else if (ch == '}') {
                this.stream.next();
                return new Token(TokenKind.Seperator, ch, pos, Seperator.CloseBrace);
            }
            else if (ch == '[') {
                this.stream.next();
                return new Token(TokenKind.Seperator, ch, pos, Seperator.OpenBracket);
            }
            else if (ch == ']') {
                this.stream.next();
                return new Token(TokenKind.Seperator, ch, pos, Seperator.CloseBracket);
            }
            else if (ch == ':') {
                this.stream.next();
                return new Token(TokenKind.Seperator, ch, pos, Seperator.Colon);
            }
            else if (ch == ';') {
                this.stream.next();
                return new Token(TokenKind.Seperator, ch, pos, Seperator.SemiColon);
            }
            else if (ch == ',') {
                this.stream.next();
                return new Token(TokenKind.Seperator, ch, pos, Op.Comma);
            }
            else if (ch == '?') {
                this.stream.next();
                return new Token(TokenKind.Seperator, ch, pos, Op.QuestionMark);
            }
            else if (ch == '@') {
                this.stream.next();
                return new Token(TokenKind.Seperator, ch, pos, Op.At);
            }
            //解析数字字面量，语法是：
            // DecimalLiteral: IntegerLiteral '.' [0-9]* 
            //   | '.' [0-9]+
            //   | IntegerLiteral 
            //   ;
            // IntegerLiteral: '0' | [1-9] [0-9]* ;
            else if (this.isDigit(ch)) {
                this.stream.next();
                let ch1 = this.stream.peek();
                let literal: string = '';
                if (ch == '0') {//暂不支持八进制、二进制、十六进制
                    if (!(ch1 >= '1' && ch1 <= '9')) {
                        literal = '0';
                    }
                    else {
                        console.log("0 cannot be followed by other digit now, at line: " + this.stream.line + " col: " + this.stream.col);
                        //暂时先跳过去
                        this.stream.next();
                        return this.getAToken();
                    }
                }
                else if (ch >= '1' && ch <= '9') {
                    literal += ch;
                    while (this.isDigit(ch1)) {
                        ch = this.stream.next();
                        literal += ch;
                        ch1 = this.stream.peek();
                    }
                }
                //加上小数点.
                if (ch1 == '.') {
                    //小数字面量
                    literal += '.';
                    this.stream.next();
                    ch1 = this.stream.peek();
                    while (this.isDigit(ch1)) {
                        ch = this.stream.next();
                        literal += ch;
                        ch1 = this.stream.peek();
                    }
                    pos.end = this.stream.pos + 1;
                    return new Token(TokenKind.DecimalLiteral, literal, pos);
                }
                else {
                    //返回一个整型直面量
                    return new Token(TokenKind.IntegerLiteral, literal, pos);
                }
            }
            else if (ch == '.') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (this.isDigit(ch1)) {
                    //小数字面量
                    let literal = '.';
                    while (this.isDigit(ch1)) {
                        ch = this.stream.next();
                        literal += ch;
                        ch1 = this.stream.peek();
                    }
                    pos.end = this.stream.pos + 1; // 这里为什么要加1  因为上一条命令是peek？有可能
                    return new Token(TokenKind.DecimalLiteral, literal, pos);
                }
                //...省略号
                else if (ch1 == '.') {
                    this.stream.next();
                    //第三个.
                    ch1 = this.stream.peek();
                    if (ch1 == '.') {
                        pos.end = this.stream.pos + 1;
                        return new Token(TokenKind.Seperator, '...', pos, Op.Ellipsis);
                    }
                    else {
                        console.log('Unrecognized pattern : .., missed a . ?');
                        return this.getAToken();
                    }
                }
                //.号分隔符
                else {
                    return new Token(TokenKind.Seperator, '.', pos, Op.Dot);
                }
            }
            else if (ch == '/') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (ch1 == '*') {
                    this.skipMultipleLineComments();
                    return this.getAToken();
                }
                else if (ch1 == '/') {
                    this.skipSingleLineComment();
                    return this.getAToken();
                }
                else if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '/=', pos, Op.DivideAssign);
                }
                else {
                    return new Token(TokenKind.Operator, '/', pos, Op.Divide);
                }
            }
            else if (ch == '+') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (ch1 == '+') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '++', pos, Op.Inc);
                } else if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '+=', pos, Op.PlusAssign);
                }
                else {
                    return new Token(TokenKind.Operator, '+', pos, Op.Plus);
                }
            }
            else if (ch == '-') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (ch1 == '-') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '--', pos, Op.Dec);
                } else if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '-=', pos, Op.MinusAssign);
                }
                else {
                    return new Token(TokenKind.Operator, '-', pos, Op.Minus);
                }
            }
            else if (ch == '*') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '*=', pos, Op.MultiplyAssign);
                }
                else {
                    return new Token(TokenKind.Operator, '*', pos, Op.Multiply);
                }
            }
            else if (ch == '%') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '%=', pos, Op.ModulusAssign);
                }
                else {
                    return new Token(TokenKind.Operator, '%', pos, Op.Modulus);
                }
            }
            else if (ch == '>') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '>=', pos, Op.GE);
                }
                else if (ch1 == '>') {
                    this.stream.next();
                    let ch1 = this.stream.peek();
                    if (ch1 == '>') {
                        this.stream.next();
                        ch1 = this.stream.peek();
                        if (ch1 == '=') {
                            this.stream.next();
                            return new Token(TokenKind.Operator, '>>>=', pos, Op.RightShiftLogicalAssign);
                        }
                        else {
                            return new Token(TokenKind.Operator, '>>>', pos, Op.RightShiftLogical);
                        }
                    }
                    else if (ch1 == '=') {
                        this.stream.next();
                        return new Token(TokenKind.Operator, '>>=', pos, Op.LeftShiftArithmeticAssign);
                    }
                    else {
                        return new Token(TokenKind.Operator, '>>', pos, Op.RightShiftArithmetic);
                    }
                }
                else {
                    return new Token(TokenKind.Operator, '>', pos, Op.G);
                }
            }
            else if (ch == '<') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '<=', pos, Op.LE);
                }
                else if (ch1 == '<') {
                    this.stream.next();
                    ch1 = this.stream.peek();
                    if (ch1 == '=') {
                        this.stream.next();
                        return new Token(TokenKind.Operator, '<<=', pos, Op.LeftShiftArithmeticAssign);
                    }
                    else {
                        return new Token(TokenKind.Operator, '<<', pos, Op.LeftShiftArithmetic);
                    }
                }
                else {
                    return new Token(TokenKind.Operator, '<', pos, Op.L);
                }
            }
            else if (ch == '=') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    let ch1 = this.stream.peek();
                    if (ch1 = '=') {
                        this.stream.next();
                        return new Token(TokenKind.Operator, '===', pos, Op.IdentityEquals);
                    }
                    else {
                        return new Token(TokenKind.Operator, '==', pos, Op.EQ);
                    }
                }
                //箭头=>
                else if (ch1 == '>') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '=>', pos, Op.ARROW);
                }
                else {
                    return new Token(TokenKind.Operator, '=', pos, Op.Assign);
                }
            }
            else if (ch == '!') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    let ch1 = this.stream.peek();
                    if (ch1 = '=') {
                        this.stream.next();
                        return new Token(TokenKind.Operator, '!==', pos, Op.IdentityNotEquals);
                    }
                    else {
                        return new Token(TokenKind.Operator, '!=', pos, Op.NE);
                    }
                }
                else {
                    return new Token(TokenKind.Operator, '!', pos, Op.Not);
                }
            }
            else if (ch == '|') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (ch1 == '|') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '||', pos, Op.Or);
                }
                else if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '|=', pos, Op.BitOrAssign);
                }
                else {
                    return new Token(TokenKind.Operator, '|', pos, Op.BitOr);
                }
            }
            else if (ch == '&') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (ch1 == '&') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '&&', pos, Op.And);
                }
                else if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '&=', pos, Op.BitAndAssign);
                }
                else {
                    return new Token(TokenKind.Operator, '&', pos, Op.BitAnd);
                }
            }
            else if (ch == '^') {
                this.stream.next();
                let ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '^=', pos, Op.BitXorAssign);
                }
                else {
                    return new Token(TokenKind.Operator, '^', pos, Op.BitXOr);
                }
            }
            else if (ch == '~') {
                this.stream.next();
                return new Token(TokenKind.Operator, '~', pos, Op.BitNot);
            }
            else {
                //暂时去掉不能识别的字符
                console.log("Unrecognized pattern meeting ': " + ch + "', at" + this.stream.line + " col: " + this.stream.col);
                this.stream.next();
                return this.getAToken();
            }
        }
    }
    /**
     * 跳过单行注释
     */
    private skipSingleLineComment() {
        //跳过第二个/，第一个之前已经跳过去了。
        this.stream.next();

        //往后一直找到回车或者eof
        while (this.stream.peek() != '\n' && !this.stream.eof()) {
            this.stream.next();
        }
    }

    /**
     * 跳过多行注释
     */
    private skipMultipleLineComments() {
        //跳过*，/之前已经跳过去了。
        this.stream.next();

        if (!this.stream.eof()) {
            let ch1 = this.stream.next();
            //往后一直找到回车或者eof
            while (!this.stream.eof()) {
                let ch2 = this.stream.next();
                if (ch1 == '*' && ch2 == '/') {
                    return;
                }
                ch1 = ch2;
            }
        }

        //如果没有匹配上，报错。
        console.log("Failed to find matching */ for multiple line comments at ': " + this.stream.line + " col: " + this.stream.col);
    }

    /**
     * 跳过空白字符
     */
    private skipWhiteSpaces() {
        while (this.isWhiteSpace(this.stream.peek())) {
            this.stream.next();
        }
    }

    /**
     * 字符串字面量。
     * 目前只支持双引号，并且不支持转义。
     */
    private parseStringLiteral(): Token {
        let pos = this.stream.getPosition();
        let token = new Token(TokenKind.StringLiteral, "", pos);

        //第一个字符不用判断，因为在调用者那里已经判断过了
        this.stream.next();

        while (!this.stream.eof() && this.stream.peek() != '"') {
            token.text += this.stream.next();
        }

        if (this.stream.peek() == '"') {
            //消化掉字符换末尾的引号
            this.stream.next();
        }
        else {
            console.log("Expecting an \" at line: " + this.stream.line + " col: " + this.stream.col);
        }

        return token;
    }

    /**
     * 解析标识符。从标识符中还要挑出关键字。
     */
    private parseIdentifer(): Token {
        let pos = this.stream.getPosition();
        let token = new Token(TokenKind.Identifier, "", pos);

        //第一个字符不用判断，因为在调用者那里已经判断过了
        token.text += this.stream.next();

        //读入后序字符
        while (!this.stream.eof() &&
            this.isLetterDigitOrUnderScore(this.stream.peek())) {
            token.text += this.stream.next();
        }

        //识别出关键字（从字典里查，速度会比较快）
        if (this.KeywordMap.has(token.text)) {
            token.kind = TokenKind.Keyword;
            token.code = this.KeywordMap.get(token.text) as Keyword;
        }


        return token;
    }

    private isLetterDigitOrUnderScore(ch: string): boolean {
        return (ch >= 'A' && ch <= 'Z' ||
            ch >= 'a' && ch <= 'z' ||
            ch >= '0' && ch <= '9' ||
            ch == '_');
    }

    private isLetter(ch: string): boolean {
        return (ch >= 'A' && ch <= 'Z' || ch >= 'a' && ch <= 'z');
    }

    private isDigit(ch: string): boolean {
        return (ch >= '0' && ch <= '9');
    }

    private isWhiteSpace(ch: string): boolean {
        return (ch == ' ' || ch == '\n' || ch == '\t');
    }
}

////////////////////////
// 将Token细化分类

// 分隔符
export enum Seperator {
    OpenBracket = 0,    // [
    CloseBracket,       // ]
    OpenParen,          // (
    CloseParen,         // )
    OpenBrace,          // {
    CloseBrace,         // }
    Colon,              // :
    SemiColon,          // ;
}

// 运算符
export enum Op {
    QuestionMark = 100,             //?   让几个类型的code取值不重叠
    Ellipsis,                       //...
    Dot,                            //.
    Comma,                          //,
    At,                             //@

    RightShiftArithmetic,           //>>
    LeftShiftArithmetic,            //<<
    RightShiftLogical,              //>>>
    IdentityEquals,                 //===
    IdentityNotEquals,              //!==

    BitNot,                         //~
    BitAnd,                         //&
    BitXOr,                         //^
    BitOr,                          //|

    Not,                            //!   
    And,                            //&&
    Or,                             //||

    Assign,                         //=
    MultiplyAssign,                 //*=
    DivideAssign,                   ///=
    ModulusAssign,                  //%=
    PlusAssign,                     //+=
    MinusAssign,                    //-=
    LeftShiftArithmeticAssign,      //<<=
    RightShiftArithmeticAssign,     //>>=
    RightShiftLogicalAssign,        //>>>=
    BitAndAssign,                   //&=
    BitXorAssign,                   //^=
    BitOrAssign,                    //|=

    ARROW,                          //=>

    Inc,                            //++
    Dec,                            //--

    Plus,                           //+
    Minus,                          //-
    Multiply,                       //*
    Divide,                         ///
    Modulus,                        //%

    EQ,                             //==
    NE,                             //!=
    G,                              //>
    GE,                             //>=
    L,                              //<
    LE,                             //<=
}

// 关键字
export enum Keyword {
    Function = 200,
    Class,
    Break,
    Delete,
    Return,
    Case,
    Do,
    If,
    Switch,
    Var,
    Catch,
    Else,
    In,
    This,
    Void,
    Continue,
    False,
    Instanceof,
    Throw,
    While,
    Debugger,
    Finally,
    New,
    True,
    With,
    Default,
    For,
    Null,
    Try,
    Typeof,
    // 严格模式
    Implements,
    Let,
    Private,
    Public,
    Yield,
    Interface,
    Package,
    Protected,
    Static,

    Any,
    String,
    Number,
    Boolean,
    Symbol,
    Undefined,
}

/**
 * 对运算符的一些判断
 */
 export class Operators{
    static isAssignOp(op:Op):boolean{
        return op>= Op.Assign && op <= Op.BitOrAssign;
    }
    
    static isRelationOp(op:Op):boolean{
        return op>= Op.EQ && op <= Op.LE;
    }
    
    static isArithmeticOp(op:Op):boolean{
        return op>= Op.Plus && op <= Op.Modulus;
    }

    static isLogicalOp(op:Op):boolean{
        return op>= Op.Not && op <= Op.Or;
    }
}