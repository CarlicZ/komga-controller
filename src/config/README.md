# config/

`defaults.js` — 默认配置与常量，修改新建站点时的初始行为。

## 内容

| 导出 | 说明 |
|------|------|
| `KEY_MAP` | 键盘按键 `key` → `keyCode`/`code` 查找表，覆盖方向键、功能键、字母、数字、F 键、小键盘、符号 |
| `lookupKey(key)` | 根据 `key` 字符串返回 `{ keyCode, code }`，未找到时用 charCode 推断 |
| `BUTTON_LABELS_ZH` | 手柄 17 个按钮的中文标签（A/B/X/Y/LB/RB/十字键…） |
| `BUTTON_LABELS_EN` | 同上的英文标签 |
| `AXIS_LABELS` | 摇杆各方向的中英文标签（左摇杆←→↑↓ / 右摇杆←→↑↓） |
| `getKeyDisplayName(key)` | 将 `key` 值转为人可读的显示名（如 `ArrowRight` → `→ (ArrowRight)`，` ` → `空格 (Space)`） |
| `getKomgaDefaults()` | Komga 漫画阅读器默认映射 |
| `getYoutubeDefaults()` | YouTube 默认映射 |
| `getSiteDefaults(hostname)` | 根据域名返回对应默认映射，未知站点返回 Komga 映射 |

## 映射条目格式

每个映射是一个对象，结构如下：

```typescript
type MappingEntry =
  | { type: "button"; index: number; key: string }                         // 按钮映射
  | { type: "axis";   index: number; direction: "positive"|"negative"; key: string }  // 摇杆映射
```

| 字段 | 说明 |
|------|------|
| `type` | `"button"` 映射按钮，`"axis"` 映射摇杆轴 |
| `index` | 按钮序号 0-16（A=0, B=1, X=2, Y=3, LB=4, RB=5, LT=6, RT=7, Select=8, Start=9, L3=10, R3=11, 十字键↑=12, ↓=13, ←=14, →=15, Home=16）；轴序号 0=左X, 1=左Y, 2=右X, 3=右Y |
| `direction` | 仅 axis 类型需要。`"positive"` 为正方向（右/下），`"negative"` 为负方向（左/上） |
| `key` | 目标键盘按键，使用 [`KeyboardEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values) 标准值。`""` 表示未映射 |

**示例：**

```javascript
{ type: "button", index: 0, key: "ArrowRight" }  // A 键 → 右箭头
{ type: "axis", index: 0, direction: "negative", key: "ArrowLeft" }  // 左摇杆← → 左箭头
{ type: "button", index: 4, key: "" }  // LB → 未映射
```

## 新增默认站点映射

在 `getSiteDefaults(hostname)` 中添加分支：

```javascript
if (hostname.includes('newsite.com')) {
  return [
    { type: 'button', index: 0, key: 'ArrowRight' },
    // ...
  ];
}
```

## 新增默认启用站点

在 `src/core/storage.js` 的 `DEFAULT_ENABLED_SITES` 数组中添加域名。
