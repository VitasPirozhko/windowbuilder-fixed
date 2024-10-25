/**
 * ### Графический редактор
 *
 * Created by Evgeniy Malyarov 24.07.2015
 *
 * @module  editor
 */

/**
 * ### Графический редактор
 * - Унаследован от [paper.PaperScope](http://paperjs.org/reference/paperscope/)
 * - У редактора есть коллекция проектов ({{#crossLink "Scheme"}}изделий{{/crossLink}}). В настоящий момент, поддержано единственное активное изделие, но потенциально, имеется возможность одновременного редактирования нескольких изделий
 * - У `редактора` есть коллекция инструментов ([tools](http://paperjs.org/reference/tool/)). Часть инструментов встроена в редактор, но у конечного пользователя, есть возможность как переопределить поведение встроенных инструментов, так и подключить собственные специализированные инструменты
 *
 *
 * - **Редактор** можно рассматривать, как четрёжный стол (кульман)
 * - **Изделие** подобно листу ватмана, прикрепленному к кульману в текущий момент
 * - **Инструменты** - это карандаши и рейсшины, которые инженер использует для редактирования изделия
 *
 * @example
 *
 *     // создаём экземпляр графического редактора
 *     // передаём в конструктор указатель на ячейку _cell и дополнительные реквизиты
 *
 * @class Editor
 * @constructor
 * @extends paper.PaperScope
 * @param pwnd {dhtmlXCellObject} - [ячейка dhtmlx](http://docs.dhtmlx.com/cell__index.html), в которой будет размещен редактор
 * @param [attr] {Object} - дополнительные параметры инициализации редактора
 * @menuorder 10
 * @tooltip Графический редактор
 */
class Editor extends $p.EditorInvisible {

  constructor(pwnd, handlers){

    super();

    const _editor = window.paper = this;

    this.activate();

    /**
     * ### Ячейка родительского окна, в которой размещен редактор
     *
     * @property _pwnd
     * @type dhtmlXCellObject
     * @final
     * @private
     */
    this.__define('_pwnd', {
      get() {
        return pwnd;
      }
    });

    /**
     * ### Разбивка на канвас и аккордион
     *
     * @property _layout
     * @type dhtmlXLayoutObject
     * @final
     * @private
     */
    this._layout = pwnd.attachLayout({
      pattern: '2U',
      cells: [{
        id: 'a',
        text: 'Изделие',
        header: false
      }, {
        id: 'b',
        text: 'Инструменты',
        collapsed_text: 'Инструменты',
        width: (pwnd.getWidth ? pwnd.getWidth() : pwnd.cell.offsetWidth) > 1200 ? 440 : 260
      }],
      offsets: {top: 28, right: 0, bottom: 0, left: 0}
    });

    /**
     * ### Контейнер канваса
     *
     * @property _wrapper
     * @type HTMLDivElement
     * @final
     * @private
     */
    this._wrapper = document.createElement('div');

    this._layout.cells("a").attachObject(_editor._wrapper);
    this._dxw.attachViewportTo(_editor._wrapper);

    this._wrapper.oncontextmenu = (event) => $p.iface.cancel_bubble(event, true);

    this._drawSelectionBounds = 0;

    /**
     * ### Буфер обмена
     * Объект для прослушивания и обработки событий буфера обмена
     *
     * @property clipbrd
     * @for Editor
     * @type Clipbrd
     * @final
     * @private
     */
    //this._clipbrd = new Clipbrd(this);

    /**
     * ### Клавиатура
     * Объект для управления редактором с клавиатуры
     *
     * @property keybrd
     * @for Editor
     * @type Keybrd
     * @final
     * @private
     */
    this._keybrd = new Keybrd(this);

    /**
     * ### История редактирования
     * Объект для сохранения истории редактирования и реализации команд (вперёд|назад)
     *
     * @property undo
     * @for Editor
     * @type UndoRedo
     * @final
     * @private
     */
    this._undo = new UndoRedo(this);

    /**
     * ### Aккордион со свойствами
     *
     * @property _acc
     * @type EditorAccordion
     * @private
     */
    this._acc = new EditorAccordion(_editor, _editor._layout.cells("b"));

    /**
     * ### Панель выбора инструментов рисовалки
     *
     * @property tb_left
     * @type OTooolBar
     * @private
     */
    this.tb_left = new $p.iface.OTooolBar({wrapper: _editor._wrapper, top: '14px', left: '8px', name: 'left', height: '320px',
      image_path: '/imgs/',
      buttons: [
        {name: 'select_node', css: 'tb_icon-arrow-white', title: $p.injected_data['tip_select_node.html']},
        {name: 'pan', css: 'tb_icon-hand', tooltip: 'Панорама и масштаб {Crtl}, {Alt}, {Alt + колёсико мыши}'},
        {name: 'zoom_fit', css: 'tb_cursor-zoom', tooltip: 'Вписать в окно'},
        {name: 'pen', css: 'tb_cursor-pen-freehand', tooltip: 'Добавить профиль'},
        {name: 'lay_impost', css: 'tb_cursor-lay-impost', tooltip: 'Вставить раскладку или импосты'},
        {name: 'arc', css: 'tb_cursor-arc-r', tooltip: 'Арка {Crtl}, {Alt}, {Пробел}'},
        {name: 'cut', css: 'tb_cursor-cut', tooltip: 'Тип соединения'},
        {name: 'fx', text: '<i class="fa fa-magic fa-fw"></i>', tooltip: 'Действия', sub:
            {
              width: '120px',
              height:'28px',
              align: 'hor',
              buttons: [
                {name: 'm1', float: 'left', text: '<small><i class="fa fa-magnet"></i><sub>0</sub></small>', tooltip: 'Импост по 0-штапику'},
                {name: 'm2', float: 'left', text: '<small><i class="fa fa-magnet"></i><sub>Т</sub></small>', tooltip: 'T в угол'},
                {name: 'm3', float: 'left', text: '<small><i class="fa fa-arrows-v"></i><sub>би</sub></small>', tooltip: 'Уравнять импост в балконе'},
                {name: 'm4', float: 'left', text: '<small><i class="fa fa-object-group"></i></small>', tooltip: 'Выделить группу'},
                ],
            }},
        {name: 'ruler', css: 'tb_ruler_ui', tooltip: 'Позиционирование и сдвиг'},
        {name: 'grid', css: 'tb_grid', tooltip: 'Таблица координат'},
        {name: 'text', css: 'tb_text', tooltip: 'Произвольный текст'},
      ],
      onclick: (name) => _editor.select_tool(name),
      on_popup: (popup, bdiv) => {
        popup.show(dhx4.absLeft(bdiv), 0, bdiv.offsetWidth, _editor._wrapper.offsetHeight);
        popup.p.style.top = (dhx4.absTop(bdiv) - 20) + 'px';
        popup.p.querySelector('.dhx_popup_arrow').style.top = '20px';
      }
    });

    /**
     * ### Верхняя панель инструментов
     *
     * @property tb_top
     * @type OTooolBar
     * @private
     */
    this.tb_top = new $p.iface.OTooolBar({wrapper: _editor._layout.base, width: '100%', height: '28px', top: '0px', left: '0px', name: 'top',
      image_path: '/imgs/',
      buttons: [

        {name: 'save_close', text: '&nbsp;<i class="fa fa-floppy-o fa-fw"></i>', tooltip: 'Рассчитать, записать и закрыть', float: 'left', width: '34px'},
        {name: 'calck', text: '<i class="fa fa-calculator fa-fw"></i>', tooltip: 'Рассчитать и записать данные', float: 'left'},

        //{name: 'sep_0', text: '', float: 'left'},
        {name: 'stamp',  css: 'tb_stamp', tooltip: 'Загрузить из типового блока или заказа', float: 'left'},

        //{name: 'sep_1', text: '', float: 'left'},
        {name: 'copy', text: '<i class="fa fa-clone fa-fw"></i>', tooltip: 'Скопировать выделенное', float: 'left'},
        {name: 'paste', text: '<i class="fa fa-clipboard fa-fw"></i>', tooltip: 'Вставить', float: 'left'},
        {name: 'paste_prop', text: '<i class="fa fa-paint-brush fa-fw"></i>', tooltip: 'Применить скопированные свойства', float: 'left'},

        //{name: 'sep_2', text: '', float: 'left'},
        {name: 'back', text: '<i class="fa fa-undo fa-fw"></i>', tooltip: 'Шаг назад', float: 'left'},
        {name: 'rewind', text: '<i class="fa fa-repeat fa-fw"></i>', tooltip: 'Шаг вперед', float: 'left'},

        //{name: 'sep_3', text: '', float: 'left'},
        {name: 'open_spec', text: '<i class="fa fa-table fa-fw"></i>', tooltip: 'Открыть спецификацию изделия', float: 'left'},
        //{name: 'sep_4', text: '', float: 'left'},
        {name: 'dxf', text: 'DXF', tooltip: 'Экспорт в DXF', float: 'left', width: '30px'},

        {name: 'close', text: '<i class="fa fa-times fa-fw"></i>', tooltip: 'Закрыть без сохранения', float: 'right'}


      ], onclick: function (name) {
        switch (name) {

        case 'save_close':
          if(_editor.project) {
            _editor.project.save_coordinates({save: true, close: true});
          }
          break;

        case 'close':
          _editor.close();
          break;

        case 'calck':
          if(_editor.project) {
            _editor.project.save_coordinates({save: true});
          }
          break;

        case 'stamp':
          _editor.load_stamp();
          break;

        case 'new_stv':
          var fillings = _editor.project.getItems({class: $p.EditorInvisible.Filling, selected: true});
          if(fillings.length) {
            fillings[0].create_leaf();
          }
          break;

        case 'back':
          _editor._undo.back();
          break;

        case 'rewind':
          _editor._undo.rewind();
          break;

        case 'copy':
          //_editor._clipbrd.copy();
          break;

        case 'paste':
          //_editor._clipbrd.paste();
          break;

        case 'paste_prop':
          $p.msg.show_msg(name);
          break;

        case 'open_spec':
          _editor.project.ox.form_obj();
          break;

        case 'dxf':
          $p.md.emit('dxf', _editor.project);
          break;

        case 'square':
          $p.msg.show_msg(name);
          break;

        case 'triangle1':
          $p.msg.show_msg(name);
          break;

        case 'triangle2':
          $p.msg.show_msg(name);
          break;

        case 'triangle3':
          $p.msg.show_msg(name);
          break;

        default:
          $p.msg.show_msg(name);
          break;
        }
      }
    });

    this.tb_top.buttons.paste.classList.add('disabledbutton');
    this.tb_top.buttons.paste_prop.classList.add('disabledbutton');

    this._layout.base.style.backgroundColor = '#f5f5f5';
    this.tb_top.cell.style.background = '#fff';
    this.tb_top.cell.style.boxShadow = 'none';

    /**
     * слушаем события клавиатуры
     */
    this.on_keydown = this.on_keydown.bind(this);
    document.body.addEventListener('keydown', this.on_keydown, false);

    // Обработчик события после записи характеристики. Если в параметрах укзано закрыть - закрываем форму
    this.eve.on('characteristic_saved', (scheme, attr) => {
      if(attr.close) {
        this.close();
      }
      else {
        this.set_text();
      }
    });

    // При изменениях изделия обновляем текст заголовка окна
    this.eve.on('coordinates_calculated', this.set_text.bind(this));

    // Обработчик события при удалении строки некой табчасти продукции
    this.on_del_row = this.on_del_row.bind(this);
    $p.cat.characteristics.on("del_row", this.on_del_row);

    // Обработчик события проверки заполненности реквизитов
    this.on_alert = this.on_alert.bind(this);
    $p.on('alert', this.on_alert);

    // Создаём инструменты

    /**
     * ### Вписать в окно
     * Это не настоящий инструмент, а команда вписывания в окно
     *
     * @class ZoomFit
     * @constructor
     * @menuorder 53
     * @tooltip Масштаб в экран
     */
    new ZoomFit();

    /**
     * Свойства и перемещение узлов элемента
     */
    new ToolSelectNode();

    /**
     * Панорама и масштабирование с колёсиком и без колёсика
     */
    new ToolPan();

    /**
     * Манипуляции с арками (дуги правильных окружностей)
     */
    new ToolArc();

    /**
     * Разрыв импостов
     */
    new ToolCut();

    /**
     * T в углу
     */
    new ToolM2();

    /**
     * Добавление (рисование) профилей
     */
    new ToolPen();

    /**
     * Вставка раскладок и импостов
     */
    new ToolLayImpost();

    /**
     * Инструмент произвольного текста
     */
    new ToolText();

    /**
     * Относительное позиционирование и сдвиг
     */
    new ToolRuler();

    /**
     * Таблица координат
     */
    new ToolCoordinates();

    this.tools[1].activate();


    // Создаём экземпляр проекта Scheme
    this.create_scheme();

    if(handlers){
      this.handlers = handlers;
      handlers.props.match.params.ref && this.open(handlers.props.match.params.ref);
    }

  }

  set_text() {
    const {handlers, project} = this;
    const {props, handleIfaceState} = handlers;
    if(project._calc_order_row){
      const title = project.ox.prod_name(true) + (project.ox._modified ? " *" : "");
      props.title != title && handleIfaceState({
        component: '',
        name: 'title',
        value: title,
      });

      // проверяем ортогональность
      if(project.getItems({class: $p.EditorInvisible.Profile}).some((p) => {
        return (p.angle_hor % 90) > 0.02;
      })){
        this._ortpos.style.display = '';
      }
      else {
        this._ortpos.style.display = 'none';
      }

      // проверяем ошибки в спецификации
      const {ОшибкаКритическая, ОшибкаИнфо} = $p.enm.elm_types;
      let has_errors;
      project.ox.specification.forEach(({nom}) => {
        if([ОшибкаКритическая, ОшибкаИнфо].includes(nom.elm_type)) {
          has_errors = true;
          return false;
        }
      });
      this._errpos.style.display = has_errors ? '' : 'none';
    }
  }

  show_ortpos(hide) {
    for (const elm of this.project.getItems({class: $p.EditorInvisible.Profile})) {
      if((elm.angle_hor % 90) > 0.02) {
        if(hide) {
          elm.path.fillColor = $p.EditorInvisible.BuilderElement.clr_by_clr.call(elm, elm._row.clr, false);
        }
        else {
          elm.path.fillColor = '#fcc';
        }
      }
    }
    if(!hide) {
      setTimeout(() => this.show_ortpos(true), 1300);
    }
  }

  show_errpos() {
    const wnd = $p.iface.dat_blank(this._dxw, {
      caption: 'Ошибки',
      height: 300,
      width: 420,
      allow_close: true,
    });
    const grid = wnd.attachGrid({
      columns: [{
        label: 'Элемент',
        width: 80,
        type: 'ro',
        sort: 'int',
        align: 'right'
      }, {
        label: 'Ошибка',
        width: 250,
        type: 'ro',
        sort: 'str',
        align: 'left'
      }]
    });

    grid.setHeader('Элемент,Ошибка');
    grid.setColTypes('ro,ro');
    grid.setColSorting('int,str');
    grid.setInitWidths('80,340');
    grid.setColAlign('right,left');
    grid.enableAutoWidth(true);
    //grid.attachEvent("onRowDblClicked", do_select);
    grid.init();

    const {ОшибкаКритическая, ОшибкаИнфо} = $p.enm.elm_types;
    this.project.ox.specification.forEach(({elm, nom}) => {
      if([ОшибкаКритическая, ОшибкаИнфо].includes(nom.elm_type)) {
        grid.addRow(1, [elm, nom.name]);
      }
    });
  }

  /**
   * ### Локальный dhtmlXWindows
   * Нужен для привязки окон инструментов к области редактирования
   *
   * @property _dxw
   * @type dhtmlXWindows
   * @final
   * @private
   */
  get _dxw() {
    return this._layout.dhxWins;
  }

  create_scheme() {

    if(this.project){
      this.project.unload ? this.project.unload() : this.project.remove();
    }

    const _editor = this;
    const _canvas = document.createElement('canvas'); // собственно, канвас
    _editor._wrapper.appendChild(_canvas);
    _canvas.style.backgroundColor = "#f9fbfa";

    const _scheme = new $p.EditorInvisible.Scheme(_canvas, _editor);
    const pwnd_resize_finish = () => {
      _editor.project.resize_canvas(_editor._layout.cells("a").getWidth(), _editor._layout.cells("a").getHeight());
    };

    /**
     * Magnetism дополнительных инструментов
     */
    _scheme.magnetism = new Magnetism(_scheme);

    /**
     * Подписываемся на события изменения размеров
     */
    _editor._layout.attachEvent("onResizeFinish", pwnd_resize_finish);
    _editor._layout.attachEvent("onPanelResizeFinish", pwnd_resize_finish);
    _editor._layout.attachEvent("onCollapse", pwnd_resize_finish);
    _editor._layout.attachEvent("onExpand", pwnd_resize_finish);

    if(_editor._pwnd instanceof  dhtmlXWindowsCell){
      _editor._pwnd.attachEvent("onResizeFinish", pwnd_resize_finish);
    }

    pwnd_resize_finish();

    /**
     * Подписываемся на событие смещения мыши, чтобы показать текущие координаты
     */
    const _mousepos = document.createElement('div');
    _editor._wrapper.appendChild(_mousepos);
    _mousepos.className = 'mousepos';
    _scheme.view.on('mousemove', (event) => {
      const {bounds} = _scheme;
      if(bounds) {
        _mousepos.innerHTML = 'x:' + (event.point.x - bounds.x).toFixed(0) +
          ' y:' + (bounds.height + bounds.y - event.point.y).toFixed(0);
      }
    });

    /**
     * Подписываемся на событие окончания расчета, чтобы нарисовать индикатор трапеции
     */
    const _toppos = document.createElement('div');
    _editor._wrapper.appendChild(_toppos);
    _toppos.className = 'toppos';

    this._ortpos = document.createElement('div');
    _toppos.appendChild(this._ortpos);
    this._ortpos.className = 'ortpos';
    this._ortpos.innerHTML = '<i class="fa fa-crosshairs"></i>';
    this._ortpos.setAttribute('title', 'Есть наклонные элементы');
    this._ortpos.style.display = 'none';
    this._ortpos.onclick = () => this.show_ortpos();

    this._errpos = document.createElement('div');
    _toppos.appendChild(this._errpos);
    this._errpos.className = 'errpos';
    this._errpos.innerHTML = '<i class="fa fa-ban"></i>';
    this._errpos.setAttribute('title', 'Есть ошибки');
    this._errpos.style.display = 'none';
    this._errpos.onclick = () => this.show_errpos();

    /**
     * Объект для реализации функций масштабирования
     * @type StableZoom
     */
    new function StableZoom(){

      function changeZoom(oldZoom, delta) {
        const factor = 1.05;
        if (delta < 0) {
          return oldZoom * factor;
        }
        if (delta > 0) {
          return oldZoom / factor;
        }
        return oldZoom;
      }

      dhtmlxEvent(_canvas, "mousewheel", (evt) => {

        if (evt.shiftKey || evt.altKey) {
          if(evt.shiftKey && !evt.deltaX){
            _editor.view.center = this.changeCenter(_editor.view.center, evt.deltaY, 0, 1);
          }
          else{
            _editor.view.center = this.changeCenter(_editor.view.center, evt.deltaX, evt.deltaY, 1);
          }
          return evt.preventDefault();
        }
        else if (evt.ctrlKey) {
          const mousePosition = new paper.Point(evt.offsetX, evt.offsetY);
          const viewPosition = _editor.view.viewToProject(mousePosition);
          const _ref1 = this.changeZoom(_editor.view.zoom, evt.deltaY, _editor.view.center, viewPosition);
          _editor.view.zoom = _ref1[0];
          _editor.view.center = _editor.view.center.add(_ref1[1]);
          evt.preventDefault();
          return _editor.view.draw();
        }
      });

      this.changeZoom = function(oldZoom, delta, c, p) {
        const newZoom = changeZoom(oldZoom, delta);
        const beta = oldZoom / newZoom;
        const pc = p.subtract(c);
        return [newZoom, p.subtract(pc.multiply(beta)).subtract(c)];
      };

      this.changeCenter = function(oldCenter, deltaX, deltaY, factor) {
        const offset = new paper.Point(deltaX, -deltaY);
        return oldCenter.add(offset.multiply(factor));
      };
    };

    _editor._acc.attach(_editor.project._dp);
  }

  /**
   * ### Активизирует инструмент
   * Находит инструмент по имени в коллекции tools и выполняет его метод [Tool.activate()](http://paperjs.org/reference/tool/#activate)
   *
   * @method select_tool
   * @for Editor
   * @param name {String} - имя инструмента
   */
  select_tool(name) {

    switch (name) {
    case 'm1':
      this.project.magnetism.m1();
      break;

    case 'm3':
      this.project.magnetism.m3();
      break;

    case 'm4':
      this.project.magnetism.m4();
      break;

    default:
      this.tools.some((tool) => {
        if(tool.options.name == name){
          tool.activate();
          return true;
        }
      });
    }
  }

  /**
   * ### Открывает изделие для редактирования
   * MDI пока не реализовано. Изделие загружается в текущий проект
   * @method open
   * @for Editor
   * @param [ox] {String|DataObj} - ссылка или объект продукции
   */
  open(ox) {
    ox && this.project.load(ox);
  }

  /**
   * ### (Пере)заполняет изделие данными типового блока
   * - Вызывает диалог выбора типового блока и перезаполняет продукцию данными выбора
   * - Если текущее изделие не пустое, задаёт вопрос о перезаписи данными типового блока
   * - В обработчик выбора типового блока передаёт метод {{#crossLink "Scheme/load_stamp:method"}}Scheme.load_stamp(){{/crossLink}} текущего изделия
   *
   * @for Editor
   * @method load_stamp
   * @param confirmed {Boolean} - подавляет показ диалога подтверждения перезаполнения
   */
  load_stamp(confirmed){

    if(!confirmed && this.project.ox.coordinates.count()){
      dhtmlx.confirm({
        title: $p.msg.bld_from_blocks_title,
        text: $p.msg.bld_from_blocks,
        cancel: $p.msg.cancel,
        callback: (btn) => btn && this.load_stamp(true)
      });
      return;
    }

    $p.cat.characteristics.form_selection_block(null, {
      on_select: this.project.load_stamp.bind(this.project)
    });
  }

  purge_selection(){
    let selected = this.project.selectedItems;
    const deselect = selected.filter((path) => path.parent instanceof $p.EditorInvisible.ProfileItem && path != path.parent.generatrix);
    while(selected = deselect.pop()){
      selected.selected = false;
    }
  }

  // Returns serialized contents of selected items.
  capture_selection_state() {

    const originalContent = [];

    this.project.selectedItems.forEach((item) => {
      if (item instanceof paper.Path && !item.guide){
        originalContent.push({
          id: item.id,
          json: item.exportJSON({asString: false}),
          selectedSegments: []
        });
      }
    });

    return originalContent;
  }

  // Restore the state of selected items.
  restore_selection_state(originalContent) {

    originalContent.forEach((orig) => {
      const item = this.project.getItem({id: orig.id});
      if (item){
        // HACK: paper does not retain item IDs after importJSON,
        // store the ID here, and restore after deserialization.
        const id = item.id;
        item.importJSON(orig.json);
        item._id = id;
      }
    });
  }

  /**
   * Create pixel perfect dotted rectable for drag selections
   * @param p1
   * @param p2
   * @return {paper.CompoundPath}
   */
  drag_rect(p1, p2) {
    const {view} = this;
    const half = new paper.Point(0.5 / view.zoom, 0.5 / view.zoom);
    const start = p1.add(half);
    const end = p2.add(half);
    const rect = new paper.CompoundPath();

    rect.moveTo(start);
    rect.lineTo(new paper.Point(start.x, end.y));
    rect.lineTo(end);
    rect.moveTo(start);
    rect.lineTo(new paper.Point(end.x, start.y));
    rect.lineTo(end);
    rect.strokeColor = 'black';
    rect.strokeWidth = 1.0 / view.zoom;
    rect.dashOffset = 0.5 / view.zoom;
    rect.dashArray = [1.0 / view.zoom, 1.0 / view.zoom];
    rect.removeOn({
      drag: true,
      up: true
    });
    rect.guide = true;
    return rect;
  }

  /**
   * ### Диалог составного пакета
   *
   * @param [cnstr] {Number} - номер элемента или контура
   */
  glass_inserts(glasses){
    if(!Array.isArray(glasses)){
      glasses = this.project.selected_glasses();
    }
    return new GlassInserts(glasses);
  }

  /**
   * ### Диалог дополнительных вставок
   *
   * @param [cnstr] {Number} - номер элемента или контура
   */
  additional_inserts(cnstr, cell){
    new AdditionalInserts(cnstr, this.project, cell);
  }

  /**
   * ### Диалог радиуса выделенного элемента
   */
  profile_radius(){

    const elm = this.project.selected_elm;

    if(elm instanceof $p.EditorInvisible.ProfileItem){

      // модальный диалог
      const options = {
        name: 'profile_radius',
        wnd: {
          caption: $p.msg.bld_arc,
          allow_close: true,
          width: 460,
          height: 180,
          modal: true
        }
      };

      const wnd = $p.iface.dat_blank(null, options.wnd);

      wnd.elmnts.grids.radius = wnd.attachHeadFields({
        obj: elm,
        oxml: {
          " ": ["r", "arc_h", "arc_ccw"]
        }
      });

    }
    else{
      $p.msg.show_msg({
        type: "alert-info",
        text: $p.msg.arc_invalid_elm,
        title: $p.msg.bld_arc
      });
    }
  }

  /**
   * ### Поворот кратно 90° и выравнивание
   *
   * @method profile_align
   * @for Editor
   * @param name {String} - ('left', 'right', 'top', 'bottom', 'all', 'delete')
   */
  profile_align(name){

    // если "все", получаем все профили активного или родительского контура
    if(name == "all"){

      if(this.glass_align()) {
        return;
      }

      if(this.lay_impost_align()) {
        return;
      }

      // получаем текущий внешний контур
      const layer = this.project.rootLayer();

      layer.profiles.forEach((profile) => {

        const {b, e} = profile;
        const bcnn = profile.cnn_point("b");
        const ecnn = profile.cnn_point("e");

        if(bcnn.profile){
          const d = bcnn.profile.e.getDistance(b);
          if(d && d < this.consts.sticking_l){
            bcnn.profile.e = b;
          }
        }
        if(ecnn.profile){
          const d = ecnn.profile.b.getDistance(e);
          if(d && d < this.consts.sticking_l){
            ecnn.profile.b = e;
          }
        }

        let mid;

        if(profile.orientation == $p.enm.orientations.vert){

          mid = b.x + e.x / 2;

          if(mid < layer.bounds.center.x){
            mid = Math.min(profile.x1, profile.x2);
            profile.x1 = profile.x2 = mid;
          }
          else{
            mid = Math.max(profile.x1, profile.x2);
            profile.x1 = profile.x2 = mid;
          }

        }else if(profile.orientation == $p.enm.orientations.hor){

          mid = b.y + e.y / 2;

          if(mid < layer.bounds.center.y){
            mid = Math.max(profile.y1, profile.y2);
            profile.y1 = profile.y2 = mid;
          }
          else{
            mid = Math.min(profile.y1, profile.y2);
            profile.y1 = profile.y2 = mid;
          }
        }
      });
    }
    else{

      const profiles = this.project.selected_profiles();
      const contours = [];
      let changed;

      profiles.forEach(function (profile) {

        if(profile.angle_hor % 90 == 0){
          return;
        }

        changed = true;

        var minmax = {min: {}, max: {}};

        minmax.min.x = Math.min(profile.x1, profile.x2);
        minmax.min.y = Math.min(profile.y1, profile.y2);
        minmax.max.x = Math.max(profile.x1, profile.x2);
        minmax.max.y = Math.max(profile.y1, profile.y2);
        minmax.max.dx = minmax.max.x - minmax.min.x;
        minmax.max.dy = minmax.max.y - minmax.min.y;

        if(name == 'left' && minmax.max.dx < minmax.max.dy){
          if(profile.x1 - minmax.min.x > 0){
            profile.x1 = minmax.min.x;
          }
          if(profile.x2 - minmax.min.x > 0){
            profile.x2 = minmax.min.x;
          }
        }
        else if(name == 'right' && minmax.max.dx < minmax.max.dy){
          if(profile.x1 - minmax.max.x < 0){
            profile.x1 = minmax.max.x;
          }
          if(profile.x2 - minmax.max.x < 0){
            profile.x2 = minmax.max.x;
          }
        }
        else if(name == 'top' && minmax.max.dx > minmax.max.dy){
          if(profile.y1 - minmax.max.y < 0){
            profile.y1 = minmax.max.y;
          }
          if(profile.y2 - minmax.max.y < 0){
            profile.y2 = minmax.max.y;
          }
        }
        else if(name == 'bottom' && minmax.max.dx > minmax.max.dy) {
          if (profile.y1 - minmax.min.y > 0){
            profile.y1 = minmax.min.y;
          }
          if (profile.y2 - minmax.min.y > 0){
            profile.y2 = minmax.min.y;
          }
        }
        else if(name == 'delete') {
          profile.removeChildren();
          profile.remove();
        }
        else{
          $p.msg.show_msg({type: "info", text: $p.msg.align_invalid_direction});
        }

      });

      // прочищаем размерные линии
      if(changed || profiles.length > 1){
        profiles.forEach(({layer}) => contours.indexOf(layer) == -1 && contours.push(layer));
        contours.forEach(({l_dimensions}) => l_dimensions && l_dimensions.clear());
      }

      // если выделено несколько, запланируем групповое выравнивание
      if(name != 'delete' && profiles.length > 1){

        if(changed){
          this.project.register_change(true);
          setTimeout(this.profile_group_align.bind(this, name, profiles), 100);
        }
        else{
          this.profile_group_align(name);
        }
      }
      else if(changed){
        this.project.register_change(true);
      }
    }

  }

  /**
   * ### Групповое выравнивание профилей
   * @param name
   * @param profiles
   */
  profile_group_align(name, profiles) {

    let	coordin = name == 'left' || name == 'bottom' ? Infinity : 0;

    if(!profiles){
      profiles = this.project.selected_profiles();
    }

    if(!profiles.length){
      return;
    }

    profiles.forEach(function (p) {
      switch (name){
        case 'left':
          if(p.x1 < coordin)
            coordin = p.x1;
          if(p.x2 < coordin)
            coordin = p.x2;
          break;
        case 'bottom':
          if(p.y1 < coordin)
            coordin = p.y1;
          if(p.y2 < coordin)
            coordin = p.y2;
          break;
        case 'top':
          if(p.y1 > coordin)
            coordin = p.y1;
          if(p.y2 > coordin)
            coordin = p.y2;
          break;
        case 'right':
          if(p.x1 > coordin)
            coordin = p.x1;
          if(p.x2 > coordin)
            coordin = p.x2;
          break;
      }
    });

    profiles.forEach(function (p) {
      switch (name){
        case 'left':
        case 'right':
          p.x1 = p.x2 = coordin;
          break;
        case 'bottom':
        case 'top':
          p.y1 = p.y2 = coordin;
          break;
      }
    });

  }

  /**
   * ### Смещает импосты чтобы получить одинаковые размеры заполнений
   * возвращает массив дельт
   * @param name
   * @param glasses
   * @return {Array}
   */
  do_glass_align(name = 'auto', glasses) {

    const {project, Point, Key, consts} = this;

    if(!glasses){
      glasses = project.selected_glasses();
    }
    if(glasses.length < 2){
      return;
    }

    // получаем текущий внешний контур
    let parent_layer;
    if(glasses.some(({layer}) => {
        const gl = layer.layer || layer;
        if(!parent_layer){
          parent_layer = gl;
        }
        else if(parent_layer != gl){
          return true;
        }
      })){
      parent_layer = null;
      if(glasses.some(({layer}) => {
        const gl = project.rootLayer(layer);
        if(!parent_layer){
          parent_layer = gl;
        }
        else if(parent_layer != gl){
          $p.msg.show_msg({
            type: "alert-info",
            text: "Заполнения принадлежат разным рамным контурам",
            title: "Выравнивание"
          });
          return true;
        }
      })){
        return;
      }
    }

    // выясняем направление, в котром уравнивать
    if(name == 'auto'){
      name = 'width';
    }

    // собираем в массиве shift все импосты подходящего направления
    const orientation = name == 'width' ? $p.enm.orientations.vert : $p.enm.orientations.hor;
   // parent_layer.profiles
    const shift = parent_layer.getItems({class: $p.EditorInvisible.Profile}).filter((impost) => {
      const {b, e} = impost.rays;
      // отрезаем плохую ориентацию и неимпосты
      return impost.orientation == orientation && (b.is_tt || e.is_tt || b.is_i || e.is_i);
    });

    // признак уравнивания геометрически, а не по заполнению
    const galign = Key.modifiers.control || Key.modifiers.shift || project.auto_align == $p.enm.align_types.Геометрически;
    let medium = 0;

    // модифицируем коллекцию заполнений - подклеиваем в неё импосты, одновременно, вычиляем средний размер
    const glmap = new Map();
    glasses = glasses.map((glass) => {
      const {bounds, profiles} = glass;
      const res = {
        glass,
        width: bounds.width,
        height: bounds.height,
      };

      if(galign){
        // находим левый-правый-верхний-нижний профили
        const by_side = glass.profiles_by_side(null, profiles);
        res.width = (by_side.right.b.x + by_side.right.e.x - by_side.left.b.x - by_side.left.e.x) / 2;
        res.height = (by_side.bottom.b.y + by_side.bottom.e.y - by_side.top.b.y - by_side.top.e.y) / 2;
        medium += name == 'width' ? res.width : res.height;
      }
      else{
        medium += bounds[name];
      }

      profiles.forEach((curr) => {
        const profile = curr.profile.nearest() || curr.profile;

        if(shift.indexOf(profile) != -1){

          if(!glmap.has(profile)){
            glmap.set(profile, {dx: new Set, dy: new Set});
          }

          const gl = glmap.get(profile);
          if(curr.outer || (profile != curr.profile && profile.cnn_side(curr.profile) == $p.enm.cnn_sides.Снаружи)){
            gl.is_outer = true;
          }
          else{
            gl.is_inner = true;
          }

          const point = curr.b.add(curr.e).divide(2);
          if(name == 'width'){
            gl.dx.add(res);
            if(point.x < bounds.center.x){
              res.left = profile;
            }
            else{
              res.right = profile;
            }
          }
          else{
            gl.dy.add(res);
            if(point.y < bounds.center.y){
              res.top = profile;
            }
            else{
              res.bottom = profile;
            }
          }
        }
      });
      return res;
    });
    medium /= glasses.length;

    // дополняем в glmap структуры подходящих заполнений
    shift.forEach((impost) => {
      // если примыкают с двух сторон или вторая сторона рамная - импост проходит
      const gl = glmap.get(impost);
      if(!gl){
        return;
      }
      gl.ok = (gl.is_inner && gl.is_outer);
      gl.dx.forEach((glass) => {
          if(glass.left == impost && !glass.right){
            gl.delta = (glass.width - medium);
            gl.ok = true;
          }
          if(glass.right == impost && !glass.left){
            gl.delta = (medium - glass.width);
            gl.ok = true;
          }
        });
    });

    // рассчитываем, на сколько и в какую сторону двигать
    const res = [];

    shift.forEach((impost) => {

      const gl = glmap.get(impost);
      if(!gl || !gl.ok){
        return;
      }

      let delta = gl.delta || 0;

      if (name == 'width') {
        if(!gl.hasOwnProperty('delta')){
          gl.dx.forEach((glass) => {
            const double = 1.1 * gl.dx.size;
            if(glass.right == impost){
              delta += (medium - glass.width) / double;
            }
            else if(glass.left == impost){
              delta += (glass.width - medium) / double;
            }
          });
        }
        delta = new Point([delta,0]);
      }
      else {
        delta = new Point([0, delta]);
      }

      if(delta.length > consts.epsilon){
        impost.move_points(delta, true);
        res.push(delta);
      }
    });

    return res;
  }

  /**
   * ### Уравнивание по ширинам заполнений
   * выполняет в цикле до получения приемлемой дельты
   */
  glass_align(name = 'auto', glasses) {

    const shift = this.do_glass_align(name, glasses);
    if(!shift){
      return;
    }

    const {_attr} = this.project;
    if(!_attr._align_counter){
      _attr._align_counter = 1;
    }
    if(_attr._align_counter > 24){
      _attr._align_counter = 0;
      return;
    }

    if(shift.some((delta) => delta.length > 0.3)){
      _attr._align_counter++;
      this.project.contours.forEach((l) => l.redraw());
      return this.glass_align(name, glasses);
    }
    else{
      _attr._align_counter = 0;
      this.project.contours.forEach((l) => l.redraw());
    }
  }

  /**
   * ### Смещает раскладку по световому проему, с учетом толщины раскладки
   * возвращает истину в случае успеха
   * @param name
   * @param glass
   * @return {Boolean}
   */
  do_lay_impost_align(name = 'auto', glass) {

    const {project, Point} = this;

    // выбираем заполнение, если не выбрано
    if(!glass) {
      const glasses = project.selected_glasses();
      if(glasses.length != 1) {
        return;
      }
      glass = glasses[0];
    }

    // проверяем наличие раскладки у заполнения
    if (!(glass instanceof $p.EditorInvisible.Filling)
      || !glass.imposts.length
      || glass.imposts.some(impost => impost.elm_type != $p.enm.elm_types.Раскладка)) {
        return;
    }

    // восстановление соединений с заполнением
    let restored;
    for(const impost of glass.imposts) {
      for(const node of ['b','e']) {
        const {cnn} = impost.rays[node];
        if(cnn && cnn.cnn_type !== cnn.cnn_type._manager.i) {
          continue;
        }
        const point = impost.generatrix.clone({insert: false})
          .elongation(1500)
          .intersect_point(glass.path, impost[node], false, node === 'b' ? impost.e : impost.b);
        if(point && !impost[node].is_nearest(point, 0)) {
          impost[node] = point;
          restored = true;
        }
      }
    }
    if(restored) {
      return true;
    }

    // выясняем направление, в котором уравнивать
    if(name === 'auto') {
      name = 'width';
    }

    // собираем в массиве shift все импосты подходящего направления, остальные помещаем в neighbors
    const orientation = name === 'width' ? $p.enm.orientations.vert : $p.enm.orientations.hor;
    const neighbors = [];
    const shift = glass.imposts.filter(impost => {
      // отрезаем плохую ориентацию, учитываем наклонные импосты
      const vert = (impost.angle_hor > 45 && impost.angle_hor <= 135) || (impost.angle_hor > 225 && impost.angle_hor <= 315);
      const passed = impost.orientation == orientation
        || (orientation === $p.enm.orientations.vert && vert)
        || (orientation === $p.enm.orientations.hor && !vert);
      if (!passed) {
        neighbors.push(impost);
      }
      return passed;
    });

    // выходим, если отсутствуют импосты подходящего направления
    if (!shift.length) {
      return;
    }

    // получение ближайших связанных импостов
    function get_nearest_link(link, src, pt) {
      // поиск близжайшего импоста к точке
      const index = src.findIndex(elm => elm.b.is_nearest(pt) || elm.e.is_nearest(pt));
      if (index !== -1) {
        // запоминаем импост
        const impost = src[index];
        // удаляем импост из доступных импостов
        src.splice(index, 1);
        // добавляем импост в связь
        link.push(impost);
        // получаем близжайшие импосты
        get_nearest_link(link, src, impost.b);
        get_nearest_link(link, src, impost.e);
      }
    }

    // группируем импосты для сдвига
    const tmp = Array.from(shift);
    const links = [];
    while (tmp.length) {
      const link = [];
      get_nearest_link(link, tmp, tmp[0].b);
      if (link.length) {
        links.push(link);
      }
    }
    // сортируем группы по возрастанию координат начальной точки первого импоста в связи
    links.sort((a, b) => {
      return orientation === $p.enm.orientations.vert ? (a[0].b._x - b[0].b._x) : (a[0].b._y - b[0].b._y);
    });

    // извлекаем ширину раскладки из номенклатуры первого импоста
    const widthNom = shift[0].nom.width;
    // определяем границы светового проема
    const bounds = glass.bounds_light(0);

    // вычисление смещения
    function get_delta(dist, pt) {
      return orientation === $p.enm.orientations.vert
        ? (bounds.x + dist - pt._x)
        : (bounds.y + dist - pt._y);
    }

    // получаем ширину строки или столбца
    const width = (orientation === $p.enm.orientations.vert ? bounds.width : bounds.height) / links.length;
    // получаем шаг между осями накладок без учета ширины элементов раскладки
    const step = ((orientation === $p.enm.orientations.vert ? bounds.width : bounds.height) - widthNom * links.length) / (links.length + 1);
    // накопительная переменная
    let pos = 0;
    // двигаем строки или столбцы
    for (const link of links) {
      // рассчитываем расположение осевой линии импоста с учетом предыдущей
      pos += step + widthNom / (pos === 0 ? 2 : 1);

      for (const impost of link) {
        // собираем соседние узлы для сдвига
        let nbs = [];
        for (const nb of neighbors) {
          if (nb.b.is_nearest(impost.b) || nb.b.is_nearest(impost.e)) {
            nbs.push({
              impost: nb,
              point: 'b'
            });
          }
          if (nb.e.is_nearest(impost.b) || nb.e.is_nearest(impost.e)) {
            nbs.push({
              impost: nb,
              point: 'e'
            });
          }
        }

        // двигаем начальную точку
        let delta = get_delta(pos, impost.b);
        impost.select_node("b");
        impost.move_points(new Point(orientation === $p.enm.orientations.vert ? [delta, 0] : [0, delta]));
        glass.deselect_onlay_points();

        // двигаем конечную точку
        delta = get_delta(pos, impost.e);
        impost.select_node("e");
        impost.move_points(new Point(orientation === $p.enm.orientations.vert ? [delta, 0] : [0, delta]));
        glass.deselect_onlay_points();

        // двигаем промежуточные точки импоста
        impost.generatrix.segments.forEach(segm => {
          if (segm.point === impost.b || segm.point === impost.e) {
            return;
          }
          delta = get_delta(pos, segm.point);
          segm.point = segm.point.add(delta);
        });

        // двигаем соседние узлы
        nbs.forEach(node => {
          delta = get_delta(pos, node.impost[node.point]);
          node.impost.select_node(node.point);
          node.impost.move_points(new Point(orientation == $p.enm.orientations.vert ? [delta, 0] : [0, delta]));
          glass.deselect_onlay_points();
        });
      }
    }

    return true;
  }

  /**
   * ### Уравнивание раскладки по световому проему
   * выполняет смещение по ширине и высоте
   * @param name
   * @param glass
   * @return {Boolean}
   */
  lay_impost_align(name = 'auto', glass) {
    // выравниваем по длине
    const width = (name === 'auto' || name === 'width') && this.do_lay_impost_align('width', glass);
    // выравниваем по высоте
    const height = (name === 'auto' ||  name === 'height') && this.do_lay_impost_align('height', glass);
    if (!width && !height) {
      return;
    }

    // перерисовываем контуры
    this.project.contours.forEach(l => l.redraw());

    return true;
  }

  /**
   * Обработчик события при удалении строки
   * @param obj
   * @param prm
   */
  on_del_row({grid, tabular_section}) {
    if(tabular_section == 'inserts'){
      const {project} = this;
      const {obj} = grid.get_cell_field() || {};
      if(obj && obj._owner._owner == project.ox && !obj.inset.empty()){
        project.ox.params.clear({cnstr: obj.cnstr, inset: obj.inset});
        project.register_change();
      }
    }
  }

  on_keydown(ev) {
    this.eve.emit('keydown', ev);
  }

  /**
   * Обработчик события проверки заполненности реквизитов
   */
  on_alert(ev) {
    if(ev._shown) {
      return;
    }
    if(ev.obj === this.project.ox) {
      if(ev.row) {
        const {inset} = ev.row;
        if(inset && !inset.empty()) {
          ev.text += `<br/>вставка "${inset.name}"`;
        }
      }
      ev._shown = true;
      $p.msg.show_msg(ev);
    }
  }

  close(ox, calc_order) {
    const {project} = this;
    let path = '/';
    if(project) {
      project.getItems({class: Editor.DimensionLine}).forEach((el) => el.wnd && el.wnd.close());
      if(!ox) {
        ox = project.ox;
      }
      if(!calc_order) {
        calc_order = ox.calc_order;
      }

      if(calc_order && !calc_order.empty()){
        path += `${calc_order.class_name}/${calc_order.ref}`;
        if(ox && !ox.empty()){
          path += `/?ref=${ox.ref}`
        }
      }
    }
    this.handlers.handleNavigate(path);
  }

  /**
   * ### Деструктор
   * @method unload
   * @for Editor
   */
  unload() {
    const {tool, tools, tb_left, tb_top, _acc, _undo, _pwnd, project} = this;


    $p.cat.characteristics.off('del_row', this.on_del_row);
    $p.off('alert', this.on_alert);
    document.body.removeEventListener('keydown', this.on_keydown);

    if(tool && tool._callbacks.deactivate.length){
      tool._callbacks.deactivate[0].call(tool);
    }

    _acc.unload();
    _undo.unload();
    tb_left.unload();
    tb_top.unload();
    project.unload();
    _pwnd.detachAllEvents();
    _pwnd.detachObject(true);

    super.unload();

  }

};


/**
 * Экспортируем конструктор Editor, чтобы экземпляры построителя можно было создать снаружи
 * @property Editor
 * @for MetaEngine
 * @type function
 */
$p.Editor = Editor;
