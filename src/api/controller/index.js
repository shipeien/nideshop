const Base = require('./base.js');

module.exports = class extends Base {
  async indexAction() {
    const banner = await this.model('ad').where({ad_position_id: 1}).select();
    const channel = await this.model('channel').order({sort_order: 'asc'}).where({is_show: '1'}).select();
    const newInformation = await this.model('information as a').field(['a.id', 'a.name', 'a.list_pic_url', 'a.retail_price',
      'a.details', 'a.user_id', 'a.user_name', 'a.user_tel', 'a.views', 'a.givelike', 'a.address', 'a.is_top', 'a.img', 'b.avatar as user_img', 'FROM_UNIXTIME(a.add_time) as add_time'])
      .join('panji_user b ON a.user_id=b.id ').where({is_delete: 0, audit_status: 2}).order({'id': 'desc'}).limit(10).select();


    // const hotInformation = await this.model('information').field(['id', 'name', 'list_pic_url', 'retail_price', 'goods_brief']).where({is_hot: 1}).limit(3).select();

    // const newGoods = await this.model('goods').field(['id', 'name', 'list_pic_url', 'retail_price']).where({is_new: 1}).limit(4).select();
    // const hotGoods = await this.model('goods').field(['id', 'name', 'list_pic_url', 'retail_price', 'goods_brief']).where({is_hot: 1}).limit(3).select();
    const brandList = await this.model('brand').where({is_new: 1}).order({new_sort_order: 'asc'}).limit(10).select();
    const topicList = await this.model('topic').limit(3).select();

    const categoryList = await this.model('category').where({parent_id: 0, name: ['<>', '推荐']}).select();
    const newCategoryList = [];
    for (const categoryItem of categoryList) {
      const childCategoryIds = await this.model('category').where({parent_id: categoryItem.id}).getField('id', 100);
      // const categoryGoods = await this.model('goods').field(['id', 'name', 'list_pic_url', 'retail_price']).where({category_id: ['IN', childCategoryIds]}).limit(7).select();
      const categoryInformation = await this.model('information').field(['id', 'name', 'list_pic_url', 'retail_price']).where({category_id: ['IN', childCategoryIds]}).limit(7).select();
      newCategoryList.push({
        id: categoryItem.id,
        name: categoryItem.name,
        InformationList: categoryInformation
      });
    }

    return this.success({
      banner: banner,
      channel: channel,
      newInformationList: newInformation,
      // hotInformationList: hotInformation,
      brandList: brandList,
      topicList: topicList,
      categoryList: newCategoryList
    });
  }
};
