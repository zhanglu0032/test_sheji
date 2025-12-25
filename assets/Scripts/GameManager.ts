import { _decorator, Component, Node, Prefab, resources, v3, Vec3, EventTouch, Camera, instantiate, UITransform, math } from 'cc';
import { EnemyBase } from './Enemy/EnemyBase';
import { GameLayer } from './UI/Panels/GameLayer';
import { UILayer } from './UI/Core/UILayer';
import { UIManager } from './UI/Core/UIManager';
import { PoolManager } from '../Framework/PoolManager';
import { Bullet } from './Bullet/Bullet';
import { HeroEntity } from './Entity/HeroEntity';

const { ccclass, property } = _decorator;

interface IWaveConfig {
    count: number;
    interval: number;
}

@ccclass('GameManager')
export class GameManager extends Component {
    public static instance: GameManager = null!;

    private readonly WAVE_DATA: IWaveConfig[] = [
        { count: 100, interval: 1.0 },
        { count: 100, interval: 0.6 },
        { count: 100, interval: 0.4 },
        { count: 100, interval: 1.5 },
    ];

    private _enemyPrefabMap: Map<string, Prefab> = new Map();
    private _currentWaveIndex: number = 0;
    private _spawnedInWave: number = 0;
    private _gameLayer: GameLayer = null!;
    private _currentHeroNode: Node | null = null;
    private _isGameStarted: boolean = false;

    // --- 射击逻辑相关变量 ---
    private _shootTimer: number = 0;
    private _shootInterval: number = 1;
    private _mainCamera: Camera = null!;

    private _manualTargetPos: Vec3 = v3();    // 最后一次有效的手动目标位置
    private _manualTimer: number = 2.0;       // 距离最后一次操作经过的时间
    private _isTouching: boolean = false;     // 当前手指是否正按在屏幕上
    private readonly AUTO_AIM_DELAY: number = 1.0; // 手动停止后恢复自动索敌的缓冲时间



    // GameManager.ts 类成员变量中添加
    private _targetHeroAngle: number = 0; // 英雄的目标角度
    private readonly ROTATE_SPEED: number = 0.2; // 旋转平滑系数 (0-1)，越大转得越快

    onLoad() {
        GameManager.instance = this;
    }

    private preLoad(callback: Function) {
        const prefabPaths = ["Prefabs/FastEnemy", "Prefabs/Bullet"];
        resources.load(prefabPaths, Prefab, (err, prefabs) => {
            if (err) {
                console.error("加载资源失败:", err);
                return;
            }
            prefabs.forEach(p => this._enemyPrefabMap.set(p.name, p));
            callback();
        });
    }

    public enterBattle() {
        if (this._isGameStarted) return;
        this.scheduleOnce(() => { this.startWaveSystem(); }, 0);
        this.preLoad(() => {
            UIManager.instance.openUI("GameLayer", UILayer.PopUp, (node) => {
                this._gameLayer = node.getComponent(GameLayer)!;
                this._mainCamera = this.node.scene.getComponentInChildren(Camera)!;

                this.registerInputEvents();
                this._isGameStarted = true;

                this.initHero((heroNode) => {
                    this._currentHeroNode = heroNode;
                });
            });
        });
    }

    private initHero(onComplete: (hero: Node) => void) {
        resources.load("Prefabs/Hero", Prefab, (err, prefab) => {
            if (err) {
                console.error("加载英雄失败:", err);
                return;
            }

            // 1. 实例化英雄
            const hero = instantiate(prefab);

            // 2. 设置父节点（通常是 gameWorld 层）
            hero.parent = this._gameLayer.gameWorld;

            // 3. 设置初始位置
            if (this._gameLayer.heroPos) {
                hero.setPosition(this._gameLayer.heroPos.position);
            } else {
                hero.setPosition(0, -400, 0);
            }
            hero.getComponent(HeroEntity).init()

            // --- 核心赋值点 ---
            this._currentHeroNode = hero;
            this._currentHeroNode.setSiblingIndex(200); // 给英雄一个较大的索引

            // 4. 通知外部初始化完成
            onComplete(hero);
        });
    }
    // --- 输入监听：处理手动目标优先级 ---
    private registerInputEvents() {
        // 在 GameLayer 上监听，确保全屏响应
        this._gameLayer.node.on(Node.EventType.TOUCH_START, this.handleTouch, this);
        this._gameLayer.node.on(Node.EventType.TOUCH_MOVE, this.handleTouch, this);
        this._gameLayer.node.on(Node.EventType.TOUCH_END, () => { this._isTouching = false; }, this);
        this._gameLayer.node.on(Node.EventType.TOUCH_CANCEL, () => { this._isTouching = false; }, this);
    }

    private handleTouch(event: EventTouch) {
        this._isTouching = true;
        this._manualTimer = 0; // 只要有操作，计时器归零

        const screenPos = event.getLocation();
        const worldPos = v3();
        // 1. 屏幕转世界
        this._mainCamera.screenToWorld(v3(screenPos.x, screenPos.y, 0), worldPos);

        // 2. 世界转英雄所在的本地坐标系（gameWorld）
        const localPos = v3();
        this._gameLayer.gameWorld.getComponent(UITransform)?.convertToNodeSpaceAR(worldPos, localPos);

        this._manualTargetPos.set(localPos);
    }

    update(dt: number) {
        if (!this._isGameStarted || !this._currentHeroNode) return;
        // 如果英雄还没加载出来，或者已经死亡被销毁，就跳过逻辑
        if (!this._isGameStarted || !this._currentHeroNode || !this._currentHeroNode.isValid) return;

        // --- 平滑旋转逻辑 ---
        const currentAngle = this._currentHeroNode.angle;
        // 使用我们自己写的 lerpAngle
        const smoothedAngle = this.lerpAngle(currentAngle, this._targetHeroAngle, 0.2);
        this._currentHeroNode.angle = smoothedAngle;

        // --- 射击冷却与碰撞逻辑 ---
        this._manualTimer += dt;
        this._shootTimer += dt;
        if (this._shootTimer >= this._shootInterval) {
            this._shootTimer = 0;
            this.executeShoot();
        }
        this.checkCollisions();
    }

    /**
 * 角度平滑插值工具函数
 * @param a 当前角度
 * @param b 目标角度
 * @param t 插值系数 (0-1)
 */
    private lerpAngle(a: number, b: number, t: number): number {
        // 1. 计算角度差值，并归一化到 [-180, 180] 之间
        let delta = (b - a) % 360;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;

        // 2. 在当前角度基础上加上缩短后的差值
        return a + delta * t;
    }

    private executeShoot() {
        if (!this._currentHeroNode) return;

        let targetDir = v3();
        const heroPos = this._currentHeroNode.position;

        // --- 1. 计算射击方向 (原有逻辑) ---
        if (this._isTouching || this._manualTimer < this.AUTO_AIM_DELAY) {
            Vec3.subtract(targetDir, this._manualTargetPos, heroPos);
        } else {
            const nearest = this.getNearestEnemy();
            if (nearest) {
                Vec3.subtract(targetDir, nearest.position, heroPos);
            } else {
                return;
            }
        }
        targetDir.z = 0;

        // --- 2. 获取枪口的世界坐标并转换 ---
        // 假设你在 Hero 下创建了名为 "FirePoint" 的节点
        const firePoint = this._currentHeroNode.getChildByName("FirePoint");
        let spawnPos = v3();

        if (firePoint) {
            // A. 先获取枪口的世界坐标
            const worldPos = v3();
            firePoint.getComponent(UITransform)!.convertToWorldSpaceAR(v3(0, 0, 0), worldPos);

            // B. 再转换回 gameWorld 的本地坐标 (因为子弹挂在 gameWorld 下)
            this._gameLayer.bulletGroup.getComponent(UITransform)!.convertToNodeSpaceAR(worldPos, spawnPos);
        } else {
            // 如果没找到挂点，保底使用英雄中心点
            spawnPos.set(heroPos);
        }

        // --- 3. 发射子弹 ---
        this.spawnBullet(spawnPos, targetDir);

        // --- 4. 更新英雄目标角度 (平滑旋转用) ---
        if (targetDir.lengthSqr() > 0.01) {
            const angle = Math.atan2(targetDir.y, targetDir.x) * (180 / Math.PI);
            this._targetHeroAngle = angle - 90;
        }
    }

    private spawnBullet(pos: Vec3, dir: Vec3) {
        const bulletPrefab = this._enemyPrefabMap.get("Bullet");
        if (!bulletPrefab) return;

        const bulletNode = PoolManager.instance.getNode(bulletPrefab, this._gameLayer.gameWorld);
        const comp = bulletNode.getComponent(Bullet);
        if (comp) {
            comp.init(pos, dir);
        }
    }

    private getNearestEnemy(): Node | null {
        const enemies = this._gameLayer.enemyGroup.children;
        let minDist = 999999;
        let target: Node | null = null;

        for (const enemy of enemies) {
            if (!enemy.active) continue;
            const d = Vec3.distance(this._currentHeroNode!.position, enemy.position);
            if (d < minDist) {
                minDist = d;
                target = enemy;
            }
        }
        return target;
    }

    private checkCollisions() {
        const enemies = this._gameLayer.enemyGroup.children;
        const bullets = this._gameLayer.gameWorld.children;

        for (let i = bullets.length - 1; i >= 0; i--) {
            const bNode = bullets[i];
            const bComp = bNode.getComponent(Bullet);
            if (!bComp || !bNode.active) continue;

            for (let j = enemies.length - 1; j >= 0; j--) {
                const eNode = enemies[j];
                if (!eNode.active) continue;

                const dx = bNode.position.x - eNode.position.x;
                const dy = bNode.position.y - eNode.position.y;
                const distSq = dx * dx + dy * dy;

                if (distSq < 2500) {
                    const eComp = eNode.getComponent(EnemyBase);
                    if (eComp) {
                        eComp.takeDamage(bComp.damage);
                        bComp.recycle();
                        break;
                    }
                }
            }
        }
    }

    // --- 波次管理 ---
    private startWaveSystem() {
        this._currentWaveIndex = 0;
        this.nextWave();
    }

    private nextWave() {
        console.log("当前波次  ",this._currentWaveIndex)
        if (this._currentWaveIndex >= this.WAVE_DATA.length) return;
        this._spawnedInWave = 0;
        const config = this.WAVE_DATA[this._currentWaveIndex];
        this.schedule(this.spawnRoutine, config.interval);
    }

    private spawnRoutine() {
        const config = this.WAVE_DATA[this._currentWaveIndex];
        if (this._spawnedInWave < config.count) {
            this.spawnOneEnemy();
            this._spawnedInWave++;
        } else {
            this.unschedule(this.spawnRoutine);
            this._currentWaveIndex++;
            if (this._currentWaveIndex < this.WAVE_DATA.length) {
                this.scheduleOnce(() => this.nextWave(), 3.0);
            }
        }
    }

    private spawnOneEnemy() {
        const targetPrefab = this._enemyPrefabMap.get("FastEnemy");
        if (!targetPrefab) return;

        const enemyNode = PoolManager.instance.getNode(targetPrefab, this._gameLayer.enemyGroup);
        const randomX = (math.random() - 0.5) * 600;
        enemyNode.setPosition(randomX, 800, 0);

        const comp = enemyNode.getComponent(EnemyBase);
        if (comp && this._currentHeroNode) {
            comp.init(this._currentHeroNode);
        }
    }

    public onHeroRemoved() {
        this._currentHeroNode = null;
        this._isGameStarted = false;
        this.unschedule(this.spawnRoutine);
    }
}