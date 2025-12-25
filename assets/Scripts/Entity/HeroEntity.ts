import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('HeroEntity')
export class HeroEntity extends Component {

    private _lifeTimer: number = -1; // 剩余生存时间，-1 代表永久存在
    private _isCounting: boolean = false; // 是否开启倒计时

    /**
     * 初始化英雄数据
     * @param duration 存在的时间（秒），如果不传或传 -1 则不会消失
     */
    public init(duration: number = -1) {
        this._lifeTimer = duration;
        this._isCounting = duration > 0;
        
        console.log(`[HeroEntity] ${this.node.name} 初始化成功，生存时间：${duration}`);
    }

    update(dt: number) {
        // 如果不是限时英雄，就不执行后面的逻辑
        if (!this._isCounting) return;

        // 倒计时
        this._lifeTimer -= dt;

        // 时间到了，英雄消失
        if (this._lifeTimer <= 0) {
            this.onTimeout();
        }
    }

    /** 时间到后的处理 */
    private onTimeout() {
        console.log(`[HeroEntity] ${this.node.name} 时间已到，从战场撤离`);
        
        // 销毁英雄节点
        this.node.destroy();
    }
}