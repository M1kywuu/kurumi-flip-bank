# 素材与依赖

- 灵感：[奈櫻Nine的投币式感应动画存钱箱](https://www.bilibili.com/video/BV1pEa66NEct/)。
- 角色：《FX战士久留美》的二创版本。插画由内置 imagegen 按漫画官方参考新绘制，提示词在 `docs/illustration-prompt-v2.md`。
- 行情：本项目生成的120根闭环模拟OHLC。影线比例参考Alpha Vantage FX_DAILY日线，来源和取得时间见 `src/fx-history.json`。
- Three.js：MIT，许可证见 `licenses/three.txt`。
- Rapier：Apache-2.0，许可证见 `licenses/rapier.txt`。
- Vite：网页构建工具。
- 音效为项目内合成；文字、模型、木纹和画页图表由项目代码生成。

- 视觉参考：[FX战士久留美动画官网](https://fxkurumi-info.com/)。成品使用自行编写的CSS、背景蜡烛图和SVG星芒。
- M PLUS 1、Cherry Bomb One：经Fontsource 5.3.0随包提供，SIL Open Font License，见 `licenses/m-plus-1.txt` 与 `licenses/cherry-bomb-one.txt`。数值用M PLUS 1的Latin子集，日文短标签用Cherry Bomb One，中文由系统字体显示。
