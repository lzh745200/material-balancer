import { describe, expect, it } from 'vitest'
import { isAllowedRendererUrl } from '../src/main/security'

const expectedUrl = 'file:///C:/material-balancer/out/renderer/index.html'

describe('渲染页面 URL 白名单', () => {
  it('Windows 下接受盘符/路径大小写不同的同一文件 URL', () => {
    const lower = 'file:///c:/MATERIAL-BALANCER/out/renderer/index.html'
    expect(isAllowedRendererUrl(lower, { expectedUrl, platform: 'win32' })).toBe(true)
    expect(isAllowedRendererUrl(lower, { expectedUrl, platform: 'linux' })).toBe(false)
  })

  it('生成的应用文件 URL 自身始终通过校验', () => {
    expect(isAllowedRendererUrl(expectedUrl, { expectedUrl, platform: 'win32' })).toBe(true)
  })

  it('拒绝其他本地文件、UNC 主机与远程页面', () => {
    expect(
      isAllowedRendererUrl('file:///C:/Windows/System32/evil.html', {
        expectedUrl,
        platform: 'win32'
      })
    ).toBe(false)
    expect(
      isAllowedRendererUrl('https://example.com/index.html', {
        expectedUrl,
        platform: 'win32'
      })
    ).toBe(false)
    expect(
      isAllowedRendererUrl('file://attacker.example/C:/material-balancer/out/renderer/index.html', {
        expectedUrl,
        platform: 'win32'
      })
    ).toBe(false)
  })

  it('开发模式按 origin 和 pathname 精确校验，前缀混淆域名被拒绝', () => {
    const devBase = 'http://localhost:5173/'
    expect(isAllowedRendererUrl('http://localhost:5173/index.html', { expectedUrl, devBase })).toBe(
      true
    )
    expect(
      isAllowedRendererUrl('http://localhost:5173.evil.example/index.html', {
        expectedUrl,
        devBase
      })
    ).toBe(false)
  })
})
