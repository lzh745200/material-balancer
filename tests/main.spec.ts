import { describe, expect, it, vi } from 'vitest'
import { IPC } from '../src/shared/types'

const { invokeHandlers, eventHandlers } = vi.hoisted(() => ({
  invokeHandlers: new Map<string, (event: unknown, ...args: unknown[]) => unknown>(),
  eventHandlers: new Map<string, (event: unknown, ...args: unknown[]) => void>()
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => {
      invokeHandlers.set(channel, listener)
    },
    on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => {
      eventHandlers.set(channel, listener)
    }
  },
  app: { getPath: () => process.cwd() },
  dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
  BrowserWindow: { fromWebContents: () => null },
  shell: { showItemInFolder: vi.fn() }
}))

import { registerIpcHandlers } from '../src/main/services/fileIO'

describe('IPC 来源校验', () => {
  it('非可信 WebContents 无法调用特权频道，也无法同步写草稿', () => {
    registerIpcHandlers(() => false)
    const event = {
      sender: { id: 999, getURL: () => 'file:///tmp/untrusted.html' }
    }
    const recents = invokeHandlers.get(IPC.RecentsList)
    expect(recents).toBeTypeOf('function')
    expect(() => recents!(event)).toThrow(/非主窗口/)

    const draftSync = eventHandlers.get(IPC.DraftSaveSync)
    expect(draftSync).toBeTypeOf('function')
    const syncEvent = { ...event, returnValue: undefined as unknown }
    draftSync!(syncEvent, '{}')
    expect(syncEvent.returnValue).toEqual({ ok: false, error: '拒绝来自非主窗口的请求' })
  })
})
