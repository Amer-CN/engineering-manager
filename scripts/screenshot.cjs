const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // 截启动动画（SplashScreen）
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800); // 等动画出来
  await page.screenshot({ path: 'docs/articles/screenshot-splash.png' });
  console.log('✅ 启动动画截图完成');

  // 等启动动画结束，进入登录页或主页
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'docs/articles/screenshot-after-splash.png' });
  console.log('✅ 启动后截图完成');

  await browser.close();
})();
