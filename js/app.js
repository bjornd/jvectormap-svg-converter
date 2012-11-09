var app = (function(){
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

  Map.prototype.loadFromSvg = function(svg){
    var that = this;

    this.width = parseInt($(svg).find('svg').attr('width'), 10);
    this.height = parseInt($(svg).find('svg').attr('height'), 10)
    $(svg).find('path').each(function(i){
      that.paths.push(new MapRegion({
        path: $(this).attr('d')
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
        Ok: function() {
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
    map.loadFromSvg( $.parseXML($('#input-source').val()) );
    layout.show('settings');
    jvmMap = map.createJvmMap({
      container: $('#settings-map'),
      map: 'map',
      backgroundColor: 'white',
      regionStyle: {
        initial: {
          fill: '#02B2FF'
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