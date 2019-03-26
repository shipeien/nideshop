const Base = require('./base.js');

module.exports = class extends Base {
  async indexAction() {
    const model = this.model('information');
    const informationList = await model.select();

    return this.success(informationList);
  }

  /**
   * 获取sku信息，用于购物车编辑时选择规格
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async skuAction() {
    const goodsId = this.get('id');
    const model = this.model('information');

    return this.success({
      specificationList: await model.getSpecificationList(goodsId),
      productList: await model.getProductList(goodsId)
    });
  }

  /**
   * 商品详情页数据
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async detailAction() {
    const infoId = this.get('id');
    const model = this.model('information');

    // 更新阅读量
    await model.updateViews(infoId);
    // 查询帖子信息
    // const info = await model.where({'id': infoId}).find();
    const info = await this.model('information as a').field(['a.details', 'a.id', 'a.name',
      'a.user_id', 'a.user_name', 'a.user_tel', 'a.views', 'a.givelike', 'a.address', 'a.is_top', 'a.img',
      'b.avatar as user_img', 'd.name as category_parent_name', 'c.name as category_name', 'add_time'])
      .join({ table: 'panji_user as b', join: ' join ', on: ['a.user_id', 'b.id'] })
      .join({ table: 'panji_category as c', join: ' join ', on: ['a.category_id', 'c.id'] })
      .join({ table: 'panji_category as d', join: ' join ', on: ['d.id', 'c.parent_id'] })
      .where({'a.id': infoId}).limit(1).select();

    const finldArry = ['a.details', 'a.id',
      'a.time', 'a.user_id', 'a.reply', 'a.hf_time',
      'b.avatar as user_img', 'b.nickname'];
    const whereMap = {information_id: infoId, del: 0};
    const orderMap = {'id': 'desc'};
    const comments = await this.model('comments as a').field(finldArry)
      .join({ table: 'panji_user as b', join: ' join ', on: ['a.user_id', 'b.id'] })
      .where(whereMap).order(orderMap).find();
    // 当前用户是否收藏
    const userHasCollect = await this.model('collect').isUserHasCollect(this.getLoginUserId(), 0, infoId);

    // 记录用户的足迹 TODO
    await await this.model('footprint').addFootprint(this.getLoginUserId(), infoId);
    return this.success({
      info: info,
      comments: comments,
      userHasCollect: userHasCollect
    });
  }

  /**
   * 获取分类下的商品
   * @returns {Promise.<*>}
   */
  async categoryAction() {
    const model = this.model('category');
    const currentCategory = await model.where({id: this.get('id'), 'is_show': 1}).find();
    const parentCategory = await model.where({id: currentCategory.parent_id, 'is_show': 1}).find();
    const brotherCategory = await model.where({parent_id: currentCategory.parent_id, 'is_show': 1}).select();

    return this.success({
      currentCategory: currentCategory,
      parentCategory: parentCategory,
      brotherCategory: brotherCategory
    });
  }

  /**
   * 获取商品列表
   * @returns {Promise.<*>}
   */
  async list1Action() {
    const categoryId = this.get('categoryId');
    const brandId = this.get('brandId');
    const keyword = this.get('keyword');
    const isNew = this.get('isNew');
    const isHot = this.get('isHot');
    const page = this.get('page');
    const size = this.get('size');
    const sort = this.get('sort');
    const order = this.get('order');

    const goodsQuery = this.model('information');

    const whereMap = {};
    if (!think.isEmpty(isNew)) {
      whereMap.is_new = isNew;
    }

    if (!think.isEmpty(isHot)) {
      whereMap.is_hot = isHot;
    }

    if (!think.isEmpty(keyword)) {
      whereMap.name = ['like', `%${keyword}%`];
      // 添加到搜索历史
      await this.model('search_history').add({
        keyword: keyword,
        user_id: this.getLoginUserId(),
        add_time: parseInt(new Date().getTime() / 1000)
      });
    }

    if (!think.isEmpty(brandId)) {
      whereMap.brand_id = brandId;
    }

    // 排序
    let orderMap = {};
    if (sort === 'price') {
      // 按价格
      orderMap = {
        retail_price: order
      };
    } else {
      // 按商品添加时间
      orderMap = {
        id: 'desc'
      };
    }

    // 筛选的分类
    let filterCategory = [{
      'id': 0,
      'name': '全部',
      'checked': false
    }];

    const categoryIds = await goodsQuery.where(whereMap).getField('category_id', 10000);
    if (!think.isEmpty(categoryIds)) {
      // 查找二级分类的parent_id
      const parentIds = await this.model('category').where({id: {'in': categoryIds}}).getField('parent_id', 10000);
      // 一级分类
      const parentCategory = await this.model('category').field(['id', 'name']).order({'sort_order': 'asc'}).where({'id': {'in': parentIds}}).select();

      if (!think.isEmpty(parentCategory)) {
        filterCategory = filterCategory.concat(parentCategory);
      }
    }

    // 加入分类条件
    if (!think.isEmpty(categoryId) && parseInt(categoryId) > 0) {
      whereMap.category_id = ['in', await this.model('category').getCategoryWhereIn(categoryId)];
    }

    // 搜索到的商品
    const goodsData = await goodsQuery.where(whereMap).field(['id', 'name', 'list_pic_url', 'retail_price']).order(orderMap).page(page, size).countSelect();
    goodsData.filterCategory = filterCategory.map(function(v) {
      v.checked = (think.isEmpty(categoryId) && v.id === 0) || v.id === parseInt(categoryId);
      return v;
    });
    goodsData.informationList = goodsData.data;

    return this.success(goodsData);
  }

  /**
   * 获取信息列表
   * @returns {Promise.<*>}
   */
  async listAction() {
    const categoryId = this.get('categoryId');
    const page = this.get('page');
    const size = this.get('size');
    const bkType = this.get('bkType');
    const orderMap = {'is_top': 'desc', 'id': 'desc'};
    // 'FROM_UNIXTIME(a.add_time) as add_time'
    const finldArry = ['a.details', 'a.id', 'a.name',
      'a.user_id', 'a.user_name', 'a.user_tel', 'a.views', 'a.givelike', 'a.address', 'a.is_top', 'a.img',
      'b.avatar as user_img', 'd.name as category_parent_name', 'c.name as category_name', 'add_time'];
    const whereMap = {'is_delete': 0, 'audit_status': 2};
    if (!think.isEmpty(bkType)) {
      const whereCateMap = {};
      if (bkType === 'isHelp') {
        // 求助帮忙
        whereCateMap.parent_id = '1007000';
      } else if (bkType === 'jobHunting') {
        // 求职招聘
        whereCateMap.parent_id = '1006000';
      } else if (bkType === 'lostProperty') {
        // 寻人寻物
        whereCateMap.parent_id = '1005000';
      }
      // 判断是否有条件产生
      if (!think.isEmpty(whereCateMap)) {
        const parentIds = await this.model('category').where(whereCateMap).getField('id', 10000);
        whereMap['a.category_id'] = {'in': parentIds};
      }
    } else if (!think.isEmpty(categoryId)) {
      // 分类查询条件生效
      whereMap['a.category_id'] = ['in', await this.model('category').getCategoryWhereIn(categoryId)];
    }
    // { table: 'tradename',  join: 'left', on: ['tid', 'id'] }
    // const informationList = await this.model('information as a').field(finldArry)
    //   .join('panji_user b ON a.user_id=b.id ').join('panji_category c on a.category_id=c.id').leftjoin().where(whereMap).order(orderMap).page(page, size).select();
    const informationList = await this.model('information as a').field(finldArry)
      .join({ table: 'panji_user as b', join: ' join ', on: ['a.user_id', 'b.id'] })
      .join({ table: 'panji_category as c', join: ' join ', on: ['a.category_id', 'c.id'] })
      .join({ table: 'panji_category as d', join: ' join ', on: ['d.id', 'c.parent_id'] })
      .where(whereMap).order(orderMap).page(page, size).select();
    return this.success({
      informationList: informationList,
      bkType: bkType
    });
  }


  /**
   * 商品列表筛选的分类列表
   * @returns {Promise.<Promise|void|PreventPromise>}
   */
  async filterAction() {
    const categoryId = this.get('categoryId');
    const keyword = this.get('keyword');
    const isNew = this.get('isNew');
    const isHot = this.get('isHot');

    const goodsQuery = this.model('information');

    if (!think.isEmpty(categoryId)) {
      goodsQuery.where({category_id: {'in': await this.model('category').getChildCategoryId(categoryId)}});
    }

    if (!think.isEmpty(isNew)) {
      goodsQuery.where({is_new: isNew});
    }

    if (!think.isEmpty(isHot)) {
      goodsQuery.where({is_hot: isHot});
    }

    if (!think.isEmpty(keyword)) {
      goodsQuery.where({name: {'like': `%${keyword}%`}});
    }

    let filterCategory = [{
      'id': 0,
      'name': '全部'
    }];

    // 二级分类id
    const categoryIds = await goodsQuery.getField('category_id', 10000);
    if (!think.isEmpty(categoryIds)) {
      // 查找二级分类的parent_id
      const parentIds = await this.model('category').where({id: {'in': categoryIds}}).getField('parent_id', 10000);
      // 一级分类
      const parentCategory = await this.model('category').field(['id', 'name']).order({'sort_order': 'asc'}).where({'id': {'in': parentIds}}).select();

      if (!think.isEmpty(parentCategory)) {
        filterCategory = filterCategory.concat(parentCategory);
      }
    }

    return this.success(filterCategory);
  }

  /**
   * 新品首发
   * @returns {Promise.<Promise|void|PreventPromise>}
   */
  async newAction() {
    return this.success({
      bannerInfo: {
        url: '',
        name: '坚持初心，为你寻觅世间好物',
        img_url: 'http://yanxuan.nosdn.127.net/8976116db321744084774643a933c5ce.png'
      }
    });
  }

  /**
   * 人气推荐
   * @returns {Promise.<Promise|void|PreventPromise>}
   */
  async hotAction() {
    return this.success({
      bannerInfo: {
        url: '',
        name: '大家都在买的严选好物',
        img_url: 'http://yanxuan.nosdn.127.net/8976116db321744084774643a933c5ce.png'
      }
    });
  }

  /**
   * 商品详情页的大家都在看的商品
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async relatedAction() {
    // 大家都在看商品,取出关联表的商品，如果没有则随机取同分类下的商品
    const model = this.model('information');
    const goodsId = this.get('id');
    const relatedGoodsIds = await this.model('related_goods').where({goods_id: goodsId}).getField('related_goods_id');
    let relatedGoods = null;
    if (think.isEmpty(relatedGoodsIds)) {
      // 查找同分类下的商品
      const goodsCategory = await model.where({id: goodsId}).find();
      relatedGoods = await model.where({category_id: goodsCategory.category_id}).field(['id', 'name', 'list_pic_url', 'retail_price']).limit(8).select();
    } else {
      relatedGoods = await model.where({id: ['IN', relatedGoodsIds]}).field(['id', 'name', 'list_pic_url', 'retail_price']).select();
    }

    return this.success({
      informationList: relatedGoods
    });
  }

  /**
   * 在售的商品总数
   * @returns {Promise.<Promise|PreventPromise|void>}
   */
  async countAction() {
    const goodsCount = await this.model('information').where({is_delete: 0, is_on_sale: 1}).count('id');

    return this.success({
      goodsCount: goodsCount
    });
  }

  /**
   * 点赞
   * @returns {Promise<void>}
   */
  async likeAction() {
    const userId = this.get('userId');
    const informationId = this.get('informationId');
    const likeType = 1;
    const hasLike = await this.model('like').updateLike(userId, informationId, likeType);
    return this.success(hasLike);
  }
};
