var app = function(){
  var convertSvgToMap = function(svg) {
    var map = {};

    map.width = parseInt($(svg).find('svg').attr('width'), 10);
    map.height = parseInt($(svg).find('svg').attr('height'), 10);
    map.paths = {};
    $(svg).find('path').each(function(i){
      map.paths['id'+i] = {
        path: $(this).attr('d'),
        name: 'name'+i
      };
    });
    return map;
  };

  var createMap = function(){
    $.fn.vectorMap('addMap', 'map', mapData);
    return new jvm.WorldMap({
      container: $('#settings-map'),
      map: 'map',
      backgroundColor: 'white',
      regionStyle: {
        initial: {
          fill: '#E9AB38'
        }
      }
    });
  };

  var renderTable = function(){
    var table = '<table><tr><th>id</th><th>name</th></tr>',
        id;

    for (id in mapData.paths) {
      table += '<tr>'+
                 '<td>'+id+'</td>'+
                 '<td>'+mapData.paths[id].name+'</td>'+
               '</tr>';
    }
    table += '</table>'
    $('#settings-table').html(table);
  };

  var CardLayout = function(cards){
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

  var layout = new CardLayout($('.card')),
      mapData;

  $('#input-convert').click(function(){
    mapData = convertSvgToMap( $.parseXML($('#input-source').val()) );

    layout.show('settings');

    renderTable();
    createMap();
  });

  $('#setting-save').click(function(){
    layout.show('save');
    $('#save-source').val( "jQuery.fn.vectorMap('addMap'," + JSON.stringify(mapData) + ");" );
  });
};