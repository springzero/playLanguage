/**
 * 类型体系
 */

export abstract class Type {
    name: string;

    constructor(name:string) {
        this.name = name;
    }


    // 类型中是否包含void
    abstract hasVoid():boolean;

}

/**
 * 简单的类型， 可以有一到多个父类型
 */
export class SimpleType extends Type{
    upperTypes: Type[];
    constructor(name:string, upperTypes:SimpleType[] = []){
        super(name);
        this.upperTypes = upperTypes;
    }

    hasVoid():boolean{
        if(this === SysTypes.Void) {
            return true;
        }
        else {
            // todo 需要检查循环引用
            for (let t of this.upperTypes) {
                if (t.hasVoid()) {
                    return true;
                }
            }
            return false;
        }
    }
}

export class FunctionType extends Type {
    returnType: Type;
    paramTypes: Type[];
    static index:number = 0;
    constructor(returnType: Type = SysTypes.Void, paramTypes: Type[] = [], name:string|undefined = undefined){
        super("@function"); // 使用一个非法字符@，避免与已有的符号名称冲突
        this.returnType = returnType;
        this.paramTypes = paramTypes;
        if (typeof name == 'string') {
            this.name = name;
        }
        else {
            this.name = "@function" + (FunctionType.index++);
        }
    }

    hasVoid(): boolean {
        return this.returnType.hasVoid();
    }
}

/**
 * 内置类型
 */
export class SysTypes{
    // 所有类型的父类型
    static Any = new SimpleType("any",[]);

    // 基础类型
    static String = new SimpleType("string", [SysTypes.Any]);
    static Number = new SimpleType("number", [SysTypes.Any]);
    static Boolean = new SimpleType("boolean", [SysTypes.Any]);

    // 所有类型的子类型
    static Null = new SimpleType("null");
    static Undefined = new SimpleType("undefined");

    static Void = new SimpleType("void");

    static Integer = new SimpleType("integer", [SysTypes.Number]);
    static Decimal = new SimpleType("decimal", [SysTypes.Number]);

    static isSysType(t:Type){
        return t === SysTypes.Any || t === SysTypes.String || t === SysTypes.Number ||
            t === SysTypes.Boolean || t === SysTypes.Null || t === SysTypes.Undefined ||
            t === SysTypes.Void || t === SysTypes.Integer || t === SysTypes.Decimal;
    }



}