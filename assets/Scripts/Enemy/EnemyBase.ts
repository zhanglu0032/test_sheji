import { _decorator, Component, Vec3, Node, isValid, math, Sprite, SpriteFrame, resources, v3 } from 'cc';
import { FrameAniPlayer } from '../FrameAniPlayer';
const { ccclass, property } = _decorator;

@ccclass('EnemyBase')
export class EnemyBase extends Component {
    @property({ tooltip: "移动速度" })
    public speed: number = 500;

    @property({ tooltip: "最大血量" })
    public maxHp: number = 100;

    protected currentHp: number = 100;
    protected target: Node = null!;
    protected isDead: boolean = false;

    // 动态停止距离，在 init 中随机化
    protected stopDistance: number = 200;

    // --- 物理与防抖控制变量 ---
    private _aniPlayer: FrameAniPlayer = null!;
    private _separationTick: number = 0;
    private readonly CHECK_INTERVAL: number = 3;      // 每3帧计算一次推挤，节省CPU
    private _pushForce: Vec3 = new Vec3(0, 0, 0);     // 缓存当前的推挤力
    private _hasSorted: boolean = false;              // 是否已完成深度排序
    private _entityId: number = 0;                    // 唯一标识，防止坐标重叠时排序闪烁

    protected skinFolder: string = "player_0001";


    onLoad() {
        // 这一行会自动检查节点上有没有 FrameAniPlayer，没有就自己加一个
        this._aniPlayer = this.getComponent(FrameAniPlayer) || this.addComponent(FrameAniPlayer);
    }
    /** 初始化怪物 */
    public init(target: Node) {
        this.target = target;
        this.currentHp = this.maxHp;
        this.isDead = false;
        this._hasSorted = false;
        this._pushForce.set(0, 0, 0);
        this._entityId = Math.random(); // 分配一个随机ID用于排序权重

        this.onSpawn();
        this.loadFrames();
        // 方案 A 配合：让停止线随机化 (150-230)，使阵型有厚度
        this.stopDistance = 150 + Math.random() * 80;

        // 确保激活节点
        this.node.active = true;
    }
    private loadFrames() {
        const path = `Textures/${this.skinFolder}`;
        resources.loadDir(path, SpriteFrame, (err, frames) => {
            if (err) {
                console.error("加载资源失败:", path);
                return;
            }
            if (isValid(this.node)) {
                frames.sort((a, b) => a.name.localeCompare(b.name));
                this._aniPlayer.play(frames, 10);
            }
        });
    }
    // 增加这个方法，防止子类报错
    protected onSpawn() {
        // 基类可以留空
    }

    update(dt: number) {
        if (this.isDead || !isValid(this.target)) return;

        const currentPos = this.node.position;
        const targetPos = this.target.position;

        // 1. 计算【基础下落位移】
        let moveY = 0;
        let distY = currentPos.y - targetPos.y;
        if (distY > this.stopDistance) {
            moveY = -this.speed * dt;
        }

        // 2. 计算【排队推挤力】（分帧执行）
        this._separationTick++;
        if (this._separationTick % this.CHECK_INTERVAL === 0) {
            this._pushForce = this.calculateSeparationForce();
        }

        // 3. 【核心防闪/防抖】处理推挤位移
        // 限制每一帧因为推挤产生的最大位移量，防止高密度下的“瞬移闪烁”
        const maxPush = 3.0;
        let safePushX = math.clamp(this._pushForce.x * 5, -maxPush, maxPush);
        let safePushY = math.clamp(this._pushForce.y * 2, -maxPush, maxPush);

        // 4. 【平滑插值】计算最终目标点
        let targetX = currentPos.x + safePushX;
        let targetY = currentPos.y + moveY + safePushY;

        // 使用 lerp 让移动更有肉感，不僵硬
        let finalX = math.lerp(currentPos.x, targetX, 0.2);
        let finalY = math.lerp(currentPos.y, targetY, 0.2);

        // 5. 【边界约束】
        // 左右边界
        finalX = math.clamp(finalX, -310, 310);
        // 英雄停止线
        const minSafeY = targetPos.y + this.stopDistance;
        if (finalY < minSafeY) finalY = minSafeY;

        // 全世界只有这里调用一次 setPosition，彻底杜绝抖动
        // 只有当坐标差距大于 0.5 像素时才执行 lerp 和 setPosition
        if (Math.abs(finalX - currentPos.x) > 0.5 || Math.abs(finalY - currentPos.y) > 0.5) {
            this.node.setPosition(finalX, finalY, 0);
        }

        // 6. 【深度排序】一生只排一次，加入 entityId 解决坐标完全重叠时的闪烁
        if (!this._hasSorted && distY < 300) {
            // 根据 Y 坐标排序，加上微小的 ID 权重确保顺序唯一
            let targetIndex = Math.floor(1000 - currentPos.y + (this._entityId * 0.1));
            let childrenCount = this.node.parent!.children.length;
            let safeIndex = math.clamp(targetIndex, 0, childrenCount - 1);

            // if (this.node.getSiblingIndex() !== safeIndex) {
            //     this.node.setSiblingIndex(safeIndex);
            // }
            this._hasSorted = true;
        }
    }



    /** 方案 C：横向排斥强，纵向排斥弱 */
    private calculateSeparationForce(): Vec3 {
        const neighbors = this.node.parent!.children;
        const myPos = this.node.position;
        let totalPush = new Vec3(0, 0, 0);
        let count = 0;

        for (let other of neighbors) {
            if (other === this.node || !other.active) continue;

            const otherPos = other.position;
            const dx = myPos.x - otherPos.x;
            const dy = myPos.y - otherPos.y;

            // 快速距离预筛：Y轴容忍度更高，允许上下挤一点
            if (Math.abs(dx) > 60 || Math.abs(dy) > 35) continue;

            const d = Vec3.distance(myPos, otherPos);
            // 判定半径
            const radius = 45;

            if (d < radius && d > 0) {
                let diff = new Vec3();
                Vec3.subtract(diff, myPos, otherPos);
                diff.normalize();

                // --- 方案 C 核心调整 ---
                diff.x *= 1.3; // 强化横向排开，防止重叠闪烁
                diff.y *= 0.3; // 极度削弱纵向推力，防止后排被顶得太远

                // 距离越近，推力指数级增长（但受限速保护）
                let force = (radius - d) / radius;
                totalPush.add(diff.multiplyScalar(force));
                count++;
            } else if (d === 0) {
                // 如果完全重合，给一个随机微小推力打破僵局
                totalPush.add(new Vec3(Math.random() - 0.5, 0, 0));
            }
        }
        return totalPush;
    }

    public takeDamage(dmg: number) {
        if (this.isDead) return;
        this.currentHp -= dmg;
        if (this.currentHp <= 0) {
            this.die();
        }
    }

    protected die() {
        this.isDead = true;
        // 建议以后配合 PoolManager.instance.putNode(this.node);
        this.node.active = false;
        this.node.destroy();
    }
}