var app = (function(){

  function Matrix(m){
    this.m = m;
  }

  Matrix.multVectors = function(v1, v2){
    var sum = 0,
        i;

    for (i = 0; i < v1.length; i++) {
      sum += v1[i]*v2[i];
    }
    return sum;
  };

  Matrix.prototype.getRow = function(index){
    return this.m[index];
  };

  Matrix.prototype.getColumn = function(index){
    var i,
        v = [];

    for (i = 0; i < this.m.length; i++) {
      v[i] = this.m[i][index];
    }
    return v;
  };

  Matrix.prototype.mult = function(m2){
    var i,
        j,
        m1 = this,
        m = [];

    for (i = 0; i < m1.m.length; i++) {
      m[i] = [];
      for (j = 0; j < m2.m[i].length; j++) {
        m[i][j] = Matrix.multVectors(m1.getRow(i), m2.getColumn(j));
      }
    };
    return new Matrix(m);
  };


  function SvgUtils(){}

  SvgUtils.transformRegExp = /(matrix|translate|scale)\(([^)]*)\)/g;

  SvgUtils.parseTransform = function(transform){
    var match,
        args = [],
        result = new Matrix([[1, 0, 0], [0, 1, 0], [0, 0, 1]]),
        matrix,
        args,
        i;

    while ((match = SvgUtils.transformRegExp.exec(transform)) !== null) {
      matrix = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      args = match[2].split(',');
      for (i = 0; i < args.length; i++) {
        args[i] = parseFloat($.trim(args[i]));
      }
      if (match[1] == 'matrix') {
        matrix[0] = [args[0], args[2], args[4]];
        matrix[1] = [args[1], args[3], args[5]];
      } else if (match[1] == 'translate') {
        matrix[0][2] = args[0];
        matrix[1][2] = args[1] || 0;
      } else if (match[1] == 'scale') {
        matrix[0][0] = args[0];
        matrix[1][1] = args[1] || args[0];
      }
      result = result.mult(new Matrix(matrix));
    }
    return result;
  };

  SvgUtils.applyTransformToPath = function(path, matrix){
    var re = /([MmLlHhVvCcSsZz])([^MmLlHhVvCcSsZz]*)/g,
        coords,
        i,
        cmdIndex = 0,
        m = matrix.m,
        tPath = '',
        point;
        relativeMatrix = new Matrix([[m[0][0], m[0][1], 0], [m[1][0], m[1][1], 0], [0, 0, 1]]);

    while ((match = re.exec(path)) !== null) {
      coords = $.trim(match[2]).split(/[, ]+/g);
      tCoords = [];
      if (coords.length >= 2) {
        for (i = 0; i < coords.length; i += 2) {
          if (match[1] === match[1].toUpperCase() || cmdIndex == 0) {
            point = matrix.mult(new Matrix([[ coords[i] ], [ coords[i+1] ], [1] ]));
          } else {
            point = relativeMatrix.mult(new Matrix([[ coords[i] ], [ coords[i+1] ], [1] ]));
          }
          tCoords.push(point.m[0][0].toFixed(2), point.m[1][0].toFixed(2));
        }
      }
      tPath += match[1]+tCoords.join(' ');
      cmdIndex++;
    }
    return tPath;
  };

  SvgUtils.units = {
    "pt": 1.25,
    "pc": 15,
    "mm": 3.543307,
    "cm": 35.43307,
    "in": 90
  };

  SvgUtils.lengthToPixels = function(v){
    var units = v.substr(v.length - 2),
        number = parseInt(v.substr(0, v.length - 2), 10);

    if (SvgUtils.units[units]) {
      return number * SvgUtils.units[units];
    } else {
      return v;
    }
  };

  function MapRegion(data){
    this.originalId = data.id || 'id'+MapRegion.uid;
    this.id = ko.observable(this.originalId);
    this.name = ko.observable(data.name || 'name'+MapRegion.uid);
    this.path = ko.observable(data.path);
    if (!data.id || !data.name)  {
      MapRegion.uid++;
    }
  }
  MapRegion.uid = 0;


  function Map(){
    this.paths = ko.observableArray([]);
  }

  Map.prototype.getConfig = function(){
    var paths = {};

    for (var i = 0; i < this.paths().length; i++) {
      paths[this.paths()[i].id()] = {
        name: this.paths()[i].name(),
        path: this.paths()[i].path()
      }
    }
    return {
      width: this.width,
      height: this.height,
      paths: paths
    };
  };

  Map.prototype.getPathById = function(id){
    var i,
        paths = this.paths();

    for (i = 0; i < paths.length; i++) {
      if (paths[i].originalId === id) {
        return paths[i];
      }
    }
  };

  Map.prototype.loadFromSvg = function(svg, settings){
    var that = this,
        svgEl = $(svg).find('svg'),
        viewBox;

    if (svgEl.attr('viewBox')) {
      viewBox = $.trim(svgEl.attr('viewBox')).split(/[\s]/);
      this.width = parseFloat(viewBox[2]) - parseFloat(viewBox[0]);
      this.height = parseFloat(viewBox[3]) - parseFloat(viewBox[1]);
    } else {
      this.width = SvgUtils.lengthToPixels( svgEl.attr('width') );
      this.height = SvgUtils.lengthToPixels( svgEl.attr('height') );
    }
    svgEl.find('path, polygon').each(function(i){
      var fullTransform = '',
          pathStr,
          points,
          i;

      $(this).parents().add(this).each(function(){
        fullTransform += ' '+$(this).attr('transform');
      });
      if (this.tagName.toLowerCase() == 'polygon') {
        points = $.trim( $(this).attr('points') ).split(/[\s,]+/);
        pathStr = 'M'+points[0]+','+points[1];
        for (i = 2; i < points.length; i+=2) {
          pathStr += 'L'+points[i]+','+points[i+1];
        }
      } else {
        pathStr = $(this).attr('d');
      }
      that.paths.push(new MapRegion({
        id: $(this).attr('id') || null,
        name: $(this).attr('name') || null,
        path: SvgUtils.applyTransformToPath( pathStr, SvgUtils.parseTransform(fullTransform) )
      }));
    });
  }

  Map.prototype.createJvmMap = function(config){
    $.fn.vectorMap('addMap', 'map', this.getConfig());
    return new jvm.WorldMap(config);
  };


  function RegionEditDialog() {
    var that = this;

    $('#edit-dialog').dialog({
      autoOpen: false,
      modal: true,
      resizable: false,
      buttons: {
        OK: function() {
          that.path.id( $('#edit-dialog-id').val() );
          that.path.name( $('#edit-dialog-name').val() );
          $( this ).dialog( "close" );
        },
        Cancel: function() {
          $( this ).dialog( "close" );
        }
      }
    });
  }

  RegionEditDialog.prototype.show = function(regionId){
    this.path = map.getPathById( regionId );
    $('#edit-dialog').dialog('open');
    $('#edit-dialog-id').val(this.path.id());
    $('#edit-dialog-name').val(this.path.name());
  }


  function CardLayout(cards){
    var self = this;

    this.cards = {};

    cards.each(function(index){
      var card = $(this);

      if (index) {
        card.hide();
      } else {
        self.currentCard = card;
      }
      self.cards[card.attr('id').split('-').slice(1).join('-')] = card;
    });
  };

  CardLayout.prototype.show = function(cardName){
    this.currentCard.hide();
    this.cards[cardName].show();
    this.currentCard = this.cards[cardName];
  };


  var map = new Map(),
      jvmMap,
      regionEditDialog = new RegionEditDialog(),
      layout = new CardLayout($('.card'));

  $('#input-convert').click(function(){
    map.loadFromSvg( $.parseXML( $.trim( $('#input-source').val()) ), {
      idAttribure: $('#input-id-attribute input').val(),
      nameAttribute: $('#input-name-attribute input').val()
    } );
    layout.show('settings');
    jvmMap = map.createJvmMap({
      container: $('#settings-map'),
      map: 'map',
      backgroundColor: 'white',
      regionStyle: {
        initial: {
          fill: '#02B2FF',
          stroke: 'white',
          "stroke-width": 1.5
        },
        hover: {
          fill: '#02DBFF'
        }
      },
      onRegionLabelShow: function(e, label, code){
        label.html(map.getPathById(code).name());
      },
      onRegionOver: function(e, code){
        $('#settings-table tr[data-region-id="'+code+'"]').addClass('active');
      },
      onRegionOut: function(e, code){
        $('#settings-table tr[data-region-id="'+code+'"]').removeClass('active');
      }
    });
  });

  $('#setting-save').click(function(){
    layout.show('save');
    $('#save-source').val( "jQuery.fn.vectorMap('addMap', '"+$('#setting-map-name').val()+"', "+JSON.stringify(map.getConfig()) + ");" );
  });

  $('#settings-table').on('mouseover mouseout', 'tr', function(e){
    if (!$(this).hasClass('header')) {
      if (e.type == 'mouseover') {
        $(this).addClass('active');
        jvmMap.regions[$(this).attr('data-region-id')].element.setHovered(true);
      } else {
        $(this).removeClass('active');
        jvmMap.regions[$(this).attr('data-region-id')].element.setHovered(false);
      }
    }
  });

  $('#settings-table').on('click', 'tr', function(e){
    if (!$(this).hasClass('header')) {
      regionEditDialog.show( $(this).attr('data-region-id') );
    }
  });

  ko.applyBindings({map: map});
});