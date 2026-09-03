# bloub — vendored engine

Vendored from [jeremy-prt/bloub](https://github.com/jeremy-prt/bloub) @ `b4bb3c1` (MIT).

- `bot/` — 上游 `src/bot/` 逐字复刻（12 源文件 + 6 测试），唯一本地修改：无（内部本为相对 import）
- `gaze.ts` — 上游 `src/ui/gaze.ts`，唯一本地修改：`@/bot/*` → `./bot/*`
- `Mascot.tsx`（上级目录）为 React 适配薄壳，非上游文件

MIT License 原文见本目录 `LICENSE`。上游 README/docs 明确：数值全部来自对 x.ai
参考视频的逐帧实测，"rounding them off breaks the resemblance"——改数值前先读上游
docs/measurements.md。
