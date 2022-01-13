// 0111
// 支持for循环有问题， 官方代码在注释了TypeChecker、TypeConverter、LeftValueAttributor 也是有问题的
// 我不理解，感觉只要有符号、和引用消除 应该就是能使用for的才对，现在for的作用域没有达到预期功能

// 0112
// 不是for循环有问题 是不支持：a=a+10
// 因为左值判断 搬到了LeftValueAttributor里，05中的
// 根本原因是 没有判断出上面赋值公式里左边的a是左值，解释器 Intepretor 执行 visitVariable 时，返回了值，正确应该是返回符号a
// 导致最后赋值计算结果为： 新增map存储 53: 63 , 正确应该是 map存储 a: 63
// 所以是需要 LeftValueAttributor

// 0113
// 

