import { _decorator, Component, Node, Prefab, NodePool, instantiate } from 'cc';
const { ccclass } = _decorator;

@ccclass('PoolManager')
export class PoolManager extends Component {
    public static instance: PoolManager = null!;
    private _poolMap: Map<string, NodePool> = new Map();

    onLoad() {
        PoolManager.instance = this;
    }

    public getNode(prefab: Prefab, parent: Node): Node {
        let name = prefab.name;
        if (!this._poolMap.has(name)) {
            this._poolMap.set(name, new NodePool());
        }
        let pool = this._poolMap.get(name)!;
        let node = pool.size() > 0 ? pool.get()! : instantiate(prefab);
        node.parent = parent;
        return node;
    }

    public putNode(node: Node) {
        let name = node.name;
        if (!this._poolMap.has(name)) {
            this._poolMap.set(name, new NodePool());
        }
        this._poolMap.get(name)!.put(node);
    }
}