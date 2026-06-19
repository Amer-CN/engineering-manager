# Agnes Image 2.1 Flash — 图片生成技能

调用 Agnes AI 的 agnes-image-2.1-flash 模型生成高质量图片。

## 何时使用
- 用户需要生成图片（文生图 / 图生图）
- 用户要求"画图"、"生成图片"、"制作图片"等
- 用户需要 AI 绘画、头像、插画等

## API 信息

| 项目 | 值 |
|------|------|
| Base URL | `https://apihub.agnes-ai.com/v1` |
| 接口 | `POST /images/generations` |
| 模型名称 | `agnes-image-2.1-flash` |
| 认证 | `Authorization: Bearer <API_KEY>` |

## 环境变量

- `AGNES_API_KEY` — API Key（默认: `sk-ZqhVc4y6UxPwKLCr7CRgbuwOlyLMIOU1qoC6pfLtkB0gr1c9`）

## 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | string | ✅ | 固定 `agnes-image-2.1-flash` |
| `prompt` | string | ✅ | 图片描述提示词（英文效果最佳） |
| `size` | string | ❌ | 图片尺寸，默认 `1024x1024`，可选 `1024x1024` / `1024x1536` / `1536x1024` 等 |
| `n` | integer | ❌ | 生成数量，默认 1 |
| `image` | string | 图生图时必填 | 输入图片 URL（图生图模式） |

### ⚠️ 重要限制
- **不要传 `response_format` 参数**（会报 400 错误）
- **图生图不需要 `tags` 参数**
- **图生图必须有 `image` 字段**
- 输入图片 URL 必须可访问（公网 URL）
- 请求超时时间建议 ≥30 秒

## 返回格式

成功时返回：
```json
{
  "created": 1781171574,
  "data": [{
    "url": "https://platform-outputs.agnes-ai.space/images/...",
    "b64_json": null,
    "revised_prompt": null
  }],
  "usage": { ... }
}
```

- 图片 URL 格式: `https://platform-outputs.agnes-ai.space/images/{type}/{year}/{month}/{filename}.{ext}`
- 如需 Base64 格式，直接下载 URL 图片后转 base64

## 使用方式

### 文生图（Text-to-Image）
```javascript
const response = await fetch("https://apihub.agnes-ai.com/v1/images/generations", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.AGNES_API_KEY}`
  },
  body: JSON.stringify({
    model: "agnes-image-2.1-flash",
    prompt: "a cute cat sitting on a windowsill, watercolor style",
    size: "1024x1024"
  })
});
const result = await response.json();
console.log(result.data[0].url);
```

### 图生图（Image-to-Image）
```javascript
const response = await fetch("https://apihub.agnes-ai.com/v1/images/generations", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.AGNES_API_KEY}`
  },
  body: JSON.stringify({
    model: "agnes-image-2.1-flash",
    prompt: "rewrite to cyberpunk style, neon lights, futuristic city",
    image: "https://example.com/input-image.png",
    size: "1024x1024"
  })
});
```

### Node.js 工具函数
```javascript
async function agnesGenerateImage(prompt, options = {}) {
  const apiKey = process.env.AGNES_API_KEY || "sk-ZqhVc4y6UxPwKLCr7CRgbuwOlyLMIOU1qoC6pfLtkB0gr1c9";
  const body = {
    model: "agnes-image-2.1-flash",
    prompt: prompt,
    ...options
  };
  // 图生图时添加 image 参数
  if (options.image) {
    body.image = options.image;
  }
  const response = await fetch("https://apihub.agnes-ai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Agnes API Error: ${err.message || response.statusText}`);
  }
  return response.json();
}
```

## 最佳实践

### 文生图建议
- 提示词用英文效果通常更好
- 包含风格描述（如 watercolor, oil painting, 3D render, anime）
- 包含光照、角度、背景等细节
- 生成多张选最好的（`n: 4`）

### 图生图建议
- `prompt` 描述想要改什么
- 输入图片必须是公网可访问的 URL
- 不要传 `tags` 参数

### 高信息密度图片建议
- 明确描述场景中的所有元素
- 指定构图（全景、特写、俯视等）
- 说明风格、色彩方案

## 常见错误排查

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `response_format 放在顶层导致报错` | 不支持该参数 | 移除 `response_format` 字段 |
| `图生图不需要 tags` | 图生图模式不支持 tags | 移除 `tags` 参数 |
| `输入图片 URL 不可访问` | 图生图图片不可达 | 确保图片 URL 公网可访问 |
| `请求超时` | 图片生成需要时间 | 增加超时到 60 秒 |
| `图生图请求缺少 image` | 忘了传 input image | 添加 `image` 字段 |

## 参考
- 文档: https://agnes-ai.com/doc/agnes-image-21-flash

