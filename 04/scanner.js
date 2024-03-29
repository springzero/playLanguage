"use strict";
// 词法分析器
exports.__esModule = true;
exports.Scanner = exports.CharStream = exports.TokenKind = void 0;
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
        this.col = 0;
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
    return CharStream;
}());
exports.CharStream = CharStream;
var Scanner = /** @class */ (function () {
    function Scanner(stream) {
        this.tokens = new Array(); // 采用一个array， 能预存多个Token
        this.stream = stream;
    }
    Scanner.prototype.next = function () {
        var t = this.tokens.shift();
        if (typeof t == 'undefined') {
            return this.getAToken();
        }
        else {
            return t;
        }
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
    //从字符串流中获取一个新Token。
    Scanner.prototype.getAToken = function () {
        this.skipWhiteSpaces();
        if (this.stream.eof()) {
            return { kind: TokenKind.EOF, text: "" };
        }
        else {
            var ch = this.stream.peek();
            if (this.isLetter(ch) || ch == '_') {
                return this.parseIdentifer();
            }
            else if (ch == '"') {
                return this.parseStringLiteral();
            }
            else if (ch == '(' || ch == ')' || ch == '{' || ch == '}' || ch == '[' || ch == ']' ||
                ch == ',' || ch == ';' || ch == ':' || ch == '?' || ch == '@') {
                this.stream.next();
                return { kind: TokenKind.Seperator, text: ch };
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
                    return { kind: TokenKind.DecimalLiteral, text: literal };
                }
                else {
                    //返回一个整型直面量
                    return { kind: TokenKind.IntegerLiteral, text: literal };
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
                    return { kind: TokenKind.DecimalLiteral, text: literal };
                }
                //...省略号
                else if (ch1 == '.') {
                    this.stream.next();
                    //第三个.
                    ch1 = this.stream.peek();
                    if (ch1 == '.') {
                        return { kind: TokenKind.Seperator, text: '...' };
                    }
                    else {
                        console.log('Unrecognized pattern : .., missed a . ?');
                        return this.getAToken();
                    }
                }
                //.号分隔符
                else {
                    return { kind: TokenKind.Seperator, text: '.' };
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
                    return { kind: TokenKind.Operator, text: '/=' };
                }
                else {
                    return { kind: TokenKind.Operator, text: '/' };
                }
            }
            else if (ch == '+') {
                this.stream.next();
                var ch1 = this.stream.peek();
                if (ch1 == '+') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '++' };
                }
                else if (ch1 == '=') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '+=' };
                }
                else {
                    return { kind: TokenKind.Operator, text: '+' };
                }
            }
            else if (ch == '-') {
                this.stream.next();
                var ch1 = this.stream.peek();
                if (ch1 == '-') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '--' };
                }
                else if (ch1 == '=') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '-=' };
                }
                else {
                    return { kind: TokenKind.Operator, text: '-' };
                }
            }
            else if (ch == '*') {
                this.stream.next();
                var ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '*=' };
                }
                else {
                    return { kind: TokenKind.Operator, text: '*' };
                }
            }
            else if (ch == '%') {
                this.stream.next();
                var ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '%=' };
                }
                else {
                    return { kind: TokenKind.Operator, text: '%' };
                }
            }
            else if (ch == '>') {
                this.stream.next();
                var ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '>=' };
                }
                else if (ch1 == '>') {
                    this.stream.next();
                    var ch1_1 = this.stream.peek();
                    if (ch1_1 == '>') {
                        this.stream.next();
                        ch1_1 = this.stream.peek();
                        if (ch1_1 == '=') {
                            this.stream.next();
                            return { kind: TokenKind.Operator, text: '>>>=' };
                        }
                        else {
                            return { kind: TokenKind.Operator, text: '>>>' };
                        }
                    }
                    else if (ch1_1 == '=') {
                        this.stream.next();
                        return { kind: TokenKind.Operator, text: '>>=' };
                    }
                    else {
                        return { kind: TokenKind.Operator, text: '>>' };
                    }
                }
                else {
                    return { kind: TokenKind.Operator, text: '>' };
                }
            }
            else if (ch == '<') {
                this.stream.next();
                var ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '<=' };
                }
                else if (ch1 == '<') {
                    this.stream.next();
                    ch1 = this.stream.peek();
                    if (ch1 == '=') {
                        this.stream.next();
                        return { kind: TokenKind.Operator, text: '<<=' };
                    }
                    else {
                        return { kind: TokenKind.Operator, text: '<<' };
                    }
                }
                else {
                    return { kind: TokenKind.Operator, text: '<' };
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
                        return { kind: TokenKind.Operator, text: '===' };
                    }
                    else {
                        return { kind: TokenKind.Operator, text: '==' };
                    }
                }
                //箭头=>
                else if (ch1 == '>') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '=>' };
                }
                else {
                    return { kind: TokenKind.Operator, text: '=' };
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
                        return { kind: TokenKind.Operator, text: '!==' };
                    }
                    else {
                        return { kind: TokenKind.Operator, text: '!=' };
                    }
                }
                else {
                    return { kind: TokenKind.Operator, text: '!' };
                }
            }
            else if (ch == '|') {
                this.stream.next();
                var ch1 = this.stream.peek();
                if (ch1 == '|') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '||' };
                }
                else if (ch1 == '=') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '|=' };
                }
                else {
                    return { kind: TokenKind.Operator, text: '|' };
                }
            }
            else if (ch == '&') {
                this.stream.next();
                var ch1 = this.stream.peek();
                if (ch1 == '&') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '&&' };
                }
                else if (ch1 == '=') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '&=' };
                }
                else {
                    return { kind: TokenKind.Operator, text: '&' };
                }
            }
            else if (ch == '^') {
                this.stream.next();
                var ch1 = this.stream.peek();
                if (ch1 == '=') {
                    this.stream.next();
                    return { kind: TokenKind.Operator, text: '^=' };
                }
                else {
                    return { kind: TokenKind.Operator, text: '^' };
                }
            }
            else if (ch == '~') {
                this.stream.next();
                return { kind: TokenKind.Operator, text: ch };
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
        var token = { kind: TokenKind.StringLiteral, text: "" };
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
        var token = { kind: TokenKind.Identifier, text: "" };
        //第一个字符不用判断，因为在调用者那里已经判断过了
        token.text += this.stream.next();
        //读入后序字符
        while (!this.stream.eof() &&
            this.isLetterDigitOrUnderScore(this.stream.peek())) {
            token.text += this.stream.next();
        }
        //识别出关键字（从字典里查，速度会比较快）
        if (Scanner.KeyWords.has(token.text)) {
            token.kind = TokenKind.Keyword;
        }
        //null
        else if (token.text == 'null') {
            token.kind = TokenKind.NullLiteral;
        }
        //布尔型字面量
        else if (token.text == 'true' || token.text == 'false') {
            token.kind = TokenKind.BooleanLiteral;
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
    Scanner.KeyWords = new Set(["function", "class", "break", "delete", "return",
        "case", "do", "if", "switch", "var",
        "catch", "else", "in", "this", "void",
        "continue", "false", "instanceof", "throw", "while",
        "debugger", "finally", "new", "true", "with",
        "default", "for", "null", "try", "typeof",
        //下面这些用于严格模式
        "implements", "let", "private", "public", "yield",
        "interface", "package", "protected", "static"]);
    return Scanner;
}());
exports.Scanner = Scanner;
