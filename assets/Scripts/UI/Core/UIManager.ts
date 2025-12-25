import { _decorator, Component, Node, Prefab, instantiate, isValid, resources } from 'cc';
import { UIBase } from './UIBase';
import { UILayer } from './UILayer';

const { ccclass, property } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {
    public static instance: UIManager = null!;

    @property(Node) layerHUD: Node = null!;
    @property(Node) layerPopUp: Node = null!;
    @property(Node) layerSystem: Node = null!;

    private _uiCache: Map<string, Node> = new Map();

    onLoad() {
        UIManager.instance = this;
    }

    /**
     * 通过资源路径动态打开 UI (推荐用于小游戏)
     * @param path Resources/UI 下的路径
     * @param layer 层级
     * @param data 传递数据
     */
    /**
 * 修改后的 openUI，增加了 callback 参数
 */
    public openUI(path: string, layer: UILayer = UILayer.PopUp, callback?: (node: Node) => void, data?: any) {
        if (this._uiCache.has(path)) {
            const node = this._uiCache.get(path)!;
            this._showUI(node, layer, data);
            // 如果缓存里有，直接回调
            if (callback) callback(node);
            return;
        }

        resources.load(`UI/${path}`, Prefab, (err, prefab) => {
            if (err) {
                console.error(`[UIManager] 加载失败: ${path}`, err);
                return;
            }
            const node = instantiate(prefab);
            this._uiCache.set(path, node);
            this._showUI(node, layer, data);

            // 【关键修复】：加载并显示后，触发回调
            if (callback) {
                callback(node);
            }
        });
    }

    private _showUI(node: Node, layer: UILayer, data?: any) {
        // 根据层级设置父节点
        if (layer === UILayer.HUD) node.parent = this.layerHUD;
        else if (layer === UILayer.System) node.parent = this.layerSystem;
        else node.parent = this.layerPopUp;

        const comp = node.getComponent(UIBase);
        if (comp) {
            comp.show(data);
        }
    }

    public hideUI(path: string) {
        const node = this._uiCache.get(path);
        if (node) {
            node.getComponent(UIBase)?.close();
        }
    }
}