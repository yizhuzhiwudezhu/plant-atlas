# 一株植物的株 · 植物观察

实拍植物与真菌观察档案，收录照片、视频链接、观察笔记和自然手绘。

此仓库保存可直接运行的静态网站。GitHub Pages 使用 main 分支根目录发布。

打开 index.html 可浏览；也可运行 `python -m http.server 8000` 后访问 http://localhost:8000。

- index.html：入口
- app.js / style.css：交互和样式
- data.js：档案内容
- assets--*.webp：压缩后的图片

照片、手绘与原始文稿由“一株植物的株”提供，适用[个人非商业使用许可](CONTENT-LICENSE.md)：允许免费浏览、分享网站链接和个人非商业学习收藏；公开转载、再分发、公开发布修改后的素材以及商业用途需另行授权。该许可不适用于程序代码；代码未另行提供开源许可。
部分日期、地点与分类信息仍在整理中，请参阅档案中的来源说明。

维护时在本地 plant-atlas 项目更新数据、运行 scripts/build.py 和 scripts/prepare_github.py，
再将 github-upload 中的文件更新到本仓库。原始大视频不存放在此仓库。
