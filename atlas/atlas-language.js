/* Interface wording for the atlas. Scientific names and record identifiers come from the shared dataset. */
(() => {
  'use strict';
  const en=new URLSearchParams(location.search).get('lang')==='en';
  const text={
    '图谱 · 一株植物的株':'Species atlas · 一株植物的株',
    '查找物种或分类':'Search species or taxa',
    '试试山茶、木兰、Pinus…':'Try Camellia, Magnoliidae, Pinus…',
    '搜索或点选会高亮归属路径，其它分支灰显。图中的数量按视频主对象档案计数，附加对象不重复计数。':'Search or select a name to highlight its path. Each video has one primary record. Other species mentioned in the same video do not increase the count.',
    '匹配的物种':'Matching records','数据从哪里来？':'About the data',
    '植物分类引用':'Plant classification follows ','邱园POWO / WCVP':'Kew’s POWO / WCVP',
    '；真菌引用':'. Fungi follow ','。植物中文属名参考':'. Chinese genus names are checked against ',
    '植物智（iPlant）':'iPlant','，未查得对应名称的属标注待核对；中文是辅助对照，类群不替代正式等级。':'. Chinese common names are included for reference. Informal groups are separate from taxonomic ranks.',
    '新增素材档案':'New records','已与本次素材对应，观察笔记已整理。WCVP下载快照：2026-06-04；各记录的来源与核对日期见档案资料来源。':' have associated field material. The WCVP snapshot dates from 4 June 2026. Each species record lists its sources and review date.',
    '下载图谱数据 ↗':'Download atlas data ↗','分类图谱':'Taxonomic atlas','图谱形式':'Chart type',
    '桑基图':'Sankey','分类树':'Taxonomic tree','旭日图':'Sunburst','力导向图':'Force network','冰柱图':'Icicle','矩形树图':'Treemap','放射树':'Radial tree','圆形打包':'Circle packing','气泡图':'Bubble chart','碰撞漫游':'Bubble discovery',
    '带宽表示收录物种数量，层级从左到右或从上到下展开。':'Band width shows the number of records. Ranks run left to right or top to bottom.',
    '读清每一个分类名称。选择节点后可展开、收起；双击进入该分支。':'Select a taxon to expand or collapse it. Double-click to focus on its branch.',
    '从中心走向外圈，分类逐级细分；扇区角度表示物种占比。':'Ranks become more specific toward the rim. A sector’s angle shows its share of records.',
    '拖动节点探索连接。节点位置和距离不表示分类等级、进化时间或亲缘距离。':'Drag a node to explore its connections. Positions do not indicate evolutionary distance or time.',
    '用一层层矩形阅读分类。分支宽度表示物种数量，点击查看完整路径。':'Branch width shows how many records it contains. Select a rectangle to see its path.',
    '把物种数量变成面积。适合比较分支大小；完整归属可在下方查看。':'Area shows the number of records per branch. Select a tile to see its full classification.',
    '沿着圆周阅读分类分支，可选择逐层放射或末端对齐。':'Follow the branches around a circle. Use radial levels or align all tips at the perimeter.',
    '嵌套圆表示分类包含关系。双击圆进入分支；外圈含留白，精确数量以数字为准。':'Nested circles show which taxa contain others. Double-click a circle to focus on its branch. Read the labels for exact counts.',
    '每个气泡是一条当前可见的末端分支，面积按收录物种数量计算。':'Each bubble represents a visible tip. Its area reflects the number of records included.',
    '鼠标推开普通物种球；随机抽中的物种换色跃出，停下来等待点击。':'Move the pointer or touch the group to push the bubbles away. Draw a record, then choose the highlighted bubble.',
    '显示设置 ⌃':'Settings ⌃','显示设置 ⌄':'Settings ⌄','布局':'Layout','隐藏到':'Hide through','展示到':'Show through',
    '不隐藏':'Show all ranks','界':'Kingdom','门':'Phylum','纲':'Class','纲 · 默认':'Class · default','亚纲':'Subclass','目':'Order','科':'Family','属':'Genus','种':'Species','种 · 完整八级':'Species · all eight ranks',
    '排列':'Sort','按物种数量':'Record count','按名称':'Name','文字':'Names','中文辅助名':'Chinese names','科学名称':'Scientific names',
    '标签':'Labels','智能避让':'Avoid overlaps','全部文字':'Show all','连线':'Links','曲线':'Curved','直角折线':'Right angles',
    '配色':'Palette','配色方案':'Colour palette','当前图谱位置':'Current branch','缩小图谱':'Zoom out','放大图谱':'Zoom in',
    '进入物种详情页 ↗':'Open record ↗','适应窗口':'Fit to window','取消选中':'Clear selection','聚焦结果':'Focus matches','全部展开':'Expand all',
    '回到全库':'Reset view','全屏':'Full screen','退出全屏':'Exit full screen','随机认识一个物种':'Meet a species','随机认识一个物种 ↗':'Draw a species ↗','重新开始':'Start over',
    '交互式分类图谱':'Interactive taxonomic atlas','没有匹配的记录。全库结构仍保留，可清除搜索词继续查看。':'No records match. Clear the search to explore the whole atlas.',
    '滚轮缩放 · 拖动画布 · 点击查看 · 双击聚焦分支':'Scroll to zoom · Drag to pan · Click to inspect · Double-click to focus',
    '所选分类信息':'Selected taxon','选择一个节点':'Choose a node','从一个名字，走进它的分支。':'Follow a name along its branch',
    '点击图中节点或左侧物种，查看中英文分类、数量与来源。':'Select a node or a name in the list to see its classification, count and sources.',
    '进入此分支':'Focus branch','展开下一层':'Expand next rank','收起此分支':'Collapse branch',
    '分类关系与数量是数据事实；节点之间的空间距离不表示进化时间或亲缘距离。':'Branch connections show classification; counts refer to records. Distances between nodes do not represent evolutionary time or relatedness.',
    '正在加载分类记录…':'Loading taxonomic records…','全库':'All records','收录物种':'Records','没有匹配的物种。':'No matching records.',
    '横向树':'Horizontal tree','纵向树':'Vertical tree','逐层放射':'Radial levels','末端对齐':'Aligned tips',
    '拖动碰撞':'Draggable bubbles','静态打包':'Static packing','从左向右':'Left to right','从上向下':'Top to bottom','均衡矩形':'Balanced tiles','条带矩形':'Strips',
    '同心圆环':'Concentric rings','层层嵌套':'Nested circles','鼠标避让与跃出':'Repulsion and draw','自由网络':'Free network',
    '自然色':'Natural','植物自然色':'Natural colours','蓝绿色':'Blue-green','清爽蓝绿':'Blue-green palette','高对比':'High contrast','高对比配色':'High contrast palette','高对比2':'Contrast 2','高对比2 · 按目配色':'Contrast 2 · by order',
    '当前浏览器未允许全屏；仍可使用缩放和拖动查看图谱。':'Full screen is unavailable in this browser. You can still zoom and pan.',
    '真菌':'Fungi','裸子植物':'Gymnosperms','被子植物':'Flowering plants','石松类':'Lycophytes','蕨类植物':'Ferns','绿藻':'Green algae',
    '空（来源未提供）':'Not supplied','来源未提供':'Not supplied','空':'Not supplied'
  };
  const t=value=>en?(text[value]??value):value;
  function translateStatic() {
    if(!en)return;
    document.documentElement.lang='en';
    document.title=t(document.title);
    const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walk.nextNode()){
      const node=walk.currentNode;
      const value=node.nodeValue.trim();
      if(value && Object.hasOwn(text,value))node.nodeValue=node.nodeValue.replace(value,text[value]);
    }
    for(const element of document.querySelectorAll('[aria-label],[placeholder],[title]')){
      for(const name of ['aria-label','placeholder','title']){
        const value=element.getAttribute(name);
        if(value && Object.hasOwn(text,value))element.setAttribute(name,text[value]);
      }
    }
    document.getElementById('labels').value='scientific';
  }
  window.AtlasLocale={en,t,translateStatic,archiveURL:id=>'../?lang='+(en?'en':'zh')+'#plant/'+encodeURIComponent(id)};
})();
