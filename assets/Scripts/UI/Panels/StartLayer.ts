import { _decorator, Component } from 'cc';
import { UIBase } from '../Core/UIBase';
import { UIManager } from '../Core/UIManager';
import { GameManager } from '../../GameManager'; // 假设 GameManager 在 Scripts 根目录
import { UILayer } from '../Core/UILayer';

const { ccclass } = _decorator;

@ccclass('StartLayer')
export class StartLayer extends UIBase {

    /** 点击开始游戏按钮 */
    public onStartBtnClick() {
        // 1. 关闭当前的开始界面
        this.close();
        if (GameManager.instance) {
            GameManager.instance.enterBattle();
        }
    }
}