import { _decorator } from 'cc';
const { ccclass } = _decorator;

@ccclass('EventManager')
export class EventManager {
    private static _handlers: { [key: string]: Function[] } = {};

    // 监听事件
    public static on(eventName: string, handler: Function) {
        if (!this._handlers[eventName]) {
            this._handlers[eventName] = [];
        }
        this._handlers[eventName].push(handler);
    }

    // 取消监听
    public static off(eventName: string, handler: Function) {
        const handlers = this._handlers[eventName];
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index !== -1) handlers.splice(index, 1);
        }
    }

    // 触发事件
    public static emit(eventName: string, ...args: any[]) {
        const handlers = this._handlers[eventName];
        if (handlers) {
            handlers.forEach(handler => handler(...args));
        }
    }
}