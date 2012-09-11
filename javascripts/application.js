(function() {
	btapp = new Btapp;
	btapp.connect({
		queries: [['btapp', 'dump_memory']]
	});

	btapp.on('add:bt:dump_memory', function() {
		btapp.dump_memory().then(function(data) {
			_.chain(data).map(function(info, location) {
				return _.extend(info, {location: location});
			}).sortBy(function(elem) {
				return -elem.allocations;
			}).each(function(elem) {
				$('body').append('<div>' + JSON.stringify(elem, null, 4) + '</div>');
			});
		});
	});	
}).call(this);