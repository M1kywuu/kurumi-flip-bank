# GitHub Pages 发布

作者：M1kywuu。仓库名称：`kurumi-flip-bank`。

- 项目仓库：<https://github.com/M1kywuu/kurumi-flip-bank>
- 试玩网址：<https://m1kywuu.github.io/kurumi-flip-bank/>

## 首次设置

将源码上传到公开仓库，主分支使用 `main`。在仓库的 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。首次发布尚未完成时，试玩网址可能返回404；以 Actions 的发布状态和实际网页为准。

`.github/workflows/pages.yml` 会安装锁定的依赖、检查行情/机构与箱体、构建网页并发布 `dist`。动作固定到经过核对的GitHub官方提交；不需要另填个人访问令牌。

## 后续更新

修改源码并提交到 `main` 后自动发布。只修改截图、文档等内容也会触发发布。可以在 **Actions → Publish game to GitHub Pages → Run workflow** 手动运行。

发布会读取Pages提供的子目录地址，因此角色图片、字体和物理库可以在 `/kurumi-flip-bank/` 路径下加载。本地启动仍使用相对路径。重新命名仓库后，发布路径随下一次运行更新，旧试玩链接需要一并更换。

`dist`、依赖目录、交付压缩包和旧版档案不进入Git版本；网站发布仅包含构建结果。字体及依赖许可证仍随网站提供。

## 参考

- [GitHub Pages 官方工作流说明](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Vite 的 GitHub Pages 部署说明](https://vite.dev/guide/static-deploy.html#github-pages)
