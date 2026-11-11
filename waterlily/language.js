'use strict';
window.PondLanguage = (() => {
  const language = window.FieldLanguagePreference.current;
  const english = language === 'en';
  const messages = {
    '睡莲的授粉时差 · 花间实验室': 'Two days in a water lily · Pond Lab',
    '通过白睡莲纵剖面动画了解雌蕊先熟，再化身蜜蜂，在横向卷轴的池塘中取粉、避障和授粉。': 'Watch how a white water lily receives pollen before it sheds its own. Then guide a bee across a pond to carry pollen from one flower to another.',
    '花间实验室首页': 'Pond Lab home',
    '花间实验室': 'Pond Lab',
    '主导航': 'Main navigation',
    '机制学习': 'Learn',
    '蜜蜂挑战': 'Bee game',
    '研究依据': 'Research',
    '返回物种网站': 'Back to the species archive',
    '物种网站': 'Species archive',
    '白睡莲': 'White water lily',
    '睡莲的授粉时差': 'Two days in a water lily',
    '同一朵花，为什么先收花粉，再散花粉？': 'Why does a flower receive pollen before it sheds its own?',
    '跟着花心的变化，认识睡莲的雌蕊先熟。': 'Look inside a water lily to see how its female parts mature first.',
    '开始学习': 'Explore the flower',
    '进入蜜蜂挑战': 'Play the bee game',
    '机制观察室': 'Inside the flower',
    '15 秒动画': '15-second animation',
    '白睡莲雌蕊先熟纵剖面动画': 'Animated longitudinal section showing the female parts of a white water lily maturing first. The labels in the animation are in Chinese.',
    '白睡莲纵剖面': 'Flower in section · Chinese labels',
    '播放剖面动画': 'Play the flower animation',
    '播放动画': 'Play animation',
    '暂停动画': 'Pause animation',
    '动画进度': 'Animation progress',
    '全屏播放': 'Full screen',
    '跟着花期看': 'Follow the flowering cycle',
    '第一天': 'Day one',
    '柱头先收粉': 'The stigma receives pollen',
    '柱头盘露在花心，表面蓄着液体。访花昆虫带来的花粉可以落在这里，此时本花的花药还未成熟。': 'At the centre of the flower, the exposed stigma forms a disc that holds a pool of fluid. Pollen brought by a visiting insect can settle here while the flower’s own anthers are still immature.',
    '第二天': 'Day two',
    '内圈花药散粉': 'The inner anthers release pollen',
    '柱头盘变干，内圈花丝向内下弯，成熟的花药伸到柱头上方。昆虫来访时，花粉就能沾上它的身体。': 'As the stigmatic disc dries, the inner filaments bend inward and down. The mature anthers now hang over the stigma, where their pollen can brush onto a visiting insect.',
    '花间传递': 'Between flowers',
    '另一朵花接收花粉': 'Another flower receives the pollen',
    '携粉昆虫飞向另一朵刚开放的睡莲，让花粉落在湿润的柱头上。收粉和散粉错开，减少了同一朵花给自己授粉的机会。': 'An insect can carry the pollen to the wet stigma of another, newly opened water lily. Receiving and shedding pollen at different times makes self-pollination less likely.',
    '蜜蜂授粉挑战': 'Bee pollination challenge',
    '去挑战': 'Play',
    '找到散粉花': 'Find a flower with pollen',
    '空手时落到金色花药上，沾取花粉。': 'Land on the golden anthers to pick up pollen.',
    '飞过池塘': 'Fly across the pond',
    '按空格振翅，松开缓降。避开花茎、水面和飞鸟。': 'Press Space or tap to flap. Release to drift down. Steer clear of stems, the water and passing birds.',
    '落在受粉花上': 'Land on a receptive flower',
    '带粉后，找花心湿润、没有蜜蜂的另一朵花。': 'Once you have pollen, find another flower with a wet centre and no bee on it.',
    '白睡莲第二天内圈雄蕊下弯的动作来自逐日花期观察。剖面中省略了部分雄蕊，花粉颗粒经过放大。': 'Daily observations of white water lilies describe the inner stamens bending down on the second day. The animation leaves out some stamens and enlarges the pollen grains for visibility. ',
    'van der Velde，1986，第 111 页 ↗': 'van der Velde, 1986, p. 111 ↗',
    '荷兰睡莲科花朵的野外调查记录了访花昆虫。游戏用蜜蜂模拟传粉过程，有蜂占用的花是游戏中的避让规则。': 'A field study in the Netherlands recorded insects visiting flowers of the water lily family. In this game, a bee carries the pollen, and players must avoid flowers already occupied by another bee. ',
    'van der Velde 等，1978，第 429 页 ↗': 'van der Velde et al., 1978, p. 429 ↗',
    '返回机制学习': 'Back to the flower',
    '振翅飞过池塘，把花粉从散粉花送到另一朵空闲的受粉花。': 'Fly across the pond and carry pollen to the wet centre of another, unoccupied flower.',
    '单次授粉': 'One delivery',
    '连续授粉': 'Endless',
    '目标 · 寻找散粉花': 'Find pollen',
    '已携粉 · 寻找受粉花': 'Deliver pollen',
    '朵': 'flowers',
    '暂停游戏': 'Pause game',
    '蜜蜂飞行游戏。按空格或点按画面振翅。': 'Bee flight game. Press Space or tap the pond to flap.',
    '准备起飞': 'Ready to fly?',
    '完成一次取粉和授粉即可过关。': 'Collect pollen and deliver it to one flower.',
    '反复取粉和授粉，比比谁送达的花朵更多。': 'Keep collecting pollen and see how many flowers you can reach.',
    '游戏模式': 'Game mode',
    '玩家昵称': 'Nickname',
    '可选，用于本机排行': 'Optional, for local scores',
    '开始飞行': 'Start flying',
    '飞行已暂停': 'Flight paused',
    '继续飞行': 'Resume flight',
    '回到模式选择': 'Choose a mode',
    '本次飞行结束': 'Flight over',
    '授粉成功！': 'Pollination complete!',
    '已授粉': 'Pollinated',
    '再飞一次': 'Fly again',
    '更换模式': 'Change mode',
    '空格': 'Space',
    '或点按画面振翅': 'or tap the pond to flap',
    '松开缓降': 'Release to drift down',
    '飞行手册': 'Flight guide',
    '先取粉': 'First, pick up pollen',
    '认准金色花药': 'Look for golden anthers',
    '再授粉': 'Then, deliver it',
    '找空闲的湿润花心': 'Find a wet centre with no bee',
    '碰错花、碰到已被占用的花、花茎、水面或飞鸟，本局结束。': 'Your flight ends if you hit a stem, a bird or the water, or land on the wrong flower or one already occupied by a bee.',
    '连续授粉榜': 'Endless flight scores',
    '本机最高记录': 'Best scores on this device',
    '完成连续模式后记录成绩。': 'Finish an endless flight to record a score.',
    '查看研究依据': 'View the research',
    '这朵花上已经有蜜蜂了。': 'Another bee was already on that flower.',
    '还没有花粉，先到金色花药上采粉。': 'Pick up pollen from the golden anthers first.',
    '已经带着花粉了，要送到青绿色的柱头上。': 'You already have pollen. Take it to a blue-green stigma.',
    '花粉落上了另一朵花的柱头！': 'Your pollen landed on the stigma of another flower!',
    '小蜜蜂碰到水面了。': 'Your bee touched the water.',
    '碰到在高处飞过的小鸟了。': 'Your bee hit a passing bird.',
    '撞到伸出水面的莲茎了。': 'Your bee hit a stalk rising from the water.',
    '撞到睡莲花下方的花茎了。': 'Your bee hit the stem below a flower.',
    '蜜蜂': 'Bee',
  };

  function t(chinese) {
    return english ? messages[chinese] ?? chinese : chinese;
  }
  function flowerUnit(score) {
    return english && score === 1 ? 'flower' : t('朵');
  }
  function scoreAnnouncement(message, score, isGoal) {
    if (english) return message + (isGoal ? '. ' : ' ') + 'Flowers pollinated: ' + score + '.';
    return message + (isGoal ? '，' : ' ') + '已授粉 ' + score + ' 朵。';
  }

  document.getElementById('atlasReturn').setAttribute('href', '../?lang=' + language);
  if (english) {
    document.documentElement.lang = 'en';
    // Translate text nodes individually to retain links, icons and emphasis.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const label = node.nodeValue.trim();
      if (Object.hasOwn(messages, label)) node.nodeValue = node.nodeValue.replace(label, messages[label]);
    }
    for (const attr of ['aria-label', 'title', 'placeholder']) {
      for (const element of document.querySelectorAll('[' + attr + ']')) {
        element.setAttribute(attr, t(element.getAttribute(attr)));
      }
    }
    document.title = t(document.title);
    const description = document.querySelector('meta[name="description"]');
    description.content = t(description.content);
  }
  return {t, flowerUnit, scoreAnnouncement};
})();
