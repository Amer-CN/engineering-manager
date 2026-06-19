#!/usr/bin/env node
/**
 * 微信公众号自动发布脚本
 * 用法: node scripts/publish-wechat.js <文章markdown文件路径>
 * 示例: node scripts/publish-wechat.js docs/articles/01-给自己造把锤子.md
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 加载配置
const configPath = path.join(__dirname, 'wechat-config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ 未找到 scripts/wechat-config.json，请先配置 AppID 和 AppSecret');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

// HTTP 请求封装
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        ...options.headers,
        ...(options.body ? { 'Content-Length': Buffer.byteLength(options.body) } : {}),
      },
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// 获取 access_token
async function getAccessToken() {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`;
  const res = await request(url);
  if (res.errcode) {
    throw new Error(`获取 token 失败: ${res.errmsg} (errcode: ${res.errcode})`);
  }
  console.log('✅ access_token 获取成功');
  return res.access_token;
}

// Markdown 转微信公众号 HTML
function markdownToHtml(md) {
  let html = md;

  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 图片标记
  html = html.replace(/!\[图片\]/g, '<p style="text-align:center;color:#999;font-size:14px;">[图片位置]</p>');

  // 分隔线
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">');

  // 引用块
  html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #ddd;padding-left:12px;color:#666;margin:16px 0;">$1</blockquote>');

  // 段落处理（非空行且不是HTML标签的行，包<p>标签）
  html = html.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return trimmed;
    return `<p style="margin:12px 0;line-height:1.8;font-size:16px;">${trimmed}</p>`;
  }).join('\n');

  // 清理多余空行
  html = html.replace(/\n{3,}/g, '\n\n');

  return html;
}

// 上传封面图
async function uploadThumb(token, imagePath) {
  const fs = require('fs');
  const path = require('path');
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
  const fileName = path.basename(imagePath);
  const fileData = fs.readFileSync(imagePath);

  const bodyParts = [];
  bodyParts.push(`--${boundary}\r\n`);
  bodyParts.push(`Content-Disposition: form-data; name="media"; filename="${fileName}"\r\n`);
  bodyParts.push(`Content-Type: image/png\r\n\r\n`);
  bodyParts.push(fileData);
  bodyParts.push(`\r\n--${boundary}--\r\n`);

  const body = Buffer.concat(bodyParts.map(p => typeof p === 'string' ? Buffer.from(p) : p));

  const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${token}&type=image`;
  const urlObj = new URL(url);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.errcode) {
            reject(new Error(`上传封面图失败: ${result.errmsg} (errcode: ${result.errcode})`));
          } else {
            console.log(`✅ 封面图上传成功，media_id: ${result.media_id}`);
            resolve(result.media_id);
          }
        } catch {
          reject(new Error(`上传封面图响应解析失败: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// 创建草稿
async function createDraft(token, article) {
  const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;
  const body = JSON.stringify({
    articles: [{
      title: article.title,
      author: article.author || '',
      digest: article.digest || '',
      content: article.content,
      content_source_url: '',
      thumb_media_id: article.thumbMediaId || '',
      need_open_comment: 1,
      only_fans_can_comment: 0,
    }]
  });

  const res = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (res.errcode) {
    throw new Error(`创建草稿失败: ${res.errmsg} (errcode: ${res.errcode})`);
  }
  console.log(`✅ 草稿创建成功，media_id: ${res.media_id}`);
  return res.media_id;
}

// 发布草稿
async function publishDraft(token, mediaId) {
  const url = `https://api.weixin.qq.com/cgi-bin/freepublish/submit?access_token=${token}`;
  const body = JSON.stringify({ media_id: mediaId });

  const res = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (res.errcode) {
    throw new Error(`发布失败: ${res.errmsg} (errcode: ${res.errcode})`);
  }
  console.log(`✅ 发布成功，publish_id: ${res.publish_id}`);
  return res.publish_id;
}

// 主流程
async function main() {
  const mdPath = process.argv[2];
  if (!mdPath) {
    console.log('用法: node scripts/publish-wechat.js <文章markdown文件>');
    console.log('示例: node scripts/publish-wechat.js docs/articles/01-给自己造把锤子.md');
    console.log('');
    console.log('选项:');
    console.log('  --draft-only   只创建草稿，不发布');
    console.log('  --title <标题>  指定文章标题');
    console.log('  --author <作者> 指定作者名');
    process.exit(0);
  }

  const fullPath = path.resolve(mdPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ 文件不存在: ${fullPath}`);
    process.exit(1);
  }

  // 解析参数
  const args = process.argv.slice(3);
  const draftOnly = args.includes('--draft-only');
  const titleIdx = args.indexOf('--title');
  const authorIdx = args.indexOf('--author');

  const title = titleIdx >= 0 ? args[titleIdx + 1] : null;
  const author = authorIdx >= 0 ? args[authorIdx + 1] : '给自己造把锤子';

  // 读取 Markdown
  const md = fs.readFileSync(fullPath, 'utf-8');

  // 提取标题（从第一行 # 标题 或 --title 参数）
  let articleTitle = title;
  let content = md;
  if (!articleTitle) {
    const titleMatch = md.match(/^# (.+)$/m);
    articleTitle = titleMatch ? titleMatch[1] : path.basename(fullPath, '.md');
    // 移除标题行
    content = md.replace(/^# .+\n?/, '').trim();
  }

  // 提取摘要（第一个非空段落）
  const firstPara = content.split('\n\n').find(p => p.trim() && !p.trim().startsWith('#') && !p.trim().startsWith('>'));
  const digest = firstPara ? firstPara.trim().substring(0, 120) : '';

  // 转 HTML
  const html = markdownToHtml(content);

  console.log(`📝 文章标题: ${articleTitle}`);
  console.log(`👤 作者: ${author}`);
  console.log(`📄 摘要: ${digest.substring(0, 50)}...`);
  console.log('');

  // 获取 token
  const token = await getAccessToken();

  // 上传封面图
  const thumbPath = path.join(__dirname, '..', 'public', 'logo-white.png');
  console.log(`🖼️  上传封面图: ${thumbPath}`);
  const thumbMediaId = await uploadThumb(token, thumbPath);

  // 创建草稿
  const mediaId = await createDraft(token, {
    title: articleTitle,
    author,
    digest,
    content: html,
    thumbMediaId,
  });

  if (draftOnly) {
    console.log('');
    console.log('📋 草稿已创建，请到公众号后台手动发布');
    console.log(`   草稿 media_id: ${mediaId}`);
    return;
  }

  // 发布
  const publishId = await publishDraft(token, mediaId);

  console.log('');
  console.log('🎉 文章已发布！');
  console.log(`   发布 ID: ${publishId}`);
  console.log('   请到公众号后台查看发布状态');
}

main().catch(err => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
