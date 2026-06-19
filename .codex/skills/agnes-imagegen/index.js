/**
 * Agnes Image 2.1 Flash - Node.js 图片生成工具 (ESM)
 * 
 * 用法:
 *   import { agnesGenerateImage } from "./agnes-imagegen/index.js";
 *   const result = await agnesGenerateImage("a cute cat");
 *   console.log(result.data[0].url);
 */

export const DEFAULT_API_KEY = "sk-ZqhVc4y6UxPwKLCr7CRgbuwOlyLMIOU1qoC6pfLtkB0gr1c9";
export const BASE_URL = "https://apihub.agnes-ai.com/v1/images/generations";
export const MODEL = "agnes-image-2.1-flash";

/**
 * 调用 Agnes Image 2.1 Flash 生成图片
 * @param {string} prompt - 图片描述提示词
 * @param {object} [options] - 可选参数
 * @param {string} [options.size="1024x1024"] - 图片尺寸
 * @param {number} [options.n=1] - 生成数量
 * @param {string} [options.image] - 输入图片 URL（图生图模式）
 * @param {string} [options.apiKey] - API Key（默认从环境变量或内置密钥）
 * @returns {Promise<object>} API 响应结果
 */
export async function agnesGenerateImage(prompt, options = {}) {
  const apiKey = options.apiKey || process.env.AGNES_API_KEY || DEFAULT_API_KEY;
  
  const body = {
    model: MODEL,
    prompt: prompt
  };

  if (options.size) body.size = options.size;
  if (options.n) body.n = options.n;
  if (options.image) body.image = options.image;

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000)
  });

  if (!response.ok) {
    let errorMsg = response.statusText;
    try {
      const err = await response.json();
      errorMsg = err.message || errorMsg;
    } catch {}
    throw new Error(`Agnes Image API Error (${response.status}): ${errorMsg}`);
  }

  return await response.json();
}
