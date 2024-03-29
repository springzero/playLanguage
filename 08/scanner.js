"use strict";
// 词法分析器
exports.__esModule = true;
exports.Operators = exports.Keyword = exports.Op = exports.Seperator = exports.Scanner = exports.CharStream = exports.Position = exports.Token = exports.TokenKind = void 0;
//Token的类型
var TokenKind;
(function (TokenKind) {
    TokenKind[TokenKind["Keyword"] = 0] = "Keyword";
    TokenKind[TokenKind["Identifier"] = 1] = "Identifier";
    TokenKind[TokenKind["StringLiteral"] = 2] = "StringLiteral";
    TokenKind[TokenKind["IntegerLiteral"] = 3] = "IntegerLiteral";
    TokenKind[TokenKind["DecimalLiteral"] = 4] = "DecimalLiteral";
    TokenKind[TokenKind["NullLiteral"] = 5] = "NullLiteral";
    TokenKind[TokenKind["BooleanLiteral"] = 6] = "BooleanLiteral";
    TokenKind[TokenKind["Seperator"] = 7] = "Seperator";
    TokenKind[TokenKind["Operator"] = 8] = "Operator";
    TokenKind[TokenKind["EOF"] = 9] = "EOF";
})(TokenKind = exports.TokenKind || (exports.TokenKind = {}));
;
// 代表一个Token的数据结构
var Token = /** @class */ (function () {
    function Token(kind, text, pos, code) {
        if (code === void 0) { code = null; }
        this.kind = kind;
        this.text = text;
        this.pos = pos;
        this.code = code;
    }
    Token.prototype.toString = function () {
        return "Token" + "@" + this.pos.toString() + "\t" + TokenKind[this.kind] + " \t'" + this.text + "'";
    };
    return Token;
}());
exports.Token = Token;
// 代码位置
var Position = /** @class */ (function () {
    function Position(begin, end, line, col) {
        this.begin = begin;
        this.end = end;
        this.line = line;
        this.col = col;
    }
    Position.prototype.toString = function () {
        return "(ln:" + this.line + ", col:" + this.col + ", pos:" + this.begin + ")";
    };
    return Position;
}());
exports.Position = Position;
/**
 * 一个字符串流。其操作为：
 * peek():预读下一个字符，但不移动指针；
 * next():读取下一个字符，并且移动指针；
 * eof():判断是否已经到了结尾。
 */
var CharStream = /** @class */ (function () {
    function CharStream(data) {
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this.data = data;
    }
    CharStream.prototype.peek = function () {
        return this.data.charAt(this.pos);
    };
    CharStream.prototype.next = function () {
        var ch = this.data.charAt(this.pos++);
        if (ch == '\n') {
            this.line++;
            this.col = 0;
        }
        else {
            this.col++;
        }
        return ch;
    };
    CharStream.prototype.eof = function () {
        return this.peek() == '';
    };
    CharStream.prototype.getPosition = function () {
        return new Position(this.pos + 1, this.pos + 1, this.line, this.col);
    };
    return CharStream;
}());
exports.CharStream = CharStream;
var Scanner = /** @class */ (function () {
    function Scanner(stream) {
        this.tokens = new Array(); // 采用一个array， 能预存多个Token
        this.lastPos = new Position(0, 0, 0, 0);
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
        this.KeywordMap = new Map([
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
        ]);
        this.stream = stream;
    }
    Scanner.prototype.next = function () {
        var t = this.tokens.shift();
        if (typeof t == 'undefined') {
            return this.getAToken();
        }
        this.lastPos = t.pos;
        return t;
    };
    Scanner.prototype.peek = function () {
        var t = this.tokens[0];
        if (typeof t == 'undefined') {
            t = this.getAToken();
            this.tokens.push(t);
        }
        return t;
    };
    Scanner.prototype.peek2 = function () {
        var t = this.tokens[1];
        while (typeof t == 'undefined') {
            this.tokens.push(this.getAToken());
            t = this.tokens[1];
        }
        return t;
    };
    // 获取接下来的Token的位置
    Scanner.prototype.getNextPos = function () {
        return this.peek().pos;
    };
    // 获取前一个Token的position？ 看来这个值是必需的
    Scanner.prototype.getLastPos = function () {
        return this.lastPos;
    };
    //从字符串流中获取一个新Token。
    Scanner.prototype.getAToken = function () {
        this.skipWhiteSpaces();
        var pos = this.stream.getPosition();
        if (this.stream.eof()) {
            return new Token(TokenKind.EOF, "EOF", pos);
        }
        else {
            var ch = this.stream.peek();
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
                var ch1 = this.stream.peek();
                var literal = '';
                if (ch == '0') { //暂不支持八进制、二进制、十六进制
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
                var ch1 = this.stream.peek();
                if (this.isDigit(ch1)) {
                    //小数字面量
                    var literal = '.';
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
                var ch1 = this.stream.peek();
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
                var ch1 = this.stream.peek();
                if (ch1 == '+') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '++', pos, Op.Inc);
                }
                else if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '+=', pos, Op.PlusAssign);
                }
                else {
                    return new Token(TokenKind.Operator, '+', pos, Op.Plus);
                }
            }
            else if (ch == '-') {
                this.stream.next();
                var ch1 = this.stream.peek();
                if (ch1 == '-') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '--', pos, Op.Dec);
                }
                else if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '-=', pos, Op.MinusAssign);
                }
                else {
                    return new Token(TokenKind.Operator, '-', pos, Op.Minus);
                }
            }
            else if (ch == '*') {
                this.stream.next();
                var ch1 = this.stream.peek();
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
                var ch1 = this.stream.peek();
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
                var ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    return new Token(TokenKind.Operator, '>=', pos, Op.GE);
                }
                else if (ch1 == '>') {
                    this.stream.next();
                    var ch1_1 = this.stream.peek();
                    if (ch1_1 == '>') {
                        this.stream.next();
                        ch1_1 = this.stream.peek();
                        if (ch1_1 == '=') {
                            this.stream.next();
                            return new Token(TokenKind.Operator, '>>>=', pos, Op.RightShiftLogicalAssign);
                        }
                        else {
                            return new Token(TokenKind.Operator, '>>>', pos, Op.RightShiftLogical);
                        }
                    }
                    else if (ch1_1 == '=') {
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
                var ch1 = this.stream.peek();
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
                var ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    var ch1_2 = this.stream.peek();
                    if (ch1_2 = '=') {
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
                var ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    var ch1_3 = this.stream.peek();
                    if (ch1_3 = '=') {
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
                var ch1 = this.stream.peek();
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
                var ch1 = this.stream.peek();
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
                var ch1 = this.stream.peek();
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
    };
    /**
     * 跳过单行注释
     */
    Scanner.prototype.skipSingleLineComment = function () {
        //跳过第二个/，第一个之前已经跳过去了。
        this.stream.next();
        //往后一直找到回车或者eof
        while (this.stream.peek() != '\n' && !this.stream.eof()) {
            this.stream.next();
        }
    };
    /**
     * 跳过多行注释
     */
    Scanner.prototype.skipMultipleLineComments = function () {
        //跳过*，/之前已经跳过去了。
        this.stream.next();
        if (!this.stream.eof()) {
            var ch1 = this.stream.next();
            //往后一直找到回车或者eof
            while (!this.stream.eof()) {
                var ch2 = this.stream.next();
                if (ch1 == '*' && ch2 == '/') {
                    return;
                }
                ch1 = ch2;
            }
        }
        //如果没有匹配上，报错。
        console.log("Failed to find matching */ for multiple line comments at ': " + this.stream.line + " col: " + this.stream.col);
    };
    /**
     * 跳过空白字符
     */
    Scanner.prototype.skipWhiteSpaces = function () {
        while (this.isWhiteSpace(this.stream.peek())) {
            this.stream.next();
        }
    };
    /**
     * 字符串字面量。
     * 目前只支持双引号，并且不支持转义。
     */
    Scanner.prototype.parseStringLiteral = function () {
        var pos = this.stream.getPosition();
        var token = new Token(TokenKind.StringLiteral, "", pos);
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
    };
    /**
     * 解析标识符。从标识符中还要挑出关键字。
     */
    Scanner.prototype.parseIdentifer = function () {
        var pos = this.stream.getPosition();
        var token = new Token(TokenKind.Identifier, "", pos);
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
            token.code = this.KeywordMap.get(token.text);
        }
        return token;
    };
    Scanner.prototype.isLetterDigitOrUnderScore = function (ch) {
        return (ch >= 'A' && ch <= 'Z' ||
            ch >= 'a' && ch <= 'z' ||
            ch >= '0' && ch <= '9' ||
            ch == '_');
    };
    Scanner.prototype.isLetter = function (ch) {
        return (ch >= 'A' && ch <= 'Z' || ch >= 'a' && ch <= 'z');
    };
    Scanner.prototype.isDigit = function (ch) {
        return (ch >= '0' && ch <= '9');
    };
    Scanner.prototype.isWhiteSpace = function (ch) {
        return (ch == ' ' || ch == '\n' || ch == '\t');
    };
    return Scanner;
}());
exports.Scanner = Scanner;
////////////////////////
// 将Token细化分类
// 分隔符
var Seperator;
(function (Seperator) {
    Seperator[Seperator["OpenBracket"] = 0] = "OpenBracket";
    Seperator[Seperator["CloseBracket"] = 1] = "CloseBracket";
    Seperator[Seperator["OpenParen"] = 2] = "OpenParen";
    Seperator[Seperator["CloseParen"] = 3] = "CloseParen";
    Seperator[Seperator["OpenBrace"] = 4] = "OpenBrace";
    Seperator[Seperator["CloseBrace"] = 5] = "CloseBrace";
    Seperator[Seperator["Colon"] = 6] = "Colon";
    Seperator[Seperator["SemiColon"] = 7] = "SemiColon";
})(Seperator = exports.Seperator || (exports.Seperator = {}));
// 运算符
var Op;
(function (Op) {
    Op[Op["QuestionMark"] = 100] = "QuestionMark";
    Op[Op["Ellipsis"] = 101] = "Ellipsis";
    Op[Op["Dot"] = 102] = "Dot";
    Op[Op["Comma"] = 103] = "Comma";
    Op[Op["At"] = 104] = "At";
    Op[Op["RightShiftArithmetic"] = 105] = "RightShiftArithmetic";
    Op[Op["LeftShiftArithmetic"] = 106] = "LeftShiftArithmetic";
    Op[Op["RightShiftLogical"] = 107] = "RightShiftLogical";
    Op[Op["IdentityEquals"] = 108] = "IdentityEquals";
    Op[Op["IdentityNotEquals"] = 109] = "IdentityNotEquals";
    Op[Op["BitNot"] = 110] = "BitNot";
    Op[Op["BitAnd"] = 111] = "BitAnd";
    Op[Op["BitXOr"] = 112] = "BitXOr";
    Op[Op["BitOr"] = 113] = "BitOr";
    Op[Op["Not"] = 114] = "Not";
    Op[Op["And"] = 115] = "And";
    Op[Op["Or"] = 116] = "Or";
    Op[Op["Assign"] = 117] = "Assign";
    Op[Op["MultiplyAssign"] = 118] = "MultiplyAssign";
    Op[Op["DivideAssign"] = 119] = "DivideAssign";
    Op[Op["ModulusAssign"] = 120] = "ModulusAssign";
    Op[Op["PlusAssign"] = 121] = "PlusAssign";
    Op[Op["MinusAssign"] = 122] = "MinusAssign";
    Op[Op["LeftShiftArithmeticAssign"] = 123] = "LeftShiftArithmeticAssign";
    Op[Op["RightShiftArithmeticAssign"] = 124] = "RightShiftArithmeticAssign";
    Op[Op["RightShiftLogicalAssign"] = 125] = "RightShiftLogicalAssign";
    Op[Op["BitAndAssign"] = 126] = "BitAndAssign";
    Op[Op["BitXorAssign"] = 127] = "BitXorAssign";
    Op[Op["BitOrAssign"] = 128] = "BitOrAssign";
    Op[Op["ARROW"] = 129] = "ARROW";
    Op[Op["Inc"] = 130] = "Inc";
    Op[Op["Dec"] = 131] = "Dec";
    Op[Op["Plus"] = 132] = "Plus";
    Op[Op["Minus"] = 133] = "Minus";
    Op[Op["Multiply"] = 134] = "Multiply";
    Op[Op["Divide"] = 135] = "Divide";
    Op[Op["Modulus"] = 136] = "Modulus";
    Op[Op["EQ"] = 137] = "EQ";
    Op[Op["NE"] = 138] = "NE";
    Op[Op["G"] = 139] = "G";
    Op[Op["GE"] = 140] = "GE";
    Op[Op["L"] = 141] = "L";
    Op[Op["LE"] = 142] = "LE";
})(Op = exports.Op || (exports.Op = {}));
// 关键字
var Keyword;
(function (Keyword) {
    Keyword[Keyword["Function"] = 200] = "Function";
    Keyword[Keyword["Class"] = 201] = "Class";
    Keyword[Keyword["Break"] = 202] = "Break";
    Keyword[Keyword["Delete"] = 203] = "Delete";
    Keyword[Keyword["Return"] = 204] = "Return";
    Keyword[Keyword["Case"] = 205] = "Case";
    Keyword[Keyword["Do"] = 206] = "Do";
    Keyword[Keyword["If"] = 207] = "If";
    Keyword[Keyword["Switch"] = 208] = "Switch";
    Keyword[Keyword["Var"] = 209] = "Var";
    Keyword[Keyword["Catch"] = 210] = "Catch";
    Keyword[Keyword["Else"] = 211] = "Else";
    Keyword[Keyword["In"] = 212] = "In";
    Keyword[Keyword["This"] = 213] = "This";
    Keyword[Keyword["Void"] = 214] = "Void";
    Keyword[Keyword["Continue"] = 215] = "Continue";
    Keyword[Keyword["False"] = 216] = "False";
    Keyword[Keyword["Instanceof"] = 217] = "Instanceof";
    Keyword[Keyword["Throw"] = 218] = "Throw";
    Keyword[Keyword["While"] = 219] = "While";
    Keyword[Keyword["Debugger"] = 220] = "Debugger";
    Keyword[Keyword["Finally"] = 221] = "Finally";
    Keyword[Keyword["New"] = 222] = "New";
    Keyword[Keyword["True"] = 223] = "True";
    Keyword[Keyword["With"] = 224] = "With";
    Keyword[Keyword["Default"] = 225] = "Default";
    Keyword[Keyword["For"] = 226] = "For";
    Keyword[Keyword["Null"] = 227] = "Null";
    Keyword[Keyword["Try"] = 228] = "Try";
    Keyword[Keyword["Typeof"] = 229] = "Typeof";
    // 严格模式
    Keyword[Keyword["Implements"] = 230] = "Implements";
    Keyword[Keyword["Let"] = 231] = "Let";
    Keyword[Keyword["Private"] = 232] = "Private";
    Keyword[Keyword["Public"] = 233] = "Public";
    Keyword[Keyword["Yield"] = 234] = "Yield";
    Keyword[Keyword["Interface"] = 235] = "Interface";
    Keyword[Keyword["Package"] = 236] = "Package";
    Keyword[Keyword["Protected"] = 237] = "Protected";
    Keyword[Keyword["Static"] = 238] = "Static";
    Keyword[Keyword["Any"] = 239] = "Any";
    Keyword[Keyword["String"] = 240] = "String";
    Keyword[Keyword["Number"] = 241] = "Number";
    Keyword[Keyword["Boolean"] = 242] = "Boolean";
    Keyword[Keyword["Symbol"] = 243] = "Symbol";
    Keyword[Keyword["Undefined"] = 244] = "Undefined";
})(Keyword = exports.Keyword || (exports.Keyword = {}));
/**
 * 对运算符的一些判断
 */
var Operators = /** @class */ (function () {
    function Operators() {
    }
    Operators.isAssignOp = function (op) {
        return op >= Op.Assign && op <= Op.BitOrAssign;
    };
    Operators.isRelationOp = function (op) {
        return op >= Op.EQ && op <= Op.LE;
    };
    Operators.isArithmeticOp = function (op) {
        return op >= Op.Plus && op <= Op.Modulus;
    };
    Operators.isLogicalOp = function (op) {
        return op >= Op.Not && op <= Op.Or;
    };
    return Operators;
}());
exports.Operators = Operators;
