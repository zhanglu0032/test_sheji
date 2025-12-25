import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * GameLayer 负责管理战斗场景中的基础容器引用
 * 它是 UIManager 加载后的战斗主界面
 */
@ccclass('GameLayer')
export class GameLayer extends Component {

    @property({ type: Node, tooltip: '实体根节点（GameWorld）' })
    public gameWorld: Node = null!;

    @property({ type: Node, tooltip: '怪物存放容器' })
    public enemyGroup: Node = null!;

    @property({ type: Node, tooltip: '英雄站位参考点' })
    public heroPos: Node = null!;

    @property({ type: Node, tooltip: '子弹存放容器' })
    public bulletGroup: Node = null!;

    /**
     * 当 UIManager 打开此页面时，可以在这里做一些初始化逻辑
     */
    onLoad() {
        console.log("[GameLayer] 战斗层已就绪");
    }

    /**
     * 提供一个简单的接口用于清理战场（比如游戏结束时）
     */
    public clearStage() {
        this.enemyGroup.removeAllChildren();
        this.bulletGroup.removeAllChildren();
    }
}