import { _decorator, Component, view, ResolutionPolicy } from 'cc';
import { UIManager } from './UI/Core/UIManager';
import { UILayer } from './UI/Core/UILayer';

const { ccclass } = _decorator;

@ccclass('GameMain')
export class GameMain extends Component {

    start() {
        // 1. 适配屏幕（针对小游戏环境优化）
        view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_WIDTH);

        // 2. 延迟一帧打开 HUD，确保 UIManager 的 onLoad 已执行完毕
        this.scheduleOnce(() => {
            this.startGame();
        }, 0);
    }

    private startGame() {
        console.log("游戏正式开始...");
        UIManager.instance.openUI("StartLayer", UILayer.PopUp);
    }
}