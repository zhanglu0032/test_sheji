import { _decorator, Component, Sprite, SpriteFrame } from 'cc';
const { ccclass } = _decorator;

/**
 * 轻量级帧动画播放器
 * 直接控制 Sprite 组件切换图片，性能极高
 */
@ccclass('FrameAniPlayer')
export class FrameAniPlayer extends Component {
    private _sprite: Sprite = null!;
    private _frames: SpriteFrame[] = [];
    private _timer: number = 0;
    private _index: number = 0;
    private _interval: number = 0.1; // 默认 10 FPS

    onLoad() {
        // 自动获取当前节点上的 Sprite 组件
        this._sprite = this.getComponent(Sprite)!;
    }

    /**
     * 播放序列帧
     * @param frames 图片数组
     * @param fps 每秒帧数
     */
    public play(frames: SpriteFrame[], fps: number = 10) {
        if (!frames || frames.length === 0) return;
        
        this._frames = frames;
        this._interval = 1 / fps;
        this._index = 0;
        this._timer = 0;
        
        // 立即显示第一帧
        this._sprite.spriteFrame = this._frames[0];
    }

    update(dt: number) {
        // 如果只有一张图或没图，不需要跑逻辑
        if (this._frames.length <= 1) return;

        this._timer += dt;
        if (this._timer >= this._interval) {
            this._timer = 0;
            // 循环播放
            this._index = (this._index + 1) % this._frames.length;
            this._sprite.spriteFrame = this._frames[this._index];
        }
    }
}