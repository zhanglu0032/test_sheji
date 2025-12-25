// Bullet.ts
import { _decorator, Component, Vec3, v3 } from 'cc';
import { PoolManager } from '../../Framework/PoolManager';

const { ccclass } = _decorator;

@ccclass('Bullet')
export class Bullet extends Component {
    private _speed: number = 1000;
    private _direction: Vec3 = v3();
    public damage: number = 10; // 默认伤害

   public init(startPos: Vec3, dir: Vec3, damage: number = 10) {
        this.node.setPosition(startPos);
        this._direction.set(dir).normalize();
        this.damage = damage; // 记录本次发射的伤害
        
        const angle = Math.atan2(this._direction.y, this._direction.x) * (180 / Math.PI);
        this.node.angle = angle - 90; 
        this.node.active = true;
    }

    // 必须声明为 public，GameManager 才能调用
    public recycle() {
        this.node.active = false;
        // 回收到对象池
        PoolManager.instance.putNode(this.node);
    }

    update(dt: number) {
        if (!this.node.active) return;

        const pos = this.node.position;
        this.node.setPosition(
            pos.x + this._direction.x * this._speed * dt,
            pos.y + this._direction.y * this._speed * dt,
            0
        );

        // 出界自动回收
        if (Math.abs(pos.x) > 1000 || Math.abs(pos.y) > 1200) {
            this.recycle();
        }
    }
}