import { Injectable } from '@nestjs/common';
import { LoginDto, RegisterDto, ResetPasswordDto } from './dto/login.dto';
import { BaseResponse } from '@/common/baseResponse';
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

@Injectable()
export class LoginService {
    response = new BaseResponse()

    // 检查邮箱验证码是否正确+是否过期
    async checkEmailCode(args: any, type: 'login'| 'register' | 'reset_password') {
        const code = await prisma.email_code.findMany({
            where: {
                email: args.email,
                type: type
            }
        })

        if(code.length === 0) return {
            result: this.response.baseResponse(1400, '请先发送验证码'),
            type: false
        }
        if(code[0].code !== args.emailCode) return {
            result: this.response.baseResponse(1400, '邮箱验证码错误'),
            type: false
        }

        const formattedDate = new Date().toLocaleString('en-US', {timeZone: 'Asia/Shanghai'});
        const beforeTime = +new Date(code[0].createdTime)
        const nowTime = +new Date(formattedDate)
        // 获取的时间是正常的，但是beforeTime经过new Date 转换之后就多了八个小时,这边还得调整
        const time = nowTime - ( beforeTime - (8 * 60 * 60 * 1000) )

        if(time > 5 * 60 * 1000) return {
            result: this.response.baseResponse(1400, '邮箱验证码已过期，请重新获取验证码'),
            type: false
        }

        return {
            result: null,
            type: true
        }
    }

    // 检查密码是否相等
    checkPassword(password: string, passwordConfirm: string) {
        return password !== passwordConfirm
    }
    
    // 登录
    login(args: LoginDto){
        // this.checkEmailCode<LoginDto>(args, 'login')
    }

    // 注册
    async register(args: RegisterDto){
        const res = await this.checkEmailCode(args, 'register')

        if(!res.type) return res.result
        // 验证码正确了，开始注册账号，先判断这个账号有没有注册
        const user = await prisma.user.findMany({where: {email: args.email}})
        if(user.length > 0) return this.response.baseResponse(1400, '该邮箱已被注册')
        await prisma.user.create({
            data: {
                email: args.email,
                password: args.password
            }
        })

        return this.response.baseResponse(1200, '注册成功，请返回登录')
    }
    
    // 重置密码
    resetPassword(args: ResetPasswordDto){
        this.checkEmailCode(args, 'reset_password')
    }
    
}
