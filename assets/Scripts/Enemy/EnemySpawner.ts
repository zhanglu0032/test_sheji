import { _decorator, Component, Node, Prefab, Vec3 } from 'cc';
import { PoolManager } from '../../Framework/PoolManager';
import { EnemyBase } from './EnemyBase';

const { ccclass, property } = _decorator;

@ccclass('EnemySpawner')
export class EnemySpawner extends Component {
    @property(Prefab) enemyPrefab: Prefab = null!;
    @property(Node) hero: Node = null!;
    @property(Node) enemyLayer: Node = null!;

    private _spawnInterval: number = 1.5;
    private _timer: number = 0;

    update(dt: number) {
        this._timer += dt;
        if (this._timer >= this._spawnInterval) {
            this.spawn();
            this._timer = 0;
        }
    }

    private spawn() {
        const enemyNode = PoolManager.instance.getNode(this.enemyPrefab, this.enemyLayer);
        
        // 随机在半径 800 的圆周上生成（确保从屏幕外进入）
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * 800;
        const y = Math.sin(angle) * 800;
        
        enemyNode.setPosition(x, y, 0);
        
        const comp = enemyNode.getComponent(EnemyBase);
        if (comp) {
            comp.init(this.hero);
        }
    }
}