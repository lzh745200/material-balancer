import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import MaterialPanel from '@/components/MaterialPanel.vue'
import PersonPanel from '@/components/PersonPanel.vue'
import { useProjectStore } from '@/stores/project'

/**
 * 组件冒烟测试（happy-dom）：
 * 重点覆盖「输入校验 → store 状态」的联动，不追求像素级渲染断言。
 * el-table 依赖 ResizeObserver，这里 stub 掉（被测交互都在表格之外）。
 */
beforeEach(() => {
  setActivePinia(createPinia())
})

function mountPanel(component: Parameters<typeof mount>[0]) {
  return mount(component, {
    global: {
      plugins: [ElementPlus],
      stubs: { ElTable: true, ElTableColumn: true }
    }
  })
}

async function setInput(wrapper: ReturnType<typeof mount>, placeholder: string, value: string) {
  const input = wrapper.findAll('input').find((i) => i.attributes('placeholder') === placeholder)
  if (!input) throw new Error(`找不到 placeholder 为 ${placeholder} 的输入框`)
  ;(input.element as HTMLInputElement).value = value
  await input.trigger('input')
}

async function clickButton(wrapper: ReturnType<typeof mount>, text: string) {
  const button = wrapper.findAll('button').find((b) => b.text().includes(text))
  if (!button) throw new Error(`找不到按钮 ${text}`)
  await button.trigger('click')
}

describe('MaterialPanel 添加物资', () => {
  it('空名称被拒绝', async () => {
    const store = useProjectStore()
    const wrapper = mountPanel(MaterialPanel)
    await clickButton(wrapper, '添加')
    expect(store.materials).toHaveLength(0)
  })

  it('未填单价被拒绝', async () => {
    const store = useProjectStore()
    const wrapper = mountPanel(MaterialPanel)
    await setInput(wrapper, '物资名称（必填）', '笔记本')
    await clickButton(wrapper, '添加')
    expect(store.materials).toHaveLength(0)
  })

  it('名称 + 单价合法时数量默认 1 件入 store', async () => {
    const store = useProjectStore()
    const wrapper = mountPanel(MaterialPanel)
    await setInput(wrapper, '物资名称（必填）', '笔记本')
    // 数量输入框（el-input-number）默认即为 1
    const priceInput = wrapper.findAll('.price-input input')[0]
    ;(priceInput.element as HTMLInputElement).value = '5'
    await priceInput.trigger('input')
    await clickButton(wrapper, '添加')
    expect(store.materials).toHaveLength(1)
    expect(store.materials[0]).toMatchObject({ name: '笔记本', quantity: 1 })
  })
})

describe('PersonPanel 人员管理', () => {
  it('添加人员进入 store', async () => {
    const store = useProjectStore()
    const wrapper = mountPanel(PersonPanel)
    await setInput(wrapper, '输入姓名后回车', '张三')
    await clickButton(wrapper, '添加')
    expect(store.people.map((p) => p.name)).toEqual(['张三'])
  })

  it('同名人员被拒绝（阻断添加而不是静默通过）', async () => {
    const store = useProjectStore()
    store.addPerson('张三')
    const wrapper = mountPanel(PersonPanel)
    await setInput(wrapper, '输入姓名后回车', '张三')
    await clickButton(wrapper, '添加')
    expect(store.people).toHaveLength(1)
  })

  it('空姓名被拒绝', async () => {
    const store = useProjectStore()
    const wrapper = mountPanel(PersonPanel)
    await clickButton(wrapper, '添加')
    expect(store.people).toHaveLength(0)
  })
})
