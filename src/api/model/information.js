module.exports = class extends think.Model {

  /**
   * 更新阅读量
   * @param id
   * @returns {Promise<void>}
   */
  async updateViews(id) {
    await this.model('information').where({id: id}).increment({'views': 1});
  }
};
