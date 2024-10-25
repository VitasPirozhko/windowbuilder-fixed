/**
 * ### Форма выбора типового блока
 *
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2018
 *
 * @module cat_characteristics_form_selection_block
 *
 * Created 23.12.2015
 */

(function({cat: {characteristics}, wsql, CatCharacteristics, utils, enm, doc, job_prm, iface}){

  const {prototype} = characteristics.constructor;
	let selection_block, wnd;

	class SelectionBlock {

	  constructor() {

	    this._obj = {
        calc_order: wsql.get_user_param('template_block_calc_order')
      }

      this._meta = Object.assign(utils._clone(characteristics.metadata()), {
        form: {
          selection: {
            fields: ['presentation', 'svg'],
            cols: [
              {id: 'presentation', width: '320', type: 'ro', align: 'left', sort: 'na', caption: 'Наименование'},
              {id: 'svg', width: '*', type: 'rsvg', align: 'left', sort: 'na', caption: 'Эскиз'}
            ]
          }
        }
      });
    }

    // виртуальные метаданные для поля фильтра по заказу
    _metadata(f) {
	    const {calc_order} = this._meta.fields;
      return f ? calc_order : {fields: {calc_order}};
    }

    get _manager() {
	    return {
        value_mgr: characteristics.value_mgr,
        class_name: 'dp.fake'
      }
    }

    get calc_order() {
      return CatCharacteristics.prototype._getter.call(this, 'calc_order');
    }
    set calc_order(v) {

	    const {_obj, attr} = this;

      if(!v || v == _obj.calc_order){
        return;
      }
      // если вместо заказа прибежала харакетристика - возвращаем её в качестве результата
      if(v._block){
        wnd && wnd.close();
        return attr.on_select && attr.on_select(v._block);
      }
      _obj.calc_order = v.valueOf();

      if(wnd && wnd.elmnts && wnd.elmnts.filter && wnd.elmnts.grid && wnd.elmnts.grid.getColumnCount()){
        wnd.elmnts.filter.call_event();
      }

      if(!utils.is_empty_guid(_obj.calc_order) && wsql.get_user_param('template_block_calc_order') != _obj.calc_order) {
        const tmp = doc.calc_order.by_ref[_obj.calc_order];
        tmp && tmp.obj_delivery_state === enm.obj_delivery_states.Шаблон && wsql.set_user_param('template_block_calc_order', _obj.calc_order);
      }
    }

  }

	// попробуем подсунуть типовой форме выбора виртуальные метаданные - с деревом и ограниченным списком значений
  characteristics.form_selection_block = function(pwnd, attr = {}){

		if(!selection_block){
			selection_block = new SelectionBlock();
		}
    selection_block.attr = attr;

		// объект отбора по ссылке на расчет в продукции
		if(job_prm.builder.base_block && (selection_block.calc_order.empty() || selection_block.calc_order.is_new())){
			job_prm.builder.base_block.some((o) => {
				selection_block.calc_order = o;
				return true;
			});
		}

		// начальное значение - выбранные в предыдущий раз типовой блок
    attr.initial_value = wsql.get_user_param('template_block_initial_value');

		// подсовываем типовой форме списка изменённые метаданные
		attr.metadata = selection_block._meta;

		// и еще, подсовываем форме собственный обработчик получения данных
		attr.custom_selection = function (attr) {
			const ares = [], crefs = [];
			let calc_order;

			// получаем ссылку на расчет из отбора
      attr.selection.some((o) => {
        if(Object.keys(o).indexOf('calc_order') != -1) {
          calc_order = o.calc_order;
          return true;
        }
      });

			// получаем документ расчет
			return doc.calc_order.get(calc_order, true, true)
				.then((o) => {

					// получаем массив ссылок на характеристики в табчасти продукции
					o.production.forEach(({characteristic}) => {
						if(!characteristic.empty()){
							if(characteristic.is_new()){
                crefs.push(characteristic.ref);
              }
							else{
								// если это характеристика продукции - добавляем
                if(!characteristic.calc_order.empty() && characteristic.coordinates.count()) {
                  if(characteristic.svg) {
                    ares.push(characteristic);
                  }
                  else {
                    crefs.push(characteristic.ref);
                  }
                }
							}
						}
					});
					return crefs.length ? characteristics.adapter.load_array(characteristics, crefs, false, characteristics.adapter.local.templates) : crefs;
				})
				.then(() => {

					// если это характеристика продукции - добавляем
					crefs.forEach((o) => {
						o = characteristics.get(o, false, true);
						if(o && !o.calc_order.empty() && o.coordinates.count()){
							ares.push(o);
						}
					});

					// фильтруем по подстроке
					crefs.length = 0;
					ares.forEach((o) => {
            const presentation = ((o.calc_order_row && o.calc_order_row.note) || o.note || o.name) + '<br />' + o.owner.name;
						if(!attr.filter || presentation.toLowerCase().match(attr.filter.toLowerCase()))
							crefs.push({
								ref: o.ref,
                presentation:   '<div style="white-space:normal"> ' + presentation + ' </div>',
								svg: o.svg || ''
							});
					});

					return Promise.all(ares);

				})
        // конвертируем в xml для вставки в грид
				.then(() => iface.data_to_grid.call(characteristics, crefs, attr));

		};

		// создаём форму списка
		wnd = prototype.form_selection.call(this, pwnd, attr);

		const {toolbar, filter} = wnd.elmnts;
    'btn_new,btn_edit,btn_delete,bs_print,bs_create_by_virtue,bs_go_to'.split(',').forEach(name => toolbar.hideItem(name));

		// добавляем элемент управления фильтра по расчету
    const fdiv = filter.add_filter({text: 'Расчет', name: 'calc_order'}).custom_selection.calc_order.parentNode;
		fdiv.removeChild(fdiv.firstChild);

    filter.custom_selection.calc_order = new iface.OCombo({
			parent: fdiv,
			obj: selection_block,
			field: "calc_order",
			width: 220,
			get_option_list: (selection, val) => new Promise((resolve, reject) => {

			  setTimeout(() => {
          const l = [];
          const {base_block, branch_filter} = job_prm.builder;

          base_block.forEach(({note, presentation, ref, production}) => {
            if(branch_filter && branch_filter.sys && branch_filter.sys.length && production.count()) {
              const {characteristic} = production.get(0);
              if(!branch_filter.sys.some((filter) => characteristic.sys._hierarchy(filter))){
                return;
              }
            }
            if(selection.presentation && selection.presentation.like){
              if(note.toLowerCase().match(selection.presentation.like.toLowerCase()) ||
                presentation.toLowerCase().match(selection.presentation.like.toLowerCase())){
                l.push({text: note || presentation, value: ref});
              }
            }else{
              l.push({text: note || presentation, value: ref});
            }
          });

          l.sort((a, b) => {
            if (a.text < b.text){
              return -1;
            }
            else if (a.text > b.text){
              return 1;
            }
            else{
              return 0;
            }
          });

          resolve(l);

        }, job_prm.builder.base_block ? 0 : 1000);
			})
		});
    filter.custom_selection.calc_order.getBase().style.border = "none";

		return wnd;
	};


})($p);
