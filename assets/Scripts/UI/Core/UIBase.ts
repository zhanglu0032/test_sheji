import { _decorator, Component, Node, UIOpacity, tween, Vec3, BlockInputEvents } from 'cc';
const { ccclass } = _decorator;

@ccclass('UIBase')
export class UIBase extends Component {
    public uiName: string = "";

    /** 界面打开时的业务逻辑（子类重写） */
    public onOpen(data?: any): void { }

    /** 界面关闭前的清理逻辑（子类重写） */
    public onBeforeClose(): void { }

    /** 显示界面并播放动画 */
    public show(data?: any): void {
        this.node.active = true;
        
        // 自动添加防点击穿透，防止 UI 操作影响到底层英雄
        if (!this.getComponent(BlockInputEvents)) {
            this.node.addComponent(BlockInputEvents);
        }

        // 入场动画：轻微缩放 + 透明度渐变
        this.node.setScale(new Vec3(0.8, 0.8, 0.8));
        tween(this.node)
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        let opacityComp = this.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        opacityComp.opacity = 0;
        tween(opacityComp).to(0.2, { opacity: 255 }).start();

        this.onOpen(data);
    }

    /** 关闭界面并隐藏 */
    public close(): void {
        this.onBeforeClose();
        
        let opacityComp = this.getComponent(UIOpacity);
        if (opacityComp) {
            tween(opacityComp)
                .to(0.15, { opacity: 0 })
                .call(() => { this.node.active = false; })
                .start();
        } else {
            this.node.active = false;
        }
    }
}