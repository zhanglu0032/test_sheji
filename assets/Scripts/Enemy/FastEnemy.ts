import { _decorator, Vec3, v3 } from 'cc';
import { EnemyBase } from './EnemyBase';
const { ccclass, property } = _decorator;
@ccclass('FastEnemy')
export class FastEnemy extends EnemyBase {
  protected onSpawn() {
    this.speed = 350;
    this.stopDistance = 50;
    let player = ["player_2022", "player_0001", "player_0002","player_2015","player_0662"];

    // 从数组中随机选择一个元素
    let randomIndex = Math.floor(Math.random() * player.length);
    this.skinFolder = player[4];

    console.log(this.skinFolder); // 输出随机选择的 skinFolder

    console.log("子类初始化成功，当前速度:", this.speed);
  }
}