module.exports = class extends think.Model {

  /**
   * 点赞
   * @param userId
   * @param valueId
   * @param likeType
   * @returns {Promise<number>}
   */
  async updateLike(userId, valueId, likeType) {
    const hasLike = await this.model('like').where({user_id: userId, value_id: valueId, like_type: likeType}).limit(1).count('id');
    if (!hasLike) {
      await this.model('like').add({
        user_id: userId,
        value_id: valueId,
        like_type: likeType
      });
      return 1;
    } else {
      return 0;
    }
  }
};
