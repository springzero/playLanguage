	.section	__TEXT,__text,regular,pure_instructions // 伪指令，会在生成的目标文件里占据一个文本段
	.build_version macos, 11, 0	sdk_version 11, 3
	.globl	_foo                            ## -- Begin function foo // 伪指令 foo可以被其他模块引用
	.p2align	4, 0x90	// 伪指令，让最后生成的机器码16字节对齐（2的4次方），多出来的部分用0x90(NO-OP指令，无动作)填充
_foo:                                   ## @foo	// 标签 别的代码可以通过这个标签跳转到该函数
	.cfi_startproc	// 伪指令 标记一个过程的开始
## %bb.0:	// 注释 bb是基本块的缩写
	pushq	%rbp	//把rpb寄存器的值压到栈中。这会导致栈顶指针（rsp寄存器）的值减少8，也就是栈顶往下长8个字节
	.cfi_def_cfa_offset 16
	.cfi_offset %rbp, -16	// 以.cfi开头的伪指令都是与debug有关的，在发生异常的时候可以记住每个栈桢的位置，实现逐级回滚
	movq	%rsp, %rbp
	.cfi_def_cfa_register %rbp
	movl	%edi, -4(%rbp)	// 把参数1，也就是a的值，从edit寄存器拷贝到rbp-4的内存位置
	movl	-4(%rbp), %eax	// 把参数1，也就是a的值，又从rbp-4的内存位置拷贝到eax寄存器
	addl	$10, %eax		// 在eax寄存器上加上立即数10
	popq	%rbp			// 弹出栈顶的值到rbp
	retq	// 返回调用者。 也就是从栈里弹出返回地址，赋给rip寄存器，从而让程序执行调用foo函数之后的代码
	.cfi_endproc	// 伪指令，标记一个过程的结尾
                                        ## -- End function
.subsections_via_symbols	// 定义一些子Section，这里现在是空的

伪指令是写给汇编器看的 帮助汇编器生成正确的目标文件
