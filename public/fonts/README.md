# UI 字体文件

本目录存放 UI 界面字体文件，用于设置页面的"界面字体"切换功能。

## 需要的字体文件

| 文件名 | 字体 | 大小 |
|--------|------|------|
| `SourceHanSansSC-Regular.otf` | 思源黑体 简中 Regular | ~15MB |
| `SourceHanSerifSC-Regular.otf` | 思源宋体 简中 Regular | ~15MB |

## 下载地址

### 思源黑体 (Source Han Sans)
- GitHub: https://github.com/adobe-fonts/source-han-sans/releases
- 下载 SubsetOTF → CN → `SourceHanSansSC-Regular.otf`

### 思源宋体 (Source Han Serif)
- GitHub: https://github.com/junmer/source-han-serif-ttf/releases
- 下载 TTF → SC → `SourceHanSerifSC-Regular.otf`（或 OTF 版本）

## 使用方式

1. 下载上述两个字体文件
2. 重命名为上表中的文件名
3. 放到本目录 (`public/fonts/`)
4. 重启开发服务器或重新构建

字体文件不纳入 git 版本控制（已在 .gitignore 中排除）。
