import { Position } from "./scanner";

export class CompilerError {
    msg: string;
    beginPos: Position;
    isWarning: boolean;

    constructor(msg:string, beginPos: Position, isWarning = false) {
        this.msg = msg;
        this.beginPos = beginPos;
        this.isWarning = isWarning;
    }
}