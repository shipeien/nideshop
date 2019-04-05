module.exports = class extends think.Model {
  async addFootprint(userId, goodsId, foot_type = 1) {
    // 用户已经登录才可以添加到足迹
    if (userId > 0 && goodsId > 0) {
      await this.add({
        foot_type_id: goodsId,
        user_id: userId,
        foot_type: foot_type,
        add_time: parseInt(Date.now() / 1000)
      });
    }
  }
};
